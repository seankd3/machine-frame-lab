import { unpriced, type Item, type Offer } from "./types";

// Linear guides, drives and motors. Dimensions from the HIWIN linear guideway
// catalogue G99TE24-2410 and StepperOnline datasheets.

export interface Guide {
  id: string;
  rail: Item & { widthMm: number; heightMm: number; pitchMm: number; massKgM: number; boltD: number };
  block: Item & {
    lengthMm: number;
    widthMm: number;
    /** Rail bottom to block top. */
    heightMm: number;
    holes: [number, number];
    boltD: number;
    massKg: number;
    /** Radial stiffness per block (N/µm) at Z0 (light) preload, HIWIN Tables 2-1-13 and 2-4-7. */
    stiffnessNPerUm: number;
  };
}

const hiwin = "https://www.hiwin.com/wp-content/uploads/HIWIN-Linear-Guideway-Catalog.pdf";

const guide = (
  id: string,
  rail: [number, number, number, number, number],
  block: { id: string; l: number; w: number; h: number; holes: [number, number]; bolt: number; kg: number; k: number },
  railOffer: Offer = unpriced("HIWIN", hiwin, "m"),
  blockOffer: Offer = unpriced("HIWIN", hiwin),
): Guide => ({
  id,
  rail: { sku: `rail-${id}`, name: `${id} profile rail`, widthMm: rail[0], heightMm: rail[1], pitchMm: rail[2], massKgM: rail[3], boltD: rail[4], offer: railOffer },
  block: {
    sku: `block-${block.id}`,
    name: `${block.id} carriage`,
    lengthMm: block.l,
    widthMm: block.w,
    heightMm: block.h,
    holes: block.holes,
    boltD: block.bolt,
    massKg: block.kg,
    stiffnessNPerUm: block.k,
    offer: blockOffer,
  },
});

export const guides: Guide[] = [
  guide("MGN12", [12, 8, 25, 0.65, 3], { id: "MGN12H", l: 45.4, w: 27, h: 13, holes: [20, 20], bolt: 3, kg: 0.054, k: 105 }),
  guide("MGN15", [15, 10, 40, 1.06, 3], { id: "MGN15H", l: 58.8, w: 32, h: 16, holes: [25, 25], bolt: 3, kg: 0.092, k: 134 }),
  guide("HGR15", [15, 15, 60, 1.45, 4], { id: "HGH15CA", l: 61.4, w: 34, h: 28, holes: [26, 26], bolt: 4, kg: 0.18, k: 196 }),
  guide("HGR20", [20, 17.5, 60, 2.21, 5], { id: "HGH20CA", l: 77.5, w: 44, h: 30, holes: [32, 36], bolt: 5, kg: 0.3, k: 232 }),
  guide("HGR25", [23, 22, 60, 3.21, 6], { id: "HGH25CA", l: 84, w: 48, h: 40, holes: [35, 35], bolt: 6, kg: 0.51, k: 292 }),
  guide("HGR30", [28, 26, 80, 4.47, 8], { id: "HGH30CA", l: 97.4, w: 60, h: 45, holes: [40, 40], bolt: 8, kg: 0.88, k: 354 }),
];

export interface BallScrew {
  id: string;
  kind: "ballscrew";
  diameterMm: number;
  leadMm: number;
  rootMm: number;
  screw: Item;
  kit: Item;
  nutStiffnessNPerUm: number;
  bearingStiffnessNPerUm: number;
  nutMassKg: number;
}

export interface Belt {
  id: string;
  kind: "belt";
  pitchMm: number;
  widthMm: number;
  /** Belt EA (N): a free span L has stiffness EA / L. Gates design manual Table 6. */
  specificStiffnessN: number;
  pulleyTeeth: number;
  belt: Item;
  kit: Item;
}

export type Drive = BallScrew | Belt;

const ballscrew = (d: number, lead: number, root: number, nutK: number, nutKg: number): BallScrew => ({
  id: `SFU${d}${String(lead).padStart(2, "0")}`,
  kind: "ballscrew",
  diameterMm: d,
  leadMm: lead,
  rootMm: root,
  screw: { sku: `screw-SFU${d}${lead}`, name: `SFU${d}${String(lead).padStart(2, "0")} rolled ball screw, C7`, offer: unpriced("Amazon / AliExpress", "https://www.amazon.com/s?k=sfu1605", "m") },
  kit: { sku: `nut-kit-SFU${d}${lead}`, name: `SFU${d}${String(lead).padStart(2, "0")} nut, housing, BK/BF${d <= 16 ? 12 : 15} supports`, offer: unpriced("Amazon / AliExpress", "https://www.amazon.com/s?k=sfu1605+bk12+bf12") },
  nutStiffnessNPerUm: nutK,
  // THK BK12 / BK15 axial rigidity; generic clones are likely softer.
  bearingStiffnessNPerUm: d <= 16 ? 88 : 100,
  nutMassKg: nutKg,
});

// Single-nut axial stiffness from the HIWIN ball screw catalogue (FSI, no
// preload); 10 mm leads are taken 10 % softer (no published figure). Root
// diameters are HIWIN's ground-screw values.
export const drives: Drive[] = [
  ballscrew(16, 5, 13.3, 110, 0.35),
  ballscrew(16, 10, 13.3, 100, 0.4),
  ballscrew(20, 5, 17.3, 196, 0.5),
  ballscrew(20, 10, 17.3, 175, 0.55),
  {
    id: "GT2-9",
    kind: "belt",
    pitchMm: 2,
    widthMm: 9,
    specificStiffnessN: 25400,
    pulleyTeeth: 20,
    belt: { sku: "belt-GT2-9", name: "GT2 9 mm glass-fibre belt", offer: unpriced("Amazon", "https://www.amazon.com/s?k=gt2+9mm+belt", "m") },
    kit: { sku: "pulley-GT2-9", name: "GT2 20T pulley and idlers", offer: unpriced("Amazon", "https://www.amazon.com/s?k=gt2+20t+pulley+9mm") },
  },
  {
    id: "GT3-15",
    kind: "belt",
    pitchMm: 3,
    widthMm: 15,
    specificStiffnessN: 73400,
    pulleyTeeth: 20,
    belt: { sku: "belt-GT3-15", name: "GT3 15 mm glass-fibre belt", offer: unpriced("Amazon", "https://www.amazon.com/s?k=gt3+15mm+belt", "m") },
    kit: { sku: "pulley-GT3-15", name: "GT3 20T pulley and idlers", offer: unpriced("Amazon", "https://www.amazon.com/s?k=gt3+20t+pulley+15mm") },
  },
];

export interface Motor extends Item {
  id: string;
  frameMm: number;
  lengthMm: number;
  shaftMm: number;
  holdingNm: number;
  rotorKgM2: number;
  massKg: number;
  /** Pull-out torque (rpm, N·m) with a DM542T-class driver at 48 V where published. */
  curve: Array<[number, number]>;
}

const stepperonline = (q: string) => unpriced("StepperOnline", `https://www.omc-stepperonline.com/search?search=${q}`);

export const motors: Motor[] = [
  // StepperOnline datasheets and torque-curve PDFs; curves read by eye (±0.02 N·m).
  // 17HS19 is its 24 V curve; 23HS22 has no published curve, so it is the
  // 23HS30 curve scaled by holding torque; 23HS45's chart stops at 420 rpm.
  { id: "17HS19", sku: "17HS19-2004S1", name: "NEMA 17 stepper, 0.59 N·m", frameMm: 42, lengthMm: 48, shaftMm: 5, holdingNm: 0.59, rotorKgM2: 82e-7, massKg: 0.39, curve: [[90, 0.43], [300, 0.42], [450, 0.39], [600, 0.33], [750, 0.23]], offer: stepperonline("17HS19-2004S1") },
  { id: "23HS22", sku: "23HS22-2804S", name: "NEMA 23 stepper, 1.26 N·m", frameMm: 57, lengthMm: 56, shaftMm: 6.35, holdingNm: 1.26, rotorKgM2: 300e-7, massKg: 0.7, curve: [[90, 1.22], [300, 1.17], [600, 0.74], [990, 0.4], [1500, 0.12]], offer: stepperonline("23HS22-2804S") },
  { id: "23HS30", sku: "23HS30-2804S", name: "NEMA 23 stepper, 1.9 N·m", frameMm: 57, lengthMm: 76.5, shaftMm: 6.35, holdingNm: 1.9, rotorKgM2: 440e-7, massKg: 1.1, curve: [[90, 1.84], [300, 1.76], [390, 1.56], [510, 1.28], [600, 1.12], [810, 0.88], [990, 0.6], [1200, 0.4], [1500, 0.18]], offer: stepperonline("23HS30-2804S") },
  { id: "23HS45", sku: "23HS45-4204S", name: "NEMA 23 stepper, 3.0 N·m", frameMm: 57, lengthMm: 113, shaftMm: 10, holdingNm: 3.0, rotorKgM2: 800e-7, massKg: 1.6, curve: [[60, 2.5], [150, 2.31], [300, 2.07], [420, 1.84]], offer: stepperonline("23HS45-4204S") },
];

export const getGuide = (id: string) => guides.find((g) => g.id === id);
export const getDrive = (id: string) => drives.find((d) => d.id === id);
export const getMotor = (id: string) => motors.find((m) => m.id === id);
