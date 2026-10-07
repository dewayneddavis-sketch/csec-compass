# Lesson figures — render proof

These four frames prove the lesson-figure **renderer** works. They were captured from a
local production build of the `feat/lesson-figures` branch.

**They are proof of a temporary fixture, not of shipped content.** At the time of capture
(and in the PR that added the renderer) **no lesson in CSEC Compass ships a figure** — the
platform's contract, renderer and harness are live, the pictures are not. The fixture that
appears in the "after" frames lived **only in the local build output** (`dist/`, which is
never committed): the lesson page fetches its content JSON at runtime, so a figure can be
added to the served copy without touching a single repository file. Nothing in `content/`
or `public/content/` was modified, and the fixture was deleted after capture.

| frame | what it shows |
|-------|---------------|
| `before-no-figure.png` | `Chemistry → States of Matter` with no figures anywhere: the lesson renders exactly as it does today, with no empty gap and no broken box. |
| `after-fixture-figure.png` | The same lesson with the fixture figure in place: a figure card between the lesson text and the objectives, scaled to the lesson column. |
| `after-fixture-figure-caption.png` | The caption under the figure ("Figure 1. …"). |
| `after-fixture-figure-fullpage.png` | The whole lesson in one frame: written body → figure card with caption → Learning Objectives → Key Concepts → Interactive Lab, all unchanged around it. |

## What the fixture was

A chequerboard with a circle, plus a red-ringed circle, drawn at a natural size of
400 × 260 with a `viewBox`. Squares staying square and the circle staying circular is how
we can see at a glance that the figure is **not** distorted when it scales. Measured in the
page: natural 400 × 260, displayed 804 × 523 — ratio 1.538 vs 1.537, i.e. scaled to the
column with its aspect ratio intact.

The DOM state was read back rather than assumed — `figures=0 img=none` before, and after:
`figures=1`, the figure's `src`, its `alt` text, and the natural/displayed sizes above.
