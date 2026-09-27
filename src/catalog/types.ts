// Every buyable thing carries where to buy it and what it costs. A null price
// means no source was found; the BOM shows it as unpriced, never as zero.

export interface Offer {
  vendor: string;
  url: string;
  /** USD per unit. */
  price: number | null;
  unit: "each" | "m" | "sheet" | "kg";
  /** Date the price was read, ISO. */
  asOf: string;
}

export interface Item {
  sku: string;
  name: string;
  offer: Offer;
}

export const unpriced = (vendor: string, url: string, unit: Offer["unit"] = "each"): Offer => ({ vendor, url, price: null, unit, asOf: "" });
