import { planes, type Analysis, type Plane } from "../model/analysis";
import type { Support } from "../model/beam";
import { numbers } from "../model/design";
import { hz, um } from "../utils/format";
import type { Update } from "./ControlField";

const W = 760;
const X0 = 44;
const X1 = W - 44;
const STRIP = 78;
const SWING = 20;

const planeView: Record<Plane, { title: string; note: string }> = {
  vertical: { title: "Side view", note: "vertical bending" },
  horizontal: { title: "Top view", note: "horizontal bending" },
};

/** Both bending planes of the span on one exaggeration scale, with the carriage. */
export function BeamView({ analysis, update }: { analysis: Analysis; update: Update }) {
  const { design } = analysis;
  const station = design.stationPct / 100;
  const peak = Math.max(...planes.map((p) => Math.max(...analysis.planes[p].beam.staticShape.map(Math.abs))));
  const gain = peak > 0 ? SWING / peak : 0;
  const bx = (x: number) => X0 + x * (X1 - X0);
  const modes = analysis.planes.vertical.beam.modes.slice(0, 3);

  return (
    <figure className="beam-view">
      <figcaption>
        <span>Span</span>
        <strong>{design.spanMm} mm · deflection exaggerated, same scale both views</strong>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${STRIP * 2 + 12}`} role="img" aria-label="Deflected shape of the span in both planes">
        {planes.map((plane, i) => {
          const result = analysis.planes[plane];
          const y0 = i * (STRIP + 12) + STRIP / 2 + 4;
          const shape = result.beam.x.map((x, n) => `${n ? "L" : "M"}${bx(x).toFixed(1)} ${(y0 + result.beam.staticShape[n] * gain).toFixed(1)}`).join(" ");
          const toolIndex = result.beam.x.indexOf(station);
          const toolY = y0 + (result.beam.staticShape[toolIndex] ?? 0) * gain;
          return (
            <g key={plane} className={`strip strip-${plane}`}>
              <text className="strip-title" x={X0} y={y0 - STRIP / 2 + 10}>
                {planeView[plane].title} <tspan>{planeView[plane].note}</tspan>
              </text>
              <line className="datum" x1={X0} y1={y0} x2={X1} y2={y0} />
              <path className="deflected" d={shape} />
              <Support x={X0} y={y0} kind={design.support} side={-1} />
              <Support x={X1} y={y0} kind={design.support === "cantilever" ? "free" : design.support} side={1} />
              <g className="carriage" transform={`translate(${bx(station)} ${toolY})`}>
                <rect x={-14} y={-8} width={28} height={16} />
                <path d={`M0 ${-26} V${-10} M-4 ${-15} L0 ${-10} L4 ${-15}`} />
              </g>
              <text className="tool-readout" x={bx(station)} y={y0 + STRIP / 2 - 2} textAnchor={station > 0.85 ? "end" : station < 0.15 ? "start" : "middle"}>
                {um(result.peakUm)} peak
              </text>
            </g>
          );
        })}
      </svg>
      <label className="carriage-slider" style={{ marginInline: `${(X0 / W) * 100}%` }}>
        <span className="sr-only">Carriage position</span>
        <input
          type="range"
          min={numbers.stationPct.min}
          max={numbers.stationPct.max}
          step={numbers.stationPct.step}
          value={design.stationPct}
          onChange={(event) => update({ stationPct: Number(event.target.value) })}
        />
      </label>

      <div className="modes">
        {modes.map((mode, i) => {
          const d = analysis.planes.vertical.beam.x.map((x, n) => `${n ? "L" : "M"}${(x * 120).toFixed(1)} ${(20 - mode.shape[n] * 14).toFixed(1)}`).join(" ");
          return (
            <div className="mode" key={i}>
              <svg viewBox="-2 0 124 40" aria-hidden="true">
                <line x1={0} y1={20} x2={120} y2={20} />
                <path d={d} />
              </svg>
              <span>Mode {i + 1}</span>
              <strong>
                {hz(mode.hz)} <small>V</small> · {hz(analysis.planes.horizontal.beam.modes[i]?.hz ?? 0)} <small>H</small>
              </strong>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function Support({ x, y, kind, side }: { x: number; y: number; kind: Support | "free"; side: -1 | 1 }) {
  if (kind === "free") return <circle className="support free" cx={x} cy={y} r={3} />;
  if (kind === "pinned") {
    return (
      <g className="support">
        <path d={`M${x} ${y} L${x - 9} ${y + 15} H${x + 9} Z`} />
        <line x1={x - 13} y1={y + 19} x2={x + 13} y2={y + 19} />
      </g>
    );
  }
  const wall = x + side * 4;
  return (
    <g className="support">
      <line x1={wall} y1={y - 20} x2={wall} y2={y + 20} />
      {[-16, -8, 0, 8, 16].map((o) => (
        <line key={o} x1={wall} y1={y + o} x2={wall + side * 8} y2={y + o + 6} />
      ))}
    </g>
  );
}
