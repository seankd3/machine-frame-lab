# Machine Frame Lab

Dark industrial web app for comparing aluminum extrusion machine-frame recipes with preliminary beam-level FEA, modal checks, rail stacks, fill media, editable design limits, and exportable analysis records.

## Model Scope

Machine Frame Lab is a preliminary sizing and comparison tool. It models the selected member as one Euler-Bernoulli beam span with equivalent composite rail/fill stiffness. It does not model a full machine frame, bolted joints, plate compliance, rail-carriage contact, fastener preload, weldments, local extrusion wall buckling, thermal drift, or control-loop behavior.

Use the results to compare concepts and identify weak candidates. Before buying material or making safety decisions, verify the section properties, support stiffness, connection details, and full-assembly modes with supplier data, CAD/FEA, measurement, or a qualified engineering review.

## Analysis Notes

- Static deflection uses assembled two-node Euler-Bernoulli beam elements with vertical displacement and rotation degrees of freedom.
- Modal frequency uses the same assembled stiffness matrix and a consistent beam mass matrix. The moving spindle/carriage mass is added as a translational point mass at the selected load station, distributed to the adjacent FE nodes.
- First-mode frequency is computed from the reduced generalized eigenproblem `K phi = omega^2 M phi`.
- Dynamic deflection is the static FE deflection multiplied by a damped single-mode amplification factor against the nearest spindle or tooth-pass excitation, capped to keep the preliminary readout from implying false precision.
- Modal separation is the percent distance between an excitation and structural mode: `abs(modeHz - excitationHz) / modeHz * 100`.
- Design limits are editable and stored in share links and local drafts: maximum dynamic deflection, minimum first mode, and minimum modal separation.

## Verification

Run the focused numerical test suite:

```sh
npm test -- --run
```

The tests compare static midspan/free-end deflection and first modal frequency against closed-form Euler-Bernoulli results for simply supported, fixed-fixed, and cantilever beams.

## Share It

The app builds to plain static files. It is configured for GitHub Pages from `main` `/docs`, so the friend link is:

```txt
https://sean-kenneth-doherty.github.io/machine-frame-lab/
```

If you need to refresh the hosted files manually:

```sh
npm run build:pages
git add docs
git commit -m "Update hosted build"
git push
```

For Netlify, Vercel, or Cloudflare Pages:

1. Run `npm install && npm run build`.
2. Upload the `dist/` folder to Netlify Drop, Vercel, Cloudflare Pages, or GitHub Pages.
3. Open the hosted app and use **Copy link** to share the exact profile, rail, fill, and cutting-load setup.

For a quick same-network preview from Omarchy:

```sh
npm install
npm run dev
```

Then open `http://192.168.1.72:5173` from another device on the same network.

## Notes

Seed profiles approximate common McMaster-style T-slot framing dimensions. Replace them with verified drawing tables or CAD mass properties before making purchase or safety decisions. Custom/imported profiles improve traceability only when their area, mass per meter, and second moments of area are verified from a reliable source.
