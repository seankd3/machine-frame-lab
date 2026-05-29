export const MM_TO_M = 0.001;
export const MM2_TO_M2 = 1e-6;
export const MM4_TO_M4 = 1e-12;
export const GPA_TO_PA = 1e9;

export function mmToM(value: number) {
  return value * MM_TO_M;
}

export function mm2ToM2(value: number) {
  return value * MM2_TO_M2;
}

export function mm4ToM4(value: number) {
  return value * MM4_TO_M4;
}

export function gpaToPa(value: number) {
  return value * GPA_TO_PA;
}
