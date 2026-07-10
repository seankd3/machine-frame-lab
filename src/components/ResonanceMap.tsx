import type { ScenarioAnalysis } from "../model/types";
import { formatFrequency } from "../utils/format";

interface ResonanceMapProps {
  analysis: ScenarioAnalysis;
}

export function ResonanceMap({ analysis }: ResonanceMapProps) {
  const modes = analysis.beam.frequenciesHz.slice(0, 4);
  const plottedFrequencies = [analysis.spindleHz, analysis.toothPassingHz, ...modes].filter(
    (frequency) => Number.isFinite(frequency) && frequency > 0,
  );
  const minHz = Math.max(10, Math.min(...plottedFrequencies) * 0.72);
  const maxHz = Math.max(...plottedFrequencies, 250) * 1.12;
  const safer = analysis.resonance.saferRpm;
  const position = (frequency: number) => {
    const ratio = Math.log(Math.max(frequency, minHz) / minHz) / Math.log(maxHz / minHz);
    return `${Math.min(98, Math.max(2, ratio * 100))}%`;
  };

  return (
    <section className="resonance-map">
      <div className="section-title compact">
        <h2>Operating resonance</h2>
      </div>
      <div className="resonance-legend" aria-label="Resonance marker legend">
        <span><i className="legend-mode" /> Structural modes</span>
        <span><i className="legend-spindle" /> Spindle</span>
        <span><i className="legend-tooth" /> Tooth pass</span>
      </div>
      <div className="frequency-track">
        {modes.map((frequency, index) => (
          <span
            className="mode-marker"
            style={{ left: position(frequency) }}
            key={frequency}
            title={`Mode ${index + 1}: ${formatFrequency(frequency)}`}
          />
        ))}
        <span
          className="excitation spindle"
          style={{ left: position(analysis.spindleHz) }}
          title={`Spindle: ${formatFrequency(analysis.spindleHz)}`}
        />
        <span
          className="excitation tooth"
          style={{ left: position(analysis.toothPassingHz) }}
          title={`Tooth passing: ${formatFrequency(analysis.toothPassingHz)}`}
        />
      </div>
      <div className="frequency-labels">
        <span>{formatFrequency(minHz)}</span>
        <span>{formatFrequency(maxHz)}</span>
      </div>
      <p className="frequency-scale-note">Log frequency scale</p>
      <div className="resonance-readout">
        <span>Spindle {formatFrequency(analysis.spindleHz)}</span>
        <span>Tooth pass {formatFrequency(analysis.toothPassingHz)}</span>
        <span>Modes {modes.map((mode) => formatFrequency(mode)).join(" / ")}</span>
        <strong>
          Nearest: {analysis.resonance.nearestExcitationLabel} to{" "}
          {formatFrequency(analysis.resonance.nearestModeHz)} mode,{" "}
          {analysis.resonance.nearestMarginPct.toFixed(1)}% margin
        </strong>
      </div>
      <p className={`compact-note resonance-advice ${analysis.resonance.toothPassesLimit ? "pass" : "fail"}`}>
        {analysis.resonance.toothPassesLimit
          ? `Tooth-pass separation meets the selected ${analysis.designLimits.minModalSeparationPct.toFixed(0)}% margin.`
          : safer
            ? `Tooth pass fails the selected margin. Nearest safer move: ${safer.direction} to ${safer.rpm.toFixed(0)} rpm (${safer.marginPct.toFixed(1)}% tooth-pass margin).`
            : "Tooth pass fails the selected margin and no safer nearby RPM exists inside 500-24000 rpm."}
      </p>
    </section>
  );
}
