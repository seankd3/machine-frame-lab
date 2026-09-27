import { priced, range, unpriced, type Item, type Offer } from "./types";

// Spindles, controllers and the shop hardware every build needs.

export interface Spindle extends Item {
  id: string;
  kind: "spindle" | "router";
  diameterMm: number;
  lengthMm: number;
  massKg: number;
  powerW: number;
  maxRpm: number;
  /** Everything else it needs to run: VFD, cable, pump. */
  extras: Item[];
}

export const spindles: Spindle[] = [
  {
    id: "makita-rt0701c",
    sku: "RT0701C",
    name: "Makita RT0701C trim router",
    kind: "router",
    diameterMm: 65,
    lengthMm: 150,
    massKg: 1.8,
    powerW: 710,
    maxRpm: 30000,
    offer: priced("Inventables", "https://www.inventables.com/products/makita-router", 159, "each", { note: "sold out when read; Home Depot lists the same price" }),
    extras: [],
  },
  {
    id: "spindle-1.5kw",
    sku: "SPINDLE-1.5KW-65",
    name: "1.5 kW 65 mm air-cooled spindle + VFD",
    kind: "spindle",
    diameterMm: 65,
    lengthMm: 195,
    massKg: 3.3,
    powerW: 1500,
    maxRpm: 24000,
    offer: range("Amazon", "https://www.amazon.com/s?k=1.5kw+spindle+vfd", 269, 310, "each", "spindle and VFD"),
    extras: [],
  },
  {
    id: "spindle-2.2kw",
    sku: "SPINDLE-2.2KW-80",
    name: "2.2 kW 80 mm water-cooled spindle + VFD",
    kind: "spindle",
    diameterMm: 80,
    lengthMm: 195,
    massKg: 5.1,
    powerW: 2200,
    maxRpm: 24000,
    offer: range("Amazon", "https://www.amazon.com/s?k=2.2kw+water+cooled+spindle+vfd", 295, 390, "each", "spindle and VFD"),
    extras: [],
  },
];

export interface Controller extends Item {
  id: string;
  /** Peak phase current its motor drivers can deliver (A); null where no datasheet was found. */
  driverPeakA: number | null;
  driverName: string;
  /** Drivers, PSU and anything else the board needs to move three axes. */
  extras: Array<Item & { count: number }>;
}

const DM542T: Item = { sku: "DM542T", name: "DM542T stepper driver", offer: priced("StepperOnline", "https://www.omc-stepperonline.com/search?search=DM542T", 19.65) };
const DM556T: Item = { sku: "DM556T", name: "DM556T stepper driver", offer: priced("StepperOnline", "https://www.omc-stepperonline.com/search?search=DM556T", 22.92) };
const PSU48: Item = {
  sku: "LRS-350-48",
  name: "Mean Well LRS-350-48 power supply",
  offer: priced("TRC Electronics", "https://www.trcelectronics.com/View/Mean-Well/LRS-350-48.shtml", 36.11),
};
const PSU24: Item = { sku: "LRS-350-24", name: "Mean Well LRS-350-24 power supply", offer: priced("TRC Electronics", "https://www.trcelectronics.com/View/Mean-Well/LRS-350-24.shtml", 34.81) };
const externalDrivers = [{ ...DM542T, count: 4 }, { ...PSU48, count: 1 }];

export const controllers: Controller[] = [
  {
    id: "fluidnc-6pack",
    sku: "FLUIDNC-6X",
    name: "FluidNC 6-axis board, external drivers",
    driverPeakA: 4.2,
    driverName: "DM542T",
    offer: priced("Elecrow", "https://www.elecrow.com/catalogsearch/result/?q=fluidnc", 139.9, "each", { note: "Elecrow listing; the Tindie 6-Pack links now 404" }),
    extras: externalDrivers,
  },
  {
    id: "fluidnc-dm556t",
    sku: "FLUIDNC-6X",
    name: "FluidNC 6-axis board, DM556T drivers",
    driverPeakA: 5.6,
    driverName: "DM556T",
    offer: priced("Elecrow", "https://www.elecrow.com/catalogsearch/result/?q=fluidnc", 139.9, "each", { note: "Elecrow listing; the Tindie 6-Pack links now 404" }),
    extras: [{ ...DM556T, count: 4 }, { ...PSU48, count: 1 }],
  },
  {
    id: "jackpot3",
    sku: "JACKPOT3",
    name: "Jackpot3 FluidNC board, onboard TMC2209",
    driverPeakA: 2.8,
    driverName: "onboard TMC2209",
    offer: priced("Amazon", "https://www.amazon.com/s?k=jackpot+fluidnc", 75.99),
    extras: [{ ...PSU24, count: 1 }],
  },
  {
    id: "masso-g3",
    sku: "MASSO-G3",
    name: "Masso G3 touch controller, external drivers",
    driverPeakA: 4.2,
    driverName: "DM542T",
    offer: priced("Masso", "https://www.masso.com.au/", 879),
    extras: externalDrivers,
  },
  {
    id: "openbuilds-blackbox",
    sku: "BLACKBOX-X32",
    name: "OpenBuilds BlackBox X32",
    driverPeakA: null,
    driverName: "onboard",
    offer: priced("MakerTechStore", "https://www.makertechstore.com/", 219.99, "each", { note: "out of stock when read; OpenBuilds closed in 2025" }),
    extras: [{ ...PSU24, count: 1 }],
  },
];

const BOLT_DEPOT = "https://www.boltdepot.com/Metric_socket_cap_screws_Class_12.9.aspx";
/** Bolt Depot class 12.9, per piece from the per-100 price of one length per size. */
const capScrewRate: Record<number, [number, string]> = { 3: [0.0573, "ASMC M3×18"], 5: [0.0815, "M5×12"], 6: [0.1095, "M6×16"], 8: [0.2076, "M8×20"] };
const capScrewOffer = (d: number): Offer => {
  const rate = capScrewRate[d];
  return rate ? priced("Bolt Depot", BOLT_DEPOT, rate[0], "each", { note: `${rate[1]} rate, packs of 100` }) : unpriced("Bolt Depot", BOLT_DEPOT);
};

const ASMC = "https://www.asmc.net/";
/** ISO 7380 class 12.9 button heads, ASMC per piece (25-piece minimum). M5's listed price looked like a placeholder, so it stays unpriced. */
const buttonOffer = (d: number): Offer =>
  d === 8
    ? priced("ASMC", `${ASMC}m8-x-1-25-x-16-mm-ft-coarse-thread-iso-7380-class-12-9-socket-button-head-cap-screw-alloy-steel-black-oxide/`, 0.1822, "each", { note: "M8×16 rate, 25-piece minimum" })
    : unpriced("ASMC", ASMC);

/**
 * 6061-T651 plate from Speedy Metals, 12 × 12 in pieces, saw cut. A design
 * thickness is bought as the next inch stock at least that thick, so the
 * per-kg price (of the designed plate's mass) carries the extra thickness.
 * Cutting and machining are not included.
 */
const PLATE_STOCK: Array<[number, string, number, string]> = [
  [0.25, "¼", 52.92, "p-2408-14-6061-t651-aluminum-plate.aspx"],
  [0.375, "⅜", 85.75, "p-2410-38-6061-t651-aluminum-plate.aspx"],
  [0.5, "½", 107.78, "p-2411-12-6061-t651-aluminum-plate.aspx"],
  [0.625, "⅝", 144.72, "p-2412-58-6061-t651-aluminum-plate.aspx"],
  [0.75, "¾", 168.48, "p-2413-34-6061-t651-aluminum-plate.aspx"],
  [1, "1", 211.68, "p-2415-1-6061-t651-aluminum-plate.aspx"],
];

function plateOffer(tMm: number): Offer {
  const stock = PLATE_STOCK.find(([inch]) => inch * 25.4 >= tMm - 0.2);
  if (!stock) return unpriced("Speedy Metals", "https://www.speedymetals.com/", "kg");
  const [inch, label, usd, path] = stock;
  const pieceKg = 304.8 * 304.8 * inch * 25.4 * 2.7e-6;
  const perKg = (usd / pieceKg) * ((inch * 25.4) / tMm);
  return priced("Speedy Metals", `https://www.speedymetals.com/${path}`, Math.round(perKg * 100) / 100, "kg", {
    note: `bought as ${label}" plate at the 12×12 in rate; cutting not included`,
  });
}

/** Inside-corner gussets by T-slot module (mm, rounded). */
const gussetOffer = (series: number): Offer =>
  series === 40
    ? priced("80/20", "https://8020.net/40-4334.html", 11.23, "each", { note: "80/20 40-4334" })
    : series === 38
      ? priced("TNUTZ", "https://tnutz.com/", 5.15, "each", { note: "TNUTZ CB-015-C, 80/20-compatible" })
      : unpriced("80/20", "https://8020.net/");

/** Hardware sold by the piece or by the pack, priced per piece. */
export const hardware = {
  buttonHead: (d: number, l: number): Item => ({ sku: `BHCS-M${d}x${l}`, name: `M${d} × ${l} button head screw`, offer: buttonOffer(d) }),
  capScrew: (d: number, l: number): Item => ({ sku: `SHCS-M${d}x${l}`, name: `M${d} × ${l} socket head cap screw`, offer: capScrewOffer(d) }),
  gusset: (series: number): Item => ({ sku: `GUSSET-${series}`, name: `${series} mm inside corner gusset`, offer: gussetOffer(series) }),
  coupler: (a: number, b: number): Item => ({ sku: `COUPLER-${a}x${b}`, name: `${a} × ${b} mm flexible coupler`, offer: range("Amazon", "https://www.amazon.com/s?k=flexible+shaft+coupler", 6, 8) }),
  plate: (t: number): Item => ({ sku: `PLATE-6061-${t}`, name: `6061-T6 plate ${t} mm, cut to size`, offer: plateOffer(t) }),
  foot: (d: number): Item => ({
    sku: `FOOT-M${d}`,
    name: `M${d} levelling foot`,
    offer:
      d === 10
        ? priced("WDS Components", "https://www.wdscomponents.com/en-us/m10-x-75-x-60mm-base-levelling-foot-304-stainless-steel-with-plastic-base", 8.81, "each", { note: "60 mm base, 304 stainless" })
        : unpriced("WDS Components", "https://www.wdscomponents.com/"),
  }),
  mdf: (): Item => ({ sku: "MDF-19-4x8", name: '¾" MDF sheet, 4 × 8 ft', offer: priced("Lowe's", "https://www.lowes.com/search?searchTerm=3%2F4+mdf+4x8", 50.98, "sheet") }),
  mount: (d: number): Item => ({
    sku: `MOUNT-${d}`,
    name: `${d} mm spindle clamp mount`,
    offer:
      d === 80
        ? range("Amazon", "https://www.amazon.com/s?k=80mm+spindle+mount", 20, 42)
        : d === 65
          ? priced("MakerMade", "https://makermade.com/products/65mm-router-clamp-mount", 39.2, "each", { note: "sale price; list $49" })
          : unpriced("Amazon", `https://www.amazon.com/s?k=${d}mm+spindle+mount`),
  }),
  dragChain: (): Item => ({ sku: "DRAG-CHAIN", name: "Cable drag chain", offer: range("Amazon", "https://www.amazon.com/s?k=cable+drag+chain", 13, 16, "m") }),
  limitSwitch: (): Item => ({ sku: "PROX-SWITCH", name: "Inductive homing switch", offer: range("Amazon", "https://www.amazon.com/s?k=inductive+proximity+switch", 3.6, 8) }),
};

export const getSpindle = (id: string) => spindles.find((s) => s.id === id);
export const getController = (id: string) => controllers.find((c) => c.id === id);
