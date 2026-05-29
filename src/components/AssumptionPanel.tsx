import { AlertTriangle } from "lucide-react";
import type { ProfileSpec, ScenarioAnalysis } from "../model/types";

interface AssumptionPanelProps {
  profile: ProfileSpec;
  analysis: ScenarioAnalysis;
}

export function AssumptionPanel({ profile, analysis }: AssumptionPanelProps) {
  return (
    <footer className="assumption-panel">
      <AlertTriangle size={17} />
      <span>
        Beam FEA uses Euler-Bernoulli elements, composite rail stiffness, editable fill damping, and
        machine-tool force presets. Seeded profile values should be replaced with verified McMaster
        drawing or CAD mass properties before buying metal.
      </span>
      <strong>{profile.family}</strong>
      <strong>{analysis.section.railContributionPct.toFixed(0)}% rail EI share</strong>
      <strong>{analysis.section.fillContributionPct.toFixed(0)}% fill EI share</strong>
    </footer>
  );
}
