import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { BeamView } from "./components/BeamView";
import type { Update } from "./components/ControlField";
import { Icon } from "./components/Icon";
import { LayerTable } from "./components/LayerTable";
import { ProfileCatalog } from "./components/ProfileCatalog";
import { ResonanceMap } from "./components/ResonanceMap";
import { SectionView } from "./components/SectionView";
import { SetupPanel } from "./components/SetupPanel";
import { VerdictPanel } from "./components/VerdictPanel";
import { profiles } from "./data/profiles";
import { analyze, layers } from "./model/analysis";
import { defaultDesign, formatDesign, parseDesign } from "./model/design";

const LAST = "machine-frame-lab:last";

function initialDesign() {
  if (location.hash.length > 1) return parseDesign(location.hash);
  try {
    return parseDesign(localStorage.getItem(LAST) ?? "");
  } catch {
    return defaultDesign;
  }
}

export default function App() {
  const [design, setDesign] = useState(initialDesign);
  const update: Update = useCallback((patch) => setDesign((d) => ({ ...d, ...patch })), []);

  useEffect(() => {
    const encoded = formatDesign(design);
    history.replaceState(null, "", `#${encoded}`);
    try {
      localStorage.setItem(LAST, encoded);
    } catch {
      // Storage can be blocked; the URL still holds the design.
    }
  }, [design]);

  useEffect(() => {
    const onHash = () => setDesign(parseDesign(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const analysis = useMemo(() => analyze(design), [design]);
  const deferred = useDeferredValue(design);
  const catalog = useMemo(() => profiles.map((p) => analyze({ ...deferred, profile: p.id })), [deferred]);
  const layerRows = useMemo(
    () => layers(deferred).map((layer) => ({ label: layer.label, analysis: analyze(layer.design) })),
    [deferred],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Machine Frame Lab</h1>
          <p>How far a CNC beam lets the tool move under cutting load.</p>
        </div>
        <div className={`status ${analysis.passes.all ? "ok" : "bad"}`} aria-hidden="true">
          <Icon name={analysis.passes.all ? "check" : "cross"} size={14} />
          <span>
            {Math.round(analysis.worstUm * 10) / 10} µm · {Math.round(analysis.worstHz)} Hz
          </span>
        </div>
        <div className="actions">
          <CopyLink />
          <button type="button" className="ghost" onClick={() => setDesign(defaultDesign)} title="Reset to the default design">
            <Icon name="reset" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      <main className="workbench">
        <ProfileCatalog design={design} catalog={catalog} update={update} stale={deferred !== design} />
        <SetupPanel analysis={analysis} update={update} />
        <section className="stage" aria-label="Geometry">
          <SectionView analysis={analysis} />
          <BeamView analysis={analysis} update={update} />
        </section>
        <aside className="results" aria-label="Results">
          <VerdictPanel analysis={analysis} catalog={catalog} update={update} />
          <ResonanceMap analysis={analysis} update={update} />
          <LayerTable rows={layerRows} />
        </aside>
      </main>

      <footer className="scope">
        <p>
          One beam, two bending planes: Euler-Bernoulli finite elements with the carriage as a point mass and rails
          bolted fully composite. Not modelled: joints, end plates, torsion, carriage and spindle compliance, so a
          whole machine will be softer. Section data from <a href="https://8020.net">80/20</a>, rails from the{" "}
          <a href="https://www.hiwin.com/wp-content/uploads/HIWIN-Linear-Guideway-Catalog.pdf">HIWIN catalogue</a>.
        </p>
        <span>Sean Kenneth Doherty</span>
      </footer>
    </div>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link", location.href);
    }
  };
  return (
    <button type="button" className="ghost" onClick={copy}>
      <Icon name={copied ? "check" : "link"} />
      <span>{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
