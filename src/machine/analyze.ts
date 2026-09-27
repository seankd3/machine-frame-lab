import { checks, type Finding } from "./checks";
import { compile } from "./compile";
import type { Machine } from "./document";
import { describeModes, modes, performance, solve, type ModeSummary, type Performance } from "./simulate";

// The whole analysis of one machine as plain data, so it can run in a worker
// and cross back by structured clone.

export interface ModelStats {
  nodes: number;
  elements: number;
  dof: number;
  /** Wall time of the whole analysis (ms). */
  ms: number;
}

export interface Analysis {
  stats: ModelStats;
  perf: Performance;
  modes: ModeSummary[];
  findings: Finding[];
}

export type AnalysisResult = { ok: true; analysis: Analysis } | { ok: false; error: string };

export function analyze(machine: Machine): AnalysisResult {
  const t0 = globalThis.performance.now();
  try {
    const c = compile(machine);
    const solved = solve(c);
    const perf = performance(c, solved);
    const found = describeModes(c, modes(c, solved, 4));
    const findings = checks(c, perf, found[0]?.hz ?? 0);
    const { frame } = c.asm;
    const stats = {
      nodes: frame.nodes.length,
      elements: frame.beams.length + frame.springs.length,
      dof: solved.factor.n,
      ms: globalThis.performance.now() - t0,
    };
    return { ok: true, analysis: { stats, perf, modes: found, findings } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
