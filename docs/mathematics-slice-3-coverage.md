# Mathematics — Slice 3 coverage record

Modules: `consumer-arithmetic`, `sets`, `statistics-probability` · chapters **17–28 and 40–52**
(25 chapters = 14 REUSE + 7 EXTEND + 4 NEW) · branch `math-slice-3` off `origin/main` `613ba60`.

Owner topic list: `mathematics-coverage-target-competitor-list.md`. Audit: `mathematics-coverage-audit.md`.
Lead rulings: `mathematics-slice-3-rulings.md` (chapter 49's host; reveal sequencing).

## Counts, before → after

| | before (`613ba60`) | after |
|---|---|---|
| Mathematics lessons | 47 | **51** |
| `statistics-probability` lessons | 3 | **7** |
| Per-lesson Play-tab lab sets | 32 | **36** |
| Per-lesson lab items | 181 | **205** |
| Sets with authored step-by-step workings | 0 | **4** (24 items, 3 steps each) |
| Sets in the backfill `PENDING` ledger | 32 | **32** (unchanged) |
| `tools/check-*.mjs` harnesses | 55 | **55** |
| Practice bank / KC / Paper 2 | 100 / 25 / untouched | **unchanged (banks frozen)** |

## The 25-row table

`S`/`#` are the owner's chapter numbering. "Shipped string" is quoted from the file on the branch —
where the audit's wording was a condensation, the real string is quoted and the audit's is noted.

| S | # | chapter | disposition | host / new id | what ships |
|---|---|---|---|---|---|
| 2 | 17 | Profit, Loss, and Discount | REUSE | `profit-loss-and-discounts` | "A discount is different: it is a reduction from the marked price, so it is always worked out on the marked price, never on the cost price." (audit quoted the shortened "A discount… is always worked out on the marked price"; this is the real sentence) |
| 2 | 18 | Percentage Expressions and Problem Solving | **EXTEND** | `profit-loss-and-discounts` | **+3 paragraphs appended**: "express one quantity as a percentage of another", **choosing the base** (cost price / marked price / original value), and a worked method ($48,000 → $60,000 = +25%, and 12,000 ÷ 60,000 = 20% the other way). +2 objectives, +2 concepts, all ending `(Percentage Expressions and Problem Solving)` |
| 2 | 19 | Instalment Payments | REUSE | `hire-purchase-and-instalments` | "The total hire purchase price is the deposit plus every instalment added together" |
| 2 | 20 | Simple Interest | REUSE | `simple-and-compound-interest` | "I = (P × R × T) ÷ 100 and the amount at the end is A = P + I" |
| 2 | 21 | Compound Interest, Appreciation, and Depreciation | **EXTEND** | `simple-and-compound-interest` | **+3 paragraphs appended**: appreciation (named nowhere in the subject before this slice), the `A = P(1 + R/100)^n` worked method at 10% for three years, and the four-word vocabulary box. +1 objective, +2 concepts ending `(Compound Interest, Appreciation, and Depreciation)` |
| 2 | 22 | Currency Conversion and Measures | REUSE | `exchange-rates-and-currency` | the lesson's divide-by-the-rate method (set + copy unchanged) |
| 2 | 23 | Household and Personal Finance | REUSE | `insurance-and-budgeting` | "Net income is the money actually received" |
| 3 | 24 | Set Definition and Representation | REUSE | `set-notation` | roster / set-builder notation |
| 3 | 25 | Set Relationships and Subsets | REUSE | `subsets-and-cardinality` | the real string is "a set with n elements has 2^n subsets" — the audit's ch 25 wording is a condensation of this line, quoted here as shipped |
| 3 | 26 | Calculating Set Elements | REUSE | `union-intersection-complement` | "n(A ∪ B) = n(A) + n(B) — n(A ∩ B)" |
| 3 | 27 | Venn Diagram Application | REUSE | `venn-diagrams` | "Write 10 in the overlap first" |
| 3 | 28 | Practical Set Theory | REUSE | `set-word-problems` | "neither = 35 — (13 + 9 + 9) = 4" |
| 5 | 40 | Sample and Population Attributes | **NEW** | `mat-stat-data-types-and-sampling` | new lesson; lab set "Data and Sampling Match" (6 pairs); 6 authored workings |
| 5 | 41 | Frequency Tables and Class Features | REUSE | `frequency-tables-and-cumulative-frequency` | "class intervals of equal width … must not overlap" |
| 5 | 42 | Constructing Basic Diagrams | **NEW** | `mat-stat-statistical-diagrams` | new lesson; lab set "Statistical Diagrams Match" (6 pairs); 6 authored workings |
| 5 | 43 | Cumulative Frequency Curve | REUSE | `frequency-tables-and-cumulative-frequency` | "Plot cumulative frequency against the upper class boundary to draw an ogive" |
| 5 | 44 | Mean, Median, and Mode Calculation | REUSE | `central-tendency` | "The Mean is the average" / "The Mode is simply the value that appears most frequently" (type-keyed: `data-visualizer`, no set — unchanged) |
| 5 | 45 | Choosing the Best Average | REUSE | `central-tendency` | "the median is often better than the mean for describing incomes because it isn't skewed by a few extremely high values" |
| 5 | 46 | Range and Quartiles | **EXTEND** | `frequency-tables-and-cumulative-frequency` | **+3 paragraphs appended**: `range = highest value − lowest value` (the range was defined nowhere before), quartiles and IQR, and a worked method on 3, 5, 6, 8, 9, 11, 12, 15 (range 12, IQR 6). +2 objectives, +2 concepts ending `(Range and Quartiles)` |
| 5 | 47 | Standard Deviation for Comparison | **NEW** | `mat-stat-standard-deviation` | new lesson; lab set "Standard Deviation Steps Match" (6 pairs); 6 authored workings; two worked methods (σ = 2.83 vs σ = 4.24 on the same mean) |
| 5 | 48 | Analyzing Statistical Diagrams | **EXTEND** | `frequency-tables-and-cumulative-frequency` | **+4 paragraphs appended**: analysing a diagram (highest/lowest, band count, band percentage, comparison), cumulative readings are differences, and a worked method on an ogive of 40 students (median 52, Q1 44, Q3 61, IQR 17, 50% between). +2 objectives, +2 concepts ending `(Analyzing Statistical Diagrams)` |
| 5 | 49 | Proportions and Percentages | **EXTEND** | `mat-stat-statistical-diagrams` — **deviation, see below** | taught in the new Statistical Diagrams lesson: relative frequency = frequency ÷ total frequency, the pie-chart angle as `(frequency ÷ total) × 360°`, and the two written as one calculation. **Findable by name**: objective "Write a relative frequency as a proportion and as a percentage (Proportions and Percentages)" and concept "… (Proportions and Percentages)" |
| 5 | 50 | Sample Space for Experiments | **EXTEND** | `probability` | **+4 paragraphs appended**: the sample space named and written in braces, two-way tables, experimental probability, and the **mandatory worked method** (two fair coins: {HH, HT, TH, TT} → 3/4 = 0.75, experimental check 306 ÷ 400 = 0.765). +2 objectives, +2 concepts ending `(Sample Space for Experiments)` |
| 5 | 51 | Experimental and Theoretical Probabilities | **EXTEND** | `probability` | experimental probability defined in the lesson body (`number of times the event happened ÷ number of trials`) — it appeared only in the lab blurb before. +1 objective, +1 concept ending `(Experimental and Theoretical Probabilities)` |
| 5 | 52 | Statistical Inference and Application | **NEW** | `mat-stat-statistical-inference` | new lesson; lab set "Reading a Sample Match" (6 pairs); 6 authored workings; worked method scaling 120 of 1,200 students to 300 |

**Totals:** 14 REUSE · 7 EXTEND (6 appends into 4 hosts + chapter 49 into a new lesson) · 4 NEW. 25 chapters.

## The chapter-49 deviation, stated plainly

The audit's conformance table hosts chapter 49 in `fractions-decimals-percentages`
(`number-theory-computation`) and its slice table omits chapter 49 entirely. **The lead ruled
(2026-11-08) that chapter 49 is taught inside `mat-stat-statistical-diagrams`**, because the audit's own
slicing rule is that no existing lesson is edited by two slices and `fractions-decimals-percentages` was
already extended by Slice 1. `fractions-decimals-percentages` is **not touched by this slice**.
Chapter 49 is findable by name in the new lesson (objective + concept, both ending
`(Proportions and Percentages)`).

## The two honest-copy fixes (same defect class as PR #220)

Both are `experiment.description` fields that promised a tool the Play tab does not render.

1. `frequency-tables-and-cumulative-frequency` — was: *"Ogive Reading Match: match each statistic
   (median, lower quartile, upper quartile, interquartile range) to its value read from the cumulative
   frequency curve."* The set matches each statistic to **how it is found** (`Median` → "At n/2 on the
   cumulative axis"), not to a value read from a curve. Now: *"…drag each statistic — median, lower
   quartile, upper quartile, interquartile range, estimated mean and modal class — onto how it is found
   from a cumulative frequency table."*
2. `probability` — was: *"Coin Flip Lab: Simulate flipping a coin 100 or 1000 times to see how the
   experimental probability approaches 0.5 (theoretical)."* No simulator renders; the type-keyed
   `probability-sim` set is a drag match of five events to their probabilities. Now: *"Coin & Dice
   Chances: drag each event — a coin landing heads, rolling a six, rolling an even number, rolling an odd
   number, rolling less than seven — onto its probability."*

**Still owed (outside this slice, REUSE):** `central-tendency`'s description still says *"Live Stats:
Add/remove data points in a set and watch the mean, median, and mode indicators shift on a number line"*
while `data-visualizer` renders a five-row drag match. Same defect class; not touched here because
`central-tendency` is a REUSE lesson outside Slice 3's EXTEND list.

## The reveal: four new sets ship with authored workings

`src/data/mathLessonWorkings.js` was empty (stage 1, PR #223). This slice authors the four sets it adds,
keyed lesson → item: 4 sets, 24 items, 3 steps per item, the last step stating that item's answer
verbatim. Direction is chip = term, zone = description, so a wrong drop reads
*Correct answer: only whole-number values* followed by the steps.

`tools/check-math-working.mjs` now reports **36 per-lesson sets / 205 items · authored 4 · PENDING 32**,
`PENDING ∪ authored === every live set`, red controls 21/21 caught.

## Harness edits (one, and it was made derived)

`tools/check-math-working.mjs` had `expectedItems: 181` — the literal item count of the 32 pre-existing
sets. Four new sets make the true count 205, so A8 could not pass. It is now
`expectedItems: liveItemCount(lessonSets.mathematics)`, enumerated **independently of `itemsOf()`** so a
set whose items `itemsOf()` cannot enumerate still makes the walk short. It is **derived, not loosened**:
what a set *disappearing* used to prove here is proved by A2 (every live set must be in
`PENDING ∪ authored`, and a `PENDING` key that is not live fails). No other harness was touched, and no
assertion was deleted or weakened. `tools/check-mathematics-labs.mjs` needed **zero** edits: its
grandfather window is derived from the `mat-` id convention, so the four new sets automatically fall
under the corpus rule (12 new sets now checked, up from 8).

## Evidence

- **Pure-append prefix proof** (`s3work/prefix-proof.mjs --base <613ba60 modules.json>`): 51/51.
  For all four hosts the old `content` is a strict prefix of the new one, the old `objectives` and
  `concepts` arrays are strict prefixes, no other field changed, `experiment.type` unchanged, and
  **43 of the 47 base lessons are byte-identical**.
- **Corpus rule, per new set**: 12 displayed strings each, **0 untaught**, 48 in total.
  Red control: mutating one target to "whole numbers only" makes the real harness exit 1 with
  `A7: lessonSets.mathematics.mat-stat-data-types-and-sampling: "whole numbers only" is not in that
  lesson's own copy`; the file is restored byte-for-byte afterwards (md5 verified).
- **`check-mathematics-labs`**: 702 passed, 0 failed; `--red-control` 20/20 caught.
- **`check-math-working`**: green; `--red-control` 21/21 caught.
- **Full suite on the branch**: 55 harnesses, assertion counts up across the board
  (`check-lesson-content-types` 1888→1900, `check-mathematics-labs` 610→702,
  `check-teacher-lab-names` 692→696), and the **only red is the pre-existing one**
  (`check-student-messages`, 91/93 — identical on the untouched base tree).

## NOT DONE in this PR — the DOM read-back and Play-tab screenshots

The brief asks for a DOM read-back and screenshots of each new lesson's Play tab (chips under
"Drag items", zones under "Drop zones", the description, and a wrong drop showing
"Correct answer: …" with the numbered steps). **They are not in this PR.** The production build in the
fresh worktree failed with `node_modules/.bin/vite: No such file or directory` — the worktree has no
`node_modules` symlink and `npm ci` is forbidden on this box — and the session budget ran out before the
build could be re-run from a tree that has one. The reveal is proved by the harness
(`labReveal` walks all 205 items and returns the authored steps for these 24), never by pixels.
**This is the one piece of the brief's evidence that is missing, and it is missing, not implied.**

## Slice 4 hand-over

- **Next slice**: `algebra` (ch 53–68), `relations-functions-graphs` (ch 69–77) — 4 new lessons
  (`mat-alg-binary-operations-and-distributive-law`, `mat-alg-simultaneous-equations`,
  `mat-alg-word-problems`, `mat-alg-variation`) and 2 (`mat-rel-linear-programming`,
  `mat-rel-non-linear-functions`), plus the EXTENDs to `algebraic-expressions`, `quadratic-equations`,
  `factorization`, `inequalities`, `linear-and-quadratic-graphs`.
- **The pattern to copy**: new lessons go at the end of their module in chapter order; every new lesson
  gets `experiment.type: "interactive-quiz"` + its own set in `lessonSets.mathematics` (insertion anchor
  is the literal `  },\n  "english-a": {`) **and** its workings in `src/data/mathLessonWorkings.js` in the
  same commit — a set that is live but in neither `PENDING` nor `authored` fails A2 immediately.
- **Watch for**: `check-mathematics-labs` A5f (unique targets), A6 (no two lessons share a set title),
  A7 (every displayed string must appear in that lesson's copy after folding), A3
  (`sets === lessons − 15 type-keyed`).
- **Still owed across the subject**: `central-tendency`'s false lab description; the 32-set backfill;
  the 150-question practice re-balance; the Mathematics figure generator (does not exist).
