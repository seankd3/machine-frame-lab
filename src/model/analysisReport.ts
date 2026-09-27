import type { CriterionEvaluation, MachineScenario, ProfileSpec, ScenarioAnalysis } from "./types";

export interface AnalysisReport {
  reportType: "Machine Frame Lab analysis report";
  generatedAt: string;
  modelScope: string[];
  inputs: MachineScenario;
  selectedProfile: {
    id: string;
    name: string;
    provenance: string;
    source: string;
    properties: Pick<
      ProfileSpec,
      | "widthMm"
      | "heightMm"
      | "slotMm"
      | "slotDepthMm"
      | "areaMm2"
      | "iVerticalMm4"
      | "iLateralMm4"
      | "fillableAreaMm2"
      | "massKgM"
    >;
  };
  compositeSection: ScenarioAnalysis["section"];
  numericalResults: {
    maxStaticDeflectionM: number;
    dynamicDeflectionM: number;
    stiffnessNPerM: number;
    frequenciesHz: number[];
    modeShapes: ScenarioAnalysis["beam"]["modeShapes"];
    dynamicAmplification: number;
    spindleHz: number;
    toothPassingHz: number;
    modalMarginPct: number;
    resonance: ScenarioAnalysis["resonance"];
  };
  designLimits: MachineScenario["designLimits"];
  criterionEvaluations: CriterionEvaluation[];
  controllingCriterion?: CriterionEvaluation;
  notes: string[];
}

export function buildAnalysisReport({
  analysis,
  profile,
  scenario,
}: {
  analysis: ScenarioAnalysis;
  profile: ProfileSpec;
  scenario: MachineScenario;
}): AnalysisReport {
  return {
    reportType: "Machine Frame Lab analysis report",
    generatedAt: new Date().toISOString(),
    modelScope: [
      "Preliminary beam-level Euler-Bernoulli analysis.",
      "Static and modal calculations model one equivalent beam span, not a full frame, joints, fasteners, plates, or rail-carriage contact.",
      "Seeded extrusion properties are approximate until replaced by verified drawing or CAD mass properties.",
    ],
    inputs: scenario,
    selectedProfile: {
      id: profile.id,
      name: profile.name,
      provenance: profile.id === "mcmaster-detected" ? "custom/imported" : "seeded approximate profile",
      source: profile.source,
      properties: {
        widthMm: profile.widthMm,
        heightMm: profile.heightMm,
        slotMm: profile.slotMm,
        slotDepthMm: profile.slotDepthMm,
        areaMm2: profile.areaMm2,
        iVerticalMm4: profile.iVerticalMm4,
        iLateralMm4: profile.iLateralMm4,
        fillableAreaMm2: profile.fillableAreaMm2,
        massKgM: profile.massKgM,
      },
    },
    compositeSection: analysis.section,
    numericalResults: {
      maxStaticDeflectionM: analysis.beam.maxDeflectionM,
      dynamicDeflectionM: analysis.dynamicDeflectionM,
      stiffnessNPerM: analysis.beam.stiffnessNPerM,
      frequenciesHz: analysis.beam.frequenciesHz,
      modeShapes: analysis.beam.modeShapes,
      dynamicAmplification: analysis.dynamicAmplification,
      spindleHz: analysis.spindleHz,
      toothPassingHz: analysis.toothPassingHz,
      modalMarginPct: analysis.modalMarginPct,
      resonance: analysis.resonance,
    },
    designLimits: analysis.designLimits,
    criterionEvaluations: analysis.criteria,
    controllingCriterion: analysis.controllingCriterion,
    notes: [
      "Use this record for comparison and early sizing only.",
      "Verify actual profile section properties, boundary stiffness, fastener preload, rail interface compliance, damping, and full-machine modes before purchase or safety decisions.",
    ],
  };
}
