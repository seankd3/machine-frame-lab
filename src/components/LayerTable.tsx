import type { Analysis } from "../model/analysis";
import { hz, kgm, um } from "../utils/format";

/** What rails and fill each add, peeled off one at a time. */
export function LayerTable({ rows }: { rows: Array<{ label: string; analysis: Analysis }> }) {
  return (
    <section className="layers" aria-label="What each layer adds">
      <header className="panel-head">
        <h2>What each layer adds</h2>
      </header>
      <table>
        <thead>
          <tr>
            <th>Stack</th>
            <th>Peak</th>
            <th>1st mode</th>
            <th>Mass</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, analysis: a }, i) => {
            const prev = rows[i - 1]?.analysis;
            return (
              <tr key={label}>
                <td>{label}</td>
                <td className={a.passes.deflection ? "" : "bad"}>
                  {um(a.worstUm)}
                  {prev ? <Delta now={a.worstUm} was={prev.worstUm} lowerIsBetter /> : null}
                </td>
                <td className={a.passes.mode ? "" : "bad"}>
                  {hz(a.worstHz)}
                  {prev ? <Delta now={a.worstHz} was={prev.worstHz} /> : null}
                </td>
                <td>{kgm(a.section.mass.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Delta({ now, was, lowerIsBetter = false }: { now: number; was: number; lowerIsBetter?: boolean }) {
  const change = (now - was) / was;
  if (!Number.isFinite(change) || Math.abs(change) < 0.005) return <small className="delta">—</small>;
  const better = lowerIsBetter ? change < 0 : change > 0;
  return (
    <small className={`delta ${better ? "better" : "worse"}`}>
      {change > 0 ? "+" : "−"}
      {Math.abs(change * 100).toFixed(0)}%
    </small>
  );
}
