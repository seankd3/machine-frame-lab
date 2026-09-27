// Every buyable thing carries where to buy it and what it costs. A null price
// means no source was found; the BOM shows it as unpriced, never as zero.
// Sourced prices and their caveats are recorded in docs/research/parts-and-prices.md.

export interface Offer {
  vendor: string;
  url: string;
  /** USD per unit. */
  price: number | null;
  unit: "each" | "m" | "sheet" | "kg";
  /** Date the price was read, ISO. */
  asOf: string;
  /** Fee per cut for stock sold cut to length (USD). */
  perCut?: number;
  /** Caveat shown beside the price: a range, a substitute size, an unverified listing. */
  note?: string;
}

export interface Item {
  sku: string;
  name: string;
  offer: Offer;
}

export const unpriced = (vendor: string, url: string, unit: Offer["unit"] = "each"): Offer => ({ vendor, url, price: null, unit, asOf: "" });

/** The date every price in docs/research/parts-and-prices.md was read. */
export const PRICES_READ = "2026-09-27";

export const priced = (vendor: string, url: string, price: number, unit: Offer["unit"] = "each", extra: Pick<Offer, "perCut" | "note"> = {}): Offer => ({
  vendor,
  url,
  price,
  unit,
  asOf: PRICES_READ,
  ...extra,
});

/** Midpoint of a quoted price range, with the range kept as the note. */
export const range = (vendor: string, url: string, low: number, high: number, unit: Offer["unit"] = "each", note = ""): Offer =>
  priced(vendor, url, Math.round(((low + high) / 2) * 100) / 100, unit, { note: `$${low}–${high}${note ? `; ${note}` : ""}` });
