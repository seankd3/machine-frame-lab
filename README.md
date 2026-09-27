# Machine Frame Lab

Design a DIY CNC router from parts you can actually buy, and find out how stiff, how fast and how expensive it will be before you order anything.

It works the way a design brief does: requirements first, parts second.

1. **Requirements.** You choose:
   - the material you will cut (wood, aluminium or steel);
   - the work area and a budget;
   - a pace (hobby, standard or production);
   - whether you can weld.

   These become numeric targets. Material sets the design cutting force and a deflection limit of about one chip thickness. Pace sets rapid and acceleration floors. The first-mode floor is derived: an acceleration step *a* leaves the tool ringing with amplitude *a/ω²*, so keeping that inside the deflection limit needs *f₁ ≥ √(a/δ)/2π*.
2. **Find designs.** A search walks the catalog of priced parts from your current design and every preset at once, on a pool of web workers. From each starting point it:
   - meets every target for the least added cost;
   - cuts cost while keeping every target met;
   - spends what is left of the budget on stiffness.

   It returns up to three candidates: **Cheapest that passes**, **Balanced** (30 % stiffness headroom) and **Stiffest in budget**. When nothing passes, it shows the closest design and names what it misses. It never picks an unpriced part or a joint you cannot make, and it leaves your spindle and gantry clearance alone. Preview a candidate in 3D, adopt it, and undo if you change your mind.
3. **Refine.** Every design is scored against the requirements. **Suggested changes** try every single change to the current design (about 100 variants, in a worker) and list the best fixes with their price and effect. The **Explore** tab plots all of them as cost against deflection.

Under the hood, the design compiles into:

- **3D model:**
  - extrusions, rails and carriages, ball screws and supports, motors, plates, gussets and fasteners, placed where they would go;
  - rendered on demand, with standard views (keys 0/1/7/3);
  - jog the axes, or press **Run** to sweep the gantry through its travel;
  - click any part to inspect it.
- **Frame physics:** a 3D beam-and-spring finite-element model built by the same calls that place the parts. It covers member sections, joint springs, carriage stiffness from HIWIN tables, and ball-screw, nut and bearing axial stiffness. From it come tool-tip stiffness per axis, the compliance budget (where the deflection comes from) and vibration modes. The search uses a fast first-mode estimate (inverse iteration, within 0.4 % of the full solve), and finalists get the full modal analysis.
- **Motion:**
  - moving mass, acceleration and rapids per axis, from published pull-out torque curves;
  - rapids limited by motor torque, screw whip or ball-nut DN, whichever comes first;
  - torque derated when the drivers cannot supply the motor's rated current.
- **Bill of materials:** grouped by assembly, with quantities, cut lists, cut fees, vendor links and CSV export.

The URL holds the requirements and the design together, so **Copy link** shares both.

## Where the numbers come from

Every price and stiffness figure has a source recorded in [`docs/research/parts-and-prices.md`](docs/research/parts-and-prices.md). Prices were read on 27 Sep 2026 and are single-unit USD before shipping and tax. A quoted range bills at its midpoint, with the range shown beside it. **Anything without a source stays unpriced** and is listed as such, so the BOM total is a floor, not an estimate. Most 80/20 profiles are still unpriced because 8020.net refuses automated reads. The search never chooses an unpriced part.

Section properties for 80/20 profiles come from the 8020.net product pages. Rail and carriage data comes from HIWIN catalogue G99TE24-2410, motor curves from StepperOnline datasheets, and belt stiffness from the Gates design manual.

## Model scope

This is a design comparison tool, not a certification. The frame model is linear-elastic, evaluated with the gantry and carriage centred and Z at the bottom of travel (the softest pose). T-slot joint rotational stiffness is not published anywhere we could find, so it is a calibrated assumption. Clone rails, screws and bearings are usually softer than the genuine catalogue figures used here. Use the results to compare designs and find the weak link; verify with measurement before relying on them.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + tests
```

The tests include a **build check**: every preset machine must compile, solve and bill every part. There are also closed-form checks of the beam and frame solvers.

Code map:

| Path | What it does |
|---|---|
| `src/machine/document.ts` | The machine document and its URL-hash form |
| `src/machine/compile.ts` | Document → placed parts + FE model |
| `src/machine/simulate.ts` | Stiffness, compliance budget, modes, axis motion |
| `src/machine/requirements.ts` | Requirements, derived targets, scorecard |
| `src/machine/explore.ts` | One-change variants and their ranking |
| `src/machine/search.ts`, `design.ts` | Requirements-driven design search, multi-start |
| `src/machine/checks.ts` | Engineering findings (current, joinery, fit) |
| `src/machine/bom.ts` | Bill of materials |
| `src/machine/*.worker.ts`, `src/app/pool.ts` | Analysis, exploration and the search pool, off the main thread |
| `src/catalog/` | Stock, rails, drives, motors, spindles, controllers, hardware, with prices |
| `src/fea/frame.ts` | Sparse 3D frame FE solver |
| `src/render/`, `src/geometry/` | three.js scene and part geometry |
| `src/app/` | The three-panel UI |

## Share it

The app builds to static files. For GitHub Pages from `main` `/docs`:

```sh
npm run build:pages   # replaces docs/index.html and docs/assets, keeps docs/research
git add docs && git commit -m "Update hosted build" && git push
```

For Netlify, Vercel or Cloudflare Pages, run `npm install && npm run build` and upload `dist/`.
