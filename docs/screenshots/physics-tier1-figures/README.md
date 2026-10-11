# Physics Tier-1 lesson figures — rendered proof

Proof that the three Physics Tier-1 figures render, that they sit inside their lessons, and that
the labels are clear of the drawn lines. The SVGs are **original vector art generated from real
data** by `tools/gen-physics-figures.mjs` (reproducible byte for byte — see the PR body).

## What is here

| file | what it shows |
|---|---|
| `before-figure-*.png` | each figure at its **intrinsic size** (780 px wide) as drafted, before the label/arrowhead defects below were fixed |
| `after-figure-*.png` | the same three after the fix |
| `zoom-before-label-crossing.png` | 4×–6× crops of the defects: the distance-time line running through "gradient = 6 m/s" and "curve → accelerating", the rising line through "9 m", the descending line through "6 m" and "stationary: 0 m", and the arrowhead that rendered as an **X** on the incident ray |
| `zoom-after-fixed.png` | the same regions after: labels clear, and a real arrowhead showing the direction of travel on both the incident and the refracted ray |
| `after-<lesson>.png` | the figure **inside the lesson** on `/lesson/physics/<lesson>` in a local production build |

## The lesson screenshots (`after-<lesson>.png`)

Lessons are behind the purchase gate, so the page was opened on a local production build with the
documented one-line gate bypass, then the bypass was reverted and proven gone in the same session
(`grep -rc SCREENSHOT-ONLY src/` → 0 files, `git diff -- src api` → empty). No bypass is committed.

DOM read back from the live page (not eyeballed):

| lesson | `figure` elements | src | natural | displayed |
|---|---|---|---|---|
| `motion-graphs` | 1 | `/content/physics/figures/motion-graphs.svg` | 780×410 | 804×423 |
| `electric-circuits` | 1 | `/content/physics/figures/circuits-series-parallel.svg` | 780×560 | 804×577 |
| `light-refraction` | 1 | `/content/physics/figures/light-refraction.svg` | 780×480 | 804×495 |

Displayed ÷ natural is the same factor on both axes in every row (1.031), so nothing is stretched,
and each figure's caption is the one shipped in `modules.json`.

## Why the "before" images exist

`node tools/check-lesson-figures.mjs` proves the schema, never the picture: the first draft of these
three figures was contract-clean, harness-green and **physically wrong in four places** (listed
above). They were found by rasterising each SVG at its intrinsic size, looking, and then measuring:
a script loaded each SVG in a browser and asked the DOM which *stroked* line crosses which *text*
box (`getBBox` + segment/rectangle clipping). Before: six crossed labels in `motion-graphs` and one
in `circuits-series-parallel`. After: **none** (the two remaining hits the measurement reports in
`circuits-series-parallel` are the series loop wire passing behind the white-filled resistor bodies,
confirmed by the 6× crop `zoom-after-fixed.png`).
