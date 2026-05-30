import { SlidersHorizontal } from "lucide-react";
import { loadPresets } from "../data/loadPresets";
import type { LoadAxis, MachineScenario, SupportType } from "../model/types";
import { NumberField, PanelSection, SegmentedControl, SelectField } from "./ControlField";

interface ScenarioControlsProps {
  scenario: MachineScenario;
  onScenarioChange: (scenario: MachineScenario) => void;
}

export function ScenarioControls({ scenario, onScenarioChange }: ScenarioControlsProps) {
  const update = (patch: Partial<MachineScenario>) => onScenarioChange({ ...scenario, ...patch });

  return (
    <PanelSection title="2 Define load" icon={<SlidersHorizontal size={18} />} className="load-section">
      <SelectField
        label="Preset"
        value="custom"
        options={[
          { value: "custom", label: "Custom" },
          ...loadPresets.map((preset) => ({ value: preset.id, label: preset.name })),
        ]}
        onChange={(presetId) => {
          const preset = loadPresets.find((item) => item.id === presetId);
          if (!preset) return;
          update({
            loadN: preset.loadN,
            rpm: preset.rpm,
            flutes: preset.flutes,
            movingMassKg: preset.movingMassKg,
            axis: preset.axis,
          });
        }}
      />

      <NumberField
        label="Span"
        value={scenario.spanMm}
        min={250}
        max={2200}
        step={25}
        unit="mm"
        onChange={(spanMm) => update({ spanMm })}
      />
      <NumberField
        label="Force"
        value={scenario.loadN}
        min={50}
        max={3000}
        step={25}
        unit="N"
        onChange={(loadN) => update({ loadN })}
      />
      <NumberField
        label="Load position"
        value={scenario.loadPositionPct}
        min={5}
        max={95}
        step={5}
        unit="%"
        onChange={(loadPositionPct) => update({ loadPositionPct })}
      />

      <SegmentedControl<LoadAxis>
        label="Bending axis"
        value={scenario.axis}
        options={[
          { value: "vertical", label: "Vertical" },
          { value: "lateral", label: "Lateral" },
        ]}
        onChange={(axis) => update({ axis })}
      />

      <SegmentedControl<SupportType>
        label="Supports"
        value={scenario.support}
        options={[
          { value: "fixed-fixed", label: "Fixed" },
          { value: "simply-supported", label: "Pinned" },
          { value: "cantilever", label: "Cantilever" },
        ]}
        onChange={(support) => update({ support })}
      />

      <NumberField
        label="Spindle mass"
        value={scenario.movingMassKg}
        min={2}
        max={80}
        step={1}
        unit="kg"
        onChange={(movingMassKg) => update({ movingMassKg })}
      />
      <NumberField
        label="Spindle speed"
        value={scenario.rpm}
        min={500}
        max={24000}
        step={100}
        unit="rpm"
        onChange={(rpm) => update({ rpm })}
      />
      <NumberField
        label="Flutes"
        value={scenario.flutes}
        min={1}
        max={8}
        step={1}
        onChange={(flutes) => update({ flutes })}
      />
    </PanelSection>
  );
}
