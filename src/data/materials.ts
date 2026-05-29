import type { FillMedium } from "../model/types";

export const ALUMINUM_E_GPA = 69;
export const ALUMINUM_DAMPING_LOSS = 0.002;

export const fills: FillMedium[] = [
  {
    id: "none",
    name: "Hollow",
    densityKgM3: 0,
    eGPa: 0,
    dampingLoss: 0,
    stiffnessEfficiency: 0,
  },
  {
    id: "dry-sand",
    name: "Dry sand",
    densityKgM3: 1600,
    eGPa: 0.15,
    dampingLoss: 0.08,
    stiffnessEfficiency: 0.03,
  },
  {
    id: "cement-grout",
    name: "Cement grout",
    densityKgM3: 1900,
    eGPa: 8,
    dampingLoss: 0.025,
    stiffnessEfficiency: 0.24,
  },
  {
    id: "epoxy-granite",
    name: "Epoxy granite",
    densityKgM3: 2200,
    eGPa: 18,
    dampingLoss: 0.04,
    stiffnessEfficiency: 0.38,
  },
  {
    id: "polymer-concrete",
    name: "Polymer concrete",
    densityKgM3: 2150,
    eGPa: 22,
    dampingLoss: 0.032,
    stiffnessEfficiency: 0.45,
  },
];

export function getFill(id: string) {
  return fills.find((fill) => fill.id === id) ?? fills[0];
}
