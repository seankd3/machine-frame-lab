import { getFill } from "../data/materials";
import { getRail } from "../data/rails";
import type { MachineScenario, ProfileSpec } from "../model/types";
import {
  profileCellLayout,
  ProfileSourceCrop,
  profileShape,
  profileSourceForShape,
} from "./ProfileGlyph";

interface CadProfileCutawayProps {
  profile: ProfileSpec;
  scenario: MachineScenario;
}

const view = { width: 420, height: 320 };

export function CadProfileCutaway({ profile, scenario }: CadProfileCutawayProps) {
  const shape = profileShape(profile);
  const cells = profileCellLayout(shape);
  const source = profileSourceForShape(shape);
  const rail = getRail(scenario.rail.modelId);
  const fill = getFill(scenario.fill.mediumId);
  const hasRails = rail.id !== "none";
  const maxCell = cells.rows > 2 ? 78 : 104;
  const cellSize = Math.min(maxCell, 218 / cells.rows);
  const gap = Math.max(2.5, cellSize * 0.035);
  const drawingW = cells.cols * cellSize + (cells.cols - 1) * gap;
  const drawingH = cells.rows * cellSize + (cells.rows - 1) * gap;
  const drawingX = 146 - drawingW / 2;
  const drawingY = 58 + (226 - drawingH) / 2;
  const moduleWidthMm = profile.widthMm / cells.cols;
  const pxPerMm = cellSize / moduleWidthMm;
  const railW = clamp(rail.widthMm * pxPerMm, 30, cellSize * 0.86);
  const railH = clamp(rail.heightMm * pxPerMm, 12, 32);
  const topRails = hasRails ? railPositions(scenario.rail.topCount, drawingW, railW) : [];
  const sideRails = hasRails ? railPositions(scenario.rail.sideCount, drawingH, railW) : [];
  const fillOpacity = fill.id === "none" ? 0 : Math.max(0.14, scenario.fill.ratio * 0.55);
  const cavityInset = profile.construction === "hollow" ? 0.28 : 0.37;
  const widthDimensionY = Math.min(drawingY + drawingH + 16, view.height - 24);

  return (
    <svg className="cad-cutaway" viewBox={`0 0 ${view.width} ${view.height}`} role="img">
      <title>CAD-style extrusion cutaway with rails and fill media</title>
      <defs>
        <marker id="cad-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path className="cad-arrow-head" d="M 0 0 L 7 3.5 L 0 7 z" />
        </marker>
      </defs>

      <rect className="cad-plate" x="22" y="22" width="246" height="270" />
      <g className="cad-fill-set" opacity={fillOpacity}>
        {Array.from({ length: cells.rows }).flatMap((_, row) =>
          Array.from({ length: cells.cols }).map((__, col) => {
            const x = drawingX + col * (cellSize + gap) + cellSize * cavityInset;
            const y = drawingY + row * (cellSize + gap) + cellSize * cavityInset;
            const size = cellSize * (1 - cavityInset * 2);

            return (
              <rect
                key={`${row}-${col}`}
                className={`cad-fill fill-${fill.id}`}
                x={x}
                y={y}
                width={size}
                height={size}
                rx="4"
              />
            );
          }),
        )}
      </g>

      <g className="cad-profile-stack">
        {Array.from({ length: cells.rows }).flatMap((_, row) =>
          Array.from({ length: cells.cols }).map((__, col) => (
            <ProfileSourceCrop
              key={`${row}-${col}`}
              source={source}
              x={drawingX + col * (cellSize + gap)}
              y={drawingY + row * (cellSize + gap)}
              size={cellSize}
              className="cad-profile-source"
              imageClassName="cad-profile-image"
            />
          )),
        )}
      </g>

      {topRails.map((offset, index) => (
        <LinearRail
          key={`top-${index}`}
          x={drawingX + drawingW / 2 + offset - railW / 2}
          y={drawingY - railH - 10}
          width={railW}
          height={railH}
        />
      ))}

      {sideRails.map((offset, index) => (
        <LinearRail
          key={`side-${index}`}
          x={index % 2 === 0 ? drawingX - railH - 10 : drawingX + drawingW + 10}
          y={drawingY + drawingH / 2 + offset - railW / 2}
          width={railW}
          height={railH}
          rotate={index % 2 === 0 ? -90 : 90}
        />
      ))}

      <DimensionLine
        x1={drawingX}
        y1={widthDimensionY}
        x2={drawingX + drawingW}
        y2={widthDimensionY}
        label={`${formatMm(profile.widthMm)} mm`}
      />
      <DimensionLine
        x1={drawingX + drawingW + 24}
        y1={drawingY}
        x2={drawingX + drawingW + 24}
        y2={drawingY + drawingH}
        label={`${formatMm(profile.heightMm)} mm`}
        vertical
      />

      <g className="cad-callouts">
        <text x="296" y="64">Profile section</text>
        <text x="296" y="88">{profile.partNumber ? `McMaster ${profile.partNumber}` : profile.family}</text>
        <text x="296" y="124">{formatMm(profile.slotMm)} mm T-slot</text>
        <text x="296" y="148">{profile.construction ?? "profile"} body</text>
        <text x="296" y="184">{hasRails ? rail.name : "No rail attached"}</text>
        <text x="296" y="208">{fill.id === "none" ? "No fill" : `${fill.name} fill`}</text>
      </g>
    </svg>
  );
}

function LinearRail({
  x,
  y,
  width,
  height,
  rotate,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
}) {
  const transform = rotate
    ? `translate(${x} ${y}) rotate(${rotate})`
    : `translate(${x} ${y})`;

  return (
    <g className="cad-rail" transform={transform}>
      <rect x="0" y="0" width={width} height={height} rx="2" />
      <line x1={width * 0.18} y1="2" x2={width * 0.18} y2={height - 2} />
      <line x1={width * 0.82} y1="2" x2={width * 0.82} y2={height - 2} />
      <path d={`M ${width * 0.28} ${height * 0.5} H ${width * 0.72}`} />
      <circle cx={width * 0.34} cy={height * 0.5} r={Math.max(2, height * 0.12)} />
      <circle cx={width * 0.66} cy={height * 0.5} r={Math.max(2, height * 0.12)} />
    </g>
  );
}

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  vertical?: boolean;
}) {
  return (
    <g className="cad-dimension">
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#cad-arrow)" markerEnd="url(#cad-arrow)" />
      <text
        x={vertical ? x1 + 12 : (x1 + x2) / 2}
        y={vertical ? (y1 + y2) / 2 : y1 + 12}
        transform={vertical ? `rotate(90 ${x1 + 12} ${(y1 + y2) / 2})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function railPositions(count: number, bodySpan: number, railSpan: number) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const edge = Math.max(0, bodySpan / 2 - railSpan / 2 - 5);
  if (count === 2) return [-edge, edge];
  const step = (edge * 2) / (count - 1);

  return Array.from({ length: count }, (_, index) => -edge + index * step);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMm(value: number) {
  return Number(value.toFixed(value % 1 ? 1 : 0));
}
