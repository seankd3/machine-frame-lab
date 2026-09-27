import { fields } from "../app/fields";
import { bom } from "./bom";
import { compile } from "./compile";
import { setPath, type Machine } from "./document";
import { AXES, performance, solve } from "./simulate";

// One-change exploration: every design that differs from the current one in
// exactly one choice, each compiled, solved statically and priced. Modal
// analysis is left out (it costs ten times as much); the static solve covers
// deflection, speed and cost, which is what ranking changes needs.

/** Plate thicknesses sold as stock, mm. */
const PLATES = [6, 8, 10, 12, 15, 20, 25];

/** What a design does, from the static solve and the BOM. */
export interface Quick {
  deflectionUm: number;
  /** Slowest X/Y rapid and acceleration: the pace targets. */
  rapidMmMin: number;
  accelMs2: number;
  cost: number;
  unpriced: number;
  /** Quantity of every unpriced BOM line, by SKU. */
  unpricedQty: Record<string, number>;
  massKg: number;
  welded: boolean;
}

export interface Variant {
  key: string;
  value: string | number;
  /** "Gantry beam → 45-9090" */
  label: string;
  quick: Quick;
}

export function quick(machine: Machine): Quick {
  const c = compile(machine);
  const perf = performance(c, solve(c));
  const b = bom(c);
  const planar = ["x", "y"] as const;
  return {
    deflectionUm: Math.max(...AXES.map((a) => perf.deflection[a])),
    rapidMmMin: Math.min(...planar.map((a) => perf.motion[a].rapidMmMin)),
    accelMs2: Math.min(...planar.map((a) => perf.motion[a].accelMs2)),
    cost: b.total,
    unpriced: b.unpriced,
    unpricedQty: Object.fromEntries(b.lines.filter((l) => l.total === null).map((l) => [l.sku, l.qty])),
    massKg: perf.massKg,
    welded: machine.frame.joinery === "welded",
  };
}

const get = (m: Machine, key: string) => key.split(".").reduce<any>((o, p) => o[p], m) as string | number;

const AXIS_NAME: Record<string, string> = { x: "X", y: "Y", z: "Z" };

function describe(key: string, value: string | number): string {
  const f = fields[key];
  const [head, tail] = key.split(".");
  const what = AXIS_NAME[head] ? `${AXIS_NAME[head]} ${f.label.toLowerCase()}` : f.label;
  if (f.kind === "number") return `${what} → ${value} ${f.unit}`;
  const option = f.options.find((o) => o.id === String(value));
  void tail;
  return `${what} → ${option?.label ?? value}`;
}

/** Every single-field change worth trying, as [key, value] pairs. */
export function moves(m: Machine): Array<[string, string | number]> {
  const out: Array<[string, string | number]> = [];
  const choice = ["frame.stock", "frame.joinery", "gantry.beam", "gantry.beams", "spindle", "controller", ...["x", "y", "z"].flatMap((a) => ["guide", "drive", "motor"].map((k) => `${a}.${k}`))];
  for (const key of choice) {
    const f = fields[key];
    if (f.kind !== "choice") continue;
    const current = String(get(m, key));
    for (const o of f.options) if (o.id !== current) out.push([key, key === "gantry.beams" ? Number(o.id) : o.id]);
  }
  const t = m.gantry.plateMm;
  const below = PLATES.filter((p) => p < t).pop();
  const above = PLATES.find((p) => p > t);
  if (below !== undefined) out.push(["gantry.plateMm", below]);
  if (above !== undefined) out.push(["gantry.plateMm", above]);
  // A lower gantry is a shorter lever arm: try less clearance, and more for reach.
  const cf = fields["gantry.clearanceMm"];
  if (cf.kind === "number") {
    for (const c of [m.gantry.clearanceMm - 50, m.gantry.clearanceMm + 50]) if (c >= cf.min && c <= cf.max) out.push(["gantry.clearanceMm", c]);
  }
  return out;
}

/** Evaluate every move, reporting in batches so a caller can show progress. */
export function* explore(m: Machine, batch = 8): Generator<{ done: number; total: number; variants: Variant[] }> {
  const all = moves(m);
  let pending: Variant[] = [];
  for (let i = 0; i < all.length; i++) {
    const [key, value] = all[i];
    try {
      pending.push({ key, value, label: describe(key, value), quick: quick(setPath(m, key, value)) });
    } catch {
      // A combination that does not compile or solve is not a suggestion.
    }
    if (pending.length >= batch || i === all.length - 1) {
      yield { done: i + 1, total: all.length, variants: pending };
      pending = [];
    }
  }
}

// ------------------------------------------------------------ ranking

export interface Suggestion extends Variant {
  /** Change against the current design. */
  dCost: number;
  dDeflection: number;
  /** The variant swaps in parts that have no sourced price, so its cost is uncertain. */
  priceUnknown: boolean;
}

export interface Goals {
  deflectionUm: number;
  rapidMmMin: number;
  accelMs2: number;
  budget: number;
  /** Welded frames are allowed only when the builder can weld. */
  weld: boolean;
}

/** More of anything unpriced than the base has: the cost change is then a floor, not a figure. */
const buysUnpriced = (base: Quick, v: Quick) => Object.entries(v.unpricedQty).some(([sku, q]) => q > (base.unpricedQty[sku] ?? 0) + 1e-9);

const meets = (q: Quick, g: Goals) => q.deflectionUm <= g.deflectionUm && q.rapidMmMin >= g.rapidMmMin && q.accelMs2 >= g.accelMs2;

/**
 * Ranked suggestions against the goals:
 *  - stiffer: the largest deflection cut per dollar (free or cheaper ones first);
 *  - faster: raises the slowest rapid without breaking the deflection goal;
 *  - cheaper: saves money without losing any goal the design meets now.
 */
export function rank(base: Quick, variants: Variant[], goals: Goals) {
  const s: Suggestion[] = variants.map((v) => ({
    ...v,
    dCost: v.quick.cost - base.cost,
    dDeflection: v.quick.deflectionUm - base.deflectionUm,
    priceUnknown: buysUnpriced(base, v.quick),
  }));
  // Only changes the builder can make are suggestions; the chart still shows the rest.
  const allowed = s.filter((x) => goals.weld || !x.quick.welded);
  // Respect the budget while the design is inside it; once over, still show every fix with its cost.
  const affordable = (x: Suggestion) => base.cost > goals.budget || x.quick.cost <= goals.budget;
  // Stiffness bought per dollar; a free change ranks first only when its price is known.
  const value = (x: Suggestion) => (x.priceUnknown ? -x.dDeflection / Math.max(x.dCost, 50) / 10 : x.dCost <= 0 ? Infinity : -x.dDeflection / x.dCost);

  const stiffer = allowed
    .filter((x) => x.dDeflection < -0.03 * base.deflectionUm && x.quick.rapidMmMin >= Math.min(base.rapidMmMin, goals.rapidMmMin) && affordable(x))
    .sort((a, b) => value(b) - value(a) || a.dDeflection - b.dDeflection);

  const faster = allowed
    .filter((x) => x.quick.rapidMmMin > base.rapidMmMin * 1.05 && x.quick.deflectionUm <= Math.max(base.deflectionUm, goals.deflectionUm) && affordable(x))
    .sort((a, b) => b.quick.rapidMmMin - a.quick.rapidMmMin);

  const baseMeets = {
    deflection: base.deflectionUm <= goals.deflectionUm,
    rapid: base.rapidMmMin >= goals.rapidMmMin,
    accel: base.accelMs2 >= goals.accelMs2,
  };
  const cheaper = allowed
    .filter(
      (x) =>
        x.dCost < -1 &&
        !x.priceUnknown &&
        (!baseMeets.deflection || x.quick.deflectionUm <= goals.deflectionUm) &&
        (!baseMeets.rapid || x.quick.rapidMmMin >= goals.rapidMmMin) &&
        (!baseMeets.accel || x.quick.accelMs2 >= goals.accelMs2) &&
        x.quick.deflectionUm <= base.deflectionUm * 1.1,
    )
    .sort((a, b) => a.dCost - b.dCost);

  return { all: s, stiffer, faster, cheaper, meetsGoals: (q: Quick) => meets(q, goals) };
}
