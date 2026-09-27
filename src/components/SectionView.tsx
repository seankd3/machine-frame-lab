import { getRail } from "../data/rails";
import type { Analysis } from "../model/analysis";
import { envelope, kNm2, kgm, pct } from "../utils/format";
import { profilePaths } from "./ProfileArt";

const BOX = { w: 300, h: 260 };

/** The oriented cross-section at true scale with rails, fill and neutral axes. */
export function SectionView({ analysis }: { analysis: Analysis }) {
  const { profile, section, design } = analysis;
  const rail = getRail(design.rail);
  const art = profilePaths({ ...profile, cols: section.cols, rows: section.rows });
  const w = section.widthMm;
  const h = section.heightMm;
  const railH = rail?.heightMm ?? 0;
  const railW = rail?.widthMm ?? 0;
  const hasTop = section.rails.some((r) => r.face === "top");
  const hasFront = section.rails.some((r) => r.face === "front");

  // Content extents in mm (SVG y down, so z maps to -y).
  const left = -w / 2;
  const right = w / 2 + (hasFront ? railH : 0);
  const top = -h / 2 - (hasTop ? railH : 0);
  const bottom = h / 2;
  const k = Math.min((BOX.w - 90) / (right - left), (BOX.h - 70) / (bottom - top));
  const ox = 58 - left * k;
  const oy = 20 - top * k;
  const px = (x: number) => ox + x * k;
  const py = (y: number) => oy + y * k;
  const naX = px(section.centroid.y);
  const naY = py(-section.centroid.z);

  return (
    <figure className="section-view">
      <figcaption>
        <span>Cross-section</span>
        <strong>
          {profile.id} · {envelope(w, h, profile.system)}
        </strong>
      </figcaption>
      <svg viewBox={`0 0 ${BOX.w} ${BOX.h}`} role="img" aria-label={`${profile.id} cross-section with rails and fill`}>
        <g transform={`translate(${ox} ${oy}) scale(${k})`}>
          {design.fill !== "hollow" ? (
            <g className={`fill fill-${design.fill}`}>
              {art.cavities.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          ) : null}
          <path className="extrusion" d={art.body} fillRule="evenodd" />
          {rail
            ? section.rails.map((r, i) =>
                r.face === "top" ? (
                  <RailShape key={i} x={r.y - railW / 2} y={-r.z - railH} w={railW} h={railH} />
                ) : (
                  <RailShape key={i} x={r.y} y={-r.z - railW / 2} w={railH} h={railW} sideways />
                ),
              )
            : null}
        </g>

        <g className="neutral">
          <line x1={naX} y1={py(top) - 8} x2={naX} y2={py(bottom) + 8} />
          <line x1={px(left) - 8} y1={naY} x2={px(right) + 8} y2={naY} />
          <circle cx={naX} cy={naY} r={3.5} />
        </g>

        <g className="dims">
          <line x1={px(left)} y1={py(bottom) + 22} x2={px(w / 2)} y2={py(bottom) + 22} />
          <line x1={px(left)} y1={py(bottom) + 16} x2={px(left)} y2={py(bottom) + 28} />
          <line x1={px(w / 2)} y1={py(bottom) + 16} x2={px(w / 2)} y2={py(bottom) + 28} />
          <text x={(px(left) + px(w / 2)) / 2} y={py(bottom) + 40} textAnchor="middle">
            {trim(w)}
          </text>
          <line x1={px(left) - 22} y1={py(-h / 2)} x2={px(left) - 22} y2={py(h / 2)} />
          <line x1={px(left) - 28} y1={py(-h / 2)} x2={px(left) - 16} y2={py(-h / 2)} />
          <line x1={px(left) - 28} y1={py(h / 2)} x2={px(left) - 16} y2={py(h / 2)} />
          <text x={px(left) - 30} y={(py(-h / 2) + py(h / 2)) / 2} textAnchor="middle" transform={`rotate(-90 ${px(left) - 30} ${(py(-h / 2) + py(h / 2)) / 2})`}>
            {trim(h)}
          </text>
        </g>
      </svg>

      <dl className="section-stats">
        <div>
          <dt>Bending stiffness EI</dt>
          <dd>
            {kNm2(section.eiNm2.vertical)} <small>vertical</small>
          </dd>
          <dd>
            {kNm2(section.eiNm2.horizontal)} <small>horizontal</small>
          </dd>
        </div>
        <div>
          <dt>Mass</dt>
          <dd>{kgm(section.mass.total)}</dd>
          <dd>
            <small>
              {section.mass.profile.toFixed(2)} alu
              {section.mass.rails ? ` + ${section.mass.rails.toFixed(2)} rail` : ""}
              {section.mass.fill ? ` + ${section.mass.fill.toFixed(2)} fill` : ""}
            </small>
          </dd>
        </div>
        <div>
          <dt>Damping ratio</dt>
          <dd>{pct(section.dampingRatio)}</dd>
        </div>
        <div>
          <dt>Neutral axis shift</dt>
          <dd>
            {trim(Math.hypot(section.centroid.y, section.centroid.z))} mm <small>toward rails</small>
          </dd>
        </div>
      </dl>
    </figure>
  );
}

function RailShape({ x, y, w, h, sideways = false }: { x: number; y: number; w: number; h: number; sideways?: boolean }) {
  const groove = sideways ? `M${x + w * 0.5} ${y + h * 0.18} V${y + h * 0.82}` : `M${x + w * 0.18} ${y + h * 0.5} H${x + w * 0.82}`;
  return (
    <g className="rail">
      <rect x={x} y={y} width={w} height={h} />
      <path d={groove} />
    </g>
  );
}

const trim = (value: number) => String(Number(value.toFixed(1)));
