import { formatMachine, type Machine } from "./document";
import type { Goals } from "./explore";
import { presets } from "./presets";
import { goalsFor, loadFor, minModeHz, type Requirements } from "./requirements";
import { meets, search, violation, type Candidate, type Evaluator, type SearchResult } from "./search";

// Design from requirements with several starting templates at once: the
// current design and every preset, each adapted to the builder's work area,
// spindle and gantry clearance. Greedy search depends on where it starts, so
// running a few and keeping the best of each kind is cheap insurance.

export interface Pick extends Candidate {
  template: string;
  /** Meets every target, the first mode confirmed by the full analysis. */
  passes: boolean;
}

export interface DesignResult {
  /** Up to three picks, cheapest first; empty when nothing met the targets. */
  picks: Pick[];
  /** The design nearest to passing, when nothing passed. */
  closest: Pick | null;
  /** Cheapest passing design costs more than the budget. */
  overBudget: boolean;
  evaluated: number;
  goals: Goals;
}

export interface DesignProgress {
  evaluated: number;
  finished: number;
  total: number;
}

function templates(current: Machine, req: Requirements): Array<{ name: string; machine: Machine }> {
  const adapt = (m: Machine): Machine => ({
    ...m,
    work: { ...current.work },
    spindle: current.spindle,
    gantry: { ...m.gantry, clearanceMm: current.gantry.clearanceMm },
    cutN: loadFor(req),
  });
  const list = [{ name: "Your current design", machine: adapt(current) }, ...presets.map((p) => ({ name: p.name, machine: adapt(p.machine) }))];
  const seen = new Set<string>();
  return list.filter((t) => {
    const k = formatMachine(t.machine);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function designFor(current: Machine, req: Requirements, evaluator: Evaluator, onProgress?: (p: DesignProgress) => void, cancelled = () => false): Promise<DesignResult> {
  const goals = goalsFor(req);
  const starts = templates(current, req);
  const counts = starts.map(() => 0);
  let finished = 0;
  const report = () => onProgress?.({ evaluated: counts.reduce((a, b) => a + b, 0), finished, total: starts.length });

  const results = await Promise.all(
    starts.map(async (t, i): Promise<{ name: string; result: SearchResult } | null> => {
      try {
        for await (const ev of search(t.machine, goals, evaluator)) {
          if (cancelled()) return null;
          if (ev.kind === "progress") counts[i] = ev.evaluated;
          else {
            counts[i] = ev.result.evaluated;
            finished++;
            report();
            return { name: t.name, result: ev.result };
          }
          report();
        }
      } catch {
        finished++;
        report();
      }
      return null;
    }),
  );

  const fMin = minModeHz(req);
  const all: Pick[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!r) continue;
    for (const c of r.result.candidates) {
      const k = formatMachine(c.machine);
      if (seen.has(k)) continue;
      seen.add(k);
      all.push({ ...c, template: r.name, passes: meets(c.q, goals) && (c.f1 ?? 0) >= fMin * 0.98 });
    }
  }
  const passing = all.filter((c) => c.passes);
  const evaluated = counts.reduce((a, b) => a + b, 0);
  if (!passing.length) {
    const closest = all.reduce<Pick | null>((a, b) => (!a || violation(b.q, goals) < violation(a.q, goals) ? b : a), null);
    return { picks: [], closest, overBudget: false, evaluated, goals };
  }

  const byCost = [...passing].sort((a, b) => a.q.cost - b.q.cost);
  const cheapest = { ...byCost[0], kind: "cheapest" as const };
  const inBudget = passing.filter((c) => c.q.cost <= req.budget);
  const stiffest = inBudget.length ? inBudget.reduce((a, b) => (b.q.deflectionUm < a.q.deflectionUm ? b : a)) : null;
  const balanced = inBudget.filter((c) => c.q.deflectionUm <= 0.7 * goals.deflectionUm && c !== byCost[0] && c !== stiffest).sort((a, b) => a.q.cost - b.q.cost)[0] ?? null;

  const picks: Pick[] = [cheapest];
  if (balanced) picks.push({ ...balanced, kind: "balanced" });
  if (stiffest && stiffest !== byCost[0] && formatMachine(stiffest.machine) !== formatMachine(cheapest.machine)) picks.push({ ...stiffest, kind: "stiffest" });
  return { picks, closest: null, overBudget: cheapest.q.cost > req.budget, evaluated, goals };
}
