# Doherty Dynamics Machine Frame Lab

Dark industrial web app for comparing aluminum extrusion machine-frame recipes with beam FEA, modal estimates, rail stacks, and fill media.

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

Seed profiles approximate common McMaster-style T-slot framing dimensions. Replace them with verified McMaster drawing or CAD mass properties before making purchase or safety decisions.

## Visual Sources

Profile picker artwork is adapted from Wikimedia Commons `8020-Fractional-Profiles-1.svg`, licensed under CC BY-SA 3.0. The app crops and recolors the 1.00" and 1.50" fractional profile drawings for compact UI selection icons; these are visual references, not McMaster-Carr drawings.
