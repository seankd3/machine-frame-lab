import { AlertTriangle, CheckCircle2, CircleSlash, Wrench } from "lucide-react";
import { getBuildVerdict } from "../model/verdict";
import type { ScenarioAnalysis } from "../model/types";

interface VerdictPanelProps {
  analysis: ScenarioAnalysis;
}

export function VerdictPanel({ analysis }: VerdictPanelProps) {
  const verdict = getBuildVerdict(analysis);
  const Icon =
    verdict.tone === "ready"
      ? CheckCircle2
      : verdict.tone === "blocked"
        ? CircleSlash
        : AlertTriangle;

  return (
    <section className={`verdict-panel verdict-${verdict.tone}`} aria-label="Build verdict">
      <div className="verdict-mark">
        <Icon size={24} />
        <span>{verdict.label}</span>
      </div>

      <div className="verdict-copy">
        <p>{verdict.headline}</p>
        <span>{verdict.summary}</span>
      </div>

      <div className="verdict-reasons">
        {analysis.criteria.map((criterion) => (
          <span className={`criterion-chip criterion-${criterion.status}`} key={criterion.id}>
            <strong>{criterion.status}</strong>
            {criterion.summary}
          </span>
        ))}
      </div>

      <div className="verdict-next">
        <Wrench size={16} />
        <span>{verdict.nextMove}</span>
      </div>
    </section>
  );
}
