import { ArrowDownUp, Scale3D, ShieldAlert, Waves } from "lucide-react";
import type { ScenarioAnalysis } from "../model/types";
import {
  formatFrequency,
  formatMass,
  formatMicrons,
  formatStiffness,
  riskLabel,
} from "../utils/format";

interface KpiGridProps {
  analysis: ScenarioAnalysis;
}

export function KpiGrid({ analysis }: KpiGridProps) {
  const cards = [
    {
      label: "Static deflection",
      value: formatMicrons(analysis.beam.maxDeflectionM),
      detail: formatStiffness(analysis.beam.stiffnessNPerM),
      icon: <ArrowDownUp size={18} />,
    },
    {
      label: "Dynamic deflection",
      value: formatMicrons(analysis.dynamicDeflectionM),
      detail: `${analysis.dynamicAmplification.toFixed(1)}x amp`,
      icon: <Waves size={18} />,
    },
    {
      label: "First mode",
      value: formatFrequency(analysis.beam.frequenciesHz[0] ?? 0),
      detail: `${analysis.modalMarginPct.toFixed(0)}% nearest margin`,
      icon: <ShieldAlert size={18} />,
      risk: analysis.riskLevel,
    },
    {
      label: "Moving stack mass",
      value: formatMass(analysis.totalMassKg),
      detail: `${(analysis.section.dampingRatio * 100).toFixed(2)}% damping`,
      icon: <Scale3D size={18} />,
    },
  ];

  return (
    <section className="kpi-grid" aria-label="Simulation results">
      {cards.map((card) => (
        <article className={`kpi-card ${card.risk ? `risk-${card.risk}` : ""}`} key={card.label}>
          <div className="kpi-icon">{card.icon}</div>
          <div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.risk ? riskLabel(card.risk) : card.detail}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
