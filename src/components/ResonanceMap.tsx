import type { ScenarioAnalysis } from "../model/types";
import { formatFrequency } from "../utils/format";

interface ResonanceMapProps {
  analysis: ScenarioAnalysis;
}

export function ResonanceMap({ analysis }: ResonanceMapProps) {
  const maxHz = Math.max(analysis.toothPassingHz, ...analysis.beam.frequenciesHz.slice(0, 3), 250) * 1.1;

  return (
    <section className="resonance-map">
      <div className="section-title compact">
        <h2>Resonance map</h2>
      </div>
      <div className="frequency-track">
        {analysis.beam.frequenciesHz.slice(0, 3).map((frequency, index) => (
          <span
            className="mode-marker"
            style={{ left: `${Math.min(96, (frequency / maxHz) * 100)}%` }}
            key={frequency}
            title={`Mode ${index + 1}: ${formatFrequency(frequency)}`}
          />
        ))}
        <span
          className="excitation spindle"
          style={{ left: `${Math.min(96, (analysis.spindleHz / maxHz) * 100)}%` }}
          title={`Spindle: ${formatFrequency(analysis.spindleHz)}`}
        />
        <span
          className="excitation tooth"
          style={{ left: `${Math.min(96, (analysis.toothPassingHz / maxHz) * 100)}%` }}
          title={`Tooth passing: ${formatFrequency(analysis.toothPassingHz)}`}
        />
      </div>
      <div className="frequency-labels">
        <span>0</span>
        <span>{formatFrequency(maxHz)}</span>
      </div>
      <p className="compact-note">
        Margin {analysis.modalMarginPct.toFixed(0)}% between cutting excitation and the closest structural mode.
      </p>
    </section>
  );
}
