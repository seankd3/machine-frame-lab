import { generalizedEigen } from "../model/eigen";
import { reverseCuthillMcKee, Skyline } from "./skyline";

// 3D frame finite elements: 6 DOF per node (ux uy uz rx ry rz), Euler-Bernoulli
// beams with torsion, 6-DOF springs between nodes (bolted joints, rail
// carriages, drives), point masses, and fixed DOFs. SI units throughout.

export type Vec3 = [number, number, number];

export interface BeamSection {
  e: number; // Pa
  g: number; // Pa
  a: number; // m²
  /** Resists deflection sideways (local z = axis × up). */
  iy: number; // m⁴
  /** Resists deflection toward the beam's up vector (local y). */
  iz: number; // m⁴
  j: number; // m⁴ torsion constant
  massPerLength: number; // kg/m
}

export interface Beam {
  a: number;
  b: number;
  section: BeamSection;
  /** Any vector not parallel to the beam; local y is its component normal to the axis. */
  up: Vec3;
  tag: string;
}

export interface Spring {
  a: number;
  b: number;
  /** Translational then rotational stiffness in global axes (N/m, N·m/rad). */
  k: [number, number, number, number, number, number];
  tag: string;
}

export interface Frame {
  nodes: Vec3[];
  beams: Beam[];
  springs: Spring[];
  masses: Array<{ node: number; kg: number }>;
  /** Node → DOF indices (0–5) held at zero. */
  fixed: Map<number, number[]>;
}

export const emptyFrame = (): Frame => ({ nodes: [], beams: [], springs: [], masses: [], fixed: new Map() });

export interface Solved {
  frame: Frame;
  /** Equation number of each node DOF, −1 if fixed. */
  eq: Int32Array;
  k: Skyline;
  m: Skyline;
  factor: Skyline;
  /** Global stiffness of each beam, kept for strain-energy sums. */
  beamK: number[][][];
}

/** Numbers equations, assembles K and M, and factorises K. */
export function assemble(frame: Frame): Solved {
  const nodeCount = frame.nodes.length;
  const adjacency: number[][] = Array.from({ length: nodeCount }, () => []);
  const link = (a: number, b: number) => {
    if (a === b) return;
    adjacency[a].push(b);
    adjacency[b].push(a);
  };
  frame.beams.forEach((e) => link(e.a, e.b));
  frame.springs.forEach((s) => link(s.a, s.b));

  const order = reverseCuthillMcKee(adjacency);
  const eq = new Int32Array(nodeCount * 6).fill(-1);
  let count = 0;
  for (const node of order) {
    const held = frame.fixed.get(node) ?? [];
    for (let d = 0; d < 6; d++) if (!held.includes(d)) eq[node * 6 + d] = count++;
  }

  // Skyline profile: lowest coupled equation for every equation.
  const first = new Int32Array(count);
  for (let i = 0; i < count; i++) first[i] = i;
  const couple = (nodes: number[]) => {
    const eqs = nodes.flatMap((n) => Array.from({ length: 6 }, (_, d) => eq[n * 6 + d])).filter((e) => e >= 0);
    const low = Math.min(...eqs);
    for (const e of eqs) if (low < first[e]) first[e] = low;
  };
  frame.beams.forEach((e) => couple([e.a, e.b]));
  frame.springs.forEach((s) => couple([s.a, s.b]));

  const k = new Skyline(first);
  const m = Skyline.like(k);
  const scatter = (target: Skyline, nodes: number[], matrix: number[][]) => {
    const dofs = nodes.flatMap((n) => Array.from({ length: 6 }, (_, d) => eq[n * 6 + d]));
    for (let r = 0; r < dofs.length; r++) {
      if (dofs[r] < 0) continue;
      for (let c = r; c < dofs.length; c++) {
        if (dofs[c] >= 0 && matrix[r][c] !== 0) target.add(dofs[r], dofs[c], matrix[r][c]);
      }
    }
  };

  const beamK: number[][][] = [];
  for (const beam of frame.beams) {
    const { kg, mg } = beamMatrices(frame.nodes[beam.a], frame.nodes[beam.b], beam.section, beam.up);
    scatter(k, [beam.a, beam.b], kg);
    scatter(m, [beam.a, beam.b], mg);
    beamK.push(kg);
  }
  for (const spring of frame.springs) {
    const ks: number[][] = Array.from({ length: 12 }, () => new Array(12).fill(0));
    spring.k.forEach((v, d) => {
      ks[d][d] = v;
      ks[d + 6][d + 6] = v;
      ks[d][d + 6] = -v;
      ks[d + 6][d] = -v;
    });
    scatter(k, [spring.a, spring.b], ks);
  }
  for (const { node, kg } of frame.masses) {
    for (let d = 0; d < 3; d++) {
      const e = eq[node * 6 + d];
      if (e >= 0) m.add(e, e, kg);
    }
  }

  const factor = new Skyline(first);
  k.cols.forEach((col, j) => factor.cols[j].set(col));
  factor.factor();
  return { frame, eq, k, m, factor, beamK };
}

/** Displacement of every node DOF (length nodes × 6) under nodal loads. */
export function solveStatic(solved: Solved, loads: Array<{ node: number; f: [number, number, number, number, number, number] }>) {
  const rhs = new Float64Array(solved.factor.n);
  for (const load of loads) {
    load.f.forEach((v, d) => {
      const e = solved.eq[load.node * 6 + d];
      if (e >= 0) rhs[e] += v;
    });
  }
  return expand(solved, solved.factor.solve(rhs));
}

export interface FrameMode {
  hz: number;
  /** Node DOF shape (nodes × 6), mass-normalised. */
  shape: Float64Array;
}

/** Lowest modes by subspace iteration on K φ = ω² M φ. */
export function solveModes(solved: Solved, count: number, iterations = 40): FrameMode[] {
  const n = solved.factor.n;
  const q = Math.min(n, Math.max(2 * count, count + 8));
  // Start vectors: M's diagonal plus seeded random vectors, so no mode family
  // is left out of the starting subspace.
  let seed = 12345;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  let x: Float64Array[] = Array.from({ length: q }, (_, c) => {
    const v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = c === 0 ? solved.m.get(i, i) : random();
    return v;
  });

  let values: number[] = [];
  let previous: number[] = [];
  for (let it = 0; it < iterations; it++) {
    const y = x.map((v) => solved.factor.solve(solved.m.multiply(v)));
    const ky = y.map((v) => solved.k.multiply(v));
    const my = y.map((v) => solved.m.multiply(v));
    const kr = y.map((a) => ky.map((b) => dot(a, b)));
    const mr = y.map((a) => my.map((b) => dot(a, b)));
    symmetrise(kr);
    symmetrise(mr);
    const eig = generalizedEigen(kr, mr);
    values = eig.values;
    x = eig.vectors.map((coeffs) => {
      const v = new Float64Array(n);
      coeffs.forEach((c, i) => {
        const yi = y[i];
        for (let r = 0; r < n; r++) v[r] += c * yi[r];
      });
      return v;
    });
    const converged = previous.length && values.slice(0, count).every((v, i) => Math.abs(v - previous[i]) <= 1e-8 * v);
    previous = values;
    if (converged) break;
  }

  return values.slice(0, count).map((lambda, i) => ({
    hz: Math.sqrt(Math.max(lambda, 0)) / (2 * Math.PI),
    shape: expand(solved, x[i]),
  }));
}

/**
 * Lowest natural frequency alone, by inverse iteration with a Rayleigh
 * quotient. It reuses the factorised K, so it costs a few back-substitutions
 * rather than a subspace solve. When the two lowest modes are close, the
 * quotient settles between them, so its error is bounded by their gap.
 */
export function firstModeHz(solved: Solved, iterations = 14): number {
  const n = solved.factor.n;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = solved.m.get(i, i) * (1 + 0.1 * Math.sin(i));
  let mx = solved.m.multiply(x);
  let lambda = Infinity;
  for (let it = 0; it < iterations; it++) {
    // y = K⁻¹Mx, so Ky = Mx and the quotient yᵀKy / yᵀMy needs no K product.
    const y = solved.factor.solve(mx);
    const my = solved.m.multiply(y);
    const lam = dot(y, mx) / dot(y, my);
    let norm = 0;
    for (let i = 0; i < n; i++) norm = Math.max(norm, Math.abs(y[i]));
    for (let i = 0; i < n; i++) my[i] /= norm;
    mx = my;
    const done = Math.abs(lambda - lam) <= 1e-5 * lam;
    lambda = lam;
    if (done) break;
  }
  return Math.sqrt(Math.max(lambda, 0)) / (2 * Math.PI);
}

function expand(solved: Solved, reduced: Float64Array) {
  const full = new Float64Array(solved.eq.length);
  solved.eq.forEach((e, i) => {
    if (e >= 0) full[i] = reduced[e];
  });
  return full;
}

const dot = (a: Float64Array, b: Float64Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

function symmetrise(a: number[][]) {
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const v = (a[i][j] + a[j][i]) / 2;
      a[i][j] = v;
      a[j][i] = v;
    }
  }
}

/** Global 12×12 stiffness and consistent mass of one beam. */
export function beamMatrices(p: Vec3, q: Vec3, s: BeamSection, up: Vec3) {
  const d: Vec3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const l = Math.hypot(...d);
  const ex = d.map((v) => v / l) as Vec3;
  let ey = sub(up, scale(ex, dotv(up, ex)));
  if (Math.hypot(...ey) < 1e-9 * Math.hypot(...up)) ey = sub([0, 0, 1], scale(ex, ex[2]));
  if (Math.hypot(...ey) < 1e-9) ey = sub([0, 1, 0], scale(ex, ex[1]));
  ey = scale(ey, 1 / Math.hypot(...ey));
  const ez = cross(ex, ey);
  const lambda = [ex, ey, ez];

  const kl = localStiffness(s, l);
  const ml = localMass(s, l);
  const t = (matrix: number[][]) => {
    // Tᵀ A T with T = diag(λ, λ, λ, λ), done block by block.
    const out: number[][] = Array.from({ length: 12 }, () => new Array(12).fill(0));
    for (let bi = 0; bi < 4; bi++) {
      for (let bj = 0; bj < 4; bj++) {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            let sum = 0;
            for (let a = 0; a < 3; a++) {
              const la = lambda[a][i];
              if (la === 0) continue;
              for (let b = 0; b < 3; b++) sum += la * matrix[bi * 3 + a][bj * 3 + b] * lambda[b][j];
            }
            out[bi * 3 + i][bj * 3 + j] = sum;
          }
        }
      }
    }
    return out;
  };
  return { kg: t(kl), mg: t(ml), length: l, axes: lambda };
}

function localStiffness(s: BeamSection, l: number) {
  const k: number[][] = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const set = (i: number, j: number, v: number) => {
    k[i][j] = v;
    k[j][i] = v;
  };
  const ea = (s.e * s.a) / l;
  const gj = (s.g * s.j) / l;
  set(0, 0, ea); set(6, 6, ea); set(0, 6, -ea);
  set(3, 3, gj); set(9, 9, gj); set(3, 9, -gj);
  // Bending in local x-y (about z): v = 1, 7; θz = 5, 11.
  const z = (s.e * s.iz) / l ** 3;
  set(1, 1, 12 * z); set(7, 7, 12 * z); set(1, 7, -12 * z);
  set(1, 5, 6 * l * z); set(1, 11, 6 * l * z); set(7, 5, -6 * l * z); set(7, 11, -6 * l * z);
  set(5, 5, 4 * l * l * z); set(11, 11, 4 * l * l * z); set(5, 11, 2 * l * l * z);
  // Bending in local x-z (about y): w = 2, 8; θy = 4, 10 (sign flips).
  const y = (s.e * s.iy) / l ** 3;
  set(2, 2, 12 * y); set(8, 8, 12 * y); set(2, 8, -12 * y);
  set(2, 4, -6 * l * y); set(2, 10, -6 * l * y); set(8, 4, 6 * l * y); set(8, 10, 6 * l * y);
  set(4, 4, 4 * l * l * y); set(10, 10, 4 * l * l * y); set(4, 10, 2 * l * l * y);
  return k;
}

function localMass(s: BeamSection, l: number) {
  const m: number[][] = Array.from({ length: 12 }, () => new Array(12).fill(0));
  const set = (i: number, j: number, v: number) => {
    m[i][j] = v;
    m[j][i] = v;
  };
  const c = s.massPerLength * l;
  set(0, 0, c / 3); set(6, 6, c / 3); set(0, 6, c / 6);
  const polar = (c * (s.iy + s.iz)) / Math.max(s.a, 1e-12);
  set(3, 3, polar / 3); set(9, 9, polar / 3); set(3, 9, polar / 6);
  const b = c / 420;
  // x-y plane
  set(1, 1, 156 * b); set(7, 7, 156 * b); set(1, 7, 54 * b);
  set(1, 5, 22 * l * b); set(1, 11, -13 * l * b); set(7, 5, 13 * l * b); set(7, 11, -22 * l * b);
  set(5, 5, 4 * l * l * b); set(11, 11, 4 * l * l * b); set(5, 11, -3 * l * l * b);
  // x-z plane (rotation sign flips)
  set(2, 2, 156 * b); set(8, 8, 156 * b); set(2, 8, 54 * b);
  set(2, 4, -22 * l * b); set(2, 10, 13 * l * b); set(8, 4, -13 * l * b); set(8, 10, 22 * l * b);
  set(4, 4, 4 * l * l * b); set(10, 10, 4 * l * l * b); set(4, 10, -3 * l * l * b);
  return m;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dotv = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
