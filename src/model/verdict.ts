import type { ScenarioAnalysis } from "./types";

export type VerdictTone = "ready" | "marginal" | "blocked";

export interface BuildVerdict {
  tone: VerdictTone;
  label: string;
  headline: string;
  summary: string;
  nextMove: string;
  reasons: string[];
}

export function getBuildVerdict(analysis: ScenarioAnalysis): BuildVerdict {
  const dynamicUm = analysis.dynamicDeflectionM * 1e6;
  const firstModeHz = analysis.beam.frequenciesHz[0] ?? 0;
  const margin = analysis.modalMarginPct;
  const resonanceWatch = margin < 18 || analysis.dynamicAmplification > 2.2;
  const stiffEnough = dynamicUm <= 35 && firstModeHz >= 250;
  const usable = dynamicUm <= 85 && firstModeHz >= 140;

  if (stiffEnough && !resonanceWatch) {
    return {
      tone: "ready",
      label: "Buildable",
      headline: "Good candidate for the current machine load",
      summary: "Deflection and modal spacing look healthy for this frame recipe.",
      nextMove: "Compare weight, cost, and rail mounting before committing to metal.",
      reasons: [
        `${formatUm(dynamicUm)} dynamic deflection`,
        `${formatHz(firstModeHz)} first mode`,
        `${margin.toFixed(0)}% modal margin`,
      ],
    };
  }

  if (usable) {
    return {
      tone: "marginal",
      label: resonanceWatch ? "Watch resonance" : "Marginal",
      headline: resonanceWatch
        ? "Marginal for aluminum cutting: watch resonance"
        : "Marginal but usable for light aluminum work",
      summary: resonanceWatch
        ? "The frame is not wildly flexible, but a cutting excitation is close enough to a structural mode to deserve attention."
        : "The frame can be useful, but it is not a comfortable stiffness reserve for heavier passes.",
      nextMove: resonanceWatch
        ? "Move the tooth-passing frequency away with spindle speed, flute count, shorter span, or a taller profile."
        : "Try a taller extrusion, shorter span, or dual rails before stepping up cutting force.",
      reasons: [
        `${formatUm(dynamicUm)} dynamic deflection`,
        `${formatHz(firstModeHz)} first mode`,
        `${margin.toFixed(0)}% modal margin`,
      ],
    };
  }

  return {
    tone: "blocked",
    label: "Too flexible",
    headline: "Not a good machine-tool beam as configured",
    summary: "This stack is likely to chatter or lose accuracy under the selected machine-tool load.",
    nextMove: "Shorten the span, rotate to the stronger axis, step up the profile, or redesign around a heavier base member.",
    reasons: [
      `${formatUm(dynamicUm)} dynamic deflection`,
      `${formatHz(firstModeHz)} first mode`,
      `${margin.toFixed(0)}% modal margin`,
    ],
  };
}

function formatUm(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} um`;
}

function formatHz(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} Hz`;
}
