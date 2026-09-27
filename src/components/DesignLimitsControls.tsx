import { ListChecks } from "lucide-react";
import type { MachineScenario } from "../model/types";
import { NumberField, PanelSection } from "./ControlField";

interface DesignLimitsControlsProps {
  scenario: MachineScenario;
  onScenarioChange: (scenario: MachineScenario) => void;
}

export function DesignLimitsControls({
  scenario,
  onScenarioChange,
}: DesignLimitsControlsProps) {
  const updateLimits = (patch: Partial<MachineScenario["designLimits"]>) => {
    onScenarioChange({
      ...scenario,
      designLimits: {
        ...scenario.designLimits,
        ...patch,
      },
    });
  };

  return (
    <PanelSection
      title="5 Set design limits"
      icon={<ListChecks size={18} />}
      className="limits-section"
    >
      <NumberField
        label="Max dynamic deflection"
        value={scenario.designLimits.maxDynamicDeflectionUm}
        min={5}
        max={150}
        step={1}
        unit="um"
        onChange={(maxDynamicDeflectionUm) => updateLimits({ maxDynamicDeflectionUm })}
      />
      <NumberField
        label="Minimum first mode"
        value={scenario.designLimits.minFirstModeHz}
        min={50}
        max={900}
        step={10}
        unit="Hz"
        onChange={(minFirstModeHz) => updateLimits({ minFirstModeHz })}
      />
      <NumberField
        label="Minimum modal separation"
        value={scenario.designLimits.minModalSeparationPct}
        min={5}
        max={35}
        step={1}
        unit="%"
        onChange={(minModalSeparationPct) => updateLimits({ minModalSeparationPct })}
      />
    </PanelSection>
  );
}
