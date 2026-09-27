import type { CriterionEvaluation, DesignLimits, ScenarioAnalysis } from "./types";

export const DEFAULT_DESIGN_LIMITS: DesignLimits = {
  maxDynamicDeflectionUm: 35,
  minFirstModeHz: 250,
  minModalSeparationPct: 18,
};

export function normalizeDesignLimits(limits?: Partial<DesignLimits>): DesignLimits {
  return {
    maxDynamicDeflectionUm: positiveOrDefault(
      limits?.maxDynamicDeflectionUm,
      DEFAULT_DESIGN_LIMITS.maxDynamicDeflectionUm,
    ),
    minFirstModeHz: positiveOrDefault(limits?.minFirstModeHz, DEFAULT_DESIGN_LIMITS.minFirstModeHz),
    minModalSeparationPct: positiveOrDefault(
      limits?.minModalSeparationPct,
      DEFAULT_DESIGN_LIMITS.minModalSeparationPct,
    ),
  };
}

export function evaluateDesignCriteria(
  analysis: Pick<ScenarioAnalysis, "beam" | "dynamicDeflectionM" | "modalMarginPct">,
  limits: DesignLimits,
): CriterionEvaluation[] {
  const dynamicUm = analysis.dynamicDeflectionM * 1e6;
  const firstModeHz = analysis.beam.frequenciesHz[0] ?? 0;

  return [
    {
      id: "dynamic-deflection",
      label: "Dynamic deflection",
      status: upperBoundStatus(dynamicUm, limits.maxDynamicDeflectionUm),
      value: dynamicUm,
      limit: limits.maxDynamicDeflectionUm,
      unit: "um",
      marginPct: percentReserve(limits.maxDynamicDeflectionUm - dynamicUm, limits.maxDynamicDeflectionUm),
      summary: `${formatValue(dynamicUm)} um / max ${formatValue(limits.maxDynamicDeflectionUm)} um`,
    },
    {
      id: "first-mode",
      label: "First mode",
      status: lowerBoundStatus(firstModeHz, limits.minFirstModeHz),
      value: firstModeHz,
      limit: limits.minFirstModeHz,
      unit: "Hz",
      marginPct: percentReserve(firstModeHz - limits.minFirstModeHz, limits.minFirstModeHz),
      summary: `${formatValue(firstModeHz)} Hz / min ${formatValue(limits.minFirstModeHz)} Hz`,
    },
    {
      id: "modal-separation",
      label: "Modal separation",
      status: lowerBoundStatus(analysis.modalMarginPct, limits.minModalSeparationPct),
      value: analysis.modalMarginPct,
      limit: limits.minModalSeparationPct,
      unit: "%",
      marginPct: percentReserve(
        analysis.modalMarginPct - limits.minModalSeparationPct,
        limits.minModalSeparationPct,
      ),
      summary: `${formatValue(analysis.modalMarginPct)}% / min ${formatValue(limits.minModalSeparationPct)}%`,
    },
  ];
}

export function controllingCriterion(criteria: CriterionEvaluation[]) {
  const failures = criteria.filter((criterion) => criterion.status === "fail");
  if (failures.length > 0) {
    return failures.sort((left, right) => left.marginPct - right.marginPct)[0];
  }

  const watches = criteria.filter((criterion) => criterion.status === "watch");
  if (watches.length > 0) {
    return watches.sort((left, right) => left.marginPct - right.marginPct)[0];
  }

  return criteria.sort((left, right) => left.marginPct - right.marginPct)[0];
}

function upperBoundStatus(value: number, limit: number) {
  if (!Number.isFinite(value) || value > limit) return "fail";
  if (value > limit * 0.8) return "watch";
  return "pass";
}

function lowerBoundStatus(value: number, limit: number) {
  if (!Number.isFinite(value) || value < limit) return "fail";
  if (value < limit * 1.15) return "watch";
  return "pass";
}

function positiveOrDefault(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function percentReserve(delta: number, reference: number) {
  return reference > 0 ? (delta / reference) * 100 : 0;
}

function formatValue(value: number) {
  return value.toFixed(value >= 100 ? 0 : 1);
}
