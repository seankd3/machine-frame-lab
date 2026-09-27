import { fills } from "../data/materials";
import { cutPresets } from "../data/loadPresets";
import { rails } from "../data/rails";
import type { Analysis } from "../model/analysis";
import type { Design } from "../model/design";
import { Group, NumberField, Segmented, type Update } from "./ControlField";

const counts = (slots: number) => Array.from({ length: slots + 1 }, (_, n) => ({ value: n, label: String(n) }));

export function SetupPanel({ analysis, update }: { analysis: Analysis; update: Update }) {
  const { design, section } = analysis;
  const cut = cutPresets.find((p) => p.cut.forceN === design.forceN && p.cut.rpm === design.rpm && p.cut.flutes === design.flutes);

  return (
    <section className="setup" aria-label="Setup">
      <Group title="Beam">
        <NumberField name="spanMm" design={design} update={update} />
        <Segmented
          label="Ends"
          value={design.support}
          options={[
            { value: "fixed", label: "Both fixed" },
            { value: "pinned", label: "Both pinned" },
            { value: "cantilever", label: "Cantilever" },
          ]}
          onChange={(support) => update({ support })}
        />
      </Group>

      <Group title="Linear rails">
        <Segmented
          value={design.rail}
          options={["none", ...rails.map((r) => r.id)].map((id) => ({ value: id, label: id === "none" ? "None" : id }))}
          onChange={(rail) => update({ rail })}
        />
        {design.rail !== "none" ? (
          <div className="pair">
            <Segmented
              label="On top face"
              value={Math.min(design.topRails, section.cols)}
              options={counts(section.cols)}
              onChange={(topRails) => update({ topRails })}
            />
            <Segmented
              label="On front face"
              value={Math.min(design.frontRails, section.rows)}
              options={counts(section.rows)}
              onChange={(frontRails) => update({ frontRails })}
            />
          </div>
        ) : null}
      </Group>

      <Group title="Cavity fill">
        <Segmented value={design.fill} options={fills.map((f) => ({ value: f.id, label: f.label }))} onChange={(fill) => update({ fill })} />
      </Group>

      <Group
        title="Cut"
        aside={
          <div className="presets">
            {cutPresets.map((p) => (
              <button type="button" key={p.label} className={cut === p ? "on" : ""} onClick={() => update(p.cut)}>
                {p.label}
              </button>
            ))}
          </div>
        }
      >
        <NumberField name="forceN" design={design} update={update} />
        <div className="pair">
          <NumberField name="rpm" design={design} update={update} />
          <NumberField name="flutes" design={design} update={update} />
        </div>
        <NumberField name="carriageKg" design={design} update={update} />
      </Group>

      <Group title="Targets">
        <NumberField name="maxUm" design={design} update={update} />
        <NumberField name="minHz" design={design} update={update} />
      </Group>
    </section>
  );
}
