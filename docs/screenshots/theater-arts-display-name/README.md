# Theatre Arts display name — rendered before/after

Owner ruling (2026-10-09): the subject's **display name** reads **"Theatre Arts"**.
The subject id/slug (`theater-arts`) and the icon name (`Theaters`) are lookup
**keys** and stay byte-identical — respelling either breaks the `/subject/theater-arts`
route or blanks the theatre-masks icon.

Captured from a local production build (`vite build` + `vite preview --port 4173`),
driven with agent-browser. The catalog and the subject metadata are fetched at
runtime from `/content/...`, so **one build serves both states**: the `after-*`
frames were shot from the branch tree, then `dist/content/subjects.json` and
`dist/content/theater-arts/metadata.json` were overwritten with the `origin/main`
(base) copies, the pages reloaded, and the `before-*` frames shot. Nothing in
`src/` or `api/` was bypassed or patched — no purchase-gate bypass is used in this
PR, and the frames are of the real shipped components.

The URL in every frame is `/subject/theater-arts` (read back from
`location.pathname`, not assumed).

| frame | file | DOM read-back |
|---|---|---|
| after — subject page | `after-subject-theater-arts.png` | `path=/subject/theater-arts heading="Theatre Arts" iconText=🎭` |
| before — subject page | `before-subject-theater-arts.png` | `path=/subject/theater-arts heading="Theater Arts" iconText=🎭` |
| after — catalog card | `after-catalog-theater-arts-card.png` | `found="Theatre Arts" top=140 y=2570` |
| before — catalog card | `before-catalog-theater-arts-card.png` | `found="Theater Arts" top=140 y=2570` |

Both catalog frames were scrolled with `scrollBehavior='auto'` to the same measured
position (`top=140`, `y=2570`) so the pair shows the same region. md5s are all
distinct (four frames, four hashes) — see below.

Served-content proof at swap time:

```
served subjects.json: ['Theatre Arts']      -> ['Theater Arts']   (after the swap)
served metadata.json: Theatre Arts           -> Theater Arts
```

The theatre-masks icon 🎭 is present and unchanged in all four frames, and the
heading is the only thing that changes: `Theater` -> `Theatre`.

Note: the pricing page's subject dropdown is a native `<select>` (its open list is
not photographable), so the catalog grid frames carry the catalogue proof; the
dropdown's fallback list in `src/data/pricingSubjects.js` is the third display-name
site and is guarded by `tools/check-subject-pricing.mjs` (see the PR body for the
red/green control).
