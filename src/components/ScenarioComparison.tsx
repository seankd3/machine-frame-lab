import type { MachineScenario, ProfileSpec } from "../model/types";
import { analyzeScenario, comparisonScenarios } from "../model/scenario";
import { formatFrequency, formatMicrons, formatMassPerMeter } from "../utils/format";

interface ScenarioComparisonProps {
  profile: ProfileSpec;
  scenario: MachineScenario;
}

export function ScenarioComparison({ profile, scenario }: ScenarioComparisonProps) {
  const rows = comparisonScenarios(scenario).map((variant) => ({
    name: variant.name,
    analysis: analyzeScenario(profile, variant.scenario),
  }));

  return (
    <section className="comparison-table" aria-label="Scenario comparison">
      <div className="section-title compact">
        <h2>Stack comparison</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Stack</th>
            <th>Defl.</th>
            <th>F1</th>
            <th>Mass</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className={row.analysis.riskLevel === "high" ? "row-risk" : ""}>
              <td>{row.name}</td>
              <td>{formatMicrons(row.analysis.beam.maxDeflectionM)}</td>
              <td>{formatFrequency(row.analysis.beam.frequenciesHz[0] ?? 0)}</td>
              <td>{formatMassPerMeter(row.analysis.section.massKgM)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
