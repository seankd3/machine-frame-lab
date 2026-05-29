import { Activity, Gauge, RadioTower } from "lucide-react";
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
      <div>
        <p className="eyebrow">FrameForge Lab</p>
        <h1>Machine frame extrusion simulator</h1>
      </div>

      <div className="header-status" aria-label="Current simulation status">
        <ShareActions design={design} />
        <div className={`status-pill risk-${analysis.riskLevel}`}>
          <RadioTower size={16} />
          <span>{riskLabel(analysis.riskLevel)} modal margin</span>
        </div>
        <div className="status-pill">
          <Gauge size={16} />
          <span>F1 {formatFrequency(analysis.beam.frequenciesHz[0] ?? 0)}</span>
        </div>
        <div className="status-pill">
          <Activity size={16} />
          <span>TPF {formatFrequency(analysis.toothPassingHz)}</span>
        </div>
      </div>
    </header>
  );
}
