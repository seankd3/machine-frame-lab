import type { Machine } from "./document";
import { explore, quick } from "./explore";

// Runs the one-change exploration off the main thread. A new request
// terminates the worker, so there is no cancellation logic here.

self.onmessage = (event: MessageEvent<{ id: number; machine: Machine }>) => {
  const { id, machine } = event.data;
  self.postMessage({ id, kind: "base", quick: quick(machine) });
  for (const step of explore(machine)) self.postMessage({ id, kind: "batch", ...step });
  self.postMessage({ id, kind: "done" });
};
