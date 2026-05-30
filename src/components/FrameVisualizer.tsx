import type { MachineScenario, ProfileSpec, ScenarioAnalysis } from "../model/types";
import { formatFrequency, formatMicrons } from "../utils/format";
import { CadProfileCutaway } from "./CadProfileCutaway";

interface FrameVisualizerProps {
  profile: ProfileSpec;
  scenario: MachineScenario;
  analysis: ScenarioAnalysis;
}

export function FrameVisualizer({ profile, scenario, analysis }: FrameVisualizerProps) {
  return (
    <section className="visual-stage" aria-label="Frame geometry visualization">
      <div className="stage-toolbar">
        <div>
          <span>Active stack</span>
          <strong>{profile.name}</strong>
        </div>
        <div>
          <span>Axis EI</span>
          <strong>{(analysis.axisEiNm2 / 1000).toFixed(1)} kN m2</strong>
        </div>
        <div>
          <span>Predicted motion</span>
          <strong>{formatMicrons(analysis.dynamicDeflectionM)}</strong>
        </div>
      </div>

      <div className="visual-layout">
        <CadProfileCutaway profile={profile} scenario={scenario} />
        <BeamDiagram scenario={scenario} analysis={analysis} />
      </div>

      <div className="stage-readout">
        <span>Nearest excitation {formatFrequency(analysis.nearestExcitationHz)}</span>
        <span>Nearest mode {formatFrequency(analysis.nearestModeHz)}</span>
        <span>{analysis.section.massKgM.toFixed(2)} kg/m stack</span>
      </div>
    </section>
  );
}

function BeamDiagram({
  scenario,
  analysis,
}: {
  scenario: MachineScenario;
  analysis: ScenarioAnalysis;
}) {
  const loadX = 38 + (scenario.loadPositionPct / 100) * 304;
  const mode = analysis.beam.modeShapes[0]?.points ?? [];
  const path = mode
    .map((point, index) => `${index === 0 ? "M" : "L"} ${38 + point.x * 304} ${126 - point.y * 24}`)
    .join(" ");

  return (
    <svg className="beam-diagram" viewBox="0 0 380 220" role="img">
      <title>Frame span, load position, and first mode shape</title>
      <line className="beam-line" x1="38" y1="126" x2="342" y2="126" />
      <path className="mode-path" d={path} />
      <line className="load-arrow" x1={loadX} y1="48" x2={loadX} y2="112" />
      <path className="load-head" d={`M ${loadX - 8} 104 L ${loadX} 118 L ${loadX + 8} 104`} />
      <SupportGlyph x={38} y={126} support={scenario.support} />
      <SupportGlyph x={342} y={126} support={scenario.support === "cantilever" ? "free" : scenario.support} />
      <text x="38" y="174">{scenario.spanMm} mm</text>
      <text x={loadX - 20} y="39">{scenario.loadN} N</text>
      <text x="210" y="202">F1 {(analysis.beam.frequenciesHz[0] ?? 0).toFixed(1)} Hz</text>
    </svg>
  );
}

function SupportGlyph({
  x,
  y,
  support,
}: {
  x: number;
  y: number;
  support: MachineScenario["support"] | "free";
}) {
  if (support === "free") {
    return <circle className="free-end" cx={x} cy={y} r="5" />;
  }

  if (support === "fixed-fixed" || support === "cantilever") {
    return (
      <g className="support fixed">
        <rect x={x - 7} y={y - 36} width="14" height="72" />
        {[-24, -12, 0, 12, 24].map((offset) => (
          <line key={offset} x1={x - 17} y1={y + offset + 10} x2={x - 7} y2={y + offset} />
        ))}
      </g>
    );
  }

  return (
    <g className="support">
      <path d={`M ${x - 13} ${y + 28} L ${x} ${y + 4} L ${x + 13} ${y + 28} Z`} />
      <line x1={x - 18} y1={y + 31} x2={x + 18} y2={y + 31} />
    </g>
  );
}
