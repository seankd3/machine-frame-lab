import type { ScenarioAnalysis } from "../model/types";
import { formatFrequency } from "../utils/format";

interface ModeShapeChartProps {
  analysis: ScenarioAnalysis;
}

export function ModeShapeChart({ analysis }: ModeShapeChartProps) {
  return (
    <section className="mode-strip" aria-label="Mode shapes">
      {analysis.beam.modeShapes.map((shape) => {
        const path = shape.points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 180} ${34 - point.y * 22}`)
          .join(" ");

        return (
          <article key={shape.mode}>
            <div>
              <span>Mode {shape.mode}</span>
              <strong>{formatFrequency(shape.frequencyHz)}</strong>
            </div>
            <svg viewBox="0 0 180 68" role="img">
              <title>Mode {shape.mode} shape</title>
              <line x1="0" y1="34" x2="180" y2="34" />
              <path d={path} />
            </svg>
          </article>
        );
      })}
    </section>
  );
}
