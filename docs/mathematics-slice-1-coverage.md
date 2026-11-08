# Mathematics — Slice 1 coverage: the Number Theory & Computation module

**Branch:** `math-slice-1-number` · **Built:** 2026-11-07 · **Base:** `origin/main` `c27570b`
(Mathematics Slice 0, PR #218).

**Scope of this slice: module `number-theory-computation` only** — 14 of the owner's 104 rival
chapters. Five new `mat-num-` lessons, three EXTENDs, six REUSE. **No new module**
(`estimatedModules` stays 9), **no lesson id renamed, re-keyed, split or reordered**, **banks
frozen** (practice exactly 100, knowledge check exactly 25), **no figures**.

The module goes **5 → 10 lessons**; the subject goes **39 → 44**.

---

## 1. The 14 rows

| S | # | chapter (verbatim) | disposition | host / new id |
|---|---|---|---|---|
| 1 | 1 | Sets of Numbers | REUSE | `types-of-numbers` |
| 1 | 2 | Powers and Roots of Real Numbers | REUSE | `indices-and-surds` |
| 1 | 3 | Basic Operations and Order of Operations | REUSE | `real-numbers` |
| 1 | 4 | Fractions, Decimals, and Percents Conversion | REUSE | `fractions-decimals-percentages` |
| 1 | 5 | Factors, Multiples, HCF, and LCM | REUSE | `types-of-numbers` |
| 1 | 6 | Number Bases and Place Value | **NEW** | `mat-num-number-bases-and-place-value` |
| 1 | 8 | Significant Figures and Decimal Places | **NEW** | `mat-num-significant-figures-and-decimal-places` |
| 1 | 9 | Properties of Operations | **NEW** | `mat-num-properties-of-operations` |
| 1 | 10 | Scientific Notation | REUSE | `standard-form` |
| 1 | 11 | Fractions and Percentages of Quantities | **EXTEND** | `fractions-decimals-percentages` |
| 1 | 13 | Ordering Real Numbers | **EXTEND** | `standard-form` |
| 1 | 14 | Number Sequences | **NEW** | `mat-num-number-sequences` |
| 1 | 15 | Dividing Quantities by Ratio | **NEW** | `mat-num-ratio-and-proportion` |
| 1 | 16 | Problem Solving in Number Theory | **EXTEND** | `types-of-numbers` |

**Chapters 7 ("Units and Conversions") and 12 ("Ratio, Proportion, and Rates") are deliberately
NOT in this slice.** Both are Section-1 chapters whose host lesson is `si-units-and-conversion`,
which lives in the **measurement** module owned by **Slice 2**. Slices are cut by **host-lesson
ownership, never by section** — slicing by section would put two builders inside one lesson.
Consequence: `mat-num-ratio-and-proportion` does **not** teach direct or inverse proportion
(`y = kx`, `y = k/x`); its copy says so explicitly and points the reader at the units lesson.

## 2. The five new lessons

Appended inside `number-theory-computation.lessons` after `standard-form`, in this order.
Key set is exactly `id, title, content, objectives, concepts, experiment` — **no
`estimatedMinutes`** (dropped by lead ruling: no Mathematics lesson carries it and there is no
reader for it).

| # | new id | title | `experiment.type` | Play-tab set heading |
|---|---|---|---|---|
| 6.1 | `mat-num-number-bases-and-place-value` | Number Bases and Place Value | `interactive-quiz` | **Place Value in Any Base** |
| 8.1 | `mat-num-significant-figures-and-decimal-places` | Significant Figures and Decimal Places | `interactive-quiz` | **Count, Then Round** |
| 9.1 | `mat-num-properties-of-operations` | Properties of Operations | `interactive-quiz` | **Name the Property** |
| 14.1 | `mat-num-number-sequences` | Number Sequences | `interactive-quiz` | **Find the Rule** |
| 15.1 | `mat-num-ratio-and-proportion` | Dividing Quantities by Ratio | `interactive-quiz` | **Share It in a Ratio** |

**Title vs id on the last row.** The audit fixes the id as `mat-num-ratio-and-proportion`, but
chapter 15 is *"Dividing Quantities by Ratio"*. The **title is the chapter name** so the chapter
is findable by name (the coverage rule is "every target topic taught **and findable by name**");
the **id keeps the audit's slug** and is never respelled. This is deliberate, not a typo.

`interactive-quiz` is in `MATH_DRAG_TYPES`, so even a lost set would still reach a lab; every one
of the five carries its own set, which `ExperimentSandbox` resolves **by lessonId first**.

## 3. The three EXTENDs (pure appends)

`newContent.slice(0, oldContent.length) === oldContent` proved for all three; objectives and
concepts extended **at the end only**; string-multiset diff over each host shows **0 strings
removed**.

| host | chapter | content | objectives | concepts |
|---|---|---|---|---|
| `types-of-numbers` | 16 Problem Solving in Number Theory | 1421 → 2597 chars (3 paragraphs, A1–A3) | 4 → 5 | 4 → 6 |
| `fractions-decimals-percentages` | 11 Fractions and Percentages of Quantities | 900 → 2585 chars (4 paragraphs, B1–B4) | 2 → 3 | 2 → 5 |
| `standard-form` | 13 Ordering Real Numbers | 1153 → 2113 chars (2 paragraphs, C1–C2) | 4 → 5 | 4 → 6 |

**Fraction arithmetic is taught** (B3): adding and subtracting over a common denominator,
multiplying, dividing by multiplying by the reciprocal, and dividing by a decimal. No chapter on
the owner's list names it, but live bank questions `p63`, `p64` and `p53` test exactly those
skills and no lesson in the subject taught them. Teaching them is the honest fix; retiring three
live questions is not.

**A3** ("1 is the one number that is neither prime nor composite, because it has a single
factor.") is added because the `types-of-numbers` lab's pair `p5` now reads
`Neither prime nor composite` — the corpus rule requires the lesson's own copy to teach every
string its lab displays.

## 4. Two false lab descriptions, corrected

Honest copy is a standing requirement, not a nice-to-have. One field each, both inside this
slice's module ownership.

| lesson | was | now |
|---|---|---|
| `fractions-decimals-percentages` | "Visual Fraction/Percentage Slider: A bar that you can slide…" — **no slider exists** (`visual-converter` resolves to a drag set) | "Fraction, Decimal and Percentage Match: drag each fraction to its equivalent decimal and percentage." |
| `real-numbers` | "…click the operations in the correct order…" — `interactive-quiz` routes to a drag match | "Order of Operations Match: drag each expression to the value that BODMAS gives it." |

## 5. The one mathematically false lab pair, corrected

`lessonSets.mathematics["types-of-numbers"].pairs[4]` read
`{ target: "Neither prime nor square", label: "1" }`. **1 is a perfect square (1 = 1 × 1)**, so
the lab was teaching a false fact. It now reads `{ target: "Neither prime nor composite",
label: "1" }`, which is true, and A3 supplies the supporting sentence.

## 6. Lab partition after this slice

`node tools/check-mathematics-labs.mjs` prints:

```
    partition: 29 sets + 15 type-keyed = 44 lessons
    estimatedModules 9 = modules.length 9
    grandfathered sets: 24 (corpus rule applies to 5 new set(s))
```

The five new sets are **not** in `LEGACY_SETS`, so assertion 7 — *every string a lab displays
must appear in that lesson's own copy* — holds them to the rule string by string. They were
authored to pass it and they do. `types-of-numbers` is still grandfathered (its other four
pairs are paraphrase labels), which is why the `p5` fix needed A3 in the copy anyway: the fix is
true regardless of which rule checks it.

`tools/check-mathematics-labs.mjs` changed in this PR, deliberately and disclosed:

* **R1's expected `A3` arithmetic is now derived** (`liveSetCount - 1` / `coverageCount`)
  instead of the hardcoded `23 sets for 24 coverage lessons`. The old literal went stale the
  moment the module grew and read as "the assertion stopped biting"; the derived form expects
  the exact numbers `A3` must print for this tree with one set deleted, so it bites no less.
* **R13 added**: a **new** (non-grandfathered) set is doctored to display `"Zebra"`, and `A7`
  must name it. R8/R9 force a *legacy* set through the corpus rule, which proves the rule can
  bite; R13 proves the rule is actually **applied** to a shipped Slice 1 set.

`--red-controls-all`: **13/13 caught**. `--selftest`: 4/4.

## 7. Bank hand-over — the re-balance pass's work order

**Banks are frozen in this PR**: `practice.json` stays exactly **100** and
`knowledge-check.json` exactly **25**. Every row below is **input to the single-owner
150-question re-balance** that runs after all six coverage slices merge. Nothing here was acted
on.

| id | old topic | new topic | reason |
|---|---|---|---|
| `q23` | `real-numbers` | `types-of-numbers` | roots are taught in `types-of-numbers` (squares, cubes and their roots), not in `real-numbers` |
| `p14`, `p60`, `p61`, `p49` | `real-numbers` | `types-of-numbers` | primes / HCF / LCM / surds — all four are `types-of-numbers` content |
| `p15`, `p97` | `real-numbers` | `standard-form` | both are standard-form questions sitting under the operations lesson |
| `p47`, `p48` | `real-numbers` | `indices-and-surds` | both test index laws, which `indices-and-surds` teaches |
| `p16`, `p58` | `real-numbers` | `mat-num-ratio-and-proportion` | share-out and the unitary method — **now taught** (§2, row 15.1) |
| `p51` | `real-numbers` | `mat-num-significant-figures-and-decimal-places` | rounding — **now taught** (§2, row 8.1) |
| `p29` | `functions` | `mat-num-number-sequences` | nth term — **now taught** (§2, row 14.1) |
| `p80` | `fractions-decimals-percentages` | `simple-and-compound-interest` | simple interest for 6 months belongs with the interest lesson |
| `p17`, `p35`, `p59` | `real-numbers` | `si-units-and-conversion` | speed / time / unit conversion — **Slice 2's host, not Slice 1's** |
| `q2`, `p62`, `p63`, `p64`, `p75`, `p43`, `p44`, `p45`, `p100`, `p53` | `fractions-decimals-percentages` | *(no re-tag)* | now **taught** by the fractions EXTEND B1–B4 — no bank edit needed |

**Cross-slice, still owed by Slices 2–6:** `p39` range, `p65` sector area, `p70` surface area,
`p76`/`p77` variation, `p81` elimination, `p1`/`p22` expansion, and KC `q8` exact trig values.

`formulas.json` closes three items in this slice (ratio sharing, nth term, geometric sequences).
**Do not delete** the others — they are coverage promises later slices keep.

## 8. What this slice did not touch

* `mathematics-coverage-audit.md` — the pinned evidence baseline.
* `content/mathematics/metadata.json` (`estimatedModules` 9, unchanged).
* `practice.json`, `knowledge-check.json`, `paper2.json`, `formulas.json`.
* Any `figures` key — Mathematics has none and there is no `mathematics` entry in any
  `tools/gen-*-figures.py`, so adding one would red `check-figure-generators.mjs`.
* Any other subject's block in `src/components/lessonSets.js`.
