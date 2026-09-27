import type { Bom } from "./bom";
import type { Machine } from "./document";
import { AXES, type ModeSummary, type Performance } from "./simulate";

// What the builder needs the machine to do, as opposed to how it is built.
// The work envelope lives in the machine document (it is both); everything
// else here sets targets that a design either meets or misses.

export type Material = "wood" | "aluminium" | "steel";
export type Pace = "hobby" | "standard" | "production";

export interface Requirements {
  material: Material;
  /** Cap on the priced parts total (USD). */
  budget: number;
  pace: Pace;
  /** Whether the builder can weld; welded frames are ruled out otherwise. */
  weld: boolean;
}

export const defaultRequirements: Requirements = { material: "aluminium", budget: 3000, pace: "standard", weld: false };

/**
 * Design load and stiffness target per material, for a ¼" (6 mm) two-flute
 * cutter. Peak force is specific cutting force × chip thickness × depth:
 *   wood / plastics  Kc ≈ 60 N/mm²,   h 0.20 mm, ap 6 mm  → ≈ 70 N
 *   aluminium 6061   Kc ≈ 700 N/mm²,  h 0.05 mm, ap 3 mm  → ≈ 105 N
 *   mild steel       Kc ≈ 2000 N/mm², h 0.03 mm, ap 2 mm  → ≈ 120 N
 * then 1.5–2× for engagement spikes and dull tools. The deflection target is
 * about one chip thickness, the point where the cutter starts to rub and
 * chatter instead of cutting (looser for wood, where finish rules first).
 */
export const MATERIALS: Record<Material, { label: string; cutN: number; deflectionUm: number; minModeHz: number; blurb: string }> = {
  wood: { label: "Wood", cutN: 100, deflectionUm: 120, minModeHz: 20, blurb: "Sheet goods, hardwood, acrylic, HDPE" },
  aluminium: { label: "Aluminium", cutN: 150, deflectionUm: 50, minModeHz: 30, blurb: "6061 plate and extrusion, brass, plus everything softer" },
  steel: { label: "Steel", cutN: 250, deflectionUm: 25, minModeHz: 40, blurb: "Light passes in mild steel, plus everything softer" },
};

/** Rapid and acceleration floors for the X and Y axes. */
export const PACES: Record<Pace, { label: string; rapidMmMin: number; accelMs2: number; blurb: string }> = {
  hobby: { label: "Hobby", rapidMmMin: 2500, accelMs2: 0.5, blurb: "Speed is not the point" },
  standard: { label: "Standard", rapidMmMin: 5000, accelMs2: 1, blurb: "Comfortable for 3D carving and profiling" },
  production: { label: "Production", rapidMmMin: 10000, accelMs2: 2.5, blurb: "Short cycle times on sheet parts" },
};

export const loadFor = (r: Requirements) => MATERIALS[r.material].cutN;

// ------------------------------------------------------------ URL form

const MAT = Object.keys(MATERIALS) as Material[];
const PACE = Object.keys(PACES) as Pace[];
export const BUDGET = { min: 300, max: 20000, step: 50 };

export function parseRequirements(text: string): Requirements {
  const p = new URLSearchParams(text.replace(/^#/, ""));
  const r = { ...defaultRequirements };
  const material = p.get("req.material");
  if (material && (MAT as string[]).includes(material)) r.material = material as Material;
  const pace = p.get("req.pace");
  if (pace && (PACE as string[]).includes(pace)) r.pace = pace as Pace;
  const budget = Number(p.get("req.budget"));
  if (p.has("req.budget") && Number.isFinite(budget) && budget >= BUDGET.min && budget <= BUDGET.max) r.budget = budget;
  if (p.has("req.weld")) r.weld = p.get("req.weld") === "1";
  return r;
}

export const formatRequirements = (r: Requirements) =>
  new URLSearchParams({ "req.material": r.material, "req.budget": String(r.budget), "req.pace": r.pace, "req.weld": r.weld ? "1" : "0" }).toString();

// ------------------------------------------------------------ scoring

export interface Target {
  key: "deflection" | "mode" | "rapid" | "accel" | "budget" | "fabrication";
  label: string;
  /** Measured value and target, as display strings. */
  value: string;
  target: string;
  pass: boolean;
  /** Signed headroom as a fraction of the target: positive passes. */
  margin: number;
  /** What sets the value, or what to change when it misses. */
  hint: string;
}

export interface ScoreInput {
  machine: Machine;
  perf: Performance;
  modes: ModeSummary[];
  bom: Bom;
}

/** Every requirement, measured against the design. */
export function score(req: Requirements, { machine, perf, modes, bom }: ScoreInput): Target[] {
  const mat = MATERIALS[req.material];
  const pace = PACES[req.pace];
  const worst = AXES.reduce((a, b) => (perf.deflection[b] > perf.deflection[a] ? b : a));
  const w = perf.deflection[worst];
  const soft = perf.budget[worst][0];
  const f1 = modes[0]?.hz ?? 0;
  const planar = ["x", "y"] as const;
  const slow = planar.reduce((a, b) => (perf.motion[b].rapidMmMin < perf.motion[a].rapidMmMin ? b : a));
  const lazy = planar.reduce((a, b) => (perf.motion[b].accelMs2 < perf.motion[a].accelMs2 ? b : a));
  const welded = machine.frame.joinery === "welded";

  return [
    {
      key: "deflection",
      label: "Tool deflection",
      value: `${Math.round(w)} µm`,
      target: `≤ ${mat.deflectionUm} µm`,
      pass: w <= mat.deflectionUm,
      margin: (mat.deflectionUm - w) / mat.deflectionUm,
      hint: `${worst.toUpperCase()} at ${mat.cutN} N${soft ? `; ${soft.name} ${Math.round(soft.share * 100)} %` : ""}`,
    },
    {
      key: "mode",
      label: "First mode",
      value: `${f1.toFixed(1)} Hz`,
      target: `≥ ${mat.minModeHz} Hz`,
      pass: f1 >= mat.minModeHz,
      margin: (f1 - mat.minModeHz) / mat.minModeHz,
      hint: modes[0]?.budget[0] ? `${modes[0].budget[0].name} ${Math.round(modes[0].budget[0].share * 100)} % of the strain energy` : "",
    },
    {
      key: "rapid",
      label: "Rapids",
      value: `${(perf.motion[slow].rapidMmMin / 1000).toFixed(1)} m/min`,
      target: `≥ ${pace.rapidMmMin / 1000} m/min`,
      pass: perf.motion[slow].rapidMmMin >= pace.rapidMmMin,
      margin: (perf.motion[slow].rapidMmMin - pace.rapidMmMin) / pace.rapidMmMin,
      hint: `${slow.toUpperCase()}: ${perf.motion[slow].limitedBy}`,
    },
    {
      key: "accel",
      label: "Acceleration",
      value: `${perf.motion[lazy].accelMs2.toFixed(2)} m/s²`,
      target: `≥ ${pace.accelMs2} m/s²`,
      pass: perf.motion[lazy].accelMs2 >= pace.accelMs2,
      margin: (perf.motion[lazy].accelMs2 - pace.accelMs2) / pace.accelMs2,
      hint: `${lazy.toUpperCase()} moves ${perf.motion[lazy].movingKg.toFixed(1)} kg`,
    },
    {
      key: "budget",
      label: "Parts cost",
      value: `$${Math.round(bom.total).toLocaleString("en-US")}`,
      target: `≤ $${req.budget.toLocaleString("en-US")}`,
      pass: bom.total <= req.budget,
      margin: (req.budget - bom.total) / req.budget,
      hint: bom.unpriced ? `a floor: ${bom.unpriced} lines unpriced` : "every line priced",
    },
    {
      key: "fabrication",
      label: "Fabrication",
      value: welded ? "welded frame" : "bolted frame",
      target: req.weld ? "welding available" : "no welding",
      pass: req.weld || !welded,
      margin: req.weld || !welded ? 1 : -1,
      hint: welded && !req.weld ? "switch the base to plates or brackets" : "",
    },
  ];
}
