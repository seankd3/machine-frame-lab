import type { ProfileSpec } from "../model/types";

export type ProfileShape = "single" | "double" | "triple" | "quad" | "double-quad";

interface ProfileGlyphProps {
  shape: ProfileShape;
  className?: string;
}

export function ProfileGlyph({ shape, className }: ProfileGlyphProps) {
  const cells = cellLayout(shape);
  const cellSize = 28;
  const gap = 2;
  const width = cells.cols * cellSize + (cells.cols - 1) * gap + 20;
  const height = cells.rows * cellSize + (cells.rows - 1) * gap + 20;

  return (
    <svg
      className={["profile-glyph", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${shapeLabel(shape)} T-slot profile`}
    >
      {Array.from({ length: cells.rows }).flatMap((_, row) =>
        Array.from({ length: cells.cols }).map((__, col) => (
          <Cell
            key={`${row}-${col}`}
            x={10 + col * (cellSize + gap)}
            y={10 + row * (cellSize + gap)}
            size={cellSize}
          />
        )),
      )}
      {shape === "quad" || shape === "double-quad" ? (
        <rect
          className="profile-glyph-void"
          x={width / 2 - cellSize * 0.58}
          y={height / 2 - cellSize * 0.58}
          width={cellSize * 1.16}
          height={cellSize * 1.16}
          rx="4"
        />
      ) : null}
      {shape === "double-quad" ? (
        <rect
          className="profile-glyph-void"
          x={width / 2 - cellSize * 0.5}
          y={height / 2 - cellSize * 1.32}
          width={cellSize}
          height={cellSize * 2.64}
          rx="5"
        />
      ) : null}
    </svg>
  );
}

export function HeightGlyph() {
  return (
    <svg className="height-glyph" viewBox="0 0 68 54" role="img" aria-label="Rail height">
      <Cell x={7} y={9} size={32} />
      <line x1="52" y1="9" x2="52" y2="41" />
      <path d="M 47 14 L 52 9 L 57 14" />
      <path d="M 47 36 L 52 41 L 57 36" />
    </svg>
  );
}

export function profileShape(profile: ProfileSpec): ProfileShape {
  const name = profile.name.toLowerCase();
  if (name.includes("double-quad")) return "double-quad";
  if (name.includes("triple")) return "triple";
  if (name.includes("double")) return "double";
  if (name.includes("quad")) return "quad";
  return "single";
}

export function shapeLabel(shape: ProfileShape) {
  const labels: Record<ProfileShape, string> = {
    single: "Single",
    double: "Double",
    triple: "Triple",
    quad: "Quad",
    "double-quad": "Base",
  };

  return labels[shape];
}

function Cell({ x, y, size }: { x: number; y: number; size: number }) {
  const center = x + size / 2;
  const mid = y + size / 2;
  const slot = size * 0.17;

  return (
    <g className="profile-glyph-cell">
      <rect x={x + 3} y={y + 3} width={size - 6} height={size - 6} rx="4" />
      <circle cx={center} cy={mid} r={size * 0.16} />
      <path d={`M ${x + 6} ${y + 6} L ${center} ${mid} L ${x + size - 6} ${y + 6}`} />
      <path d={`M ${x + 6} ${y + size - 6} L ${center} ${mid} L ${x + size - 6} ${y + size - 6}`} />
      <path d={`M ${center - slot} ${y + 3} H ${center + slot}`} />
      <path d={`M ${center - slot} ${y + size - 3} H ${center + slot}`} />
      <path d={`M ${x + 3} ${mid - slot} V ${mid + slot}`} />
      <path d={`M ${x + size - 3} ${mid - slot} V ${mid + slot}`} />
    </g>
  );
}

function cellLayout(shape: ProfileShape) {
  if (shape === "double") return { cols: 1, rows: 2 };
  if (shape === "triple") return { cols: 1, rows: 3 };
  if (shape === "quad") return { cols: 2, rows: 2 };
  if (shape === "double-quad") return { cols: 2, rows: 4 };
  return { cols: 1, rows: 1 };
}
