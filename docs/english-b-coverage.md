# English B — Coverage (16 chapters)

Owner's target list: `/home/team/shared/english-b-coverage-target-competitor-list.md` (verbatim, 16
chapters across 4 sections). Formal audit: `/home/team/shared/english-b-coverage-audit.md` (design) and
`/home/team/shared/english-b-build-constraints.md` (traps).
Machine-checked by `tools/check-english-b-coverage.mjs` — **this table is parsed by that harness**, so the
columns below are a contract, not decoration.

**Headline after Slice D: 16 chapters = REUSE 12 + EXTEND 1 + NEW 3** against the 24 shipped lessons in 7 modules (Slice A closed rows 1, 5 and 9 in `eb-l1-1`; Slice B closed rows 6 and 8 in `eb-l2-2` and `eb-l2-3`; Slice C closed rows 2, 3 and 4 in `eb-l3-1`, `eb-l3-2` and `eb-l3-3`; Slice D closed rows 10, 11 and 12 in `eb-l4-1`, `eb-l4-3` and `eb-l4-2`). **After Slice D only row 15 is still `EXTEND`.**
End state: **8 modules, 27 lessons** (the 3 NEW ids are still pending — see below).
13 of the 16 chapters are already taught **under other names**: this is a *naming* gap, not a teaching
gap, so most of the build is by-name work inside lessons that already exist.

## Column contract

| column | meaning |
|---|---|
| `#` | chapter number 1–16, in the owner's numbering. Row order is the contract: row *n* must be chapter *n* |
| `chapter` | the owner's chapter name, **verbatim**, including the American spelling in row 10 (see the exception note) |
| `section` | `Drama` (1–4), `Poetry` (5–8), `Prose Fiction` (9–12), `Literary Appreciation` (13–16) — 4 chapters each |
| `class` | `REUSE` = the name is already there; `EXTEND` = the substance is taught but the name is not; `NEW` = a new lesson |
| `host lesson id` | comma-separated. **The first id is the primary host** — the name test and the evidence phrase apply to it. Every listed id must exist |
| `evidence phrase` | a phrase that **must occur verbatim** in the primary host's own copy (title + content + objectives + concepts). `-` for `NEW` rows, which are not taught yet |

**The two naming tests (this is what makes the table falsifiable):**

- `REUSE` — every significant word of the chapter name (stopwords `as, and, the, of, with, a, an, in, to,
  on, its` dropped, plurals allowed) occurs in the **primary host's title or `concepts`**. This is the
  audit's own REUSE rule, and it is what separates a real REUSE from a "maps loosely onto" claim.
- `EXTEND` — the same test **fails on every listed host**. That is the assertion that the name really is
  missing. The moment a slice adds the chapter's name to a host, this harness goes red until the row is
  re-classed: the table can never quietly claim a naming gap that has been closed.

A phrase alone is never proof: a `REUSE` row needs the name, an `EXTEND` row needs the name's *absence*
plus a phrase for the substance it does teach.

## Resolved decisions — do not re-litigate

- **D-1 — the knowledge check stays exactly 25. OWNER-CONFIRMED 2026-11-05.** 25 items cannot cover 27
  lessons, so 3 items are retired with written reasons in the Slice G ledger (`kc14`, the duplicate
  `eb-l3-2` item, plus two from lessons that keep ≥3 practice questions, never from `eb-mod-7` or
  `eb-mod-8`). The two lessons left without a KC item are **named in that ledger**, not left silent.
  **Do not re-tag `kc25` onto `eb-l8-critical-evaluation`** — it would just empty `eb-l6-3`.
- **D-2 — rows 1 and 9 get the two by-name headings in Slice A** (`eb-l1-1`), one sentence each, so both
  REUSE claims stop resting on a concept pair alone. The rows stay `REUSE` (the heading is *added* to
  teaching that already exists; the audit's "EXTEND-with-heading-added" wording describes the edit, not a
  change of class). **Slice A landed 2026-11-17:** both headings are now paragraphs in `eb-l1-1`, and row 5
  ("The Nature of Poetry") flipped `EXTEND` → `REUSE` in the same PR, because its name now exists — that is
  the ledger's own rule, not a re-class to make the harness green. **Slice B landed 2026-11-17:** rows 6 and 8
  flipped `EXTEND` → `REUSE` by the same rule, because `eb-l2-2` now names "Poetic Form and Structure" and
  `eb-l2-3` now names "Critical Interpretation of Poetry". **Slice C landed 2026-11-17:** rows 2, 3 and 4
  flipped `EXTEND` → `REUSE` by the same rule, because `eb-l3-1`, `eb-l3-2` and `eb-l3-3` now name
  "Developing Dramatic Elements", "Plot Structure and Dramatic Techniques" and "Interpreting Drama".
  **Slice D landed 2026-11-17:** rows 10, 11 and 12 flipped `EXTEND` → `REUSE` by the same rule, because
  `eb-l4-1`, `eb-l4-3` and `eb-l4-2` now name "Analysing Prose Elements" (the shipped British form of the
  owner's American chapter name), "Interpreting Language and Meaning" and "Critical Engagement with Prose".
- **D-3 — Paper 2 for the `eb-l8-*` lessons: YES, as a separate PR after Slice G. OWNER-CONFIRMED
  2026-11-05.** It moves the `check-paper2.mjs` pin (9 items / 265 marks) together with the new items.
  **No slice of the coverage build adds a Paper 2 item.**

## Exception — row 10's chapter name is American, and we ship the British form

Chapter 10 is **"Analyzing Prose Elements"** (American spelling, the only one of the 16).
*(The audit's §G.7 and the Slice 0 brief both call this "row 11". The row table above and the owner's own
paste — paste rows 10–13 map to chapters 9–12 — make it chapter **10**. The table wins; this note exists so
no later slice "fixes" the number back.)* The pinned British/CXC spelling baseline forbids shipping
"Analyzing", so:

- the `chapter` cell keeps the owner's verbatim **"Analyzing Prose Elements"**, and the harness compares it
  as written;
- **Slice D landed 2026-11-17:** the row is `REUSE`, because `eb-l4-1` now names the chapter in the shipped
  British form **"Analysing prose elements"** — a heading paragraph and a `concepts` entry. The naming test
  accepts the British form as the equal of the American one **for this word only** (`WORD_EQUIVALENTS` in
  the harness), so the row cannot pass on an unrelated concept; the red control `row10-name-removed` proves
  it still bites: remove that concept and row 10 goes red;
- **the harness asserts that no English B lesson copy ships "analyzing"/"analyze"** — if a later slice ever
  puts the American form into a lesson, that assertion reds. The British form **"Analysing prose
  elements"** is what the lesson ships, and the harness accepts either spelling when it checks whether
  the naming gap has been closed.

## The 16-row coverage table

| # | chapter | section | class | host lesson id | evidence phrase |
|---|---|---|---|---|---|
| 1 | Drama as a Genre | Drama | REUSE | eb-l1-1, eb-l3-1 | Drama is the genre written to be performed, and that one fact decides what you can say about it |
| 2 | Developing Dramatic Elements | Drama | REUSE | eb-l3-1 | a subplot develops the main action by echoing it in a smaller key |
| 3 | Plot Structure and Dramatic Techniques | Drama | REUSE | eb-l3-2, eb-l3-1 | Plot structure is the shape of the action |
| 4 | Interpreting Drama | Drama | REUSE | eb-l3-3 | an interpretation has to be built from what an audience sees and hears |
| 5 | The Nature of Poetry | Poetry | REUSE | eb-l1-1 | it compresses an experience into a handful of lines, so every word carries more weight than the same word would carry in prose |
| 6 | Poetic Form and Structure | Poetry | REUSE | eb-l2-2 | how many stanzas there are, how long each one runs, where the lines break, where the poem turns, and what repeats |
| 7 | Figurative Language and Poetic Devices | Poetry | REUSE | eb-l2-1 | Figurative language is language used beyond its literal sense. |
| 8 | Critical Interpretation of Poetry | Poetry | REUSE | eb-l2-3 | the move from what a poem says to a judgement about what it means |
| 9 | Prose Fiction Genre | Prose Fiction | REUSE | eb-l1-1, eb-l4-1, eb-l4-2, eb-l4-3 | Prose fiction is the genre of the novel and the short story: prose, because it is written in sentences and paragraphs, and fiction, because the events are invented even when they feel true |
| 10 | Analyzing Prose Elements | Prose Fiction | REUSE | eb-l4-1, eb-l4-2, eb-l4-3 | Analysing prose elements means taking a passage apart into the parts that are doing work |
| 11 | Interpreting Language and Meaning | Prose Fiction | REUSE | eb-l4-3 | Interpretation begins where description stops |
| 12 | Critical Engagement with Prose | Prose Fiction | REUSE | eb-l4-2 | A judgement is only worth marks if someone else could argue with it |
| 13 | Author's Craft and Reader Influence | Literary Appreciation | NEW | eb-l8-craft | - |
| 14 | Critical Evaluation of Literary Texts | Literary Appreciation | NEW | eb-l8-critical-evaluation | - |
| 15 | Structured Literary Response | Literary Appreciation | EXTEND | eb-l6-1 | Each body paragraph should begin with a topic sentence that makes a point, then quote or describe evidence, then explain the effect and link back to the question. |
| 16 | Context and Shared Human Experience | Literary Appreciation | NEW | eb-l8-context | - |

**Tally: 16 = REUSE 12 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) + EXTEND 1 (15) + NEW 3 (13, 14, 16).**
Sections: Drama 4 · Poetry 4 · Prose Fiction 4 · Literary Appreciation 4.

## Pending ids

The three NEW lessons do not exist yet. They are the ids the tree is still missing — a slice that lands one
must delete it from this list **and** re-class its row, or the harness goes red.

- `eb-l8-craft` (row 13)
- `eb-l8-critical-evaluation` (row 14)
- `eb-l8-context` (row 16)

`eb-l8-` collides with nothing: all 24 shipped ids match `^eb-l[1-7]-\d+$`, and no `eb-l8-` string exists
in `content/english-b/*.json` or `src/components/lessonSets.js`.

## Build slices (one branch + one PR each, cut by HOST-LESSON OWNERSHIP, never by section)

| slice | module | edits | new ids | chapters closed |
|---|---|---|---|---|
| **0** | — | retire the pin harness for a derived one, this doc + its harness, check `eb-l7-4` | — | — |
| **A** | 1 | `eb-l1-1` (ch5) + the D-2 headings | — | 1, 5, 9 = 3 |
| **B** | 2 | `eb-l2-2` (ch6), `eb-l2-3` (ch8) | — | 6, 7, 8 = 3 |
| **C** | 3 | `eb-l3-1` (ch2), `eb-l3-2` (ch3), `eb-l3-3` (ch4) | — | 2, 3, 4 = 3 |
| **D** | 4 | `eb-l4-1` (ch10), `eb-l4-2` (ch12), `eb-l4-3` (ch11) | — | 10, 11, 12 = 3 |
| **E** | 6 | `eb-l6-1` (ch15) | — | 15 = 1 |
| **F** | new 8 | creates `eb-mod-8`; **only slice touching `lessonSets.js`** (append 3 blocks at the END of the subject block, never reorder); `estimatedModules` 7 → 8 | `eb-l8-craft`, `eb-l8-critical-evaluation`, `eb-l8-context` | 13, 14, 16 = 3 |
| **G** | — | bank re-balance per D-1; rewrite this doc's headline to the final totals; both harnesses green with their red controls | — | — |

Totals: A3 + B3 + C3 + D3 + E1 + F3 = **16** · EXTEND edits **10** · NEW lessons **3** · end state
**8 modules, 27 lessons**. EXTENDs keep their existing `lessonSets` set **and its `kind`** — a lesson's
kind is identity, exactly like its id.

## What this build does NOT need

- **No lab-type honesty pass** (unlike IT Slice 0): all 24 `experiment.type` values are already in the 8
  English B types.
- **No figures pass.** English B's teachable structures (plot arc, PEE chain, essay plan) are already
  interactive `order`/`match` labs, which teach the same shape with feedback; a static SVG would be a
  downgrade on the object it duplicates.
- **No Paper 2 items** in any slice — see D-3.
