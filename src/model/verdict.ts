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
  const controlling = analysis.controllingCriterion;
  const failures = analysis.criteria.filter((criterion) => criterion.status === "fail");
  const watches = analysis.criteria.filter((criterion) => criterion.status === "watch");

  if (failures.length === 0 && watches.length === 0) {
    return {
      tone: "ready",
      label: "Buildable",
      headline: "Passes the selected preliminary limits",
      summary: "Dynamic deflection, first mode, and modal spacing are inside the editable criteria.",
      nextMove: "Review weight, cost, and rail mounting before ordering material.",
      reasons: analysis.criteria.map((criterion) => `${criterion.label}: ${criterion.summary}`),
    };
  }

  if (failures.length === 0) {
    return {
      tone: "marginal",
      label: "Watch",
      headline: `${controlling?.label ?? "One criterion"} is close to its limit`,
      summary: "No selected limit is failing, but the controlling criterion has limited reserve.",
      nextMove: nextMoveFor(controlling?.id),
      reasons: analysis.criteria.map((criterion) => `${criterion.label}: ${criterion.summary}`),
    };
  }

  return {
    tone: "blocked",
    label: "Fails limit",
    headline: `${controlling?.label ?? "A criterion"} controls the design`,
    summary: "At least one selected preliminary engineering criterion is outside the configured limit.",
    nextMove: nextMoveFor(controlling?.id),
    reasons: analysis.criteria.map((criterion) => `${criterion.label}: ${criterion.summary}`),
  };
}

function nextMoveFor(id?: ScenarioAnalysis["criteria"][number]["id"]) {
  if (id === "dynamic-deflection") {
    return "Reduce span or cutting force, rotate to the stronger axis, add section depth, or increase rail contribution.";
  }

  if (id === "first-mode") {
    return "Raise stiffness-to-mass ratio with a shorter span, taller profile, lighter moving mass, or stiffer support condition.";
  }

  if (id === "modal-separation") {
    return "Move tooth-pass RPM away from the nearest mode, change flute count, or shift the structure with stiffness and mass changes.";
  }

  return "Review the controlling limit before using this design as a machine-tool beam.";
}
