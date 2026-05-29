import { FileDown, Upload, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createDetectedProfile, profiles } from "../data/profiles";
import { parseMcmasterInput } from "../model/importParser";
import type { ProfileSpec } from "../model/types";
import { PanelSection, SelectField } from "./ControlField";

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
  const detection = useMemo(() => parseMcmasterInput(input), [input]);
  const canApply = Boolean(detection.widthMm && detection.heightMm);
  const profileOptions = [
    ...profiles.map((profile) => ({ value: profile.id, label: profile.name })),
    ...(customProfile ? [{ value: customProfile.id, label: customProfile.name }] : []),
  ];

  return (
    <PanelSection title="McMaster intake" icon={<FileDown size={18} />}>
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
        <span>{activeProfile.widthMm} x {activeProfile.heightMm} mm</span>
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
