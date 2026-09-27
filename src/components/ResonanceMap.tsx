import { useMemo, type PointerEvent } from "react";
import { peakAtRpm, planes, type Analysis } from "../model/analysis";
import { numbers } from "../model/design";
import { rpm as fmtRpm, um } from "../utils/format";
import type { Update } from "./ControlField";

const W = 440;
const H = 230;
const M = { l: 42, r: 12, t: 14, b: 30 };
const SAMPLES = 240;

/**
 * Peak tool deflection against spindle speed in both planes. Peaks are where
 * tooth-pass frequency meets a bending mode; red bands miss the target.
 */
export function ResonanceMap({ analysis, update }: { analysis: Analysis; update: Update }) {
  const { design } = analysis;
  const { min, max, step } = numbers.rpm;

  const curves = useMemo(() => {
    const speeds = Array.from({ length: SAMPLES }, (_, i) => min + ((max - min) * i) / (SAMPLES - 1));
    return {
      speeds,
      vertical: speeds.map((s) => peakAtRpm(analysis, "vertical", s)),
      horizontal: speeds.map((s) => peakAtRpm(analysis, "horizontal", s)),
    };
  }, [analysis, min, max]);

  const all = [...curves.vertical, ...curves.horizontal, design.maxUm];
  const lo = Math.log10(Math.max(0.01, Math.min(...all) * 0.7));
  const hi = Math.log10(Math.max(...all) * 1.4);
  const x = (s: number) => M.l + ((s - min) / (max - min)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (Math.log10(Math.max(v, 1e-6)) - lo) / (hi - lo)) * (H - M.t - M.b);
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(curves.speeds[i]).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const bands: Array<[number, number]> = [];
  curves.speeds.forEach((s, i) => {
    const bad = Math.max(curves.vertical[i], curves.horizontal[i]) > design.maxUm;
    const last = bands[bands.length - 1];
    if (bad && last && last[1] === curves.speeds[i - 1]) last[1] = s;
    else if (bad) bands.push([s, s]);
  });

  const ticks = logTicks(lo, hi);
  const setFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const sx = ((event.clientX - box.left) / box.width) * W;
    const s = min + ((sx - M.l) / (W - M.l - M.r)) * (max - min);
    update({ rpm: Math.min(max, Math.max(min, Math.round(s / step) * step)) });
  };

  return (
    <figure className="resonance">
      <figcaption>
        <span>Spindle speed sweep</span>
        <strong>
          tooth pass {Math.round(analysis.toothHz)} Hz at {fmtRpm(design.rpm)}
        </strong>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Peak tool deflection against spindle speed; click to set spindle speed"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPointer(event);
        }}
        onPointerMove={(event) => event.buttons === 1 && setFromPointer(event)}
      >
        {bands.map(([a, b]) => (
          <rect key={a} className="avoid" x={x(a) - 1} y={M.t} width={Math.max(2, x(b) - x(a) + 2)} height={H - M.t - M.b} />
        ))}
        {ticks.map((t) => (
          <g key={t} className="grid">
            <line x1={M.l} y1={y(t)} x2={W - M.r} y2={y(t)} />
            <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end">
              {t >= 1 ? t : t.toFixed(t >= 0.1 ? 1 : 2)}
            </text>
          </g>
        ))}
        {[5000, 10000, 15000, 20000, 25000, 30000].filter((s) => s <= max).map((s) => (
          <text key={s} className="axis" x={x(s)} y={H - 10} textAnchor="middle">
            {s / 1000}k
          </text>
        ))}
        <text className="axis unit" x={M.l - 6} y={M.t - 3} textAnchor="end">
          µm
        </text>
        <line className="target" x1={M.l} y1={y(design.maxUm)} x2={W - M.r} y2={y(design.maxUm)} />
        <text className="target-label" x={W - M.r - 2} y={y(design.maxUm) - 5} textAnchor="end">
          target {um(design.maxUm)}
        </text>
        {planes.map((p) => (
          <path key={p} className={`curve curve-${p}`} d={path(curves[p])} />
        ))}
        <line className="now" x1={x(design.rpm)} y1={M.t} x2={x(design.rpm)} y2={H - M.b} />
        {planes.map((p) => (
          <circle key={p} className={`dot curve-${p}`} cx={x(design.rpm)} cy={y(analysis.planes[p].peakUm)} r={3.5} />
        ))}
      </svg>
      <div className="legend">
        <span className="curve-vertical">Vertical {um(analysis.planes.vertical.peakUm)}</span>
        <span className="curve-horizontal">Horizontal {um(analysis.planes.horizontal.peakUm)}</span>
        <span className="avoid-key">Misses target</span>
      </div>
    </figure>
  );
}

function logTicks(lo: number, hi: number) {
  const ticks: number[] = [];
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
    for (const m of hi - lo > 2 ? [1] : [1, 2, 5]) {
      const v = m * 10 ** e;
      if (Math.log10(v) >= lo && Math.log10(v) <= hi) ticks.push(v);
    }
  }
  return ticks;
}
