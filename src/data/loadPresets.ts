import type { LoadAxis } from "../model/types";

export interface LoadPreset {
  id: string;
  name: string;
  loadN: number;
  rpm: number;
  flutes: number;
  movingMassKg: number;
  axis: LoadAxis;
}

export const loadPresets: LoadPreset[] = [
  {
    id: "finish-pass",
    name: "Finish pass",
    loadN: 280,
    rpm: 12000,
    flutes: 2,
    movingMassKg: 12,
    axis: "vertical",
  },
  {
    id: "aluminum-roughing",
    name: "Aluminum roughing",
    loadN: 950,
    rpm: 7800,
    flutes: 3,
    movingMassKg: 18,
    axis: "vertical",
  },
  {
    id: "steel-light",
    name: "Light steel cut",
    loadN: 1450,
    rpm: 4200,
    flutes: 4,
    movingMassKg: 22,
    axis: "lateral",
  },
  {
    id: "gantry-accel",
    name: "Axis acceleration",
    loadN: 650,
    rpm: 9000,
    flutes: 1,
    movingMassKg: 28,
    axis: "lateral",
  },
];
