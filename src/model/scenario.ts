import { buildCompositeSection } from "./section";
import { runBeamFea } from "./beamFea";
import {
  controllingCriterion,
  evaluateDesignCriteria,
  normalizeDesignLimits,
} from "./limits";
import { buildResonanceReadout } from "./resonance";
import type { MachineScenario, ProfileSpec, RiskLevel, ScenarioAnalysis } from "./types";
import { mmToM } from "./units";

const ELEMENT_COUNT = 18;

export function analyzeScenario(
  profile: ProfileSpec,
  scenario: MachineScenario,
): ScenarioAnalysis {
  const section = buildCompositeSection(profile, scenario.rail, scenario.fill);
  const lengthM = mmToM(scenario.spanMm);
  const axisEiNm2 =
    scenario.axis === "vertical" ? section.eiVerticalNm2 : section.eiLateralNm2;
  const designLimits = normalizeDesignLimits(scenario.designLimits);
  const beam = runBeamFea({
    lengthM,
    elements: ELEMENT_COUNT,
    eiNm2: axisEiNm2,
    massKgM: section.massKgM,
    pointMassKg: scenario.movingMassKg,
    loadN: scenario.loadN,
    loadPositionPct: scenario.loadPositionPct,
    support: scenario.support,
  });

  const toothPassingHz = (scenario.rpm * scenario.flutes) / 60;
  const spindleHz = scenario.rpm / 60;
  const resonance = buildResonanceReadout(
    beam.frequenciesHz,
    scenario.rpm,
    scenario.flutes,
    designLimits.minModalSeparationPct,
  );
  const dynamicAmplification = amplification(
    resonance.nearestModeHz,
    resonance.nearestExcitationHz,
    section.dampingRatio,
  );
  const dynamicDeflectionM = beam.maxDeflectionM * dynamicAmplification;
  const baseAnalysis = {
    beam,
    dynamicDeflectionM,
    modalMarginPct: resonance.nearestMarginPct,
  };
  const criteria = evaluateDesignCriteria(baseAnalysis, designLimits);
  const controlling = controllingCriterion(criteria);

  return {
    section,
    beam,
    axisEiNm2,
    totalMassKg: section.massKgM * lengthM + scenario.movingMassKg,
    toothPassingHz,
    spindleHz,
    dynamicAmplification,
    dynamicDeflectionM,
    modalMarginPct: resonance.nearestMarginPct,
    riskLevel: riskFromCriteria(criteria),
    nearestExcitationHz: resonance.nearestExcitationHz,
    nearestModeHz: resonance.nearestModeHz,
    designLimits,
    criteria,
    controllingCriterion: controlling,
    resonance,
  };
}

export function comparisonScenarios(scenario: MachineScenario) {
  return [
    {
      name: "Bare profile",
      scenario: {
        ...scenario,
        rail: { ...scenario.rail, modelId: "none", topCount: 0, sideCount: 0 },
        fill: { ...scenario.fill, mediumId: "none", ratio: 0 },
      },
    },
    {
      name: "Rails only",
      scenario: {
        ...scenario,
        fill: { ...scenario.fill, mediumId: "none", ratio: 0 },
      },
    },
    {
      name: "Fill only",
      scenario: {
        ...scenario,
        rail: { ...scenario.rail, modelId: "none", topCount: 0, sideCount: 0 },
      },
    },
    {
      name: "Current stack",
      scenario,
    },
  ];
}

function amplification(modeHz: number, excitationHz: number, dampingRatio: number) {
  if (!modeHz || !excitationHz) return 1;
  const ratio = excitationHz / modeHz;
  const denominator = Math.sqrt((1 - ratio ** 2) ** 2 + (2 * dampingRatio * ratio) ** 2);
  return Math.min(12, Math.max(1, 1 / denominator));
}

function riskFromCriteria(criteria: ScenarioAnalysis["criteria"]): RiskLevel {
  if (criteria.some((criterion) => criterion.status === "fail")) return "high";
  if (criteria.some((criterion) => criterion.status === "watch")) return "watch";
  return "low";
}
