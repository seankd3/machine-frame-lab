import { getFill } from "../data/materials";
import { getRail } from "../data/rails";
import type { MachineScenario, ProfileSpec, ScenarioAnalysis } from "../model/types";
import { formatFrequency, formatMicrons } from "../utils/format";

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
        <CrossSectionDiagram profile={profile} scenario={scenario} />
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

function CrossSectionDiagram({
  profile,
  scenario,
}: {
  profile: ProfileSpec;
  scenario: MachineScenario;
}) {
  const rail = getRail(scenario.rail.modelId);
  const fill = getFill(scenario.fill.mediumId);
  const pad = 34;
  const width = 260;
  const height = 220;
  const maxDim = Math.max(profile.widthMm + rail.heightMm * 2, profile.heightMm + rail.heightMm * 2);
  const scale = 150 / maxDim;
  const bodyW = profile.widthMm * scale;
  const bodyH = profile.heightMm * scale;
  const x = width / 2 - bodyW / 2;
  const y = height / 2 - bodyH / 2 + 8;
  const railW = rail.widthMm * scale;
  const railH = rail.heightMm * scale;
  const topRails = rail.id === "none" ? [] : railPositions(scenario.rail.topCount, bodyW, railW);
  const sideRails = rail.id === "none" ? [] : railPositions(scenario.rail.sideCount, bodyH, railW);
  const fillInset = Math.max(10, profile.slotMm * scale * 1.4);

  return (
    <svg className="cross-section" viewBox={`0 0 ${width} ${height}`} role="img">
      <title>Extrusion cross section with rails and fill</title>
      <rect className="axis-grid" x={pad} y={pad} width={width - pad * 2} height={height - pad * 2} />
      <rect className="profile-body" x={x} y={y} width={bodyW} height={bodyH} rx="3" />
      <rect
        className={`fill-body fill-${fill.id}`}
        x={x + fillInset}
        y={y + fillInset}
        width={Math.max(0, bodyW - fillInset * 2)}
        height={Math.max(0, bodyH - fillInset * 2)}
        opacity={fill.id === "none" ? 0 : Math.max(0.12, scenario.fill.ratio)}
      />
      <TSlotGrooves x={x} y={y} width={bodyW} height={bodyH} slot={profile.slotMm * scale} />

      {topRails.map((offset, index) => (
        <rect
          className="rail-body"
          key={`top-${index}`}
          x={x + bodyW / 2 + offset - railW / 2}
          y={y - railH - 3}
          width={railW}
          height={railH}
          rx="2"
        />
      ))}

      {sideRails.map((offset, index) => (
        <rect
          className="rail-body side"
          key={`side-${index}`}
          x={index % 2 === 0 ? x - railH - 3 : x + bodyW + 3}
          y={y + bodyH / 2 + offset - railW / 2}
          width={railH}
          height={railW}
          rx="2"
        />
      ))}
    </svg>
  );
}

function TSlotGrooves({
  x,
  y,
  width,
  height,
  slot,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  slot: number;
}) {
  const groove = Math.max(4, slot);
  return (
    <g className="slot-grooves">
      <rect x={x + width / 2 - groove / 2} y={y - 1} width={groove} height={height + 2} />
      <rect x={x - 1} y={y + height / 2 - groove / 2} width={width + 2} height={groove} />
      <circle cx={x + width / 2} cy={y + height / 2} r={groove * 0.65} />
    </g>
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

function railPositions(count: number, bodySpan: number, railSpan: number) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const edge = Math.max(0, bodySpan / 2 - railSpan / 2 - 4);
  if (count === 2) return [-edge, edge];
  const step = (edge * 2) / (count - 1);
  return Array.from({ length: count }, (_, index) => -edge + index * step);
}
