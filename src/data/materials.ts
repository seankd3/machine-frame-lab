export const ALUMINUM = { eGPa: 69, densityKgM3: 2700 }; // 6063-T6, 8020.net
export const STEEL = { eGPa: 200, densityKgM3: 7850 };

/**
 * Damping ratio assumed for the bare frame. Bolted aluminium structures
 * measure roughly 1–3 %, almost all of it from joints; 1 % is the cautious end.
 */
export const FRAME_DAMPING = 0.01;

export interface Fill {
  id: "hollow" | "sand" | "epoxy-granite";
  label: string;
  densityKgM3: number;
  /** Modulus credited in bending. Granular fill carries no bending stress. */
  eGPa: number;
  /** Material loss factor η; its share of the beam's mass adds η/2 to ζ. */
  lossFactor: number;
}

export const fills: Fill[] = [
  { id: "hollow", label: "Hollow", densityKgM3: 0, eGPa: 0, lossFactor: 0 },
  // Particle damping in dry sand is friction between grains; η ≈ 0.1 is a rough
  // figure from sand-filled tube tests and varies strongly with packing.
  { id: "sand", label: "Dry sand", densityKgM3: 1600, eGPa: 0, lossFactor: 0.1 },
  // Commercial mineral casting: E 35–45 GPa, ρ 2.3 (Schneeberger, RAMPF
  // EPUMENT 140/8), log decrement 0.03 → η ≈ 0.0095. Hand-mixed DIY epoxy
  // granite packs less densely, so 30 GPa is credited.
  { id: "epoxy-granite", label: "Epoxy granite", densityKgM3: 2300, eGPa: 30, lossFactor: 0.0095 },
];

export const getFill = (id: string) => fills.find((f) => f.id === id);
