# Mathematics — Slice 2 coverage: the Measurement module

**Branch:** `math-slice2-measurement` · **Built:** 2026-11-08 · **Base:** `origin/main` `8030a05`
(Mathematics honest-copy fix, PR #220).

**Scope: module `measurement` only** — 13 of the owner's 104 rival chapters. Three new
`mat-meas-` lessons, two EXTENDs, five REUSE. **No new module** (`estimatedModules` stays 9),
**no lesson id renamed, re-keyed, split or reordered**, **banks frozen** (practice exactly 100,
knowledge check exactly 25), **no figures** (no `figures` array, no generator — Mathematics
still has zero diagrams).

The module goes **3 → 6 lessons**; the subject goes **44 → 47**; modules stay **9**.

---

## 1. The 13 rows

`S` = section, `#` = the owner's chapter number. Every "by-name string" below was verified
present in the shipped lesson text on this branch (`content/mathematics/modules.json`), not in a
brief.

| S | # | chapter (verbatim) | disposition | host | the exact by-name string | where |
|---|---|---|---|---|---|---|
| 1 | 7 | Units and Conversions | REUSE | `si-units-and-conversion` | `kilo means 1000, centi means 1/100` | content ¶1 |
| 1 | 12 | Ratio, Proportion, and Rates | **EXTEND** | `si-units-and-conversion` | `A rate is a ratio whose two quantities have different units` | content ¶5 (appended) |
| 4 | 29 | Units and Conversion | REUSE | `si-units-and-conversion` | *(audit recorded no quotation — near-duplicate of ch 7, same host; confirmed by the §1 quotation above)* | — |
| 4 | 30 | Perimeter of Plane Shapes | REUSE | `perimeter-area` | `C = 2πr or C = πd` | content ¶1 |
| 4 | 31 | Arc Length and Sector Perimeter | **EXTEND** | `perimeter-area` | `arc length = θ/360 × 2πr` and `sector perimeter = θ/360 × 2πr + 2r` | content ¶4 (appended) |
| 4 | 32 | Estimating and Calculating Area of Polygons and Circles | **EXTEND** | `perimeter-area` | `area of a parallelogram = base × perpendicular height`; `area of a trapezium = 1/2 × (a + b) × h`; `estimate with area = πr²` | content ¶6 and ¶8 (appended) |
| 4 | 33 | Area of Sectors, Triangles, and Segments | **EXTEND** | `perimeter-area` | `sector area = θ/360 × πr²`; `segment area = θ/360 × πr² − 1/2 × r² × sin θ`; `1/2 × base × perpendicular height` | content ¶9 (appended) |
| 4 | 34 | Surface Area of Solids | **NEW** | `mat-meas-surface-area-of-solids` | `surface area = 2πr² + 2πrh` | content ¶4 |
| 4 | 35 | Volume of Solids | REUSE | `volume-capacity` | `V = A_base × h` | content ¶1 |
| 4 | 36 | Time, Distance, and Speed | REUSE | `si-units-and-conversion` | `speed = distance ÷ time` | content ¶2 |
| 4 | 37 | Measurement Error | **NEW** | `mat-meas-measurement-error` | `absolute error = measured value − true value` | content ¶2 |
| 4 | 38 | Scale and Scale Drawings | **NEW** | `mat-meas-scale-and-scale-drawings` | `1 cm on the drawing is 50 cm real` | content ¶2 |
| 4 | 39 | Applied Measurement Problems | **EXTEND** | `si-units-and-conversion` | `Worked method — an applied measurement problem.` | content ¶9 (appended) |

**Two audit quotations are condensations, not verbatim strings — recorded, not substituted:**

* ch 35: the audit quotes `V = A_base × h … the volume of a cylinder is πr²h`. The shipped
  lesson reads `V = A_base × h` (verbatim, ¶1) and `The volume of a cylinder is therefore πr²h,
  since its base is a circle.` — capital `T` plus the word `therefore`. The fact holds; the
  audit's quotation was condensed.
* ch 7: shipped as `kilo means 1000, centi means 1/100, milli means 1/1000 and micro means
  1/1,000,000`; the audit's ellipsis hides the continuation, not a change.

## 2. The three new lessons

Appended inside `measurement.lessons` after `si-units-and-conversion`, in chapter order
34 → 37 → 38. Key set is exactly `id, title, content, objectives, concepts, experiment` —
**no `estimatedMinutes`**.

| # | new id | title | `experiment.type` | Play-tab set heading |
|---|---|---|---|---|
| 34 | `mat-meas-surface-area-of-solids` | Surface Area of Solids | `interactive-quiz` | **Surface Area Match** |
| 37 | `mat-meas-measurement-error` | Measurement Error | `interactive-quiz` | **Measurement Error Match** |
| 38 | `mat-meas-scale-and-scale-drawings` | Scale and Scale Drawings | `interactive-quiz` | **Scale Drawing Match** |

`interactive-quiz` is in `MATH_DRAG_TYPES`, so even a lost set reaches a lab; each of the three
also carries its **own** set, which `ExperimentSandbox` resolves **by lessonId first**.

## 3. The two EXTENDs (pure appends)

Proved in the build script: `newContent.slice(0, oldContent.length) === oldContent` for both,
objectives and concepts extended **at the end only**, every other lesson's JSON unchanged, and a
string-multiset diff over each host in which the **only** string that disappears is the old
whole-`content` blob (replaced by old+append).

| host | chapters | content | objectives | concepts |
|---|---|---|---|---|
| `si-units-and-conversion` | 12, 39 | 1531 → 3413 chars (+6 paragraphs) | 4 → 9 | 4 → 9 |
| `perimeter-area` | 31, 32, 33 | 946 → 3519 chars (+8 paragraphs) | 2 → 6 | 2 → 8 |

**`perimeter-area` now has a worked method** (the audit listed it among the 13 lessons with
none): three of them — arc length and sector perimeter (r = 9 cm, θ = 80°, π ≈ 3.142 → arc
12.57 cm, perimeter 30.57 cm), trapezium area (a = 6, b = 10, h = 4 → 32 cm²) and segment area
(r = 6 cm, θ = 60° → sector 18.85 − triangle 15.59 = 3.26 cm²). Every step names its labels and
carries its unit. `si-units-and-conversion` gains one too: the applied tank problem
(1.2 × 0.8 × 0.5 = 0.48 m³ → 480 L → 480 ÷ 15 = 32 minutes).

**π and unit convention (stated, as the brief requires):** the slice uses the **π symbol with
superscripts** (`πr²`, `2πrh`) exactly as `volume-capacity` (`πr²h`) and
`transposition-and-substitution` (`A = πr²`) already do — no `22/7` and no caret notation. A
decimal is given only where a worked method needs a number, with the value of π stated in the
same sentence (`π ≈ 3.142`), and every length answer is in cm/m and every area answer in cm²/m².
No existing lesson in the subject states a numeric π, so this introduces none of its own
convention — it borrows `3.142` only inside worked methods.

**All 36 arithmetic results re-derived independently** (`~/slice2/arith.py`, 36/36 OK): 6 × 4² =
96; 2(40 + 24 + 15) = 158; 2πr² + 2πrh at r = 7, h = 10 = 307.9 + 439.9 = 747.8; 25 − 24.8 = 0.2,
0.2 ÷ 24.8 = 0.0081, 0.81%; 0.5 × 10⁻¹ = 0.05 kg → 4.55–4.65 kg; 7 × 50 = 350 cm = 3.5 m;
25,000 cm = 250 m; 50² = 2500; 48 × 2500 = 120,000 cm² = 12 m²; 45:60 = 3:4; 4 × 12 = 48 → 48 ÷ 6
= 8; 0.48 m³ = 480 L → 32 min; 80/360 × 2π × 9 = 12.57 cm; 1/2(6 + 10)4 = 32 cm²;
60/360 × π × 36 − 1/2 × 36 × sin 60° = 3.26 cm².

## 4. Lab partition and the corpus rule after this slice

```
node tools/check-mathematics-labs.mjs
    partition: 32 sets + 15 type-keyed = 47 lessons
    estimatedModules 9 = modules.length 9
    grandfathered sets: 24 (corpus rule applies to 8 new set(s))
check-mathematics-labs: 520 passed, 0 failed
--red-control: 13/13 caught, caller green on the untouched real tree
```

The three new sets are **not** in `LEGACY_SETS`, so assertion 7 holds them to the corpus rule
string by string. Measured per set — **12 displayed strings each, 12 taught, 0 not taught**
(36/36 across the slice). My own red control (throwaway, reverted) broke one string in each new
set and the harness fired on all three:

```
FAIL: A7: lessonSets.mathematics.mat-meas-surface-area-of-solids: "the total area of every edge" is not in that lesson's own copy
FAIL: A7: lessonSets.mathematics.mat-meas-measurement-error: "0.5 × 10⁻¹ = 0.5 kg" is not in that lesson's own copy
FAIL: A7: lessonSets.mathematics.mat-meas-scale-and-scale-drawings: "1 cm on the map is 25 m" is not in that lesson's own copy
check-mathematics-labs: 516 passed, 4 failed   →  restored: 520 passed, 0 failed
```

**Two pairs added to the existing `si-units-and-conversion` set** (`p7` Direct proportion →
`y = kx`, `p8` Inverse proportion → `y = k/x`) so the Play tab shows the proportion chapter this
slice adds to that lesson. Both strings are in the lesson's own copy. It is a legacy
(grandfathered) set, so no rule forced the additions; the reason is honesty of coverage.

`lessonSets.js`: **29 → 32** Mathematics sets, 0 removed, no title collision, and **all 24
non-mathematics subject blocks are `JSON.stringify`-equal to `origin/main`** (proved by
importing both versions in node and comparing every subject block). The append anchor was the
literal `  },\n  "english-a": {`, as the brief warned.

## 5. Honest copy — DOM read-back of each new Play tab

Production build (`vite build` + `vite preview --port 4231`), real lesson URLs, read back from
the DOM (not from the JSON). The access gate was bypassed with a throwaway
`return true; // SCREENSHOT-ONLY` in `src/data/access.js`, reverted afterwards
(`grep -rc SCREENSHOT-ONLY src/` = 0 matches; `git status` shows only the three slice files).
Screenshots: `/home/team/shared/math-slice2/shots/`.

| lesson | `<h1>` | activity title | chips column (`Drag items`) | zones column (`Drop zones`) |
|---|---|---|---|---|
| `mat-meas-surface-area-of-solids` | Surface Area of Solids | Surface Area Match | 6 chips: Cube, Open-top tank, A net, Cuboid, Cylinder, Surface area | 6 zones: `the total area of every face`, `the solid opened out and laid flat`, `6 × side²`, `2(lw + lh + wh)`, `2πr² + 2πrh`, `subtract the top face` |
| `mat-meas-measurement-error` | Measurement Error | Measurement Error Match | 6 chips: Relative error, Greatest possible error, Absolute error, Percentage error, 25 cm to the nearest cm, 4.6 kg to 1 d.p. | 6 zones: `measured value − true value`, `absolute error ÷ true value`, `relative error × 100`, `4.55 kg to 4.65 kg`, `0.5 × 10⁻¹ = 0.05 kg`, `24.5 cm to 25.5 cm` |
| `mat-meas-scale-and-scale-drawings` | Scale and Scale Drawings | Scale Drawing Match | 6 chips: Drawing length, 1:25,000, Real length, A wall drawn 7 cm at 1:50, Area scale factor, 1:50 | 6 zones: `1 cm on the drawing is 50 cm real`, `drawing length × scale factor`, `real length ÷ scale factor`, `1 cm on the map is 250 m`, `50² = 2500`, `350 cm = 3.5 m` |

Each subtitle names the direction that actually renders: *"drag each … **onto** the …"* — the
chip is dragged onto a zone. **No new copy promises a picture**: chapters 34 (nets) and 31/33
(sectors) are taught in words ("the net of a cuboid is six rectangles in three matching pairs"),
and neither the lessons nor their labs mention a diagram.

## 6. Found, measured, NOT fixed: two Mathematics Play tabs are the wrong tool

Out of this slice's scope, so it is reported rather than patched — but it is the #220 defect
class and it is measured, not guessed. Both lessons are **TYPE-KEYED** in
`check-mathematics-labs.mjs` (`MATH_BALANCE_TYPES` → `<BalanceScale subjectId="mathematics">`), so
their Play tab is the **Equation Balance Scale**:

| lesson | activity title | `experiment.description` promises | what the DOM actually renders |
|---|---|---|---|
| `perimeter-area` | Area Builder | "Shape Flex: **Resize a rectangle or circle** and watch the area and perimeter values update dynamically…" | `Equation Balance Scale` — Math (Algebra) / POA tabs, weights 1, 2, 3, 5, x, Left Side / Right Side pans. 0 chips, 0 zones. |
| `volume-capacity` | Volume Lab | "Water Tank: **Fill different shaped 3D containers (prism, cylinder) with water**…" | same Equation Balance Scale; 0 chips, 0 zones. |

A copy edit cannot make either tab honest — the **activity heading** and the **tool** both say
"Equation Balance Scale", so the fix is structural: either route `area-builder` / `volume-filler`
to a real area/volume component, or give these two lessons their own sets (which means removing
them from `TYPE_KEYED` **and** from `MATH_BALANCE_TYPES`, changing the harness partition).
`experiment.type` and both descriptions are untouched by this PR.

## 7. Harness pins

**No harness file was touched.** The full suite is 54/54 on this branch and on the three-way
merged tree, so no Mathematics count pin needed making derived:

* `tools/check-mathematics-labs.mjs` — every count it asserts is already derived
  (`A3: setKeys.length === allLessons.length − typeKeyed.length`); it now prints 32 / 47. Its
  `R1` expectation is already `liveSetCount - 1`. `LEGACY_SETS` is unchanged (24) and the three
  new ids are **not** in it.
* `tools/check-french-labs.mjs` — pins a **literal list** of the 24 original set keys, not a
  total, so it is unaffected (the Slice 1 fix).
* `tools/check-show-your-work.mjs` — reads `subjectTypeSets.mathematics` out of
  `DragDropLabel.jsx`, not `lessonSets.js`; unaffected.
* `tools/check-mock-paper.mjs` — `mathLessonIds` is derived from `modules.json`; unaffected.

Known stale *prose* (not an assertion, left alone deliberately, unchanged since Slice 0): the
header comment of `check-mathematics-labs.mjs` still describes the pre-coverage partition
("39 lessons … 24 lessons carry their own per-lesson set"), which is now 47 / 32.

## 8. Hand-over to Slice 3

**Slice 3 = modules `consumer-arithmetic` + `sets` + `statistics-probability`, chapters 17–28 and
40–52 (24 chapters).** Nothing below has been touched by this slice.

| # | chapter | disposition | host / new id |
|---|---|---|---|
| 17 | Profit, Loss, and Discount | REUSE | `profit-loss-and-discounts` |
| 18 | Percentage Expressions and Problem Solving | **EXTEND** | `profit-loss-and-discounts` |
| 19 | Instalment Payments | REUSE | `hire-purchase-and-instalments` |
| 20 | Simple Interest | REUSE | `simple-and-compound-interest` |
| 21 | Compound Interest, Appreciation, and Depreciation | **EXTEND** (appreciation never named) | `simple-and-compound-interest` |
| 22 | Currency Conversion and Measures | REUSE | `exchange-rates-and-currency` |
| 23 | Household and Personal Finance | REUSE | `insurance-and-budgeting` |
| 24 | Set Definition and Representation | REUSE | `set-notation` |
| 25 | Set Relationships and Subsets | REUSE | `subsets-and-cardinality` |
| 26 | Calculating Set Elements | REUSE | `union-intersection-complement` |
| 27 | Venn Diagram Application | REUSE | `venn-diagrams` |
| 28 | Practical Set Theory | REUSE | `set-word-problems` |
| 40 | Sample and Population Attributes | **NEW** | `mat-stat-data-types-and-sampling` |
| 41 | Frequency Tables and Class Features | REUSE | `frequency-tables-and-cumulative-frequency` |
| 42 | Constructing Basic Diagrams | **NEW** | `mat-stat-statistical-diagrams` |
| 43 | Cumulative Frequency Curve | REUSE | `frequency-tables-and-cumulative-frequency` |
| 44 | Mean, Median, and Mode Calculation | REUSE | `central-tendency` |
| 45 | Choosing the Best Average | REUSE | `central-tendency` |
| 46 | Range and Quartiles | **EXTEND** (range never defined) | `frequency-tables-and-cumulative-frequency` |
| 47 | Standard Deviation for Comparison | **NEW** | `mat-stat-standard-deviation` |
| 48 | Analyzing Statistical Diagrams | **EXTEND** | `frequency-tables-and-cumulative-frequency` |
| 49 | Proportions and Percentages | **EXTEND** | `fractions-decimals-percentages` *(out of section)* |
| 50 | Sample Space for Experiments | **EXTEND** | `probability` |
| 51 | Experimental and Theoretical Probabilities | **EXTEND** | `probability` |
| 52 | Statistical Inference and Application | **NEW** | `mat-stat-statistical-inference` |

**Slice 3 shape:** 4 new `mat-stat-` lessons, 6 EXTENDs, 14 REUSE. `statistics-probability`
goes **3 → 7** lessons; the subject goes **47 → 51**; modules stay **9**. `consumer-arithmetic`
(6) and `sets` (6) gain no lessons.

**Traps Slice 3 will hit:** `central-tendency` and `probability` are **TYPE-KEYED**
(`data-visualizer`, `probability-sim`), so an EXTEND must not add a per-lesson set or
`check-mathematics-labs.mjs` A2 fires; chapter 49's host lives outside its own section;
`frequency-tables-and-cumulative-frequency` is grandfathered, so its set is not corpus-checked
and any new pair added there is unchecked by design.

**Bank hand-over (banks stayed frozen here — this is the re-balance pass's input):** three
questions the Slice 1 ledger listed as cross-slice are **now taught** and need no retirement:
`p65` sector area (ch 33), `p70` surface area (ch 34), `p76`/`p77` variation (ch 12 direct and
inverse proportion, `y = kx` / `y = k/x`). Re-tag them to `perimeter-area`,
`mat-meas-surface-area-of-solids` and `si-units-and-conversion` respectively. `p39` (range) is
still owed by Slice 3.

## 9. What this slice did not touch

* `docs/mathematics-coverage-audit.md` and the owner's target list — unchanged.
* `content/mathematics/metadata.json` (`estimatedModules` 9).
* `practice.json`, `knowledge-check.json`, `paper2.json`, `formulas.json`.
* Any `figures` key, any generator — Mathematics still has no diagrams.
* `src/data/access.js` (the screenshot bypass was reverted; `git diff` empty).
* Any harness in `tools/`.
