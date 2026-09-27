import type { Item } from "../catalog/types";
import { emptyFrame, type BeamSection, type Frame, type Vec3 } from "../fea/frame";
import type { Piece } from "../geometry/parts";

// The compile target. Layout code places parts and, in the same calls, builds
// the FE model; nothing downstream re-derives geometry, so the 3D view, the
// bill of materials and the physics describe one machine.

export type Group = "Base" | "Y axis" | "Gantry" | "X axis" | "Z axis" | "Spindle" | "Electronics";
export type Axis = "x" | "y" | "z";

export interface Part {
  item: Item;
  /** Quantity in the item's unit: 1 per piece, or metres of stock. */
  qty: number;
  /** Geometry cache key; parts sharing it share GPU buffers. */
  shape: string;
  build: () => Piece[];
  /** Column-major 4×4 in millimetres. */
  matrix: number[];
  group: Group;
  label: string;
  /** Cut length for stock, mm. */
  cutMm?: number;
  /** Axes this part moves with, for jogging and for moving-mass sums. */
  rides: Axis[];
  massKg: number;
}

/** Orthonormal placement: length along `z`, profile up along `y`. */
export function place(at: Vec3, z: Vec3, y: Vec3, scaleZ = 1): number[] {
  const zn = norm(z);
  const yn = norm(sub(y, scale(zn, dot(y, zn))));
  const xn = cross(yn, zn);
  return [...xn, 0, ...yn, 0, ...scale(zn, scaleZ), 0, ...at, 1];
}

export const X: Vec3 = [1, 0, 0];
export const Y: Vec3 = [0, 1, 0];
export const Z: Vec3 = [0, 0, 1];
export const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

const RIGID: BeamSection = { e: 2e12, g: 8e11, a: 1e-2, iy: 1e-5, iz: 1e-5, j: 2e-5, massPerLength: 0 };

export class Assembly {
  parts: Part[] = [];
  frame: Frame = emptyFrame();
  /** Named nodes the analysis reads: tool tip, table under the tool, drive ends. */
  marks = new Map<string, number>();
  private members: Member[] = [];

  add(part: Omit<Part, "rides"> & { rides?: Axis[] }) {
    this.parts.push({ rides: [], ...part });
  }

  /** FE node at a point in millimetres. */
  node(p: Vec3) {
    this.frame.nodes.push([p[0] / 1000, p[1] / 1000, p[2] / 1000]);
    return this.frame.nodes.length - 1;
  }

  point(n: number): Vec3 {
    const [x, y, z] = this.frame.nodes[n];
    return [x * 1000, y * 1000, z * 1000];
  }

  beam(a: number, b: number, section: BeamSection, up: Vec3, tag: string) {
    this.frame.beams.push({ a, b, section, up, tag });
  }

  /** A stiff offset between two points of one body (plate to bolt line, rail to host). */
  rigid(a: number, b: number) {
    const [p, q] = [this.frame.nodes[a], this.frame.nodes[b]];
    const d = sub(q as Vec3, p as Vec3);
    const up: Vec3 = Math.abs(d[2]) < 0.9 * Math.hypot(...d) ? Z : X;
    this.frame.beams.push({ a, b, section: RIGID, up, tag: "rigid" });
  }

  /** Six-DOF spring between coincident nodes, stiffness in global axes. */
  spring(a: number, b: number, k: [number, number, number, number, number, number], tag: string) {
    this.frame.springs.push({ a, b, k, tag });
  }

  /** A second node on top of `n`, joined by the given spring. */
  hinge(n: number, k: [number, number, number, number, number, number], tag: string) {
    const m = this.node(this.point(n));
    this.spring(n, m, k, tag);
    return m;
  }

  mass(node: number, kg: number) {
    this.frame.masses.push({ node, kg });
  }

  fix(node: number, dofs: number[]) {
    this.frame.fixed.set(node, dofs);
  }

  /** A straight FE member; ask it for nodes at any station, then `finish`. */
  member(from: Vec3, to: Vec3, section: BeamSection, up: Vec3, tag: string) {
    const m = new Member(this, from, to, section, up, tag);
    this.members.push(m);
    return m;
  }

  finish() {
    this.members.forEach((m) => m.finish());
    return this;
  }
}

export class Member {
  private stations = new Map<number, number>();
  readonly length: number;
  readonly dir: Vec3;

  constructor(
    private owner: Assembly,
    readonly from: Vec3,
    readonly to: Vec3,
    readonly section: BeamSection,
    readonly up: Vec3,
    readonly tag: string,
  ) {
    const d = sub(to, from);
    this.length = Math.hypot(...d);
    this.dir = scale(d, 1 / this.length);
  }

  /** Node at distance s (mm) from `from`, created once. */
  at(s: number) {
    const key = Math.round(Math.min(this.length, Math.max(0, s)) * 10) / 10;
    let n = this.stations.get(key);
    if (n === undefined) {
      n = this.owner.node(add(this.from, scale(this.dir, key)));
      this.stations.set(key, n);
    }
    return n;
  }

  /** Node nearest to a point's projection on the member. */
  near(p: Vec3) {
    return this.at(dot(sub(p, this.from), this.dir));
  }

  finish(maxElement = 120) {
    this.at(0);
    this.at(this.length);
    const keys = [...this.stations.keys()].sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
      const gap = keys[i + 1] - keys[i];
      const pieces = Math.ceil(gap / maxElement);
      for (let k = 1; k < pieces; k++) this.at(keys[i] + (gap * k) / pieces);
    }
    const sorted = [...this.stations.entries()].sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < sorted.length - 1; i++) this.owner.beam(sorted[i][1], sorted[i + 1][1], this.section, this.up, this.tag);
  }
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));
