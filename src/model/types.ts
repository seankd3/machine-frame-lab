export type SupportType = "simply-supported" | "fixed-fixed" | "cantilever";
export type LoadAxis = "vertical" | "lateral";
export type PreloadClass = "light" | "medium" | "heavy";
export type RiskLevel = "low" | "watch" | "high";

export interface ProfileSpec {
  id: string;
  name: string;
  family: string;
  source: string;
  widthMm: number;
  heightMm: number;
  slotMm: number;
  areaMm2: number;
  iVerticalMm4: number;
  iLateralMm4: number;
  fillableAreaMm2: number;
  massKgM: number;
  note: string;
}

export interface RailSpec {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  massKgM: number;
  eGPa: number;
  dampingLoss: number;
}

export interface FillMedium {
  id: string;
  name: string;
  densityKgM3: number;
  eGPa: number;
  dampingLoss: number;
  stiffnessEfficiency: number;
}

export interface RailSelection {
  modelId: string;
  topCount: number;
  sideCount: number;
  boltPitchMm: number;
  preload: PreloadClass;
}

export interface FillSelection {
  mediumId: string;
  ratio: number;
}

export interface MachineScenario {
  profileId: string;
  spanMm: number;
  support: SupportType;
  axis: LoadAxis;
  loadN: number;
  loadPositionPct: number;
  rpm: number;
  flutes: number;
  movingMassKg: number;
  rail: RailSelection;
  fill: FillSelection;
}

export interface CompositeSection {
  massKgM: number;
  baseMassKgM: number;
  railMassKgM: number;
  fillMassKgM: number;
  eiVerticalNm2: number;
  eiLateralNm2: number;
  dampingRatio: number;
  railContributionPct: number;
  fillContributionPct: number;
}

export interface ModeShape {
  mode: number;
  frequencyHz: number;
  points: Array<{ x: number; y: number }>;
}

export interface BeamResult {
  maxDeflectionM: number;
  stiffnessNPerM: number;
  frequenciesHz: number[];
  modeShapes: ModeShape[];
}

export interface ScenarioAnalysis {
  section: CompositeSection;
  beam: BeamResult;
  axisEiNm2: number;
  totalMassKg: number;
  toothPassingHz: number;
  spindleHz: number;
  dynamicAmplification: number;
  dynamicDeflectionM: number;
  modalMarginPct: number;
  riskLevel: RiskLevel;
  nearestExcitationHz: number;
  nearestModeHz: number;
}

export interface McmasterDetection {
  partNumber?: string;
  widthMm?: number;
  heightMm?: number;
  slotMm?: number;
  confidence: number;
  notes: string[];
}
