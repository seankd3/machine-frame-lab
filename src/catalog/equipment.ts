import { unpriced, type Item } from "./types";

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
    offer: unpriced("Amazon", "https://www.amazon.com/s?k=makita+rt0701c"),
    extras: [],
  },
  {
    id: "spindle-1.5kw",
    sku: "SPINDLE-1.5KW-65",
    name: "1.5 kW 65 mm water-cooled spindle + VFD",
    kind: "spindle",
    diameterMm: 65,
    lengthMm: 195,
    massKg: 3.3,
    powerW: 1500,
    maxRpm: 24000,
    offer: unpriced("Amazon", "https://www.amazon.com/s?k=1.5kw+water+cooled+spindle+vfd"),
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
    offer: unpriced("Amazon", "https://www.amazon.com/s?k=2.2kw+water+cooled+spindle+vfd"),
    extras: [],
  },
];

export interface Controller extends Item {
  id: string;
  /** Drivers, PSU and anything else the board needs to move three axes. */
  extras: Array<Item & { count: number }>;
}

export const controllers: Controller[] = [
  {
    id: "fluidnc-6pack",
    sku: "6PACK-FLUIDNC",
    name: "FluidNC 6-Pack controller",
    offer: unpriced("Bart Dring / Tindie", "https://www.tindie.com/products/33366583/6-pack-cnc-controller-for-fluidnc/"),
    extras: [
      { sku: "DM542T", name: "DM542T stepper driver", count: 4, offer: unpriced("StepperOnline", "https://www.omc-stepperonline.com/search?search=DM542T") },
      { sku: "PSU-48V-350W", name: "48 V 350 W power supply", count: 1, offer: unpriced("StepperOnline", "https://www.omc-stepperonline.com/search?search=48V+350W") },
    ],
  },
  {
    id: "openbuilds-blackbox",
    sku: "BLACKBOX-X32",
    name: "OpenBuilds BlackBox X32",
    offer: unpriced("OpenBuilds", "https://openbuildspartstore.com/blackbox-motion-control-system-x32/"),
    extras: [{ sku: "PSU-24V-400W", name: "24 V 400 W power supply", count: 1, offer: unpriced("OpenBuilds", "https://openbuildspartstore.com/") }],
  },
];

/** Hardware sold by the piece or by the pack, priced per piece. */
export const hardware = {
  buttonHead: (d: number, l: number): Item => ({ sku: `BHCS-M${d}x${l}`, name: `M${d} × ${l} button head screw`, offer: unpriced("Bolt Depot", "https://www.boltdepot.com/") }),
  capScrew: (d: number, l: number): Item => ({ sku: `SHCS-M${d}x${l}`, name: `M${d} × ${l} socket head cap screw`, offer: unpriced("Bolt Depot", "https://www.boltdepot.com/") }),
  tNut: (d: number): Item => ({ sku: `TNUT-M${d}`, name: `M${d} drop-in T-nut`, offer: unpriced("80/20 via tnutz.com", "https://tnutz.com/") }),
  gusset: (series: number): Item => ({ sku: `GUSSET-${series}`, name: `${series} mm inside corner gusset`, offer: unpriced("80/20 via tnutz.com", "https://tnutz.com/") }),
  coupler: (a: number, b: number): Item => ({ sku: `COUPLER-${a}x${b}`, name: `${a} × ${b} mm flexible coupler`, offer: unpriced("Amazon", "https://www.amazon.com/s?k=flexible+shaft+coupler") }),
  plate: (t: number): Item => ({ sku: `PLATE-6061-${t}`, name: `6061-T6 plate ${t} mm, cut to size`, offer: unpriced("SendCutSend", "https://sendcutsend.com/", "kg") }),
  foot: (d: number): Item => ({ sku: `FOOT-M${d}`, name: `M${d} levelling foot`, offer: unpriced("Amazon", "https://www.amazon.com/s?k=levelling+foot") }),
  mdf: (): Item => ({ sku: "MDF-19-4x8", name: "19 mm MDF sheet, 4 × 8 ft", offer: unpriced("Home Depot", "https://www.homedepot.com/", "sheet") }),
  mount: (d: number): Item => ({ sku: `MOUNT-${d}`, name: `${d} mm spindle clamp mount`, offer: unpriced("Amazon", "https://www.amazon.com/s?k=spindle+mount") }),
  motorMount: (): Item => ({ sku: "MOTOR-MOUNT-23", name: "NEMA 23 motor mount plate", offer: unpriced("Amazon", "https://www.amazon.com/s?k=nema+23+motor+mount") }),
};

export const getSpindle = (id: string) => spindles.find((s) => s.id === id);
export const getController = (id: string) => controllers.find((c) => c.id === id);
