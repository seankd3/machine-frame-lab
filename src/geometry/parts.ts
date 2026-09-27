import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { circle, roundedRect, type Pt, type Section2D } from "./tslot";

// Procedural geometry for every catalogue part, in millimetres. Elongated parts
// run along local +Z from 0; profiles lie in local XY with +Y up. Each builder
// returns one merged geometry per material look, so a shape costs one draw
// call per look however many times it is placed.

export type Look =
  | "alu"
  | "aluMachined"
  | "aluBlack"
  | "steel"
  | "screw"
  | "oxide"
  | "socket"
  | "motor"
  | "plastic"
  | "seal"
  | "brass"
  | "mdf"
  | "paint"
  | "carbide"
  | "teal"
  | "rubber"
  | "label";

export type Piece = { geometry: THREE.BufferGeometry; look: Look };

type Parts = Partial<Record<Look, THREE.BufferGeometry[]>>;

function collect(parts: Parts): Piece[] {
  return Object.entries(parts)
    .filter(([, list]) => list && list.length)
    .map(([look, list]) => {
      const merged = list!.length === 1 ? list![0] : mergeGeometries(list!.map(normalise), false)!;
      merged.computeBoundingSphere();
      return { geometry: merged, look: look as Look };
    });
}

/** Mergeable: non-indexed, with position/normal/uv only. */
function normalise(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (!["position", "normal", "uv"].includes(name)) out.deleteAttribute(name);
  if (!out.attributes.uv) out.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((out.attributes.position.count) * 2), 2));
  return out;
}

const shapeOf = (outline: Pt[], holes: Pt[][] = []) => {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes = holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  return shape;
};

/** Prism of a section along +Z, `depth` long. */
export function prism(section: { outline: Pt[]; holes?: Pt[][] }, depth: number, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shapeOf(section.outline, section.holes), {
    depth: depth - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 8,
  });
  if (bevel) g.translate(0, 0, bevel);
  return g;
}

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z + d / 2);

/** Cylinder along +Z from z0. */
const cyl = (r: number, length: number, z0 = 0, segments = 32, x = 0, y = 0) =>
  new THREE.CylinderGeometry(r, r, length, segments).rotateX(Math.PI / 2).translate(x, y, z0 + length / 2);

/** Lathe of (radius, z) points around +Z. */
const lathe = (pts: Array<[number, number]>, segments = 32) =>
  new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), segments).rotateX(Math.PI / 2);

const hex = (acrossFlats: number, height: number, z0 = 0) =>
  new THREE.CylinderGeometry(acrossFlats / Math.sqrt(3), acrossFlats / Math.sqrt(3), height, 6).rotateX(Math.PI / 2).translate(0, 0, z0 + height / 2);

// ---------------------------------------------------------------- stock

/** Unit-length extruded member; instances scale Z to the cut length. */
export const memberGeometry = (section: Section2D, look: Look = "alu"): Piece[] => collect({ [look]: [prism(section, 1)] });

// ---------------------------------------------------------------- linear motion

export interface RailSize {
  widthMm: number;
  heightMm: number;
  pitchMm: number;
}

/** Profile rail cross-section with the two ball-track grooves per side. */
export function railSection({ widthMm: w, heightMm: h }: RailSize): Section2D {
  const g = Math.min(0.09 * w, 2.2);
  const side = (s: 1 | -1): Pt[] => {
    const pts: Pt[] = [
      [s * (w / 2), 0.08 * h],
      [s * (w / 2), 0.5 * h],
      [s * (w / 2 - g), 0.57 * h],
      [s * (w / 2 - g), 0.65 * h],
      [s * (w / 2), 0.72 * h],
      [s * (w / 2), 0.9 * h],
      [s * (w / 2 - 0.05 * w), h],
    ];
    return s === 1 ? pts : pts.reverse();
  };
  return {
    w,
    h,
    outline: [[-w / 2 + 0.05 * w, 0], [w / 2 - 0.05 * w, 0], ...side(1), ...side(-1)] as Pt[],
    holes: [],
  };
}

export function railGeometry(rail: RailSize, length: number): Piece[] {
  const holes: THREE.BufferGeometry[] = [];
  const count = Math.max(1, Math.floor((length - 20) / rail.pitchMm) + 1);
  const start = (length - (count - 1) * rail.pitchMm) / 2;
  const cb = Math.min(rail.widthMm * 0.42, 5.5);
  for (let i = 0; i < count; i++) {
    holes.push(cyl(cb, 0.3, 0, 20).rotateX(Math.PI / 2).translate(0, rail.heightMm, start + i * rail.pitchMm));
  }
  return collect({ steel: [prism(railSection(rail), length)], socket: holes });
}

export interface BlockSize {
  lengthMm: number;
  widthMm: number;
  /** Rail bottom to block top. */
  heightMm: number;
  railWidthMm: number;
  railHeightMm: number;
}

/** Carriage block centred on z = 0 along the rail, sitting on a rail whose bottom is y = 0. */
export function blockGeometry(b: BlockSize): Piece[] {
  const gap = Math.max(2.5, b.heightMm * 0.13);
  const channelW = b.railWidthMm + 1.2;
  const channelH = b.railHeightMm - gap + 0.6;
  const u = (w: number, top: number): Section2D => ({
    w,
    h: top,
    outline: [
      [-w / 2, gap],
      [-channelW / 2, gap],
      [-channelW / 2, gap + channelH],
      [channelW / 2, gap + channelH],
      [channelW / 2, gap],
      [w / 2, gap],
      [w / 2, top - 1],
      [w / 2 - 1, top],
      [-w / 2 + 1, top],
      [-w / 2, top - 1],
    ],
    holes: [],
  });
  const body = b.lengthMm * 0.66;
  const cap = (b.lengthMm - body) / 2;
  const steelBody = prism(u(b.widthMm, b.heightMm), body).translate(0, 0, -body / 2);
  const capA = prism(u(b.widthMm - 1.5, b.heightMm - 1.5), cap * 0.75).translate(0, 0, body / 2);
  const capB = prism(u(b.widthMm - 1.5, b.heightMm - 1.5), cap * 0.75).translate(0, 0, -body / 2 - cap * 0.75);
  const sealA = prism(u(b.widthMm - 1, b.heightMm - 1), cap * 0.25).translate(0, 0, body / 2 + cap * 0.75);
  const sealB = prism(u(b.widthMm - 1, b.heightMm - 1), cap * 0.25).translate(0, 0, -b.lengthMm / 2);
  const holes: THREE.BufferGeometry[] = [];
  const sx = b.widthMm * 0.36;
  const sz = body * 0.32;
  for (const x of [-sx, sx]) for (const z of [-sz, sz]) holes.push(cyl(b.widthMm * 0.06, 0.3, 0, 16).rotateX(Math.PI / 2).translate(x, b.heightMm + 0.3, z));
  const nipple = [
    hex(4, 3, 0).rotateX(0).translate(0, b.heightMm * 0.62, b.lengthMm / 2),
    cyl(1.6, 4, b.lengthMm / 2 + 3).translate(0, b.heightMm * 0.62, 0),
  ];
  return collect({ steel: [steelBody], plastic: [capA, capB], seal: [sealA, sealB], socket: holes, brass: nipple });
}

// ---------------------------------------------------------------- ball screw drive

export function screwGeometry(d: number, length: number): Piece[] {
  const journal = Math.min(40, length * 0.08);
  const core = cyl(d / 2, length - 2 * journal, journal, 28);
  const ends = [cyl(d * 0.38, journal, 0, 20), cyl(d * 0.38, journal, length - journal, 20)];
  const g = mergeGeometries([core, ...ends].map(normalise))!;
  // Thread texture coordinates: v runs along the screw in millimetres.
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, Math.atan2(pos.getY(i), pos.getX(i)) / (2 * Math.PI), pos.getZ(i));
  return collect({ screw: [g] });
}

/** Flanged ball nut in its aluminium housing, centred on z = 0. */
export function ballNutGeometry(d: number): Piece[] {
  const od = d * 1.75;
  const flange = cyl(od * 0.86, d * 0.6, -d * 1.4, 32);
  const body = cyl(od / 2, d * 2.4, -d * 1.2, 32);
  const housingW = od * 1.9;
  const housing = box(housingW, od * 1.35, d * 2.6, 0, od * 0.1, -d * 1.3);
  const bolts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    bolts.push(cyl(d * 0.14, 1.5, -d * 1.4 - 1.2, 12, Math.cos(a) * od * 0.68, Math.sin(a) * od * 0.68));
  }
  return collect({ steel: [flange, body], aluBlack: [housing], oxide: bolts });
}

/** BK (fixed) or BF (floating) end support, bore on z = 0 axis, foot at y = -centre. */
export function supportGeometry(d: number, fixed: boolean): Piece[] {
  const w = d * 5;
  const h = d * 3.6;
  const t = fixed ? d * 2.2 : d * 1.7;
  const centre = h * 0.55;
  const body = prism(
    {
      outline: [
        [-w / 2, -centre],
        [w / 2, -centre],
        [w / 2, -centre + h * 0.35],
        [d * 1.3, -centre + h * 0.45],
        [d * 1.3, h - centre - d * 0.4],
        [d * 0.9, h - centre],
        [-d * 0.9, h - centre],
        [-d * 1.3, h - centre - d * 0.4],
        [-d * 1.3, -centre + h * 0.45],
        [-w / 2, -centre + h * 0.35],
      ],
      holes: [circle(0, 0, d * 0.55, 24)],
    },
    t,
    0.5,
  ).translate(0, 0, -t / 2);
  const bearing = cyl(d * 0.55, t * 0.9, -t * 0.45, 24);
  const lock = fixed ? [cyl(d * 0.7, d * 0.5, t / 2, 6)] : [];
  return collect({ aluBlack: [body], steel: [bearing, ...lock] });
}

// ---------------------------------------------------------------- motors

export function motorGeometry(frame: number, length: number, shaft: number): Piece[] {
  const c = frame * 0.12;
  const square: Pt[] = [
    [-frame / 2 + c, -frame / 2],
    [frame / 2 - c, -frame / 2],
    [frame / 2, -frame / 2 + c],
    [frame / 2, frame / 2 - c],
    [frame / 2 - c, frame / 2],
    [-frame / 2 + c, frame / 2],
    [-frame / 2, frame / 2 - c],
    [-frame / 2, -frame / 2 + c],
  ];
  const holePitch = frame * 0.83;
  const holes = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => circle((sx * holePitch) / 2, (sy * holePitch) / 2, frame * 0.045, 12)));
  const flange = frame * 0.12;
  const front = prism({ outline: square, holes }, flange, 0.6).translate(0, 0, -flange);
  const stator = prism({ outline: square.map(([x, y]) => [x * 0.985, y * 0.985] as Pt) }, length - 2 * flange, 0.4).translate(0, 0, -length + flange);
  const rear = prism({ outline: square }, flange, 0.6).translate(0, 0, -length);
  const boss = cyl(frame * 0.33, 1.6, 0, 40);
  const shaftG = cyl(shaft / 2, frame * 0.37, 1.6, 20);
  const plug = box(frame * 0.3, frame * 0.2, frame * 0.18, 0, -frame / 2 - frame * 0.08, -length + flange);
  const screws = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => cyl(frame * 0.035, 1, -length - 0.8, 12, (sx * holePitch) / 2, (sy * holePitch) / 2)));
  return collect({ alu: [front, rear, boss], motor: [stator], steel: [shaftG], plastic: [plug], socket: screws });
}

export function couplerGeometry(d: number): Piece[] {
  const r = d * 0.8;
  const body = cyl(r, d * 3, 0, 32);
  const rings = [0.28, 0.45, 0.55, 0.72].map((f) => cyl(r + 0.05, 0.6, d * 3 * f, 32));
  const screws = [0.12, 0.88].map((f) => cyl(d * 0.14, r * 0.5, 0, 12).rotateY(Math.PI / 2).translate(r * 0.6, 0, d * 3 * f));
  return collect({ aluMachined: [body], socket: [...rings, ...screws] });
}

// ---------------------------------------------------------------- plates and brackets

/** Flat plate in local XY (w × h), t thick along +Z, with drilled holes. */
export function plateGeometry(w: number, h: number, t: number, holes: Array<[number, number, number]>, look: Look = "aluMachined"): Piece[] {
  const g = prism({ outline: roundedRect(w, h, Math.min(3, w / 10)), holes: holes.map(([x, y, d]) => circle(x, y, d / 2, 16)) }, t, 0.4);
  return collect({ [look]: [g] });
}

/** Two-leg corner gusset: legs along +Y and +Z from the corner, `width` across X. */
export function gussetGeometry(leg: number, width: number, t: number): Piece[] {
  const side = prism(
    {
      outline: [
        [0, 0],
        [leg, 0],
        [leg, t],
        [t * 1.6, t * 1.6],
        [t, leg],
        [0, leg],
      ],
    },
    width,
    0.3,
  )
    // Side profile drawn in (z, y); turn it so legs run along +Z and +Y.
    .rotateY(-Math.PI / 2)
    .translate(width / 2, 0, 0);
  const web = prism({ outline: [[t, t], [leg * 0.85, t], [t, leg * 0.85]] }, t * 0.8)
    .rotateY(-Math.PI / 2)
    .translate(t * 0.4, 0, 0);
  return collect({ alu: [side, web] });
}

// ---------------------------------------------------------------- fasteners

/** ISO 4762 socket head cap screw, head on z = 0 bearing face, shank along −Z. */
export function capScrewGeometry(d: number, length: number): Piece[] {
  const hd = 1.5 * d;
  const k = d;
  const head = lathe([
    [0, 0],
    [hd / 2, 0],
    [hd / 2, k * 0.9],
    [hd / 2 - k * 0.1, k],
    [0, k],
  ]);
  const shank = cyl(d / 2, length, -length, 16);
  const socket = hex(d * 0.75, 0.2, k + 0.01);
  return collect({ oxide: [head, shank], socket: [socket] });
}

/** ISO 7380 button head: the look of T-slot joinery. */
export function buttonHeadGeometry(d: number): Piece[] {
  const r = 0.95 * d;
  const k = 0.55 * d;
  const pts: Array<[number, number]> = [[0, 0], [r, 0]];
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([r * Math.cos(a), k * Math.sin(a) + 0.1]);
  }
  pts.push([0, k + 0.1]);
  const head = lathe(pts, 24);
  const socket = hex(d * 0.6, 0.2, k + 0.05);
  return collect({ oxide: [head], socket: [socket] });
}

// ---------------------------------------------------------------- spindles

export interface SpindleSize {
  kind: "spindle" | "router";
  diameterMm: number;
  lengthMm: number;
}

/** Spindle with collet and a 6 mm end mill; tool tip at z = 0, body upward. */
export function spindleGeometry(s: SpindleSize): Piece[] {
  const r = s.diameterMm / 2;
  const tool = [cyl(3, 38, 0, 16)];
  const flutes = cyl(3.05, 18, 0, 6);
  const nut = hex(s.diameterMm * 0.4, 12, 32);
  const nose = lathe([[s.diameterMm * 0.2, 44], [r * 0.7, 56], [r, 64], [0, 64]]);
  if (s.kind === "router") {
    const body = cyl(r, s.lengthMm * 0.55, 64, 40);
    const motor = lathe([[r, 64 + s.lengthMm * 0.55], [r * 1.12, 70 + s.lengthMm * 0.6], [r * 1.05, 64 + s.lengthMm], [0, 70 + s.lengthMm]], 40);
    const dial = cyl(r * 0.3, 6, 64 + s.lengthMm - 4, 24);
    return collect({ carbide: [flutes], steel: [...tool, nut], aluMachined: [body, nose], teal: [motor], plastic: [dial] });
  }
  const body = cyl(r, s.lengthMm, 64, 48);
  const cap = cyl(r * 0.98, 26, 64 + s.lengthMm, 48);
  const plug = cyl(9, 22, 0, 20).rotateY(Math.PI / 2).translate(r - 2, 0, 64 + s.lengthMm + 13);
  const fittings = [-0.25, 0.25].map((a) => cyl(3.5, 16, 0, 12).rotateY(Math.PI / 2).translate(r + 2, Math.sin(a) * r * 0.9, 64 + s.lengthMm - 30 - a * 40));
  const band = cyl(r + 0.2, 34, 64 + s.lengthMm * 0.45, 48);
  return collect({ carbide: [flutes], steel: [...tool, nut], aluMachined: [body, nose], aluBlack: [cap], plastic: [plug], brass: fittings, label: [band] });
}

/** Clamp mount for a round spindle: bore along Z, back face on y = 0, spanning −y. */
export function spindleMountGeometry(diameter: number): Piece[] {
  const w = diameter + 40;
  const depth = diameter / 2 + 30;
  const block = prism(
    {
      outline: [
        [-w / 2, 0],
        [w / 2, 0],
        [w / 2, -depth + 12],
        [w / 2 - 12, -depth],
        [-w / 2 + 12, -depth],
        [-w / 2, -depth + 12],
      ],
      holes: [circle(0, -(diameter / 2 + 12), diameter / 2, 48)],
    },
    60,
    0.6,
  );
  const clampScrews = [15, 45].map((z) => cyl(3, 10, 0, 12).rotateY(Math.PI / 2).translate(w / 2 - 4, -depth + 6, z));
  return collect({ aluBlack: [block], oxide: clampScrews });
}

// ---------------------------------------------------------------- sheets and boxes

export const sheetGeometry = (w: number, h: number, t: number, look: Look = "mdf"): Piece[] => collect({ [look]: [box(w, h, t)] });

export function enclosureGeometry(w: number, h: number, d: number): Piece[] {
  const shell = prism({ outline: roundedRect(w, h, 6) }, d, 1.5);
  const panel = box(w * 0.5, h * 0.18, 0.4, -w * 0.1, h * 0.2, d);
  const leds = [0, 1, 2].map((i) => cyl(1.6, 0.8, d, 12, w * 0.25 + i * 7, h * 0.2));
  return collect({ paint: [shell], label: [panel], brass: leds });
}

/** Levelling foot: threaded stud up +Z from a rubber pad. */
export function footGeometry(d: number): Piece[] {
  const pad = cyl(d * 2.2, d * 0.8, 0, 32);
  const base = lathe([[d * 2, d * 0.8], [d * 1.2, d * 1.8], [0, d * 1.8]], 32);
  const nut = hex(d * 1.6, d * 0.8, d * 3);
  const stud = cyl(d / 2, d * 4, d * 1.8, 16);
  return collect({ rubber: [pad], steel: [base, stud], oxide: [nut] });
}
