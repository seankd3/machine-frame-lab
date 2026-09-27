import { nearestPassingRpm, planes, type Analysis, type Plane } from "../model/analysis";
import type { Design } from "../model/design";
import { hz, kgm, rpm, um } from "../utils/format";
import type { Update } from "./ControlField";
import { Icon } from "./Icon";

const worstPlane = (analysis: Analysis, key: "peakUm" | "firstHz"): Plane =>
  planes.reduce((a, b) =>
    key === "peakUm"
      ? analysis.planes[b].peakUm > analysis.planes[a].peakUm ? b : a
      : analysis.planes[b].firstHz < analysis.planes[a].firstHz ? b : a,
  );

export function VerdictPanel({ analysis, catalog, update }: { analysis: Analysis; catalog: Analysis[]; update: Update }) {
  const { design, passes } = analysis;
  const bendPlane = worstPlane(analysis, "peakUm");
  const modePlane = worstPlane(analysis, "firstHz");
  const worst = analysis.planes[bendPlane];
  const resonating = !passes.deflection && worst.vibrationUm > worst.steadyUm;

  const headline = passes.all
    ? "Holds the tool for this cut"
    : resonating
      ? `Resonating at ${rpm(design.rpm)}`
      : !passes.deflection
        ? "Too flexible for this cut"
        : "First mode below target";

  const moves: Array<{ label: string; detail: string; patch: Partial<Design> }> = [];
  const speed = passes.deflection ? null : nearestPassingRpm(analysis);
  if (speed !== null && resonating) {
    moves.push({ label: `Run at ${rpm(speed)}`, detail: "moves tooth pass off the peak", patch: { rpm: speed } });
  }
  if (!passes.all) {
    const lighter = catalog
      .filter((a) => a.passes.all)
      .sort((a, b) => a.section.mass.total - b.section.mass.total)[0];
    if (lighter) {
      const delta = lighter.section.mass.total - analysis.section.mass.total;
      moves.push({
        label: `Switch to ${lighter.profile.id}`,
        detail: `lightest that passes, ${delta >= 0 ? "+" : "−"}${kgm(Math.abs(delta))}`,
        patch: { profile: lighter.profile.id },
      });
    } else {
      moves.push({ label: "No catalogue extrusion passes", detail: "shorten the span, add rails, or relax targets", patch: {} });
    }
  }

  return (
    <section className={`verdict ${passes.all ? "ok" : resonating || !passes.deflection ? "bad" : "warn"}`} aria-live="polite">
      <p className="verdict-kicker">
        <Icon name={passes.all ? "check" : "cross"} size={15} />
        {passes.all ? "Meets both targets" : `Misses ${Number(!passes.deflection) + Number(!passes.mode)} of 2 targets`}
      </p>
      <h2>{headline}</h2>

      <div className="checks">
        <Check
          label="Peak tool deflection"
          value={um(worst.peakUm)}
          limit={`≤ ${um(design.maxUm)}`}
          plane={bendPlane}
          ok={passes.deflection}
          fraction={worst.peakUm / design.maxUm}
          detail={`${um(worst.steadyUm)} steady + ${um(worst.vibrationUm)} vibration`}
        />
        <Check
          label="First bending mode"
          value={hz(analysis.worstHz)}
          limit={`≥ ${hz(design.minHz)}`}
          plane={modePlane}
          ok={passes.mode}
          fraction={design.minHz / Math.max(analysis.worstHz, 1)}
          detail={`${hz(analysis.planes.vertical.firstHz)} vertical · ${hz(analysis.planes.horizontal.firstHz)} horizontal`}
        />
      </div>

      {moves.length ? (
        <div className="moves">
          {moves.map((move) => (
            <button
              type="button"
              key={move.label}
              disabled={!Object.keys(move.patch).length}
              onClick={() => update(move.patch)}
            >
              <span>
                <strong>{move.label}</strong>
                <small>{move.detail}</small>
              </span>
              {Object.keys(move.patch).length ? <Icon name="arrow" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Check({ label, value, limit, plane, ok, fraction, detail }: {
  label: string;
  value: string;
  limit: string;
  plane: Plane;
  ok: boolean;
  fraction: number;
  detail: string;
}) {
  return (
    <div className={`check ${ok ? "ok" : "bad"}`}>
      <div className="check-line">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          {limit} · {plane}
        </small>
      </div>
      <span className="meter">
        <i className={ok ? "ok" : "bad"} style={{ width: `${Math.min(100, fraction * 66.7)}%` }} />
        <b style={{ left: "66.7%" }} />
      </span>
      <small className="check-detail">{detail}</small>
    </div>
  );
}
