# Integrated Science Tier-1 lesson figures — rendered before/after proof

Task `f7bb17dd` (audit `/home/team/shared/integrated-science-figure-audit.md` §2 Tier 1).
Three figures, three lessons, all **additive** — no lesson id, bank count or lesson copy changed.

| Lesson | Figure (SVG in both trees) |
|---|---|
| `is-l2-1` Cells and Life Processes | `is-cells-plant-animal.svg` |
| `is-l5-1` Circuits and Household Electricity | `is-circuits-series-parallel.svg` |
| `is-l5-3` Heat Transfer and Temperature Control | `is-heat-transfer-control.svg` |

## The screenshots

Each lesson was served from a local production build (`node_modules/.bin/vite build` +
`vite preview --port 4173`) and driven with a real headless chromium.

* `before-*.png` — full page, the **same build** with the three `figures` entries removed from
  `dist/content/integrated-science/modules.json` only (build output, never committed). The figure
  block is absent: DOM says `figures: 0`.
* `after-*.png` — full page with the real content in place; `after-*-figure-view.png` is the same
  page scrolled so the figure fills the viewport.
* `dom-readback-before.txt` / `dom-readback-after.txt` — the DOM read-back each shot was taken
  against (`document.querySelectorAll('figure')`).

Read-back, after (all three lessons): `figures: 1`, the `src` is the subject-local SVG, the `alt`
text is the lesson's own description, the renderer prefixes the caption with `Figure 1.`, and the
image is complete (`loaded: true`) at its intrinsic size scaled without distortion:

| Lesson | intrinsic | displayed | ratio |
|---|---|---|---|
| `is-l2-1` | 1000×1560 | 804×1254 | 0.8040 / 0.8038 |
| `is-l5-1` | 780×656 | 804×676 | 1.0308 / 1.0305 |
| `is-l5-3` | 1000×930 | 804×748 | 0.8040 / 0.8043 |

## The purchase gate

The figure block renders **inside** the gate, so the shots were taken with the documented
throwaway bypass (`return true; // SCREENSHOT-ONLY` as the first line of `hasSubjectAccess()` in
`src/data/access.js`). It is reverted and proven:

* `grep -rl SCREENSHOT-ONLY src/ api/` → **0 files**
* `git diff --stat origin/main -- src api` → **empty**

## Reproducing the artwork

`python3 tools/gen-integrated-science-figures.py --trees` rewrites both trees; re-running it does
not change a byte (`md5sum` before/after). The generator refuses to write unless:

* **borrowed geometry is still current** — it rebuilds Biology's plant-cell wall rect and
  animal-cell outline and Physics's series/parallel panel lines from its own constants and asserts
  each string still occurs in the sibling subject's shipped SVG (so the reuse cannot drift), and
* **every drawn phrase is taught** — each drawn label/line is asserted against that lesson's own
  copy (content, objectives, concepts, Play-tab description): 34 phrases are verbatim fragments of
  the lesson's words, 11 are label sets built only from its vocabulary, 0 unexplained, and
* **no number the lesson does not state** appears (audit §4 taught-numbers rule — which is why the
  borrowed circuit panels are drawn without Physics's 6 V / 2 Ω / 1 A values), and
* no HTML-only entity, no `<script>`/`<image>`, and no text overflowing the canvas.

Label placement was measured in the DOM, not eyeballed: every `<text>`'s `getBBox()` was clipped
against every stroked segment (`line`/`rect`/`polyline`/`polygon` edges and 1 px-sampled `path`s).
Result: **0 real crossings**. The only remaining hits are two known-benign classes — the 6 px where
a leader line starts inside its own label box, and the A/B letters inside the white-filled component
boxes whose wire is painted behind them.
