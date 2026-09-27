import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../machine/analyze";
import { formatMachine, parseMachine, setPath, type Machine } from "../machine/document";
import { formatRequirements, loadFor, parseRequirements, type Requirements } from "../machine/requirements";
import { validField } from "./fields";

/**
 * The machine document and its requirements, kept together in the URL hash
 * so the address is the share link. The design load follows the material.
 */
export function useDesign() {
  const read = () => ({ machine: parseMachine(window.location.hash, validField), req: parseRequirements(window.location.hash) });
  const [state, setState] = useState(() => {
    const s = read();
    return { ...s, machine: { ...s.machine, cutN: loadFor(s.req) } };
  });

  useEffect(() => {
    const hash = `#${formatRequirements(state.req)}&${formatMachine(state.machine)}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [state]);

  useEffect(() => {
    const onHash = () => {
      const s = read();
      setState({ ...s, machine: { ...s.machine, cutN: loadFor(s.req) } });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const set = useCallback((key: string, value: string | number) => setState((s) => ({ ...s, machine: setPath(s.machine, key, value) })), []);
  /** Replace the machine (a preset or a search candidate), keeping the requirements' load. */
  const load = useCallback((m: Machine) => setState((s) => ({ ...s, machine: { ...m, cutN: loadFor(s.req) } })), []);
  const setReq = useCallback(
    (patch: Partial<Requirements>) =>
      setState((s) => {
        const req = { ...s.req, ...patch };
        return { req, machine: { ...s.machine, cutN: loadFor(req) } };
      }),
    [],
  );
  return { machine: state.machine, req: state.req, set, load, setReq };
}

/**
 * Runs the analysis in a worker. Only the newest request is kept: while one
 * runs, later edits collapse into a single follow-up, and stale answers are
 * dropped, so dragging a slider never queues a backlog of solves.
 */
export function useAnalysis(machine: Machine) {
  const worker = useRef<Worker | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pending, setPending] = useState(true);
  const state = useRef({ sent: 0, busy: false, queued: null as Machine | null });

  const send = useCallback((m: Machine) => {
    const s = state.current;
    if (s.busy) {
      s.queued = m;
      return;
    }
    s.busy = true;
    s.sent++;
    worker.current!.postMessage({ id: s.sent, machine: m });
  }, []);

  useEffect(() => {
    const w = new Worker(new URL("../machine/analysis.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = (event: MessageEvent<{ id: number; result: AnalysisResult }>) => {
      const s = state.current;
      s.busy = false;
      if (s.queued) {
        const next = s.queued;
        s.queued = null;
        send(next);
        return;
      }
      if (event.data.id === s.sent) {
        setResult(event.data.result);
        setPending(false);
      }
    };
    w.onerror = (event) => {
      state.current.busy = false;
      state.current.queued = null;
      setResult({ ok: false, error: event.message || "the analysis worker failed to start" });
      setPending(false);
    };
    return () => {
      w.terminate();
      worker.current = null;
      state.current = { sent: 0, busy: false, queued: null };
    };
  }, [send]);

  useEffect(() => {
    setPending(true);
    // The worker effect runs first on mount, so the worker exists here.
    if (worker.current) send(machine);
  }, [machine, send]);

  return { result, pending };
}
