import { Layers3 } from "lucide-react";
import { fills } from "../data/materials";
import type { MachineScenario } from "../model/types";
import { NumberField, PanelSection, SelectField } from "./ControlField";

interface FillControlsProps {
  scenario: MachineScenario;
  onScenarioChange: (scenario: MachineScenario) => void;
}

export function FillControls({ scenario, onScenarioChange }: FillControlsProps) {
  const updateFill = (patch: Partial<MachineScenario["fill"]>) =>
    onScenarioChange({ ...scenario, fill: { ...scenario.fill, ...patch } });

  return (
    <PanelSection title="Fill media" icon={<Layers3 size={18} />}>
      <SelectField
        label="Medium"
        value={scenario.fill.mediumId}
        options={fills.map((fill) => ({ value: fill.id, label: fill.name }))}
        onChange={(mediumId) => updateFill({ mediumId })}
      />
      <NumberField
        label="Fill ratio"
        value={scenario.fill.ratio}
        min={0}
        max={1}
        step={0.05}
        onChange={(ratio) => updateFill({ ratio })}
      />
    </PanelSection>
  );
}
