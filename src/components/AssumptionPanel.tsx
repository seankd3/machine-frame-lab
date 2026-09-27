import { AlertTriangle } from "lucide-react";
import { profileConfidence } from "../model/confidence";
import type { ProfileSpec, ScenarioAnalysis } from "../model/types";

interface AssumptionPanelProps {
  profile: ProfileSpec;
  customProfile: ProfileSpec | null;
  analysis: ScenarioAnalysis;
}

export function AssumptionPanel({ profile, customProfile, analysis }: AssumptionPanelProps) {
  const confidence = profileConfidence(profile, Boolean(customProfile && customProfile.id === profile.id));

  return (
    <footer className="assumption-panel">
      <AlertTriangle size={17} />
      <span>
        Preliminary beam-level analysis only: Euler-Bernoulli beam elements, equivalent rail/fill
        stiffness, and point carriage mass. Not a full frame, joint, fastener, or connection model.
      </span>
      <strong className={`confidence-pill confidence-${confidence.tone}`} title={confidence.needs.join(" ")}>
        {confidence.label}
      </strong>
      <strong>{profile.family}</strong>
      <strong>{analysis.section.railContributionPct.toFixed(0)}% rail EI share</strong>
      <strong>{analysis.section.fillContributionPct.toFixed(0)}% fill EI share</strong>
      <span className="brand-credit">Sean Kenneth Doherty</span>
    </footer>
  );
}
