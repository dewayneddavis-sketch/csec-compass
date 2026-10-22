# Physics Section D — coverage build frames

Rendered from a **local production build** (`npm run build` + `vite preview`) of the
`content/physics-section-d` branch, driven with `agent-browser`. The lesson/lab frames
come from a throwaway build with the access predicate bypassed (`return true;
// SCREENSHOT-ONLY` spliced into `src/data/access.js`), reverted afterwards —
`grep -rc SCREENSHOT-ONLY src/` = 0 and `git diff origin/main -- src/data/access.js`
empty. The gate frame comes from the un-patched build.

| frame | what it shows | DOM read-back |
|---|---|---|
| `subject-physics-electricity-14-lessons.png` | Module 4: Electricity and Magnetism now holds **14 lessons** | `module="Module 4: Electricity and Magnetism"`, `count=14` |
| `subject-physics-electricity-new-lessons.png` | the two reconciled-in lessons visible in the module list | visible names include "Direct and Alternating Current", "Primary and Secondary Cells"; `removedPresent=[]` |
| `gate-em-direct-and-alternating-current.png` | a new lesson sits behind the purchase gate for a signed-out visitor | `locked=true`, "Sign in to view the free 2-lesson preview, or unlock all **27** lessons" |
| `lesson-em-direct-and-alternating-current.png` | the new lesson page renders its own copy | `h1="Direct and Alternating Current"`, `sandbox=true` |
| `lab-em-direct-and-alternating-current.png` | its Play tab renders its own deck (not another lesson's) | 8 labels + zones "Direct current / Alternating current" |
| `lesson-em-primary-and-secondary-cells.png` | the second new lesson page | `h1="Primary and Secondary Cells"`, `sandbox=true` |
| `lab-em-primary-and-secondary-cells.png` | its Play tab deck | 8 labels + zones "Primary cell / Secondary cell" |
| `gate-em-logic-gates-and-truth-tables.png` · `lesson-…` · `lab-…` | batch-1 frames for a lesson the reconciliation **kept** — untouched | — |

`lab-em-transformers-and-energy-transfer.png` was **deleted**: the reconciliation
removed that lesson (its chapter is an EXTEND row on `magnetism-and-electromagnetism`),
so its lab frame no longer describes anything shipped.

Every frame here has a distinct md5; the counts above are quoted from the live DOM, and
the PNG only illustrates them.
## Which base these frames were shot on

They were rendered on the branch's **pre-rebase** base (before it was rebuilt on
`main` at Section E's merge), when Physics had **27 lessons** in total. Two frames carry
that number and one of them quotes it:

- `subject-physics-electricity-14-lessons.png` — "Module 4: Electricity and Magnetism,
  14 lessons". **Still exactly right**: this slice's own module count did not change.
- `gate-em-direct-and-alternating-current.png` — the gate sentence reads "unlock all
  **27** lessons". On the rebased head the total is **38** (main's 27 + this slice's 11).
  The *shape* of the proof still holds — the new lesson is behind the purchase gate for a
  signed-out visitor — but the quoted count is from the old base, and it is not re-shot.
- The lesson/lab frames are per-lesson and unaffected by the other sections.
