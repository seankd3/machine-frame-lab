import { analyze } from "./analyze";
import type { Machine } from "./document";

// Modal analysis takes a few hundred milliseconds; running it here keeps the
// controls and the 3D view responsive while it works.

self.onmessage = (event: MessageEvent<{ id: number; machine: Machine }>) => {
  const { id, machine } = event.data;
  self.postMessage({ id, result: analyze(machine) });
};
