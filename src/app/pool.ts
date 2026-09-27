import type { Machine } from "../machine/document";
import type { Quick } from "../machine/explore";
import type { Evaluator } from "../machine/search";

/** Worker pool that splits every batch evenly across the machine's cores. */
export class Pool implements Evaluator {
  private workers: Worker[];
  private waiting = new Map<number, (out: unknown[]) => void>();
  private id = 0;

  constructor(size = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1))) {
    this.workers = Array.from({ length: size }, () => {
      const w = new Worker(new URL("../machine/pool.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (event: MessageEvent<{ id: number; out: unknown[] }>) => {
        this.waiting.get(event.data.id)?.(event.data.out);
        this.waiting.delete(event.data.id);
      };
      return w;
    });
  }

  get size() {
    return this.workers.length;
  }

  private send<T>(worker: Worker, kind: "quick" | "firstMode", machines: Machine[]) {
    return new Promise<T[]>((resolve) => {
      const id = ++this.id;
      this.waiting.set(id, resolve as (out: unknown[]) => void);
      worker.postMessage({ id, kind, machines });
    });
  }

  private async run<T>(kind: "quick" | "firstMode", machines: Machine[]): Promise<T[]> {
    if (!machines.length) return [];
    const per = Math.ceil(machines.length / this.workers.length);
    const chunks = this.workers.map((_, i) => machines.slice(i * per, (i + 1) * per)).filter((c) => c.length);
    const parts = await Promise.all(chunks.map((c, i) => this.send<T>(this.workers[i], kind, c)));
    return parts.flat();
  }

  quick = (machines: Machine[]) => this.run<Quick | null>("quick", machines);
  firstMode = (machines: Machine[]) => this.run<number | null>("firstMode", machines);

  terminate() {
    for (const w of this.workers) w.terminate();
    this.waiting.clear();
  }
}
