import { profiles, profileUrl, type Profile } from "../data/profiles";
import { tslotSection, tubeSection, type Section2D } from "../geometry/tslot";
import { priced, unpriced, type Item, type Offer } from "./types";

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

const IN_PER_M = 1000 / 25.4;

/** 80/20 direct list prices (8020.net), per metre with the per-cut fee. */
const tslotPrices: Record<string, { perM: number; perCut: number }> = {
  "1530": { perM: 1.81 * IN_PER_M, perCut: 3.79 },
  "1545": { perM: 2.76 * IN_PER_M, perCut: 3.94 },
  "3060": { perM: 5.72 * IN_PER_M, perCut: 4.47 },
  "40-4080": { perM: 82.1, perCut: 3.79 },
  "45-4590": { perM: 99.4, perCut: 3.79 },
};

const tslotOffer = (p: Profile): Offer => {
  const price = tslotPrices[p.id];
  if (!price) return unpriced("80/20", profileUrl(p), "m");
  return priced("80/20", profileUrl(p), Math.round(price.perM * 100) / 100, "m", { perCut: price.perCut });
};

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
  offer: tslotOffer(p),
});

/** Sharp-corner thin-wall properties; EN 10219 corner radii shift them ~1–2 %. */
function tube(id: string, name: string, wIn: number, hIn: number, tIn: number, offer?: Offer): Stock {
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
    offer: offer ?? unpriced("Metals Depot", METALS_DEPOT, "m"),
  };
}

const METALS_DEPOT = "https://www.metalsdepot.com/steel-products/steel-rectangle-tube";
/** Metals Depot A500 tube, quoted per foot in 24 ft lengths. */
const perFoot = (usd: number, note: string) => priced("Metals Depot", METALS_DEPOT, Math.round((usd / 0.3048) * 100) / 100, "m", { note });

/** Speedy Metals square tube, quoted per foot for short lengths. */
const speedy = (usd: number, path: string, note: string) =>
  priced("Speedy Metals", `https://www.speedymetals.com/${path}`, Math.round((usd / 0.3048) * 100) / 100, "m", { note });

export const stock: Stock[] = [
  ...profiles.map(tslot),
  tube("tube-2x2x0.125", 'Steel tube 2" × 2" × 1/8"', 2, 2, 0.125, speedy(8.88, "pc-4790-8251-2-sq-x-76864-wall-square-steel-tubing.aspx", "priced as 11 ga (0.120″) wall; short-length rate")),
  tube("tube-3x2x0.125", 'Steel tube 3" × 2" × 1/8"', 2, 3, 0.125, perFoot(9.12, "priced as 11 ga (0.120″) wall; 24 ft lengths")),
  tube("tube-3x3x0.1875", 'Steel tube 3" × 3" × 3/16"', 3, 3, 0.1875, speedy(17.76, "p-4797-3-sq-x-1203264-wall-square-steel-tubing.aspx", "short-length rate")),
  tube("tube-4x2x0.1875", 'Steel tube 4" × 2" × 3/16"', 2, 4, 0.1875, perFoot(15.45, "24 ft lengths")),
];

export const getStock = (id: string) => stock.find((s) => s.id === id);
