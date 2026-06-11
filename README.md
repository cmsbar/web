# CMSBar marketing site

Static landing page for [CMSBar](../CMSBar) — Git-as-CMS you drop into your
own codebase.

- `index.html` / `styles.css` / `app.js` — no build step, no dependencies.
- The hero demo is an interactive simulation of the real product flow:
  New draft → click the headline and type → Save → a PR card appears with the
  JSON diff → Merge → "deployed". Replayable via New draft.
- Fonts: Instrument Serif (display), Schibsted Grotesk (body), Geist Mono.

## Develop

```bash
python3 -m http.server 8765   # then open http://localhost:8765
```

## Deploy

Any static host (Vercel, Netlify, Cloudflare Pages, nginx). Point it at the
repo root.
