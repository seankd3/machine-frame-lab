import type { ProfileSpec } from "../model/types";

export type ProfileShape = "single" | "double" | "triple" | "quad" | "double-quad";
export type ProfileSource = {
  url: string;
  viewBox: string;
  width: number;
  height: number;
  aspect: number;
};

interface ProfileGlyphProps {
  shape: ProfileShape;
  className?: string;
}

const mcmasterProfileSources: Record<ProfileShape, ProfileSource> = {
  single: source(
    "https://www.mcmaster.com/prerenderstable/mvPRE/Contents/BOSS1/1744693200000/d5251e63-c8ec-485f-831f-baeff9028907/4212575733954.svg",
    "0 0 43.2293 42.7119",
  ),
  double: source(
    "https://www.mcmaster.com/prerenderstable/mvPRE/Contents/BOSS1/1744693200000/a935f390-e7c8-4913-8256-fcfc4d4e5450/1097894526489.svg",
    "0 0 44 90.2889",
  ),
  triple: source(
    "https://www.mcmaster.com/prerenderstable/mvPRE/Contents/BOSS1/1744693200000/471c4a4f-7737-4d66-b32a-1017fa59e1bd/205912552540.svg",
    "0 0 44.16 127.9405",
  ),
  quad: source(
    "https://www.mcmaster.com/prerenderstable/mvPRE/Contents/BOSS1/1744693200000/9d68464a-14fd-43b8-a0a3-b6f7bc517b74/3895473700269.svg",
    "0 0 93 93",
  ),
  "double-quad": source(
    "https://www.mcmaster.com/prerenderstable/mvPRE/Contents/BOSS1/1744693200000/ddd2f878-8de2-4d62-a884-75a8f228ad0e/7749718419406.svg",
    "0 0 94.9 190",
  ),
};

export function ProfileGlyph({ shape, className }: ProfileGlyphProps) {
  const source = profileSourceForShape(shape);

  return (
    <svg
      className={["profile-glyph", className].filter(Boolean).join(" ")}
      viewBox={source.viewBox}
      role="img"
      aria-label={`${shapeLabel(shape)} T-slot profile`}
    >
      <SourceImage source={source} />
    </svg>
  );
}

export function HeightGlyph() {
  return (
    <svg className="height-glyph" viewBox="0 0 68 54" role="img" aria-label="Rail height">
      <ProfileSourceCrop source={mcmasterProfileSources.single} x={7} y={9} height={32} />
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
    "double-quad": "Double Quad",
  };

  return labels[shape];
}

export function profileSourceForShape(shape: ProfileShape): ProfileSource {
  return mcmasterProfileSources[shape];
}

export function profileCellLayout(shape: ProfileShape) {
  if (shape === "double") return { cols: 1, rows: 2 };
  if (shape === "triple") return { cols: 1, rows: 3 };
  if (shape === "quad") return { cols: 1, rows: 1 };
  if (shape === "double-quad") return { cols: 1, rows: 2 };
  return { cols: 1, rows: 1 };
}

export function ProfileSourceCrop({
  source,
  x,
  y,
  height,
  width = height * source.aspect,
  className = "profile-source-crop",
  imageClassName = "profile-source-image",
}: {
  source: ProfileSource;
  x: number;
  y: number;
  height: number;
  width?: number;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={source.viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      <SourceImage source={source} imageClassName={imageClassName} />
    </svg>
  );
}

function SourceImage({
  source,
  imageClassName = "profile-source-image",
}: {
  source: ProfileSource;
  imageClassName?: string;
}) {
  return (
    <image
      className={imageClassName}
      href={source.url}
      x="0"
      y="0"
      width={source.width}
      height={source.height}
    />
  );
}

function source(url: string, viewBox: string): ProfileSource {
  const [, , width, height] = viewBox.split(/\s+/).map(Number);

  return {
    url,
    viewBox,
    width,
    height,
    aspect: width / height,
  };
}
