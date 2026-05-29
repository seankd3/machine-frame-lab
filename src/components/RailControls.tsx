import { Rows3 } from "lucide-react";
import { rails } from "../data/rails";
import type { MachineScenario, PreloadClass } from "../model/types";
import { NumberField, PanelSection, SegmentedControl, SelectField } from "./ControlField";

interface RailControlsProps {
  scenario: MachineScenario;
  onScenarioChange: (scenario: MachineScenario) => void;
}

export function RailControls({ scenario, onScenarioChange }: RailControlsProps) {
  const updateRail = (patch: Partial<MachineScenario["rail"]>) =>
    onScenarioChange({ ...scenario, rail: { ...scenario.rail, ...patch } });

  return (
    <PanelSection title="Linear rails" icon={<Rows3 size={18} />}>
      <SelectField
        label="Rail model"
        value={scenario.rail.modelId}
        options={rails.map((rail) => ({ value: rail.id, label: rail.name }))}
        onChange={(modelId) => updateRail({ modelId })}
      />
      <NumberField
        label="Top rails"
        value={scenario.rail.topCount}
        min={0}
        max={4}
        step={1}
        onChange={(topCount) => updateRail({ topCount })}
      />
      <NumberField
        label="Side rails"
        value={scenario.rail.sideCount}
        min={0}
        max={2}
        step={1}
        onChange={(sideCount) => updateRail({ sideCount })}
      />
      <NumberField
        label="Bolt pitch"
        value={scenario.rail.boltPitchMm}
        min={30}
        max={120}
        step={5}
        unit="mm"
        onChange={(boltPitchMm) => updateRail({ boltPitchMm })}
      />
      <SegmentedControl<PreloadClass>
        label="Preload"
        value={scenario.rail.preload}
        options={[
          { value: "light", label: "Light" },
          { value: "medium", label: "Medium" },
          { value: "heavy", label: "Heavy" },
        ]}
        onChange={(preload) => updateRail({ preload })}
      />
    </PanelSection>
  );
}
