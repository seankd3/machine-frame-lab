import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../machine/analyze";
import { formatMachine, parseMachine, setPath, type Machine } from "../machine/document";
import { formatRequirements, loadFor, parseRequirements, type Requirements } from "../machine/requirements";
import { designFor, type DesignProgress, type DesignResult } from "../machine/design";
import type { Quick, Variant } from "../machine/explore";
import { Pool } from "./pool";
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

  // Discrete actions (adopting a candidate, applying a suggestion, loading a
  // preset) can be undone; slider drags are not recorded one tick at a time.
  const history = useRef<Machine[]>([]);
  const latest = useRef(state);
  latest.current = state;
  const [canUndo, setCanUndo] = useState(false);
  const record = () => {
    history.current = [...history.current.slice(-29), latest.current.machine];
    setCanUndo(true);
  };
  /** Replace the machine (a preset or a search candidate), keeping the requirements' load. */
  const load = useCallback((m: Machine) => {
    record();
    setState((s) => ({ ...s, machine: { ...m, cutN: loadFor(s.req) } }));
  }, []);
  /** One recorded change, as a suggestion's Apply does. */
  const change = useCallback((key: string, value: string | number) => {
    record();
    setState((s) => ({ ...s, machine: setPath(s.machine, key, value) }));
  }, []);
  const setReq = useCallback(
    (patch: Partial<Requirements>) =>
      setState((s) => {
        const req = { ...s.req, ...patch };
        return { req, machine: { ...s.machine, cutN: loadFor(req) } };
      }),
    [],
  );
  const undo = useCallback(() => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) setState((s) => ({ ...s, machine: { ...prev, cutN: loadFor(s.req) } }));
  }, []);
  return { machine: state.machine, req: state.req, set, load, change, undo, canUndo, setReq };
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

export interface Exploration {
  base: Quick | null;
  variants: Variant[];
  done: number;
  total: number;
  running: boolean;
}

/**
 * Explores every one-change variant of the machine in a worker, streaming
 * results. Edits restart it after a short pause, so dragging a slider does
 * not start a hundred solves per frame.
 */
export function useExplore(machine: Machine, enabled = true, delayMs = 500): Exploration {
  const [state, setState] = useState<Exploration>({ base: null, variants: [], done: 0, total: 0, running: true });
  useEffect(() => {
    setState({ base: null, variants: [], done: 0, total: 0, running: true });
    // Paused while a design search needs every core; it restarts afterwards.
    if (!enabled) return;
    let worker: Worker | null = null;
    const timer = setTimeout(() => {
      worker = new Worker(new URL("../machine/explore.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<any>) => {
        const msg = event.data;
        if (msg.kind === "base") setState((s) => ({ ...s, base: msg.quick }));
        else if (msg.kind === "batch") setState((s) => ({ ...s, variants: [...s.variants, ...msg.variants], done: msg.done, total: msg.total }));
        else if (msg.kind === "done") setState((s) => ({ ...s, running: false }));
      };
      worker.onerror = () => setState((s) => ({ ...s, running: false }));
      worker.postMessage({ id: 1, machine });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [machine, enabled, delayMs]);
  return state;
}

export type DesignSearch =
  | { status: "idle" }
  | { status: "running"; progress: DesignProgress }
  | { status: "done"; result: DesignResult; ms: number };

/** Runs designFor() on a worker pool, with progress and cancellation. */
export function useDesignSearch() {
  const pool = useRef<Pool | null>(null);
  const run = useRef(0);
  const [state, setState] = useState<DesignSearch>({ status: "idle" });
  useEffect(() => () => pool.current?.terminate(), []);

  const start = useCallback(async (machine: Machine, req: Requirements) => {
    pool.current ??= new Pool();
    const id = ++run.current;
    const t0 = performance.now();
    setState({ status: "running", progress: { evaluated: 0, finished: 0, total: 1 } });
    const result = await designFor(
      machine,
      req,
      pool.current,
      (progress) => run.current === id && setState({ status: "running", progress }),
      () => run.current !== id,
    );
    if (run.current === id) setState({ status: "done", result, ms: performance.now() - t0 });
  }, []);

  /** Stop at once: the pool's queued work is dropped with its workers. */
  const cancel = useCallback(() => {
    run.current++;
    pool.current?.terminate();
    pool.current = null;
    setState({ status: "idle" });
  }, []);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);
  return { search: state, start, cancel, dismiss, workers: pool.current?.size ?? 0 };
}
