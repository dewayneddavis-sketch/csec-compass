# Lesson figures format

Spec for the optional `figures` array on a **lesson object** in
`content/<subject>/modules.json` (mirrored at `public/content/<subject>/modules.json`).

Status: **capability only.** The renderer, the contract and its harness are live; no
lesson in the app ships a figure yet, so no screen in CSEC Compass shows a picture today.
Content authors add figures subject by subject (Chemistry pilot first).

## Lesson shape

`figures` is **optional and additive**. A lesson without it is unchanged; nothing about
lesson ids, titles, objectives, content, concepts or the lab (`experiment`) moves.

This spec file is itself mirrored byte for byte at `public/content/LESSON-FIGURES-FORMAT.md`,
like `WRITE-QUESTION-FORMAT.md` — the two content trees must hold the same files.

```jsonc
{
  "id": "periodic-table-trends",
  "title": "Trends in the Periodic Table",
  "content": "…",
  "objectives": ["…"],
  "concepts": ["…"],
  "experiment": "drag-drop-label",
  "figures": [
    {
      "src": "/content/chemistry/figures/periodic-table-trends.svg",
      "alt": "Periodic table with the first 20 elements labelled; atomic radius decreases left to right and increases down each group.",
      "caption": "Radius and electronegativity change in opposite directions across a period."
    }
  ]
}
```

## Figure shape

| key       | required | rule |
|-----------|----------|------|
| `src`     | yes      | A served path: `/content/<subject>/figures/<name>.svg`. Letters, digits, dot, dash and underscore only — no spaces, no `..`, no query, no hash, no remote URL. The `<subject>` segment must be the subject whose `modules.json` carries it. |
| `alt`     | yes      | What the figure shows, for someone who cannot see it. At least 15 characters, truthful and specific. Placeholders (`image`, `diagram`, `figure 1`, `TBD`) are rejected. |
| `caption` | no       | One short sentence shown under the figure. Omit the key rather than leaving it empty. |

**Only these three keys are allowed.** A typo (`altt`, `caption_`) fails the harness
rather than silently rendering an image with no alt text.

## Where the file goes, and why SVG only

Figures live at `public/content/<subject>/figures/<name>.svg` — the served mirror — and
the same file must exist in `content/<subject>/figures/<name>.svg`. The two trees are
mirrored byte for byte, exactly like the rest of the content (already harness-enforced).

SVG only, for two reasons that are not negotiable here:

1. **All-original (Jamaica-law).** Every figure is drawn by us from real data or a real
   illustration — nothing copied, nothing licensed in, no AI-generated artwork.
2. **Scientific accuracy.** A generated periodic table or electron shell is wrong in the
   details. Data-drawn vector output is checkable; a plausible-looking raster is not.

The harness also requires a `viewBox` (so the figure scales with the lesson column
without distortion), no raster `<image>` inside the SVG, no `<script>`, and no external
URL references.

## Rendering

`src/pages/LessonView.jsx` renders each figure in order, directly after the written
lesson body, as a `<figure>` with the `<img>` and its `<figcaption>`. The image fills the
lesson column and scales with it; the caption sits underneath. Figures are inside the
lesson, so the existing purchase gate covers them — nothing bypasses it.

Malformed entries are dropped by `asFigures()` (`src/data/lessonFigures.js`) instead of
being rendered: a card with a nameless or alt-less image is worse than no card.

## Harness

`node tools/check-lesson-figures.mjs` — validates every `figures` array across every
subject (keys, src shape, alt quality), resolves every `src` to a real file under
`public/content`, keeps the two trees byte-identical, checks the renderer wiring, and
carries a red/green control that proves it fails on a broken figure.
