# FrameForge Lab

Dark industrial web app for comparing aluminum extrusion machine-frame recipes with beam FEA, modal estimates, rail stacks, and fill media.

## Share It

The app builds to plain static files, so the easiest friend link is:

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
