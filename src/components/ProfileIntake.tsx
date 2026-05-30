import { FileDown, Upload, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createDetectedProfile, profiles } from "../data/profiles";
import { parseMcmasterInput } from "../model/importParser";
import type { ProfileSpec } from "../model/types";
import { PanelSection, SelectField } from "./ControlField";
import {
  heightKey,
  ProfileVisualPicker,
} from "./ProfileVisualPicker";
import { profileShape, type ProfileShape } from "./ProfileGlyph";

interface ProfileIntakeProps {
  activeProfile: ProfileSpec;
  customProfile: ProfileSpec | null;
  onProfileChange: (profileId: string) => void;
  onApplyDetectedProfile: (profile: ProfileSpec) => void;
}

export function ProfileIntake({
  activeProfile,
  customProfile,
  onProfileChange,
  onApplyDetectedProfile,
}: ProfileIntakeProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [shapeFilter, setShapeFilter] = useState<ProfileShape | "all">("all");
  const [systemFilter, setSystemFilter] = useState<"all" | "metric" | "inch">("all");
  const [heightFilter, setHeightFilter] = useState<string | null>(null);
  const detection = useMemo(() => parseMcmasterInput(input), [input]);
  const canApply = Boolean(detection.widthMm && detection.heightMm);
  const visibleProfiles = useMemo(
    () =>
      filterProfiles(profiles, {
        shape: shapeFilter,
        system: systemFilter,
        height: heightFilter,
      }),
    [shapeFilter, systemFilter, heightFilter],
  );
  const optionProfiles = visibleProfiles.some((profile) => profile.id === activeProfile.id)
    ? visibleProfiles
    : [activeProfile, ...visibleProfiles];
  const profileOptions = [
    ...optionProfiles.map((profile) => ({ value: profile.id, label: profile.name })),
    ...(customProfile && !optionProfiles.some((profile) => profile.id === customProfile.id)
      ? [{ value: customProfile.id, label: customProfile.name }]
      : []),
  ];
  const applyFilters = (nextFilters: {
    shape?: ProfileShape | "all";
    system?: "all" | "metric" | "inch";
    height?: string | null;
  }) => {
    const filters = {
      shape: nextFilters.shape ?? shapeFilter,
      system: nextFilters.system ?? systemFilter,
      height: nextFilters.height !== undefined ? nextFilters.height : heightFilter,
    };
    let matches = filterProfiles(profiles, filters);

    if (matches.length === 0 && filters.height) {
      filters.height = null;
      matches = filterProfiles(profiles, filters);
    }

    setShapeFilter(filters.shape);
    setSystemFilter(filters.system);
    setHeightFilter(filters.height);

    if (matches.length > 0 && !matches.some((profile) => profile.id === activeProfile.id)) {
      onProfileChange(matches[0].id);
    }
  };

  return (
    <PanelSection title="McMaster intake" icon={<FileDown size={18} />}>
      <ProfileVisualPicker
        activeProfile={activeProfile}
        profiles={profiles}
        shapeFilter={shapeFilter}
        systemFilter={systemFilter}
        heightFilter={heightFilter}
        matchingCount={visibleProfiles.length}
        onShapeChange={(shape) => applyFilters({ shape })}
        onSystemChange={(system) => applyFilters({ system })}
        onHeightChange={(height) => applyFilters({ height })}
      />

      <SelectField
        label="Seed profile"
        value={activeProfile.id}
        options={profileOptions}
        onChange={onProfileChange}
      />

      <label className="control-field">
        <span>Product row or URL</span>
        <textarea
          value={input}
          rows={3}
          placeholder="Paste McMaster part row, URL, drawing title, or CAD file name"
          onChange={(event) => setInput(event.target.value)}
        />
      </label>

      <div className="intake-actions">
        <label className="icon-button" title="Attach CAD, drawing, DXF, STEP, PDF">
          <Upload size={17} />
          <input
            type="file"
            multiple
            accept=".step,.stp,.dxf,.dwg,.pdf,.zip,.sldprt"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        <button
          className="text-button"
          type="button"
          disabled={!canApply}
          onClick={() => onApplyDetectedProfile(createDetectedProfile(detection, activeProfile))}
        >
          <Wand2 size={16} />
          Apply detected profile
        </button>
      </div>

      <div className="source-stack">
        {activeProfile.partNumber && activeProfile.sourceUrl ? (
          <a href={activeProfile.sourceUrl} target="_blank" rel="noreferrer">
            McMaster {activeProfile.partNumber}
          </a>
        ) : null}
        <span>{formatMm(activeProfile.widthMm)} x {formatMm(activeProfile.heightMm)} mm</span>
        {activeProfile.construction ? <span>{activeProfile.construction}</span> : null}
        {activeProfile.texture ? <span>{activeProfile.texture}</span> : null}
        <span>
          {activeProfile.slotMm.toFixed(activeProfile.slotMm % 1 ? 1 : 0)} mm slot
          {activeProfile.slotDepthMm
            ? ` / ${activeProfile.slotDepthMm.toFixed(activeProfile.slotDepthMm % 1 ? 1 : 0)} mm deep`
            : ""}
        </span>
        <span>{activeProfile.massKgM.toFixed(2)} kg/m</span>
        <span>{activeProfile.source}</span>
      </div>

      {(detection.notes.length > 0 || files.length > 0) && (
        <div className="evidence-list" aria-label="Imported source evidence">
          {detection.notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
          {files.map((file) => (
            <span key={file.name}>{file.name}</span>
          ))}
        </div>
      )}
    </PanelSection>
  );
}

function formatMm(value: number) {
  return Number(value.toFixed(value % 1 ? 1 : 0));
}

function filterProfiles(
  profileList: ProfileSpec[],
  filters: {
    shape: ProfileShape | "all";
    system: "all" | "metric" | "inch";
    height: string | null;
  },
) {
  return profileList
    .filter((profile) => filters.shape === "all" || profileShape(profile) === filters.shape)
    .filter((profile) => filters.system === "all" || profile.system === filters.system)
    .filter((profile) => !filters.height || heightKey(profile) === filters.height);
}
