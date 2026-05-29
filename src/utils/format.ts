import type { RiskLevel } from "../model/types";

export function formatMicrons(meters: number) {
  return `${(meters * 1e6).toFixed(meters * 1e6 >= 100 ? 0 : 1)} um`;
}

export function formatFrequency(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} Hz`;
}

export function formatMass(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)} kg`;
}

export function formatMassPerMeter(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)} kg/m`;
}

export function formatStiffness(nPerM: number) {
  return `${(nPerM / 1e6).toFixed(1)} N/um`;
}

export function riskLabel(risk: RiskLevel) {
  if (risk === "high") return "High";
  if (risk === "watch") return "Watch";
  return "Clear";
}
