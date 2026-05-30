import type { ProfileSpec } from "../model/types";
import profileSheetUrl from "../assets/8020-Fractional-Profiles-1.svg";

export type ProfileShape = "single" | "double" | "triple" | "quad" | "double-quad";

interface ProfileGlyphProps {
  shape: ProfileShape;
  className?: string;
}

const sheet = {
  width: 448.91787,
  height: 228.88645,
};

const sourceProfiles = {
  compact: { viewBox: "14 99 117 115", aspect: 1 },
  heavy: { viewBox: "226 46 169 168", aspect: 1 },
};

export function ProfileGlyph({ shape, className }: ProfileGlyphProps) {
  const cells = cellLayout(shape);
  const cellSize = shape === "quad" || shape === "double-quad" ? 58 : 54;
  const gap = 4;
  const padding = 4;
  const width = cells.cols * cellSize + (cells.cols - 1) * gap + padding * 2;
  const height = cells.rows * cellSize + (cells.rows - 1) * gap + padding * 2;
  const source = shape === "quad" || shape === "double-quad" ? sourceProfiles.heavy : sourceProfiles.compact;

  return (
    <svg
      className={["profile-glyph", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${shapeLabel(shape)} T-slot profile`}
    >
      {Array.from({ length: cells.rows }).flatMap((_, row) =>
        Array.from({ length: cells.cols }).map((__, col) => (
          <SourceProfile
            key={`${row}-${col}`}
            source={source}
            x={padding + col * (cellSize + gap)}
            y={padding + row * (cellSize + gap)}
            size={cellSize}
          />
        )),
      )}
    </svg>
  );
}

export function HeightGlyph() {
  return (
    <svg className="height-glyph" viewBox="0 0 68 54" role="img" aria-label="Rail height">
      <SourceProfile source={sourceProfiles.compact} x={7} y={9} size={32} />
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

function SourceProfile({
  source,
  x,
  y,
  size,
}: {
  source: { viewBox: string; aspect: number };
  x: number;
  y: number;
  size: number;
}) {
  return (
    <svg
      className="profile-source-crop"
      x={x}
      y={y}
      width={size * source.aspect}
      height={size}
      viewBox={source.viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      <image
        className="profile-source-image"
        href={profileSheetUrl}
        x="0"
        y="0"
        width={sheet.width}
        height={sheet.height}
      />
    </svg>
  );
}

function cellLayout(shape: ProfileShape) {
  if (shape === "double") return { cols: 1, rows: 2 };
  if (shape === "triple") return { cols: 1, rows: 3 };
  if (shape === "quad") return { cols: 1, rows: 1 };
  if (shape === "double-quad") return { cols: 1, rows: 2 };
  return { cols: 1, rows: 1 };
}
