import { controllers, spindles } from "../catalog/equipment";
import { drives, guides, motors } from "../catalog/motion";
import { stock } from "../catalog/stock";
import { analyze } from "./analyze";
import { formatMachine, setPath, type Machine } from "./document";
import { buysUnpriced, moves, quick, type Goals, type Quick } from "./explore";

// Design from requirements. Starting from a template, a greedy search walks
// one change at a time, trying only the fields behind whatever is short:
//   A  meet the targets: most shortfall removed per dollar;
//   B  cost down: take savings that keep every target met ("Cheapest");
//   C  spend toward the budget: most stiffness per dollar, recording the
//      first design with 30 % stiffness headroom ("Balanced") and the last
//      one inside the budget ("Stiffest").
// Each step uses the static solve; the finalists get the full modal analysis.

export type CandidateKind = "cheapest" | "balanced" | "stiffest";

export interface Candidate {
  kind: CandidateKind;
  machine: Machine;
  q: Quick;
  /** First mode from the full analysis (Hz); null if it did not solve. */
  f1: number | null;
  /** Net changes from the start design. */
  steps: string[];
}

export interface SearchResult {
  feasible: boolean;
  /** Shortfall left when no design met the targets (0 when feasible). */
  violation: number;
  candidates: Candidate[];
  /** Designs from Cheapest toward Stiffest: the cost/stiffness frontier walked. */
  frontier: Array<{ q: Quick; step: string }>;
  evaluated: number;
}

/**
 * Batch evaluation, so the caller can spread the work across a worker pool:
 * quick() for search steps, and the full analysis's first mode for finalists.
 */
export interface Evaluator {
  quick(machines: Machine[]): Promise<Array<Quick | null>>;
  firstMode(machines: Machine[]): Promise<Array<number | null>>;
}

const attempt = <T,>(f: () => T): T | null => {
  try {
    return f();
  } catch {
    return null;
  }
};

/** Everything in-process: for tests, and as the fallback without workers. */
export const localEvaluator: Evaluator = {
  quick: async (ms) => ms.map((m) => attempt(() => quick(m))),
  firstMode: async (ms) =>
    ms.map((m) => {
      const r = analyze(m);
      return r.ok ? (r.analysis.modes[0]?.hz ?? null) : null;
    }),
};

export type SearchEvent = { kind: "progress"; phase: "meet" | "cost" | "stiffen" | "confirm"; evaluated: number; best: Quick } | { kind: "done"; result: SearchResult };

/**
 * The builder's calls, not the search's: clearance sets how thick a workpiece
 * fits under the gantry, and the spindle is chosen for power, noise and collets.
 */
const FIXED = new Set(["gantry.clearanceMm", "spindle"]);

const SOFT_FIELDS: Record<string, string[]> = {
  "Base frame": ["frame.stock"],
  "Base joints": ["frame.joinery", "frame.stock"],
  "Gantry side plates": ["gantry.plateMm"],
  "Gantry beam": ["gantry.beam", "gantry.beams"],
  "Beam-to-side joints": ["gantry.beams", "gantry.plateMm", "gantry.beam"],
  "Z plates": ["gantry.plateMm"],
  "Spindle & mount": ["spindle"],
  "X carriages": ["x.guide"],
  "Y carriages": ["y.guide"],
  "Z carriages": ["z.guide"],
  "X drive": ["x.drive"],
  "Y drive": ["y.drive"],
  "Z drive": ["z.drive"],
  Rails: ["x.guide", "y.guide", "z.guide"],
};
const SPEED_FIELDS = ["x.drive", "y.drive", "x.motor", "y.motor", "controller", "gantry.beam", "gantry.plateMm"];
const LIFT_FIELDS = ["z.motor", "z.drive", "controller"];
/** A low first mode is a heavy gantry on a soft path to ground. */
const MODE_FIELDS = ["gantry.beam", "gantry.beams", "gantry.plateMm", "frame.stock", "frame.joinery", "y.guide", "y.drive"];

/** Options with a sourced price; the search never picks a part it cannot cost. */
const priced = (key: string, id: string): boolean => {
  const leaf = key.split(".").pop()!;
  if (key === "frame.stock" || key === "gantry.beam") return stock.find((s) => s.id === id)?.offer.price != null;
  if (leaf === "guide") {
    const g = guides.find((x) => x.id === id);
    return g?.rail.offer.price != null && g.block.offer.price != null;
  }
  if (leaf === "drive") {
    const d = drives.find((x) => x.id === id);
    return d?.kind === "ballscrew" ? d.kit.offer.price != null : d?.belt.offer.price != null && d.kit.offer.price != null;
  }
  if (leaf === "motor") return motors.find((x) => x.id === id)?.offer.price != null;
  if (key === "spindle") return spindles.find((x) => x.id === id)?.offer.price != null;
  if (key === "controller") return controllers.find((x) => x.id === id)?.offer.price != null;
  return true;
};

export const violation = (q: Quick, g: Goals) =>
  Math.max(0, q.deflectionUm / g.deflectionUm - 1) +
  Math.max(0, 1 - q.f1 / g.minModeHz) + Math.max(0, 1 - q.rapidMmMin / g.rapidMmMin) + Math.max(0, 1 - q.accelMs2 / g.accelMs2) + (q.zOk ? 0 : 1);

export const meets = (q: Quick, g: Goals) => violation(q, g) < 1e-9;

export async function* search(start: Machine, goals: Goals, evaluator: Evaluator = localEvaluator): AsyncGenerator<SearchEvent, SearchResult> {
  const cache = new Map<string, Quick | null>();
  let evaluated = 0;
  /** Evaluate designs not seen before in one batch; answers come back in order. */
  const evaluateAll = async (ms: Machine[]): Promise<Array<Quick | null>> => {
    const keys = ms.map(formatMachine);
    const fresh = [...new Map(keys.map((k, i) => [k, ms[i]] as const)).entries()].filter(([k]) => !cache.has(k));
    if (fresh.length) {
      const results = await evaluator.quick(fresh.map(([, m]) => m));
      fresh.forEach(([k], i) => cache.set(k, results[i]));
      evaluated += fresh.length;
    }
    return keys.map((k) => cache.get(k)!);
  };
  const evaluate = async (m: Machine) => (await evaluateAll([m]))[0];

  const startQ = await evaluate(start);
  if (!startQ) throw new Error("The start design does not solve");
  const valid = (q: Quick) => !q.unbuildable && (goals.weld || !q.welded) && !buysUnpriced(startQ, q);

  type Move = Array<[string, string | number]>;
  type Pt = { m: Machine; q: Quick; steps: string[]; move?: Move };
  const apply = (m: Machine, move: Move) => move.reduce((acc, [k, v]) => setPath(acc, k, v), m);

  /**
   * Single changes plus paired ones: the pace targets use the slower of X and
   * Y, so a drive, motor or rail change only pays off when both axes take it.
   */
  const candidateMoves = (m: Machine, keys?: string[]): Move[] => {
    const single: Move[] = moves(m)
      .filter(([k, v]) => !FIXED.has(k) && priced(k, String(v)))
      .map(([k, v]) => [[k, v]]);
    const paired: Move[] = [];
    for (const leaf of ["drive", "motor", "guide"] as const) {
      const options = leaf === "drive" ? drives : leaf === "motor" ? motors : guides;
      for (const o of options) {
        if (!priced(`x.${leaf}`, o.id)) continue;
        if (m.x[leaf] !== o.id || m.y[leaf] !== o.id) paired.push([[`x.${leaf}`, o.id], [`y.${leaf}`, o.id]]);
      }
    }
    const all = [...single, ...paired];
    return keys ? all.filter((mv) => mv.some(([k]) => keys.includes(k))) : all;
  };

  const tryMoves = async (cur: Pt, keys?: string[]) => {
    const list = candidateMoves(cur.m, keys).map((move) => ({ move, m: apply(cur.m, move) }));
    const qs = await evaluateAll(list.map((x) => x.m));
    return list
      .map(({ move, m }, i) => {
        const q = qs[i];
        return q && valid(q) ? { m, q, move, steps: [...cur.steps, describe(move)] } : null;
      })
      .filter((x): x is Pt & { move: Move } => x !== null);
  };

  // A: meet the targets.
  let cur: Pt = { m: start, q: startQ, steps: [] };
  if (!goals.weld && startQ.welded) {
    const m = setPath(start, "frame.joinery", "plates");
    const q = await evaluate(m);
    if (q) cur = { m, q, steps: [describeMove("frame.joinery", "plates")] };
  }
  for (let i = 0; i < 16 && !meets(cur.q, goals); i++) {
    const keys = new Set<string>();
    if (cur.q.deflectionUm > goals.deflectionUm) for (const s of cur.q.soft) for (const k of SOFT_FIELDS[s] ?? []) keys.add(k);
    if (cur.q.rapidMmMin < goals.rapidMmMin || cur.q.accelMs2 < goals.accelMs2) for (const k of SPEED_FIELDS) keys.add(k);
    if (!cur.q.zOk) for (const k of LIFT_FIELDS) keys.add(k);
    if (cur.q.f1 < goals.minModeHz) for (const k of MODE_FIELDS) keys.add(k);
    let options = await tryMoves(cur, [...keys]);
    const v0 = violation(cur.q, goals);
    let better = options.filter((o) => violation(o.q, goals) < v0 - 1e-6);
    if (!better.length) {
      // The obvious levers are exhausted; widen to every field once.
      options = await tryMoves(cur);
      better = options.filter((o) => violation(o.q, goals) < v0 - 1e-6);
    }
    if (!better.length) break;
    const gain = (o: Pt) => (v0 - violation(o.q, goals)) / (Math.max(0, o.q.cost - cur.q.cost) + 40);
    cur = better.reduce((a, b) => (gain(b) > gain(a) ? b : a));
    yield { kind: "progress", phase: "meet", evaluated, best: cur.q };
  }
  const feasible = meets(cur.q, goals);

  // B: cost down, applying independent savings together and checking each.
  if (feasible) {
    for (let pass = 0; pass < 3; pass++) {
      const savings = (await tryMoves(cur))
        .filter((o) => o.q.cost < cur.q.cost - 1 && meets(o.q, goals))
        .sort((a, b) => a.q.cost - b.q.cost);
      if (!savings.length) break;
      const used = new Set<string>();
      let next: Pt = cur;
      for (const sv of savings) {
        if (sv.move.some(([k]) => used.has(k))) continue;
        const m = apply(next.m, sv.move);
        const q = await evaluate(m);
        if (q && valid(q) && meets(q, goals) && q.cost < next.q.cost - 1) {
          next = { m, q, steps: [...next.steps, describe(sv.move)] };
          for (const [k] of sv.move) used.add(k);
        }
      }
      if (next === cur) break;
      cur = next;
      yield { kind: "progress", phase: "cost", evaluated, best: cur.q };
    }
  }
  const cheapest = cur;

  // C: spend toward the budget on stiffness, keeping the speed targets.
  const frontier: Array<{ q: Quick; step: string }> = [{ q: cheapest.q, step: "Cheapest that passes" }];
  let balanced: Pt | null = feasible && cheapest.q.deflectionUm <= 0.7 * goals.deflectionUm ? cheapest : null;
  if (feasible) {
    for (let i = 0; i < 12 && cur.q.deflectionUm > 0.3 * goals.deflectionUm; i++) {
      const keys = new Set<string>();
      for (const s of cur.q.soft) for (const k of SOFT_FIELDS[s] ?? []) keys.add(k);
      const ups = (await tryMoves(cur, [...keys])).filter((o) => o.q.cost <= goals.budget && meets(o.q, goals) && o.q.deflectionUm < cur.q.deflectionUm * 0.97);
      if (!ups.length) break;
      const worth = (o: Pt) => (cur.q.deflectionUm - o.q.deflectionUm) / Math.max(o.q.cost - cur.q.cost, 20);
      cur = ups.reduce((a, b) => (worth(b) > worth(a) ? b : a));
      frontier.push({ q: cur.q, step: cur.steps[cur.steps.length - 1] });
      if (!balanced && cur.q.deflectionUm <= 0.7 * goals.deflectionUm) balanced = cur;
      yield { kind: "progress", phase: "stiffen", evaluated, best: cur.q };
    }
  }
  const stiffest = cur;

  // Confirm the finalists with the full analysis, modes included.
  const picks: Array<[CandidateKind, Pt]> = [["cheapest", cheapest]];
  if (balanced && balanced !== cheapest) picks.push(["balanced", balanced]);
  if (stiffest !== cheapest && stiffest !== balanced) picks.push(["stiffest", stiffest]);
  yield { kind: "progress", phase: "confirm", evaluated, best: cheapest.q };
  const f1s = await evaluator.firstMode(picks.map(([, p]) => p.m));
  const candidates = picks.map(([kind, p], i): Candidate => ({ kind, machine: p.m, q: p.q, f1: f1s[i], steps: changes(start, p.m) }));

  const result: SearchResult = { feasible, violation: violation(cheapest.q, goals), candidates, frontier, evaluated };
  yield { kind: "done", result };
  return result;
}

/** Net differences between two designs, pairing X and Y where they changed alike. */
export function changes(from: Machine, to: Machine): string[] {
  const a = new URLSearchParams(formatMachine(from));
  const b = new URLSearchParams(formatMachine(to));
  const diff = [...b].filter(([k, v]) => k !== "cutN" && a.get(k) !== v);
  const out: string[] = [];
  const done = new Set<string>();
  for (const [k, v] of diff) {
    if (done.has(k)) continue;
    const [axis, leaf] = k.split(".");
    if (axis === "x" && diff.some(([k2, v2]) => k2 === `y.${leaf}` && v2 === v)) {
      out.push(`X+Y ${leaf} → ${v}`);
      done.add(`y.${leaf}`);
    } else out.push(describeMove(k, v));
    done.add(k);
  }
  return out;
}

/** "X+Y drive → SFU1610" for a paired move, "Plates → 15 mm" for a single one. */
function describe(move: Array<[string, string | number]>) {
  if (move.length === 2 && move[0][0].startsWith("x.") && move[1][0].startsWith("y.")) return `X+Y ${move[0][0].slice(2)} → ${move[0][1]}`;
  return move.map(([k, v]) => describeMove(k, v)).join(", ");
}

function describeMove(key: string, value: string | number) {
  const names: Record<string, string> = {
    "frame.stock": "Base stock",
    "frame.joinery": "Joints",
    "gantry.beam": "Gantry beam",
    "gantry.beams": "Gantry beams",
    "gantry.plateMm": "Plates",
    spindle: "Spindle",
    controller: "Controller",
  };
  const [axis, leaf] = key.split(".");
  const name = names[key] ?? `${axis.toUpperCase()} ${leaf}`;
  return `${name} → ${value}${key === "gantry.plateMm" ? " mm" : ""}`;
}
