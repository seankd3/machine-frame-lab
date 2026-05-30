import { Activity, AlertTriangle, Gauge } from "lucide-react";
import { ShareActions } from "./ShareActions";
import type { SharedDesign } from "../model/share";
import type { ScenarioAnalysis } from "../model/types";
import { formatFrequency, riskLabel } from "../utils/format";

interface HeaderBarProps {
  analysis: ScenarioAnalysis;
  design: SharedDesign;
}

export function HeaderBar({ analysis, design }: HeaderBarProps) {
  return (
    <header className="header-bar">
      <div className="header-brand">
        <p className="eyebrow">
          <span>Doherty Dynamics</span>
          <span>Machine frame analysis</span>
        </p>
        <h1>Machine Frame Lab</h1>
      </div>

      <div className="header-status" aria-label="Current simulation status">
        <ShareActions design={design} />
        <div className={`status-pill risk-${analysis.riskLevel}`}>
          <AlertTriangle size={16} />
          <span>Modal risk: {riskLabel(analysis.riskLevel)}</span>
        </div>
        <div className="status-pill">
          <Gauge size={16} />
          <span>First mode {formatFrequency(analysis.beam.frequenciesHz[0] ?? 0)}</span>
        </div>
        <div className="status-pill">
          <Activity size={16} />
          <span>Tooth pass {formatFrequency(analysis.toothPassingHz)}</span>
        </div>
      </div>
    </header>
  );
}
