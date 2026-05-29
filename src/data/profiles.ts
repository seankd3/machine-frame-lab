import type { McmasterDetection, ProfileSpec } from "../model/types";

const MCM_T_SLOT_URL = "https://www.mcmaster.com/products/t-slotted-framing-rails/material~6560-aluminum/";
const MCM_2040_URL = "https://www.mcmaster.com/products/2040-t-slotted-framing/";

type McMasterSeed = {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  system: "metric" | "inch";
  widthMm: number;
  heightMm: number;
  slotMm: number;
  slotDepthMm: number;
  construction: "solid" | "hollow";
  texture: "smooth" | "grooved";
  sourceUrl: string;
  note: string;
};

const mcmasterSeeds = [
  {
    id: "tslot-2040-light",
    partNumber: "5537T111",
    name: "20 x 40 mm single rail",
    family: "Compact rail beam",
    system: "metric",
    widthMm: 20,
    heightMm: 40,
    slotMm: 5,
    slotDepthMm: 6.3,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_2040_URL,
    note: "Good for guards and light fixtures; usually too flexible for cutter-bearing spans.",
  },
  {
    id: "mcmaster-2020-solid",
    partNumber: "5537T911",
    name: "20 x 20 mm single rail",
    family: "Compact rail beam",
    system: "metric",
    widthMm: 20,
    heightMm: 20,
    slotMm: 5,
    slotDepthMm: 6.3,
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Small reference member for light brackets and accessory mounts.",
  },
  {
    id: "mcmaster-3030-hollow",
    partNumber: "6575N277",
    name: "30 x 30 mm hollow rail",
    family: "Light frame rail",
    system: "metric",
    widthMm: 30,
    heightMm: 30,
    slotMm: 8,
    slotDepthMm: 9,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Light metric profile with enough cavity to make fill comparisons visible.",
  },
  {
    id: "tslot-4040-standard",
    partNumber: "6575N256",
    name: "40 x 40 mm hollow rail",
    family: "Utility extrusion",
    system: "metric",
    widthMm: 40,
    heightMm: 40,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "hollow",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A practical baseline for enclosures and small fixtures, marginal for machine axes.",
  },
  {
    id: "mcmaster-4040-solid",
    partNumber: "5537T45",
    name: "40 x 40 mm solid rail",
    family: "Utility extrusion",
    system: "metric",
    widthMm: 40,
    heightMm: 40,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Solid 40-series square rail when mass and bolt bite matter more than fill volume.",
  },
  {
    id: "tslot-4080-heavy",
    partNumber: "3136N73",
    name: "40 x 80 mm hollow double rail",
    family: "Axis beam",
    system: "metric",
    widthMm: 40,
    heightMm: 80,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Strong orientation matters; tall side up is the default machine-frame move.",
  },
  {
    id: "mcmaster-4080-solid",
    partNumber: "5537T112",
    name: "40 x 80 mm solid double rail",
    family: "Axis beam",
    system: "metric",
    widthMm: 40,
    heightMm: 80,
    slotMm: 8.1,
    slotDepthMm: 12.3,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A heavier 40 x 80 option for comparing solid rail mass against hollow fill strategies.",
  },
  {
    id: "mcmaster-3060-hollow",
    partNumber: "5537T98",
    name: "30 x 60 mm hollow double rail",
    family: "Light axis beam",
    system: "metric",
    widthMm: 30,
    heightMm: 60,
    slotMm: 8,
    slotDepthMm: 9,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Useful scale reference for smaller routers and guarded light-duty axes.",
  },
  {
    id: "mcmaster-4590-hollow",
    partNumber: "5537T113",
    name: "45 x 90 mm hollow double rail",
    family: "Axis beam",
    system: "metric",
    widthMm: 45,
    heightMm: 90,
    slotMm: 10,
    slotDepthMm: 14.5,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Larger-slot metric rail for heavier gantries and accessory hardware.",
  },
  {
    id: "tslot-8080-heavy",
    partNumber: "5537T95",
    name: "80 x 80 mm solid quad rail",
    family: "Column and base member",
    system: "metric",
    widthMm: 80,
    heightMm: 80,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A stout square member that responds well to rail and fill comparison.",
  },
  {
    id: "mcmaster-8080-hollow",
    partNumber: "6575N384",
    name: "80 x 80 mm hollow quad rail",
    family: "Column and base member",
    system: "metric",
    widthMm: 80,
    heightMm: 80,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "The better 80 x 80 candidate when the design intent is damping fill inside the rail.",
  },
  {
    id: "mcmaster-5050-solid",
    partNumber: "4633N57",
    name: "50 x 50 mm solid quad rail",
    family: "Utility extrusion",
    system: "metric",
    widthMm: 50,
    heightMm: 50,
    slotMm: 6.5,
    slotDepthMm: 8.1,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Metric mid-size square rail for comparing 40-series and 80-series stiffness jumps.",
  },
  {
    id: "mcmaster-6060-hollow",
    partNumber: "5537T99",
    name: "60 x 60 mm hollow quad rail",
    family: "Column and base member",
    system: "metric",
    widthMm: 60,
    heightMm: 60,
    slotMm: 8,
    slotDepthMm: 9,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A compact square fill candidate between 40 and 80 mm families.",
  },
  {
    id: "mcmaster-40120-hollow",
    partNumber: "4524N53",
    name: "40 x 120 mm hollow triple rail",
    family: "Machine base beam",
    system: "metric",
    widthMm: 40,
    heightMm: 120,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "hollow",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A tall hollow rail that makes the fill-vs-mass tradeoff easy to see.",
  },
  {
    id: "mcmaster-40120-solid",
    partNumber: "6575N376",
    name: "40 x 120 mm solid triple rail",
    family: "Machine base beam",
    system: "metric",
    widthMm: 40,
    heightMm: 120,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A solid tall rail option for base beams where extra mass is acceptable.",
  },
  {
    id: "tslot-80160-heavy",
    partNumber: "3136N74",
    name: "80 x 160 mm solid double-quad rail",
    family: "Machine base beam",
    system: "metric",
    widthMm: 80,
    heightMm: 160,
    slotMm: 8,
    slotDepthMm: 12.2,
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "A base-rail candidate where fill starts acting more like damping mass than a magic stiffener.",
  },
  {
    id: "mcmaster-1x1-solid",
    partNumber: "47065T801",
    name: "1 x 1 in solid rail",
    family: "Inch utility extrusion",
    system: "inch",
    widthMm: inch(1),
    heightMm: inch(1),
    slotMm: inch(0.256),
    slotDepthMm: inch(0.323),
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Small inch-family reference rail.",
  },
  {
    id: "mcmaster-1-5x1-5-solid",
    partNumber: "47065T802",
    name: "1.5 x 1.5 in solid rail",
    family: "Inch utility extrusion",
    system: "inch",
    widthMm: inch(1.5),
    heightMm: inch(1.5),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Common inch-family square rail for quick stiffness comparisons.",
  },
  {
    id: "mcmaster-1-5x3-hollow",
    partNumber: "47065T809",
    name: "1.5 x 3 in hollow double rail",
    family: "Inch axis beam",
    system: "inch",
    widthMm: inch(1.5),
    heightMm: inch(3),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "hollow",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Inch-family stand-in for 40 x 80 style machine beams.",
  },
  {
    id: "mcmaster-1-5x3-solid",
    partNumber: "47065T804",
    name: "1.5 x 3 in solid double rail",
    family: "Inch axis beam",
    system: "inch",
    widthMm: inch(1.5),
    heightMm: inch(3),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Solid inch double rail for mass and rail-mount comparisons.",
  },
  {
    id: "mcmaster-2x2-solid",
    partNumber: "47065T805",
    name: "2 x 2 in solid quad rail",
    family: "Inch column member",
    system: "inch",
    widthMm: inch(2),
    heightMm: inch(2),
    slotMm: inch(0.256),
    slotDepthMm: inch(0.323),
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Inch square profile for compact columns and carriage plates.",
  },
  {
    id: "mcmaster-3x3-hollow",
    partNumber: "47065T811",
    name: "3 x 3 in hollow quad rail",
    family: "Inch column member",
    system: "inch",
    widthMm: inch(3),
    heightMm: inch(3),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "hollow",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Big inch hollow square rail for fill-media experiments.",
  },
  {
    id: "mcmaster-3x3-solid",
    partNumber: "47065T806",
    name: "3 x 3 in solid quad rail",
    family: "Inch column member",
    system: "inch",
    widthMm: inch(3),
    heightMm: inch(3),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "solid",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Heavy inch square member for stiffness-vs-mass comparison.",
  },
  {
    id: "mcmaster-2x4-solid",
    partNumber: "6575N225",
    name: "2 x 4 in solid double-quad rail",
    family: "Inch machine base beam",
    system: "inch",
    widthMm: inch(2),
    heightMm: inch(4),
    slotMm: inch(0.256),
    slotDepthMm: inch(0.323),
    construction: "solid",
    texture: "smooth",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Tall inch profile for gantry and base beam what-ifs.",
  },
  {
    id: "mcmaster-3x6-hollow",
    partNumber: "6575N394",
    name: "3 x 6 in hollow double-quad rail",
    family: "Inch machine base beam",
    system: "inch",
    widthMm: inch(3),
    heightMm: inch(6),
    slotMm: inch(0.32),
    slotDepthMm: inch(0.484),
    construction: "hollow",
    texture: "grooved",
    sourceUrl: MCM_T_SLOT_URL,
    note: "Large hollow inch rail for epoxy-granite and sand fill comparison.",
  },
  ] satisfies McMasterSeed[];

export const profiles: ProfileSpec[] = mcmasterSeeds.map(seedProfile);

export function findProfileByPartNumber(partNumber: string) {
  return profiles.find(
    (profile) => profile.partNumber?.toUpperCase() === partNumber.toUpperCase(),
  );
}

export function createDetectedProfile(
  detection: McmasterDetection,
  fallback: ProfileSpec,
): ProfileSpec {
  const matchedProfile = detection.partNumber
    ? findProfileByPartNumber(detection.partNumber)
    : undefined;

  if (matchedProfile) {
    return {
      ...matchedProfile,
      id: "mcmaster-detected",
      source: `${matchedProfile.source} - matched from pasted McMaster part number`,
      note: "Matched to the seeded McMaster rail catalog. Section properties are still simulation estimates until CAD mass properties are imported.",
    };
  }

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
    partNumber: detection.partNumber,
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

function seedProfile(seed: McMasterSeed): ProfileSpec {
  const areaMm2 = estimateTSlotArea(seed.widthMm, seed.heightMm, seed.slotMm, seed.construction);
  const iFactor = seed.construction === "solid" ? 0.64 : 0.46;
  const iVerticalMm4 = (seed.widthMm * seed.heightMm ** 3 * iFactor) / 12;
  const iLateralMm4 = (seed.heightMm * seed.widthMm ** 3 * iFactor) / 12;
  const fillableAreaMm2 =
    seed.construction === "hollow"
      ? seed.widthMm * seed.heightMm * 0.38
      : seed.widthMm * seed.heightMm * 0.055;
  const massKgM = areaMm2 * 1e-6 * 2700;

  return {
    ...seed,
    source: `McMaster-Carr rail row ${seed.partNumber}; ${seed.construction}, ${seed.texture}, ${formatDimension(seed.slotMm)} slot`,
    areaMm2,
    iVerticalMm4,
    iLateralMm4,
    fillableAreaMm2,
    massKgM,
  };
}

function estimateTSlotArea(
  widthMm: number,
  heightMm: number,
  slotMm: number,
  construction: "solid" | "hollow" = "solid",
) {
  const boundingArea = widthMm * heightMm;
  const baseFactor = construction === "solid" ? 0.52 : 0.36;
  const slotRelief = slotMm * (widthMm + heightMm) * (construction === "solid" ? 0.55 : 0.35);

  return Math.max(boundingArea * 0.22, boundingArea * baseFactor - slotRelief);
}

function formatDimension(valueMm: number) {
  return `${Number(valueMm.toFixed(2))} mm`;
}

function inch(value: number) {
  return value * 25.4;
}
