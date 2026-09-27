// 80/20 T-slot profiles. Area and second moments are read from each product
// page at https://8020.net/<id>.html (Sept 2026). Ix is the strong axis
// (bending across the tall side). Mass is area × 2.70 g/cm³; the pages' own
// weights agree within 1% except the 20/30 series, which read 3–4% heavy.

export interface Profile {
  id: string;
  system: "inch" | "metric";
  /** Grid module: every cell is module × module with one slot per exposed face. */
  moduleMm: number;
  cols: number;
  rows: number;
  slotMm: number;
  lite: boolean;
  areaMm2: number;
  /** Strong-axis second moment (bending across the tall side). */
  ixMm4: number;
  iyMm4: number;
}

const IN = 25.4;
const IN2 = IN ** 2;
const IN4 = IN ** 4;
const CM2 = 100;
const CM4 = 1e4;

const inch = (id: string, cells: [number, number], moduleIn: number, slotIn: number, a: number, ix: number, iy: number): Profile => ({
  id,
  system: "inch",
  moduleMm: moduleIn * IN,
  cols: cells[0],
  rows: cells[1],
  slotMm: slotIn * IN,
  lite: id.endsWith("LITE"),
  areaMm2: a * IN2,
  ixMm4: ix * IN4,
  iyMm4: iy * IN4,
});

const metric = (id: string, cells: [number, number], moduleMm: number, slotMm: number, a: number, ix: number, iy: number): Profile => ({
  id,
  system: "metric",
  moduleMm,
  cols: cells[0],
  rows: cells[1],
  slotMm,
  lite: id.endsWith("LITE"),
  areaMm2: a * CM2,
  ixMm4: ix * CM4,
  iyMm4: iy * CM4,
});

export const profiles: Profile[] = [
  metric("20-2020", [1, 1], 20, 6, 1.591, 0.6826, 0.6826),
  metric("20-2040", [1, 2], 20, 6, 2.75, 4.5357, 1.2133),
  metric("30-3030", [1, 1], 30, 8, 3.144, 2.7221, 2.7221),
  metric("30-3060", [1, 2], 30, 8, 5.8266, 19.6933, 5.4332),
  metric("40-4040-LITE", [1, 1], 40, 8, 6.608, 9.3983, 9.3983),
  metric("40-4040", [1, 1], 40, 8, 8.742, 13.787, 13.787),
  metric("40-4080", [1, 2], 40, 8, 15.332, 97.6617, 25.2917),
  metric("40-8080", [2, 2], 40, 8, 23.573, 171.6341, 171.6341),
  metric("45-4545", [1, 1], 45, 10, 7.587, 13.9604, 13.9604),
  metric("45-4590", [1, 2], 45, 10, 12.615, 104.2072, 25.2637),
  // The page lists Iy 1 cm⁴ higher than Ix on a symmetric section; use the lower.
  metric("45-9090", [2, 2], 45, 10, 20.014, 178.4968, 178.4968),
  inch("1010", [1, 1], 1, 0.256, 0.437, 0.0442, 0.0442),
  inch("1020", [1, 2], 1, 0.256, 0.787, 0.3078, 0.0833),
  inch("1030", [1, 3], 1, 0.256, 1.14, 0.9711, 0.1238),
  inch("2020", [2, 2], 1, 0.256, 1.228, 0.5509, 0.5509),
  inch("2040", [2, 4], 1, 0.256, 2.29, 3.5168, 1.0513),
  inch("1515-LITE", [1, 1], 1.5, 0.32, 0.896, 0.1853, 0.1853),
  inch("1515", [1, 1], 1.5, 0.32, 1.152, 0.2542, 0.2542),
  inch("1530-LITE", [1, 2], 1.5, 0.32, 1.722, 1.3847, 0.3935),
  inch("1530", [1, 2], 1.5, 0.32, 2.077, 1.8042, 0.4824),
  inch("1545", [1, 3], 1.5, 0.32, 3.002, 5.6929, 0.7097),
  inch("3030", [2, 2], 1.5, 0.32, 3.212, 3.4133, 3.4133),
  inch("3060", [2, 4], 1.5, 0.32, 5.963, 22.03, 6.5164),
];

export const profileUrl = (profile: Profile) => `https://8020.net/${profile.id.toLowerCase()}.html`;

export const getProfile = (id: string) => profiles.find((p) => p.id === id);
