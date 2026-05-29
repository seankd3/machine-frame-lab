import { buildCompositeSection } from "./section";
import { makeModeShape, runBeamFea } from "./beamFea";
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
  const modalMassKgM = section.massKgM + (scenario.movingMassKg * 0.45) / lengthM;
  const beam = runBeamFea({
    lengthM,
    elements: ELEMENT_COUNT,
    eiNm2: axisEiNm2,
    massKgM: modalMassKgM,
    loadN: scenario.loadN,
    loadPositionPct: scenario.loadPositionPct,
    support: scenario.support,
  });

  const modeShapes = beam.frequenciesHz.slice(0, 3).map((frequencyHz, index) => ({
    mode: index + 1,
    frequencyHz,
    points: makeModeShape(scenario.support, index + 1),
  }));
  const toothPassingHz = (scenario.rpm * scenario.flutes) / 60;
  const spindleHz = scenario.rpm / 60;
  const resonance = nearestResonance(beam.frequenciesHz, [spindleHz, toothPassingHz]);
  const dynamicAmplification = amplification(
    resonance.nearestModeHz,
    resonance.nearestExcitationHz,
    section.dampingRatio,
  );
  const dynamicDeflectionM = beam.maxDeflectionM * dynamicAmplification;

  return {
    section,
    beam: { ...beam, modeShapes },
    axisEiNm2,
    totalMassKg: section.massKgM * lengthM + scenario.movingMassKg,
    toothPassingHz,
    spindleHz,
    dynamicAmplification,
    dynamicDeflectionM,
    modalMarginPct: resonance.marginPct,
    riskLevel: riskFromMargin(resonance.marginPct, dynamicAmplification),
    nearestExcitationHz: resonance.nearestExcitationHz,
    nearestModeHz: resonance.nearestModeHz,
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

function nearestResonance(modes: number[], excitations: number[]) {
  let nearestModeHz = modes[0] ?? 1;
  let nearestExcitationHz = excitations[0] ?? 1;
  let marginPct = Number.POSITIVE_INFINITY;

  modes.forEach((mode) => {
    excitations.forEach((excitation) => {
      const margin = Math.abs(mode - excitation) / mode * 100;
      if (margin < marginPct) {
        marginPct = margin;
        nearestModeHz = mode;
        nearestExcitationHz = excitation;
      }
    });
  });

  return { nearestModeHz, nearestExcitationHz, marginPct };
}

function amplification(modeHz: number, excitationHz: number, dampingRatio: number) {
  if (!modeHz || !excitationHz) return 1;
  const ratio = excitationHz / modeHz;
  const denominator = Math.sqrt((1 - ratio ** 2) ** 2 + (2 * dampingRatio * ratio) ** 2);
  return Math.min(12, Math.max(1, 1 / denominator));
}

function riskFromMargin(marginPct: number, amplificationValue: number): RiskLevel {
  if (marginPct < 8 || amplificationValue > 5) return "high";
  if (marginPct < 18 || amplificationValue > 2.2) return "watch";
  return "low";
}
