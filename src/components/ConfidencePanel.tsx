import { ShieldAlert } from "lucide-react";
import { profileConfidence } from "../model/confidence";
import type { ProfileSpec, ScenarioAnalysis } from "../model/types";

interface ConfidencePanelProps {
  analysis: ScenarioAnalysis;
  profile: ProfileSpec;
  customProfile: ProfileSpec | null;
}

export function ConfidencePanel({ analysis, customProfile, profile }: ConfidencePanelProps) {
  const confidence = profileConfidence(profile, Boolean(customProfile && customProfile.id === profile.id));

  return (
    <section className={`confidence-panel confidence-${confidence.tone}`} aria-label="Model confidence">
      <div className="section-title compact-title">
        <ShieldAlert size={16} />
        <h2>Confidence / scope</h2>
      </div>
      <p>{confidence.summary}</p>
      <div className="confidence-needs">
        {confidence.needs.map((need) => (
          <span key={need}>{need}</span>
        ))}
      </div>
      <small>
        Preliminary beam-level analysis. Damping ratio {analysis.section.dampingRatio.toFixed(3)};
        connections and full-frame modes are outside this model.
      </small>
    </section>
  );
}
