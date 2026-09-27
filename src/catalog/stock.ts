import { profiles, profileUrl, type Profile } from "../data/profiles";
import { tslotSection, tubeSection, type Section2D } from "../geometry/tslot";
import { unpriced, type Item } from "./types";

// Structural stock: 80/20 T-slot extrusion and steel rectangular tube, as the
// section properties the frame model needs plus the price per metre.

export interface Stock extends Item {
  id: string;
  kind: "tslot" | "tube";
  /** Catalogued envelope, w ≤ h. */
  wMm: number;
  hMm: number;
  areaMm2: number;
  /** Strong axis: bending across the tall side (h). */
  ixMm4: number;
  iyMm4: number;
  jMm4: number;
  massKgM: number;
  eGPa: number;
  gGPa: number;
  /** Slots per face, for rails and fasteners: [across w, across h]. */
  slots: [number, number];
  section: () => Section2D;
  profile?: Profile;
}

const ALU = { e: 69, g: 26, rho: 2700 };
const STEEL = { e: 200, g: 79, rho: 7850 };

/**
 * 80/20 does not publish torsion constants. Bosch Rexroth does for similar
 * sections (via esd.equipment): single-cell squares run J ≈ 0.10–0.19 I, and
 * multi-cell sections J ≈ 0.45–0.57 I_weak. Those ratios are applied here.
 */
const tslotJ = (p: Profile) => (p.cols * p.rows > 1 ? 0.45 : 0.13) * Math.min(p.ixMm4, p.iyMm4);

const tslot = (p: Profile): Stock => ({
  id: p.id,
  sku: `8020-${p.id}`,
  name: `80/20 ${p.id}`,
  kind: "tslot",
  wMm: p.cols * p.moduleMm,
  hMm: p.rows * p.moduleMm,
  areaMm2: p.areaMm2,
  ixMm4: p.ixMm4,
  iyMm4: p.iyMm4,
  jMm4: tslotJ(p),
  massKgM: p.areaMm2 * 1e-6 * ALU.rho,
  eGPa: ALU.e,
  gGPa: ALU.g,
  slots: [p.cols, p.rows],
  section: () => tslotSection(p),
  profile: p,
  offer: unpriced("80/20 via tnutz.com", profileUrl(p), "m"),
});

/** Sharp-corner thin-wall properties; EN 10219 corner radii shift them ~1–2 %. */
function tube(id: string, name: string, wIn: number, hIn: number, tIn: number): Stock {
  const [w, h, t] = [wIn * 25.4, hIn * 25.4, tIn * 25.4];
  const area = w * h - (w - 2 * t) * (h - 2 * t);
  return {
    id,
    sku: `tube-${id}`,
    name,
    kind: "tube",
    wMm: w,
    hMm: h,
    areaMm2: area,
    ixMm4: (w * h ** 3 - (w - 2 * t) * (h - 2 * t) ** 3) / 12,
    iyMm4: (h * w ** 3 - (h - 2 * t) * (w - 2 * t) ** 3) / 12,
    // Bredt: J = 4 A_m² t / perimeter of the mid-line.
    jMm4: (4 * ((w - t) * (h - t)) ** 2 * t) / (2 * (w - t + h - t)),
    massKgM: area * 1e-6 * STEEL.rho,
    eGPa: STEEL.e,
    gGPa: STEEL.g,
    slots: [0, 0],
    section: () => tubeSection(w, h, t),
    offer: unpriced("Metals Depot", "https://www.metalsdepot.com/steel-products/steel-rectangle-tube", "m"),
  };
}

export const stock: Stock[] = [
  ...profiles.map(tslot),
  tube("tube-2x2x0.125", 'Steel tube 2" × 2" × 1/8"', 2, 2, 0.125),
  tube("tube-3x2x0.125", 'Steel tube 3" × 2" × 1/8"', 2, 3, 0.125),
  tube("tube-3x3x0.1875", 'Steel tube 3" × 3" × 3/16"', 3, 3, 0.1875),
  tube("tube-4x2x0.1875", 'Steel tube 4" × 2" × 3/16"', 2, 4, 0.1875),
];

export const getStock = (id: string) => stock.find((s) => s.id === id);
