import { ALUMINUM, FRAME_DAMPING, STEEL, type Fill } from "../data/materials";
import type { Profile } from "../data/profiles";
import type { Rail } from "../data/rails";

export type Orientation = "upright" | "flat";
export type Face = "top" | "front";

export interface SectionInput {
  profile: Profile;
  orientation: Orientation;
  rail: Rail | undefined;
  topRails: number;
  frontRails: number;
  fill: Fill;
}

export interface RailPlacement {
  face: Face;
  /** Rail footprint centre on the face, mm from the profile centre. */
  y: number;
  z: number;
}

export interface Section {
  /** Oriented envelope: width is horizontal (y), height is vertical (z). */
  widthMm: number;
  heightMm: number;
  cols: number;
  rows: number;
  rails: RailPlacement[];
  /** Enclosed cavity area available to fill (estimated from the published area). */
  cavityMm2: number;
  mass: { profile: number; rails: number; fill: number; total: number };
  eiNm2: { vertical: number; horizontal: number };
  /** Composite neutral axes, mm from the profile centre. */
  centroid: { y: number; z: number };
  dampingRatio: number;
}

interface Part {
  e: number; // Pa
  a: number; // mm²
  y: number;
  z: number;
  iv: number; // local mm⁴, vertical bending
  ih: number; // local mm⁴, horizontal bending
}

/**
 * Transformed-section stiffness of the extrusion with bolted rails and cast
 * fill: every part bends about the shared composite neutral axis.
 */
export function buildSection(input: SectionInput): Section {
  const { profile, rail, fill } = input;
  const upright = input.orientation === "upright";
  const cols = upright ? profile.cols : profile.rows;
  const rows = upright ? profile.rows : profile.cols;
  const w = cols * profile.moduleMm;
  const h = rows * profile.moduleMm;
  const cavityMm2 = estimateCavity(profile);

  const parts: Part[] = [
    {
      e: ALUMINUM.eGPa * 1e9,
      a: profile.areaMm2,
      y: 0,
      z: 0,
      iv: upright ? profile.ixMm4 : profile.iyMm4,
      ih: upright ? profile.iyMm4 : profile.ixMm4,
    },
  ];

  const rails = rail
    ? [
        ...slotCentres(cols, profile.moduleMm, input.topRails).map((y) => ({ face: "top" as const, y, z: h / 2 })),
        ...slotCentres(rows, profile.moduleMm, input.frontRails).map((z) => ({ face: "front" as const, y: w / 2, z: -z })),
      ]
    : [];

  if (rail) {
    // Rails are modelled as rectangles of catalogue height carrying the
    // catalogue mass; they are assumed not to slip on their bolts.
    const a = (rail.massKgM / STEEL.densityKgM3) * 1e6;
    const across = (a * rail.widthMm ** 2) / 12;
    const through = (a * rail.heightMm ** 2) / 12;
    for (const r of rails) {
      const top = r.face === "top";
      parts.push({
        e: STEEL.eGPa * 1e9,
        a,
        y: top ? r.y : r.y + rail.heightMm / 2,
        z: top ? r.z + rail.heightMm / 2 : r.z,
        iv: top ? through : across,
        ih: top ? across : through,
      });
    }
  }

  if (fill.eGPa > 0) {
    // Cavities are spread through the envelope; treat the fill as uniform.
    parts.push({ e: fill.eGPa * 1e9, a: cavityMm2, y: 0, z: 0, iv: (cavityMm2 * h * h) / 12, ih: (cavityMm2 * w * w) / 12 });
  }

  const ea = parts.reduce((sum, p) => sum + p.e * p.a, 0);
  const centroid = {
    y: parts.reduce((sum, p) => sum + p.e * p.a * p.y, 0) / ea,
    z: parts.reduce((sum, p) => sum + p.e * p.a * p.z, 0) / ea,
  };
  const ei = (local: (p: Part) => number, offset: (p: Part) => number) =>
    parts.reduce((sum, p) => sum + p.e * (local(p) + p.a * offset(p) ** 2), 0) * 1e-12;

  const mass = {
    profile: profile.areaMm2 * 1e-6 * ALUMINUM.densityKgM3,
    rails: rail ? rails.length * rail.massKgM : 0,
    fill: cavityMm2 * 1e-6 * fill.densityKgM3,
    total: 0,
  };
  mass.total = mass.profile + mass.rails + mass.fill;

  return {
    widthMm: w,
    heightMm: h,
    cols,
    rows,
    rails,
    cavityMm2,
    mass,
    eiNm2: {
      vertical: ei((p) => p.iv, (p) => p.z - centroid.z),
      horizontal: ei((p) => p.ih, (p) => p.y - centroid.y),
    },
    centroid,
    dampingRatio: FRAME_DAMPING + (fill.lossFactor / 2) * (mass.fill / mass.total),
  };
}

/**
 * Enclosed cavity = envelope − metal − open T-slots. Each exterior slot's
 * T-cavity is taken as 9 % of a module², which matches 8 mm slots on 40 mm
 * profiles (≈ 8 × 4.5 lip + 16 × 7 undercut).
 */
export function estimateCavity(profile: Profile) {
  const envelope = profile.cols * profile.rows * profile.moduleMm ** 2;
  const slots = 2 * (profile.cols + profile.rows) * 0.09 * profile.moduleMm ** 2;
  return Math.max(0, envelope - profile.areaMm2 - slots);
}

/**
 * Centres of the slots a face's rails bolt into, mm from the face centre.
 * One rail takes the first slot; more spread to the outermost slots.
 */
export function slotCentres(slots: number, moduleMm: number, count: number) {
  const n = Math.min(count, slots);
  const centre = (i: number) => (i + 0.5 - slots / 2) * moduleMm;
  if (n <= 0) return [];
  if (n === 1) return [centre(0)];
  return Array.from({ length: n }, (_, k) => centre(Math.round((k * (slots - 1)) / (n - 1))));
}
