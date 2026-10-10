# Integrated Science Paper 2 tab — before/after proof

Local production build (`node_modules/.bin/vite build`) served with `vite preview`,
driven with agent-browser. The Paper 2 bank is fetched at runtime from
`/content/integrated-science/paper2.json`, so the **same build** serves both states:
the BEFORE frame was taken with that JSON removed from `dist/`, then restored.

| frame | what it proves | DOM read-back |
|---|---|---|
| `before-no-paper2-tab.png` | with no bank on disk there is **no Paper 2 tab at all** | `path=/subject/integrated-science`, tabs = `Lessons, Interactive Lab, Knowledge Check, Extra Practice, Mock Exam, Progress, CSEC SBA` — **no Paper 2** |
| `after-paper2-tab-visible-gated-locked.png` | with the bank shipped, the Paper 2 tab appears in the same tab row | tabs = `Lessons, Interactive Lab, Knowledge Check, Extra Practice, Mock Exam, `**`Paper 2`**`, `Progress, CSEC SBA` |
| `after-paper2-tab-open-locked-banner.png` | the tab is still **behind the paid gate** for a logged-out visitor | `Paper 2 is locked. Unlock full access to practise…` |

The first two frames are the same URL, the same build and the same viewport, and the
only difference between them is the presence of the bank file — that is the proof the
tab is data-driven rather than hard-coded. The third frame is captured logged out, so
it also proves this PR did **not** widen access to anything.

## `after-paper2-bank-open.png` — captured with the gate bypassed for the shot only

Showing the bank *rendered* (its 6-question header, its per-question mark budget, the
Part A / Part B groups, the item picker) requires the purchase gate bypassed, because the
Paper 2 panel only renders for an account with access
(`SubjectPage.jsx`: `activeTab === "paper2" && (paid ? …)`) and `paid` comes from a
verified server answer, not from anything a browser can set. For that one frame the pure
predicate in `src/data/access.js` was given a temporary `return true; // SCREENSHOT-ONLY`,
the tree was rebuilt, and the frame was taken; the patch was then **reverted**
(`grep -c SCREENSHOT-ONLY src/data/access.js` → `0`, `git diff -- src api` → empty) and the
honest tree rebuilt. Two earlier attempts at this frame stalled in the browser driver on
this box; the `timeout`-guarded attempt completed.

The frame shows the Paper 2 tab selected and, under the heading
**“CSEC Paper 2 — typed answers, self-assessed”**, the honest copy
(“Paper 2 questions cannot be multiple-choice: you have to write… **Nothing here is
auto-marked** — your tick count is a study aid, not a grade.”) and the bank's own
header line **“6 questions · 100 marks in total · each question shows its own time budget.”**

The bank's own content is nevertheless proven without a bypass, and more strongly:

- `node tools/check-paper2.mjs` — **425 passed, 0 failed**, including the two new
  Integrated Science assertions (`item count is 6`, `total marks is 100`,
  `question marks are 25/15/15/15/15/15 in paper order`,
  `paper split is Section A/Section A/Section A/Section A/Section B/Section B`).
- the authoring generator asserts `sum(part.marks) == item.marks` for all six questions,
  every `topic` against the real 18 lesson ids, the mark total of 100, and the published
  profile weighting (34 Knowledge and Comprehension / 58 Use of Knowledge / 8 Practical
  Skills marks), and it is byte-reproducible.
- the red/green control for the two new assertions (a tampered bank that still totals
  100 marks) is quoted in the PR body.

No purchase-gate bypass survives this run: `git checkout -- src/data/access.js` plus
`git diff -- src api` (empty) and a rebuild of the honest tree are recorded in the PR body.
