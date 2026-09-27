export const money = (usd: number, cents = false) =>
  usd.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/** Three significant figures without trailing noise: 0.642, 12.4, 233. */
export const sig = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : v.toPrecision(3).replace(/\.?0+$/, ""));

export const pct = (share: number) => `${Math.round(share * 100)} %`;

export const AXIS_LABEL = { x: "X", y: "Y", z: "Z" } as const;

/** Stock cut list as "2 × 1070, 1 × 842" (lengths in mm). */
export function cutList(cuts: number[]) {
  const counts = new Map<number, number>();
  for (const c of cuts) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].map(([len, n]) => `${n} × ${len}`).join(", ");
}
