import { checks, type Finding } from "./checks";
import { compile } from "./compile";
import type { Machine } from "./document";
import { describeModes, modes, performance, solve, type ModeSummary, type Performance } from "./simulate";

// The whole analysis of one machine as plain data, so it can run in a worker
// and cross back by structured clone.

export interface Analysis {
  perf: Performance;
  modes: ModeSummary[];
  findings: Finding[];
}

export type AnalysisResult = { ok: true; analysis: Analysis } | { ok: false; error: string };

export function analyze(machine: Machine): AnalysisResult {
  try {
    const c = compile(machine);
    const solved = solve(c);
    const perf = performance(c, solved);
    const found = describeModes(c, modes(c, solved, 4));
    return { ok: true, analysis: { perf, modes: found, findings: checks(c, perf, found[0]?.hz ?? 0) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
