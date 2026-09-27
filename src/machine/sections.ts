import type { Guide } from "../catalog/motion";
import type { Stock } from "../catalog/stock";
import type { Joinery } from "./document";
import type { BeamSection } from "../fea/frame";

// Beam sections for the FE model, SI units. `iz` resists deflection toward
// the member's up vector, `iy` sideways.

const MM2 = 1e-6;
const MM4 = 1e-12;

export const stockBeam = (s: Stock): BeamSection => ({
  e: s.eGPa * 1e9,
  g: s.gGPa * 1e9,
  a: s.areaMm2 * MM2,
  iz: s.ixMm4 * MM4,
  iy: s.iyMm4 * MM4,
  j: s.jMm4 * MM4,
  massPerLength: s.massKgM,
});

/** A plate acting as a beam: `widthMm` lies along the beam's up vector. */
export const plateBeam = (widthMm: number, tMm: number, material: "alu" | "steel" = "alu"): BeamSection => {
  const [e, g, rho] = material === "alu" ? [69e9, 26e9, 2700] : [200e9, 79e9, 7850];
  const a = widthMm * tMm;
  return {
    e,
    g,
    a: a * MM2,
    iz: ((tMm * widthMm ** 3) / 12) * MM4,
    iy: ((widthMm * tMm ** 3) / 12) * MM4,
    j: ((widthMm * tMm ** 3) / 3) * (1 - 0.63 * (tMm / widthMm)) * MM4,
    massPerLength: a * MM2 * rho,
  };
};

/** Profile rail as a steel rectangle carrying the catalogue mass. */
export const railBeam = (g: Guide): BeamSection => {
  const a = g.rail.massKgM / 7850;
  const { widthMm: w, heightMm: h } = g.rail;
  return {
    e: 200e9,
    g: 79e9,
    a,
    iz: (a * (h * 1e-3) ** 2) / 12,
    iy: (a * (w * 1e-3) ** 2) / 12,
    j: (a * ((Math.min(w, h) * 1e-3) ** 2)) / 6,
    massPerLength: g.rail.massKgM,
  };
};

/** Spindle housing as a thick aluminium tube with a steel shaft inside. */
export const spindleBeam = (diameterMm: number, massKg: number, lengthMm: number): BeamSection => {
  const r = (diameterMm / 2) * 1e-3;
  const ri = r * 0.7;
  const i = (Math.PI / 4) * (r ** 4 - ri ** 4);
  return { e: 69e9, g: 26e9, a: Math.PI * (r * r - ri * ri), iz: i, iy: i, j: 2 * i, massPerLength: massKg / (lengthMm * 1e-3) };
};

/**
 * Joint stiffness by joinery, as [translation N/m, rotation N·m/rad]. Bolted
 * T-slot joints are the soft spot of extrusion frames; these are working
 * estimates until measured values replace them.
 */
export const jointStiffness: Record<Joinery, [number, number]> = {
  brackets: [5e7, 8e3],
  plates: [2e8, 4e4],
  welded: [1e10, 1e8],
};

export const jointSpring = (j: Joinery): [number, number, number, number, number, number] => {
  const [t, r] = jointStiffness[j];
  return [t, t, t, r, r, r];
};
