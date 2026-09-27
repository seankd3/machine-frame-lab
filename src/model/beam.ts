import { cholesky, choleskySolve, generalizedEigen, zeros } from "./eigen";

export type Support = "fixed" | "pinned" | "cantilever";

export interface BeamInput {
  lengthM: number;
  eiNm2: number;
  massKgM: number;
  /** Tool / carriage station as a fraction of the span, 0 = first support. */
  station: number;
  /** Carriage mass lumped at the station. */
  pointMassKg: number;
  support: Support;
}

export interface Mode {
  hz: number;
  /** Lateral displacement at every node, scaled so the largest magnitude is 1. */
  shape: number[];
  /** Mass-normalized displacement at the tool station (units 1/√kg). */
  atTool: number;
}

export interface Beam {
  /** Node positions as fractions of the span. */
  x: number[];
  /** Static deflection per newton at the tool station (m/N). */
  compliance: number;
  /** Static deflected shape under 1 N at the tool station (m). */
  staticShape: number[];
  modes: Mode[];
}

const ELEMENTS = 16;

/**
 * Euler-Bernoulli beam FE model: static compliance at the tool and all bending
 * modes, with the carriage as a point mass on a node placed exactly at the tool.
 */
export function solveBeam(input: BeamInput): Beam {
  const x = mesh(input.station);
  const nodes = x.length;
  const dofs = nodes * 2;
  const k = zeros(dofs);
  const m = zeros(dofs);

  for (let e = 0; e < nodes - 1; e++) {
    const le = (x[e + 1] - x[e]) * input.lengthM;
    const ke = elementStiffness(input.eiNm2, le);
    const me = elementMass(input.massKgM, le);
    const map = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        k[map[i]][map[j]] += ke[i][j];
        m[map[i]][map[j]] += me[i][j];
      }
    }
  }

  const tool = x.indexOf(input.station);
  m[2 * tool][2 * tool] += input.pointMassKg;

  const free = freeDofs(dofs, input.support);
  const kr = free.map((r) => free.map((c) => k[r][c]));
  const mr = free.map((r) => free.map((c) => m[r][c]));
  const toolDof = free.indexOf(2 * tool);

  const load = free.map((_, i) => (i === toolDof ? 1 : 0));
  const u = choleskySolve(cholesky(kr), load);
  const expand = (reduced: number[]) => {
    const full = new Array<number>(dofs).fill(0);
    free.forEach((dof, i) => (full[dof] = reduced[i]));
    return Array.from({ length: nodes }, (_, n) => full[2 * n]);
  };

  const { values, vectors } = generalizedEigen(kr, mr);
  const modes = values.map((lambda, i) => {
    const w = expand(vectors[i]);
    const peak = w.reduce((best, value) => (Math.abs(value) > Math.abs(best) ? value : best), 0);
    return {
      hz: Math.sqrt(Math.max(lambda, 0)) / (2 * Math.PI),
      shape: w.map((value) => value / (peak || 1)),
      atTool: toolDof >= 0 ? vectors[i][toolDof] : 0,
    };
  });

  return { x, compliance: toolDof >= 0 ? u[toolDof] : 0, staticShape: expand(u), modes };
}

/**
 * Tool-point receptance magnitude |H(f)| in m/N by modal superposition over
 * every mode, with the same viscous damping ratio on each. |H(0)| equals the
 * static compliance because the modal set is complete.
 */
export function receptance(beam: Beam, hz: number, dampingRatio: number) {
  const omega = 2 * Math.PI * hz;
  let re = 0;
  let im = 0;
  for (const mode of beam.modes) {
    const wr = 2 * Math.PI * mode.hz;
    const a = wr * wr - omega * omega;
    const b = 2 * dampingRatio * wr * omega;
    const gain = (mode.atTool * mode.atTool) / (a * a + b * b);
    re += gain * a;
    im -= gain * b;
  }
  return Math.hypot(re, im);
}

function mesh(station: number) {
  const grid = Array.from({ length: ELEMENTS + 1 }, (_, i) => i / ELEMENTS);
  const nearest = grid.reduce((best, value) =>
    Math.abs(value - station) < Math.abs(best - station) ? value : best,
  );
  if (Math.abs(nearest - station) < 0.25 / ELEMENTS) {
    grid[grid.indexOf(nearest)] = station;
    return grid;
  }
  return [...grid, station].sort((a, b) => a - b);
}

function freeDofs(count: number, support: Support) {
  const last = count - 2;
  const fixed: Record<Support, number[]> = {
    pinned: [0, last],
    fixed: [0, 1, last, last + 1],
    cantilever: [0, 1],
  };
  return Array.from({ length: count }, (_, i) => i).filter((i) => !fixed[support].includes(i));
}

function elementStiffness(ei: number, l: number) {
  const c = ei / l ** 3;
  return [
    [12, 6 * l, -12, 6 * l],
    [6 * l, 4 * l * l, -6 * l, 2 * l * l],
    [-12, -6 * l, 12, -6 * l],
    [6 * l, 2 * l * l, -6 * l, 4 * l * l],
  ].map((row) => row.map((v) => v * c));
}

function elementMass(massKgM: number, l: number) {
  const c = (massKgM * l) / 420;
  return [
    [156, 22 * l, 54, -13 * l],
    [22 * l, 4 * l * l, 13 * l, -3 * l * l],
    [54, 13 * l, 156, -22 * l],
    [-13 * l, -3 * l * l, -22 * l, 4 * l * l],
  ].map((row) => row.map((v) => v * c));
}
