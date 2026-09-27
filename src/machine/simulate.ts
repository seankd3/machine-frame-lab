import type { Drive, Motor } from "../catalog/motion";
import { assemble, beamMatrices, solveModes, solveStatic, type FrameMode, type Solved } from "../fea/frame";
import type { Axis } from "./assembly";
import type { Compiled } from "./compile";

// What a compiled machine does: how far the tool moves under load and why,
// how fast and hard each axis can move, and what it all costs.

export const AXES: Axis[] = ["x", "y", "z"];

/** Subsystem a beam or spring tag belongs to, for the compliance budget. */
const SUBSYSTEM: Record<string, string> = {
  base: "Base frame",
  "joint-brackets": "Base joints",
  "joint-plates": "Base joints",
  "joint-welded": "Base joints",
  gantry: "Gantry side plates",
  "upright-foot": "Gantry side plates",
  beam: "Gantry beam",
  "beam-upright": "Beam-to-side joints",
  zplate: "Z plates",
  splate: "Z plates",
  weld: "Z plates",
  spindle: "Spindle & mount",
  "carriage-x": "X carriages",
  "carriage-y": "Y carriages",
  "carriage-z": "Z carriages",
  "drive-x": "X drive",
  "drive-y": "Y drive",
  "drive-z": "Z drive",
  rail: "Rails",
};

export interface AxisMotion {
  movingKg: number;
  /** Peak linear force from the motors at low speed (N). */
  forceN: number;
  accelMs2: number;
  /** Rapid limit and what sets it. */
  rapidMmMin: number;
  limitedBy: string;
}

export interface Performance {
  /** Tool-point stiffness per direction (N/µm). */
  stiffness: Record<Axis, number>;
  /** Tool deflection under the design cutting force in each direction (µm). */
  deflection: Record<Axis, number>;
  /** Share of tool compliance per subsystem, largest first, per direction. */
  budget: Record<Axis, Array<{ name: string; share: number }>>;
  motion: Record<Axis, AxisMotion>;
  massKg: number;
}

export function solve(c: Compiled) {
  return assemble(c.asm.frame);
}

export function performance(c: Compiled, solved: Solved = solve(c)): Performance {
  const tool = c.asm.marks.get("tool")!;
  const stiffness = {} as Record<Axis, number>;
  const deflection = {} as Record<Axis, number>;
  const budget = {} as Record<Axis, Array<{ name: string; share: number }>>;
  AXES.forEach((axis, d) => {
    const f: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    f[d] = 1;
    const u = solveStatic(solved, [{ node: tool, f }]);
    const compliance = u[tool * 6 + d];
    stiffness[axis] = 1 / compliance / 1e6;
    deflection[axis] = c.machine.cutN * compliance * 1e6;
    budget[axis] = energyBudget(c, u);
  });
  const motion = {} as Record<Axis, AxisMotion>;
  for (const axis of AXES) motion[axis] = axisMotion(c, axis);
  return { stiffness, deflection, budget, motion, massKg: c.asm.parts.reduce((s, p) => s + p.massKg, 0) };
}

export function modes(c: Compiled, solved: Solved = solve(c), count = 4): FrameMode[] {
  return solveModes(solved, count, 30);
}

/**
 * Strain energy per subsystem under a unit tool load. Energy ½uᵀKu equals
 * ½·compliance, so each subsystem's share is its share of the deflection.
 */
function energyBudget(c: Compiled, u: Float64Array) {
  const { frame } = c.asm;
  const totals = new Map<string, number>();
  const bump = (tag: string, e: number) => {
    const name = SUBSYSTEM[tag] ?? tag;
    if (tag === "rigid") return;
    totals.set(name, (totals.get(name) ?? 0) + e);
  };
  for (const b of frame.beams) {
    if (b.tag === "rigid") continue;
    const { kg } = beamMatrices(frame.nodes[b.a], frame.nodes[b.b], b.section, b.up);
    const ue = [...u.subarray(b.a * 6, b.a * 6 + 6), ...u.subarray(b.b * 6, b.b * 6 + 6)];
    let e = 0;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) e += ue[i] * kg[i][j] * ue[j];
    bump(b.tag, e / 2);
  }
  for (const s of frame.springs) {
    let e = 0;
    for (let d = 0; d < 6; d++) e += s.k[d] * (u[s.a * 6 + d] - u[s.b * 6 + d]) ** 2;
    bump(s.tag, e / 2);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([name, e]) => ({ name, share: e / sum }))
    .filter((x) => x.share > 0.005)
    .sort((a, b) => b.share - a.share);
}

/** Torque available at a motor speed, interpolated along the pull-out curve. */
export function torqueAt(motor: Motor, rpm: number) {
  const pts = motor.curve;
  if (rpm <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (rpm <= pts[i][0]) {
      const [r0, t0] = pts[i - 1];
      const [r1, t1] = pts[i];
      return t0 + ((t1 - t0) * (rpm - r0)) / (r1 - r0);
    }
  }
  // Past the published curve: taper to zero over another 50 % of its range.
  const [rl, tl] = pts[pts.length - 1];
  return Math.max(0, tl * (1 - (rpm - rl) / (rl * 0.5)));
}

/** Millimetres of travel per motor revolution. */
const travelPerRev = (drive: Drive) => (drive.kind === "ballscrew" ? drive.leadMm : drive.pitchMm * drive.pulleyTeeth);

function axisMotion(c: Compiled, axis: Axis): AxisMotion {
  const { r, d } = c;
  const drive = axis === "x" ? r.dx : axis === "y" ? r.dy : r.dz;
  const motor = axis === "x" ? r.mx : axis === "y" ? r.my : r.mz;
  const motors = axis === "y" ? 2 : 1;
  const movingKg = c.asm.parts.filter((p) => p.rides.includes(axis)).reduce((s, p) => s + p.massKg, 0);
  const perRev = travelPerRev(drive) / 1000; // m/rev
  const efficiency = drive.kind === "ballscrew" ? 0.9 : 0.95;

  // Reflected rotor (and screw) inertia as an equivalent linear mass.
  const screwLen = axis === "x" ? d.beamLen : axis === "y" ? d.baseL : d.zp1 - d.zp0;
  const screwJ = drive.kind === "ballscrew" ? 0.5 * (7850 * Math.PI * (drive.diameterMm / 2000) ** 2 * (screwLen / 1000)) * (drive.diameterMm / 2000) ** 2 : 0;
  const reflected = ((motor.rotorKgM2 + screwJ) * motors * (2 * Math.PI / perRev) ** 2);
  const gravity = axis === "z" ? movingKg * 9.81 : 0;

  const force = (rpm: number) => (motors * torqueAt(motor, rpm) * 2 * Math.PI * efficiency) / perRev - gravity;
  const forceN = force(150);
  const accelMs2 = Math.max(0, forceN / (movingKg + reflected));

  // Rapid limit: the motor's usable speed (a third of low-speed thrust left
  // for acceleration), screw whip, and ball-nut DN.
  let motorRpm = 60;
  while (motorRpm < 3000 && force(motorRpm + 30) > forceN / 3) motorRpm += 30;
  const limits: Array<[number, string]> = [[motorRpm * perRev * 1000, "motor torque"]];
  if (drive.kind === "ballscrew") {
    const critical = 0.8 * 2.71e8 * 0.689 * drive.rootMm / screwLen ** 2;
    limits.push([critical * drive.leadMm, `${drive.id} whip at ${Math.round(critical)} rpm`]);
    limits.push([(70000 / drive.diameterMm) * drive.leadMm, "ball-nut speed (DN 70,000)"]);
  }
  const [rapid, limitedBy] = limits.reduce((a, b) => (b[0] < a[0] ? b : a));
  return { movingKg, forceN, accelMs2, rapidMmMin: rapid, limitedBy };
}
