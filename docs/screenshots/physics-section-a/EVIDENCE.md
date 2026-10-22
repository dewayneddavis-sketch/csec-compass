# Physics Section A (Mechanics) — coverage build, slice evidence

Branch `content/physics-section-a`, off `origin/main` **65c4c7a**. Work order:
`/home/team/shared/physics-coverage-audit.md` §4 (dev-3, task 7f6e9180): of the 20 target
chapters — **REUSE 10 + EXTEND 1 + NEW 9**.

## What changed

| file | change |
|---|---|
| `content/physics/modules.json` | +9 lessons appended to the `mechanics` section (16 → 25 lessons; mechanics 5 → 14); `forces-and-newtons-laws` grown by pure insertion |
| `public/content/physics/modules.json` | byte-identical mirror (`cmp` clean) |
| `src/components/lessonSets.js` | one per-lesson lab set for each of the 9 new lessons, written at the HEAD of the `physics` block |
| `tools/check-physics-gap-labs.mjs` | `SECTION_A_LESSONS` + `PER_LESSON_SET`; counts derived; mechanics-section assertions |

New lesson ids (all `mech-`, kebab-case, none collides with the 16 frozen ids):

`mech-scientific-method` · `mech-simple-pendulum` · `mech-measurement-and-instruments` ·
`mech-density` · `mech-derived-quantities-and-units` · `mech-turning-effects-and-moments` ·
`mech-levers` · `mech-centre-of-gravity-and-stability` · `mech-deformation-and-elasticity`

Every existing lesson id is untouched in place; `work-energy-and-power`,
`fluid-pressure-and-upthrust`, `scalars-vectors`, `motion-graphs` and all four other sections are
deep-equal to main. **Banks untouched** (practice 100, KC 25 — no file opened).

**EXTEND (audit's one EXTEND row, "Forces and Weight"):** `forces-and-newtons-laws` gains one
appended content paragraph (mass vs weight, W = mg, g in N/kg, 600 N on Earth vs 96 N on the Moon)
and two appended concepts. Proven pure insertion: `new.content.startswith(old.content)` and the
first three concepts identical.

**Held (the audit's 10 REUSE rows — no lesson authored, declared in the data file):**
Scalars and Vectors · Motion Definitions and Graphs · Newton's Laws of Motion · Energy Concepts and
Transformations · Potential Energy · Kinetic Energy · Conservation of Energy · Power and Efficiency ·
Pressure · Archimedes' Principle and Buoyancy.

## Harness suite — 40/40 green (`tools/check-*.mjs`)

Deltas from main, all explained by the +9 lessons: content-types 1468 → **1495/1495**;
lesson-figures 606 → **615/615**; teacher-lab-names 555 → **564/564**; physics-gap-labs 30 → **389
passed, 0 failed**. Everything else unchanged and green (paper2 446, api-functions 41,
subject-catalog 193, play-copy 51, lab-set-ownership 30, mock-paper 34, …).

**Red controls** (run on a throwaway copy of the tree, `/tmp/rc`):
A remove the `mech-levers` lab set → 2 FAIL; B reword one displayed lab string → 1 FAIL (trace rule);
C rename a lesson id in modules.json → FAIL; E add a lesson with no lab set → 2 FAIL
("physics has 25 lessons (26)"). Restored → **389 passed, 0 failed**.

## British/CXC spelling

Widened instrument, `--selftest` **80/80**, output written to its own dated path
`/home/team/shared/physics-section-a-spelling-scan-2026-10-22.md` (the pinned baseline was not
touched). Repo totals unchanged **A 115 / B 3 / REVIEW 4**; this slice contributes **0 A, 0 B,
0 REVIEW** rows. The 5 rows that name my new content are all judged correct by the scan: 1×
`practise` (verb, modal before it — the sentence says "so you should practise the vocabulary") and
4× `micrometer`, the measuring instrument (British keeps `micrometer`; only the unit is
`micrometre`).

## Production-build render proof (two rounds, `npm run build` exit 0)

Round A — temporary `return true; // SCREENSHOT-ONLY` at the top of `hasSubjectAccess`
(`src/data/access.js`), served from `dist/` with an SPA handler:
* `/lesson/physics/mech-levers` — h1 "Levers", 5 paragraphs, 4 objectives, 5 concepts, lab heading
  "Interactive Activity", **set title "Levers"**, subtitle "Sort each example and each arrangement
  under its class of lever.", items "A wheelbarrow, a nutcracker and a bottle opener" / "A crowbar, a
  pair of scissors, pliers and a see-saw" / "The effort is between the pivot and the load" / …
  → `mech-levers-lesson-play.png`
* `/lesson/physics/mech-simple-pendulum` — h1 "Simple Pendulum Experiments", 5 paragraphs, its own
  **set "Simple Pendulum Experiments"** with "Twenty oscillations" / "The length" / "The period" /
  "A graph of T squared against l" / "The mass of the bob" → `mech-simple-pendulum-lesson-play.png`

Round B — bypass reverted, rebuilt, same URL, **no purchase**: DOM read-back
`gate = "🔒 This lesson requires full access"`, `lessonTextPresent = false`, `labPresent = false`
→ `mech-levers-purchase-gate.png`.

Bypass reverted and proven: `grep -rn SCREENSHOT-ONLY src/ api/` = 0.

## Merge note (queue discipline)

Section E (`content/physics-atom-coverage`, PR #183) appends its lab sets at the END of the same
`physics` block in `lessonSets.js`, and edits the same count lines in
`tools/check-physics-gap-labs.mjs`. This slice deliberately writes at the HEAD of the block so the
two lanes sit in different regions. If both land, the harness needs one line combined:
`const PER_LESSON_SET = [...GAP_LESSONS, ...SECTION_E_LESSONS, ...SECTION_A_LESSONS];`
