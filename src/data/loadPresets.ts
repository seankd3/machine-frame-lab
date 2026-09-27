import type { Design } from "../model/design";

// Typical router cuts in 6061 with a 6 mm carbide end mill. Peak force is the
// specific cutting force (~700 N/mm² for aluminium) times the chip section.
export const cutPresets: Array<{ label: string; cut: Pick<Design, "forceN" | "rpm" | "flutes"> }> = [
  { label: "Finish", cut: { forceN: 50, rpm: 20000, flutes: 3 } },
  { label: "Adaptive rough", cut: { forceN: 150, rpm: 18000, flutes: 3 } },
  { label: "Full slot", cut: { forceN: 200, rpm: 12000, flutes: 2 } },
];
