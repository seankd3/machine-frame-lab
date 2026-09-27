import { useState } from "react";
import { profileUrl, type Profile } from "../data/profiles";
import type { Analysis } from "../model/analysis";
import type { Design } from "../model/design";
import { envelope, hz, kgm, um } from "../utils/format";
import { Segmented, type Update } from "./ControlField";
import { ProfileGlyph } from "./ProfileArt";

/**
 * Every catalogue extrusion analysed under the current setup, lightest first,
 * so choosing a profile and comparing them are the same act.
 */
export function ProfileCatalog({ design, catalog, update, stale }: { design: Design; catalog: Analysis[]; update: Update; stale: boolean }) {
  const current = catalog.find((a) => a.profile.id === design.profile);
  const [system, setSystem] = useState<Profile["system"]>(current?.profile.system ?? "metric");
  const rows = catalog.filter((a) => a.profile.system === system).sort((a, b) => a.section.mass.profile - b.section.mass.profile);
  const scale = Math.max(...rows.map((a) => a.worstUm), design.maxUm * 1.5);
  const square = current ? current.profile.cols === current.profile.rows : true;

  return (
    <section className="catalog" aria-label="Extrusion">
      <header className="panel-head">
        <h2>Extrusion</h2>
        <a href={current ? profileUrl(current.profile) : "https://8020.net"} target="_blank" rel="noreferrer">
          80/20 data ↗
        </a>
      </header>
      <div className="catalog-filters">
        <Segmented
          value={system}
          options={[
            { value: "metric", label: "Metric" },
            { value: "inch", label: "Inch" },
          ]}
          onChange={setSystem}
        />
        <Segmented
          value={design.orientation}
          options={[
            { value: "upright", label: "Tall side up", disabled: square },
            { value: "flat", label: "Laid flat", disabled: square },
          ]}
          onChange={(orientation) => update({ orientation })}
        />
      </div>
      <div className="catalog-head" aria-hidden="true">
        <span />
        <span>Profile</span>
        <span>Tool deflection</span>
        <span>1st mode</span>
      </div>
      <ol className={`catalog-list${stale ? " stale" : ""}`}>
        {rows.map((a) => {
          const selected = a.profile.id === design.profile;
          const barStyle = { width: `${Math.min(100, (a.worstUm / scale) * 100)}%` };
          const targetStyle = { left: `${(design.maxUm / scale) * 100}%` };
          return (
            <li key={a.profile.id}>
              <button
                type="button"
                className={`catalog-row${selected ? " selected" : ""}${a.passes.all ? " pass" : " fail"}`}
                aria-pressed={selected}
                onClick={() => update({ profile: a.profile.id })}
              >
                <ProfileGlyph shape={{ ...a.profile, cols: a.section.cols, rows: a.section.rows }} />
                <span className="catalog-name">
                  <strong>{a.profile.id}</strong>
                  <small>
                    {envelope(a.section.widthMm, a.section.heightMm, a.profile.system)} · {kgm(a.section.mass.profile)}
                  </small>
                </span>
                <span className="catalog-meter">
                  <span className="meter">
                    <i className={a.passes.deflection ? "ok" : "bad"} style={barStyle} />
                    <b style={targetStyle} />
                  </span>
                  <small className={a.passes.deflection ? "" : "bad"}>{um(a.worstUm)}</small>
                </span>
                <span className={`catalog-hz${a.passes.mode ? "" : " bad"}`}>{hz(a.worstHz)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
