# Machine Frame Lab

Design a DIY CNC router from parts you can actually buy, and find out how stiff, how fast and how expensive it will be before you order anything.

You describe a moving-gantry router in about twenty choices: travel, base stock (80/20 extrusion or steel tube), joinery, gantry beam, plate thickness, and a rail, drive and motor for each axis, plus a spindle, a controller and a design cutting force. From that the app compiles every part:

- **3D model**: extrusions, rails and carriages, ball screws and supports, motors, plates, gussets and fasteners, placed where they would go. Jog the axes or press **Run** to sweep the gantry through its travel. Click any part to see its catalogue item, cut length, mass and price.
- **Frame physics**: a 3D beam-and-spring finite-element model built from the same placement calls as the picture. It covers member sections, joint springs, carriage stiffness from HIWIN tables, and ball-screw, nut and bearing axial stiffness. It reports:
  - tool-tip stiffness and deflection in X, Y and Z;
  - which subsystem the deflection comes from (**Where it bends**);
  - the lowest vibration modes, with the part of the machine each one lives in.
- **Motion**: moving mass, acceleration and rapid speed per axis, from published pull-out torque curves. Rapids are limited by the motor, by screw whip (critical speed) or by ball-nut DN, whichever comes first. Torque is derated when the controller's drivers cannot supply the motor's rated current.
- **Findings**: plain-language warnings, such as deflection past a chip load, a low first mode, current-starved motors, slow rapids, joinery that doesn't suit the stock, and screws longer than the priced kit.
- **Bill of materials**: parts grouped by assembly, with quantities, cut lists, 80/20 cut fees, vendor links and a CSV export.

Layout: inputs on the left, the machine in the centre, results on the right. The URL hash holds the whole design, so **Copy share link** shares the exact machine.

## Where the numbers come from

Every price and stiffness figure has a source recorded in [`docs/research/parts-and-prices.md`](docs/research/parts-and-prices.md). Prices were read on 27 Sep 2026 and are single-unit USD before shipping and tax. A quoted range bills at its midpoint, with the range shown beside it. **Anything without a source stays unpriced** and is listed as such, so the BOM total is a floor, not an estimate. The largest unpriced items are cut aluminium plate and some fasteners.

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
| `src/machine/checks.ts` | Findings and their thresholds |
| `src/machine/bom.ts` | Bill of materials |
| `src/machine/analysis.worker.ts` | Runs the analysis off the main thread |
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
