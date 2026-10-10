# Oleksandr Chykhaiev — portfolio

Static site, no build step on the server. Deployed on Vercel.

- `index.html` — English home (source of the layout).
- `uk/index.html` — Ukrainian home, **generated**: run `python3 tools/build_uk.py` after editing `index.html`. Translations live in that script; the build stops if a phrase is missing.
- `work/<case>/index.html` — case study pages (English).
- `styles.css`, `main.js` — shared by all pages.
- `fonts/` — self-hosted Geist, Geist Mono, Instrument Serif, Cormorant (Cyrillic accent). All OFL, licences included.
- `vercel.json` — security headers.

Designed by Oleksandr Chykhaiev, built with Claude.
