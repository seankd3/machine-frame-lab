import type { Machine } from "./document";
import { localEvaluator } from "./search";

// One member of the evaluation pool: answers batches of designs in order.

self.onmessage = async (event: MessageEvent<{ id: number; kind: "quick" | "firstMode"; machines: Machine[] }>) => {
  const { id, kind, machines } = event.data;
  const out = await localEvaluator[kind](machines);
  self.postMessage({ id, out });
};
