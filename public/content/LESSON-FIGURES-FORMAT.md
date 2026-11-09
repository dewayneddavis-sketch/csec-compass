# Lesson figures format

Spec for the optional `figures` array on a **lesson object** in
`content/<subject>/modules.json` (mirrored at `public/content/<subject>/modules.json`).

Status: **live, and moving.** The renderer, the contract and its harnesses are live and
figures ship in Chemistry, Biology, Physics, Mathematics, Human & Social Biology and
Integrated Science. Three Physics figures are ANIMATED — see "Animated figures" below for
the extra rules that apply to those. Content authors add figures subject by subject.

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

## Animated figures

A figure may MOVE, as a *simulation*: the owner's directive of 2026-10-23 asks for animated
simulations — "moving diagrams of experiments, done in code" — as our richer, all-original
alternative to the small video clips a rival drops into its lessons. Three Physics figures
ship this way today: `pendulum-oscillation.svg`, `transverse-wave-propagation.svg` and
`projectile-motion.svg`.

**The animation is declarative SVG (SMIL), inside the file — never scripting.** This is not
a style preference. A lesson renders a figure with `<img src>`, and a browser runs
declarative animation in a standalone image document while it runs no scripting and allows
no interaction there. `<script>` stays banned, so SMIL (or CSS inside the SVG's own
`<style>`) is the only way a figure moves. `animate` and `animateTransform` are what the
harnesses look for; the same rule about being original and truthful covers motion.

The extra rules an animated figure must keep (all of them machine-checked):

| rule | why |
|------|-----|
| `repeatCount="indefinite"` on every animation element | a figure that plays once and freezes reads as a broken picture |
| a positive `dur`, the value the lesson's own arithmetic gives | the pendulum's loop is 2 s because the lesson calculates T = 2.0 s; a loop at the wrong period teaches the wrong number |
| **the first painted frame is a correct static diagram** | print, raster export, an older WebView, or a renderer that ignores SMIL must still get the right picture, not a blank or a half-drawn state |
| every animation element sits inside an element that carries an `id` | the movable part is named, which is what makes the animation checkable at all |
| the animation may show only motion the lesson teaches | the figures rule: a figure may label (and therefore show) what its lesson names |
| labels clear the moving part | the generator measures every label box against the mover at t = 0, T/4, T/2 and 3T/4 and refuses to write a figure where they meet |

**`prefers-reduced-motion` is not honoured** (accepted and recorded for v1): SMIL has no way
to read it, and the correct static first frame plus the alt text and caption carry the
meaning when motion is unwanted. If the owner asks for it, the fix is a static twin of each
simulation chosen by a media query at the render site.

An animated figure is still a figure: same `figures` array, same three keys, same
`viewBox`/`<img>`-safe rules, still inside the purchase gate.

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

`node tools/check-figure-generators.mjs` — re-runs every subject's figure generator and
byte-compares its output with the committed SVGs, so a generated figure can never drift
from the code that draws it (never hand-edit an SVG to match a generator, or the other
way round).

`tools/gen-mathematics-figures.mjs` carries two assertions the other generators do not,
because Mathematics' drawings are made of arcs and circles rather than straight rules.

**The taught-labels guard** reads the text the figure actually emits — `lab.texts`, the
strings that went into the SVG — not a list written beside the call, and requires every
**word** in it to appear in that lesson's own text (title and body, case-insensitive).
**Numbers** are held to the same rule on token boundaries, the way
`tools/check-math-working.mjs` checks a worked step: a figure printing `12.5` is not taught
by a lesson that only prints `12.57`. Ordinary connective words — the guard prints the ones
it excuses on every run, and an excuse no figure needs is an error — and the non-visible
`<title>` are not body copy and are not held to it; nor are mathematical symbols or
punctuation. **What it cannot do: it catches an UNTAUGHT label, never a MISLABELLED one.**
Swap the 15.59 and the 18.85 in `sector-and-segment.svg` and every word and every number is
still taught, so the guard passes; only a human reading the drawing against the working
catches that, which is why that read-back is evidence and this guard is not.

**The second assertion:** no stroked segment — a circle sampled 96 times, an arc every 2° —
may cross a label box or leave the canvas. Both throw, so a figure whose words are untaught,
crossed by a line, or cropped at the edge never reaches the tree.

`node tools/check-physics-animations.mjs` — the animated half of the contract: a shipped
simulation must carry the animation elements its row in that harness's table names, at the
right duration, looping indefinitely, in a named parent, wired into the lesson it belongs
to, byte-identical in both trees. Add `--red-control` to make it mutate the simulation in
memory and require each rule to bite.

**What the harnesses cannot see.** They prove structure, not pixels: Node can read the
animation elements but cannot watch them move. The pixel proof is the two-screenshot motion
read-back kept with the change (`docs/screenshots/physics-animations/`): two frames of the
pendulum figure about 0.5 s apart must differ, and the same test on a static figure must give
two identical frames, which is what proves the difference is motion and not noise.
