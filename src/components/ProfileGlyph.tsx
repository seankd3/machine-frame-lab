import type { ProfileSpec } from "../model/types";

export type ProfileShape = "single" | "double" | "triple" | "quad" | "double-quad";

interface ProfileGlyphProps {
  shape: ProfileShape;
  className?: string;
}

interface ProfileSectionArtProps {
  shape: ProfileShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function ProfileGlyph({ shape, className }: ProfileGlyphProps) {
  const { width, height } = sectionSize(shape);

  return (
    <svg
      className={["profile-glyph", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${shapeLabel(shape)} T-slot profile`}
    >
      <ProfileSectionGeometry shape={shape} />
    </svg>
  );
}

export function ProfileSectionArt({
  shape,
  x = 0,
  y = 0,
  width,
  height,
  className = "profile-section-art",
}: ProfileSectionArtProps) {
  const size = sectionSize(shape);

  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={width ?? size.width}
      height={height ?? size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <ProfileSectionGeometry shape={shape} />
    </svg>
  );
}

export function HeightGlyph() {
  return (
    <svg className="height-glyph" viewBox="0 0 68 54" role="img" aria-label="Rail height">
      <ProfileSectionArt shape="single" x={7} y={9} width={32} height={32} />
      <line x1="52" y1="9" x2="52" y2="41" />
      <path className="height-arrow" d="M 47 14 L 52 9 L 57 14 M 47 36 L 52 41 L 57 36" />
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
    "double-quad": "Double Quad",
  };

  return labels[shape];
}

export function profileCellLayout(shape: ProfileShape) {
  if (shape === "double") return { cols: 1, rows: 2 };
  if (shape === "triple") return { cols: 1, rows: 3 };
  if (shape === "quad") return { cols: 2, rows: 2 };
  if (shape === "double-quad") return { cols: 2, rows: 4 };
  return { cols: 1, rows: 1 };
}

function ProfileSectionGeometry({ shape }: { shape: ProfileShape }) {
  const { cols, rows } = profileCellLayout(shape);
  const width = cols * 100;
  const height = rows * 100;
  const cavities = Array.from({ length: cols * rows }, (_, index) => ({
    col: index % cols,
    row: Math.floor(index / cols),
  }));

  return (
    <g className="profile-section-geometry">
      <rect className="profile-section-body" x="4" y="4" width={width - 8} height={height - 8} />
      {cavities.map(({ col, row }) => {
        const cx = col * 100 + 50;
        const cy = row * 100 + 50;
        return (
          <g key={`${col}-${row}`}>
            <path
              className="profile-section-cavity"
              d={`M ${cx - 19} ${cy - 25} H ${cx + 19} L ${cx + 25} ${cy - 19} V ${cy + 19} L ${cx + 19} ${cy + 25} H ${cx - 19} L ${cx - 25} ${cy + 19} V ${cy - 19} Z`}
            />
            <path
              className="profile-section-rib"
              d={`M ${cx - 25} ${cy - 19} L ${cx - 42} ${cy - 36} M ${cx + 25} ${cy - 19} L ${cx + 42} ${cy - 36} M ${cx - 25} ${cy + 19} L ${cx - 42} ${cy + 36} M ${cx + 25} ${cy + 19} L ${cx + 42} ${cy + 36}`}
            />
          </g>
        );
      })}
      {Array.from({ length: cols }, (_, col) => {
        const cx = col * 100 + 50;
        return (
          <g key={`horizontal-${col}`}>
            <path className="profile-section-slot" d={`M ${cx - 15} 4 H ${cx + 15} V 12 H ${cx + 7} L ${cx} 22 L ${cx - 7} 12 H ${cx - 15} Z`} />
            <path className="profile-section-slot" d={`M ${cx - 15} ${height - 4} H ${cx + 15} V ${height - 12} H ${cx + 7} L ${cx} ${height - 22} L ${cx - 7} ${height - 12} H ${cx - 15} Z`} />
          </g>
        );
      })}
      {Array.from({ length: rows }, (_, row) => {
        const cy = row * 100 + 50;
        return (
          <g key={`vertical-${row}`}>
            <path className="profile-section-slot" d={`M 4 ${cy - 15} V ${cy + 15} H 12 V ${cy + 7} L 22 ${cy} L 12 ${cy - 7} V ${cy - 15} Z`} />
            <path className="profile-section-slot" d={`M ${width - 4} ${cy - 15} V ${cy + 15} H ${width - 12} V ${cy + 7} L ${width - 22} ${cy} L ${width - 12} ${cy - 7} V ${cy - 15} Z`} />
          </g>
        );
      })}
      {cols > 1 ? <line className="profile-section-web" x1="100" y1="28" x2="100" y2={height - 28} /> : null}
      {Array.from({ length: rows - 1 }, (_, index) => (
        <line
          className="profile-section-web"
          key={`row-web-${index}`}
          x1="28"
          y1={(index + 1) * 100}
          x2={width - 28}
          y2={(index + 1) * 100}
        />
      ))}
    </g>
  );
}

function sectionSize(shape: ProfileShape) {
  const { cols, rows } = profileCellLayout(shape);
  return { width: cols * 100, height: rows * 100 };
}
