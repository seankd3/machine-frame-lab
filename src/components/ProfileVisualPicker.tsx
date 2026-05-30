import type { ProfileSpec } from "../model/types";
import { HeightGlyph, ProfileGlyph, profileShape, shapeLabel, type ProfileShape } from "./ProfileGlyph";

type SystemFilter = "all" | "metric" | "inch";
type HeightFilter = string | null;

interface ProfileVisualPickerProps {
  activeProfile: ProfileSpec;
  profiles: ProfileSpec[];
  shapeFilter: ProfileShape | "all";
  systemFilter: SystemFilter;
  heightFilter: HeightFilter;
  matchingCount: number;
  onShapeChange: (shape: ProfileShape | "all") => void;
  onSystemChange: (system: SystemFilter) => void;
  onHeightChange: (height: HeightFilter) => void;
}

const shapes: ProfileShape[] = ["single", "double", "triple", "quad", "double-quad"];

export function ProfileVisualPicker({
  activeProfile,
  profiles,
  shapeFilter,
  systemFilter,
  heightFilter,
  matchingCount,
  onShapeChange,
  onSystemChange,
  onHeightChange,
}: ProfileVisualPickerProps) {
  const heights = uniqueHeights(profiles, shapeFilter, systemFilter);
  const activeShape = profileShape(activeProfile);

  return (
    <div className="visual-picker" aria-label="Visual McMaster profile filters">
      <div className="picker-row-title">
        <span>T-slotted framing rail profile</span>
        <strong>{matchingCount} matches</strong>
      </div>

      <div className="shape-tile-grid">
        {shapes.map((shape) => (
          <button
            type="button"
            className={[
              "shape-tile",
              shapeFilter === shape ? "active" : "",
              shapeFilter === "all" && activeShape === shape ? "hinted" : "",
            ].join(" ")}
            key={shape}
            onClick={() => onShapeChange(shapeFilter === shape ? "all" : shape)}
          >
            <ProfileGlyph shape={shape} />
            <span>{shapeLabel(shape)}</span>
          </button>
        ))}
      </div>

      <div className="picker-row-title">
        <span>System of measurement</span>
      </div>
      <div className="system-toggle">
        {(["all", "inch", "metric"] as SystemFilter[]).map((system) => (
          <button
            type="button"
            key={system}
            className={systemFilter === system ? "active" : ""}
            onClick={() => onSystemChange(system)}
          >
            {system === "all" ? "All" : titleCase(system)}
          </button>
        ))}
      </div>

      <div className="picker-row-title height-title">
        <span>Rail height</span>
        <HeightGlyph />
      </div>
      <div className="height-chip-grid">
        <button
          type="button"
          className={!heightFilter ? "active" : ""}
          onClick={() => onHeightChange(null)}
        >
          Any
        </button>
        {heights.map((height) => (
          <button
            type="button"
            className={heightFilter === height.key ? "active" : ""}
            key={height.key}
            onClick={() => onHeightChange(heightFilter === height.key ? null : height.key)}
          >
            {height.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function uniqueHeights(
  profiles: ProfileSpec[],
  shapeFilter: ProfileShape | "all",
  systemFilter: SystemFilter,
) {
  const heights = new Map<string, { key: string; label: string; heightMm: number }>();

  profiles
    .filter((profile) => shapeFilter === "all" || profileShape(profile) === shapeFilter)
    .filter((profile) => systemFilter === "all" || profile.system === systemFilter)
    .forEach((profile) => {
      const key = heightKey(profile);
      heights.set(key, {
        key,
        label: heightLabel(profile),
        heightMm: profile.heightMm,
      });
    });

  return [...heights.values()].sort((a, b) => a.heightMm - b.heightMm);
}

export function heightKey(profile: ProfileSpec) {
  return `${profile.system ?? "metric"}-${Math.round(profile.heightMm * 10) / 10}`;
}

export function heightLabel(profile: ProfileSpec) {
  if (profile.system === "inch") {
    return `${formatInch(profile.heightMm / 25.4)}"`;
  }

  return `${Number(profile.heightMm.toFixed(profile.heightMm % 1 ? 1 : 0))} mm`;
}

function formatInch(value: number) {
  const rounded = Math.round(value * 2) / 2;
  if (rounded % 1 === 0) return String(rounded);
  return `${Math.floor(rounded)} 1/2`;
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
