import type { McmasterDetection, ProfileSpec } from "../model/types";

export const profiles: ProfileSpec[] = [
  {
    id: "tslot-2040-light",
    name: "20 x 40 mm T-slot",
    family: "Compact rail beam",
    source: "Seeded from common McMaster-style metric T-slot drawing dimensions",
    widthMm: 20,
    heightMm: 40,
    slotMm: 6,
    areaMm2: 420,
    iVerticalMm4: 54000,
    iLateralMm4: 17400,
    fillableAreaMm2: 120,
    massKgM: 1.13,
    note: "Good for guards and light fixtures; usually too flexible for cutter-bearing spans.",
  },
  {
    id: "tslot-4040-standard",
    name: "40 x 40 mm T-slot",
    family: "Utility extrusion",
    source: "Seeded from common McMaster-style metric T-slot drawing dimensions",
    widthMm: 40,
    heightMm: 40,
    slotMm: 8,
    areaMm2: 880,
    iVerticalMm4: 118000,
    iLateralMm4: 118000,
    fillableAreaMm2: 310,
    massKgM: 2.38,
    note: "A practical baseline for enclosures and small fixtures, marginal for machine axes.",
  },
  {
    id: "tslot-4080-heavy",
    name: "40 x 80 mm heavy T-slot",
    family: "Axis beam",
    source: "Seeded from common McMaster-style metric T-slot drawing dimensions",
    widthMm: 40,
    heightMm: 80,
    slotMm: 8,
    areaMm2: 1640,
    iVerticalMm4: 1120000,
    iLateralMm4: 304000,
    fillableAreaMm2: 760,
    massKgM: 4.43,
    note: "Strong orientation matters; tall side up is the default machine-frame move.",
  },
  {
    id: "tslot-8080-heavy",
    name: "80 x 80 mm heavy T-slot",
    family: "Column and base member",
    source: "Seeded from common McMaster-style metric T-slot drawing dimensions",
    widthMm: 80,
    heightMm: 80,
    slotMm: 8,
    areaMm2: 2940,
    iVerticalMm4: 2460000,
    iLateralMm4: 2460000,
    fillableAreaMm2: 1460,
    massKgM: 7.94,
    note: "A stout square member that responds well to rail and fill comparison.",
  },
  {
    id: "tslot-80160-heavy",
    name: "80 x 160 mm heavy T-slot",
    family: "Machine base beam",
    source: "Seeded from common McMaster-style metric T-slot drawing dimensions",
    widthMm: 80,
    heightMm: 160,
    slotMm: 8,
    areaMm2: 5580,
    iVerticalMm4: 15800000,
    iLateralMm4: 5120000,
    fillableAreaMm2: 3300,
    massKgM: 15.1,
    note: "A base-rail candidate where fill starts acting more like damping mass than a magic stiffener.",
  },
];

export function createDetectedProfile(
  detection: McmasterDetection,
  fallback: ProfileSpec,
): ProfileSpec {
  const widthMm = detection.widthMm ?? fallback.widthMm;
  const heightMm = detection.heightMm ?? fallback.heightMm;
  const slotMm = detection.slotMm ?? fallback.slotMm;
  const areaMm2 = estimateTSlotArea(widthMm, heightMm, slotMm);
  const voidFactor = widthMm === heightMm ? 0.56 : 0.48;
  const iVerticalMm4 = (widthMm * heightMm ** 3 * voidFactor) / 12;
  const iLateralMm4 = (heightMm * widthMm ** 3 * voidFactor) / 12;
  const fillableAreaMm2 = Math.max(areaMm2 * 0.42, widthMm * heightMm * 0.18);
  const massKgM = areaMm2 * 1e-6 * 2700;

  return {
    id: "mcmaster-detected",
    name: detection.partNumber
      ? `McMaster ${detection.partNumber}`
      : `Detected ${widthMm} x ${heightMm} mm profile`,
    family: "Imported profile",
    source: "Parsed from pasted McMaster row, drawing label, or CAD package name",
    widthMm,
    heightMm,
    slotMm,
    areaMm2,
    iVerticalMm4,
    iLateralMm4,
    fillableAreaMm2,
    massKgM,
    note: "Estimated until a drawing table or CAD mass properties are confirmed.",
  };
}

function estimateTSlotArea(widthMm: number, heightMm: number, slotMm: number) {
  const boundingArea = widthMm * heightMm;
  const slotRelief = slotMm * (widthMm + heightMm) * 1.2;
  return Math.max(boundingArea * 0.34, boundingArea * 0.58 - slotRelief);
}
