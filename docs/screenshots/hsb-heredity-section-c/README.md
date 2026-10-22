# Human & Social Biology — syllabus Section C (Heredity & Variation), rendered before/after proof

Task **03247c7a** — the subject's Paper 2 bank found that syllabus Section C had **no lesson at all**,
so the bank's heredity question (`hsb-p2-04`) had to be tagged to Cell Division (`hsb-l2-2`). This branch
adds the missing module (4 lessons, their Play-tab labs, their practice and knowledge-check questions) and
re-tags that Paper 2 question onto the lesson that now teaches it.

**Docs + screenshots only in this directory — no content is defined here.**

## The 4 new lessons (module 7, `hsb-mod-7` "Heredity & Variation")

| lesson id | lesson page (h1) | Play tab renders |
|---|---|---|
| `hsb-l7-1` | DNA, Genes and Chromosomes | match — 5 terms ↔ meanings (`Heredity Terms`) |
| `hsb-l7-2` | Monohybrid Inheritance and Genetic Diagrams | order — 5 steps of a monohybrid cross (`Genetic Diagram`) |
| `hsb-l7-3` | Sex Determination and Sex-Linked Inheritance | match — 4 terms ↔ meanings (`Sex-Linked Inheritance`) |
| `hsb-l7-4` | Variation, Mutation and Genetic Engineering | sort — 6 examples ↔ continuous / discontinuous (`Types of Variation`) |

Module counts before → after: `6 / 2 / 4 / 2 / 2 / 3` (**19 lessons**) → `+ 4` (**23 lessons**).

## Before / after pairs

| before | after | what it shows |
|---|---|---|
| `before-subject-page-19-lessons.png` — "Preview Mode — You are viewing 2 of **19** lessons" | `after-subject-page-23-lessons.png` — "2 of **23** lessons" | the subject page's own Preview Mode line moved with the content |
| the before frame's module list ends at *6 Social Implications* | `after-subject-page-heredity-module.png` | module **7 Heredity & Variation · 4 lessons** in the list, with *Variation, Mutation and Genetic Engineering* in its lesson pane |
| `before-lesson-hsb-l7-1-not-found.png` — "Lesson not found" | `after-lesson-hsb-l7-1-dna-genes.png` | the same URL before and after the lesson exists |
| — | `after-lesson-hsb-l7-1-gated-public-view.png` | what a signed-out visitor gets: "🔒 This lesson requires full access — Sign in to view the free 2-lesson preview, or unlock all 23 lessons." |
| — | `after-lesson-hsb-l7-{1,2,3,4}-*.png` | each new lesson renders as a lesson: breadcrumb `Heredity & Variation /`, h1, Learning Objectives, Key Concepts |
| — | `after-play-hsb-l7-{1,2,3,4}-*.png` | each Play tab renders the activity its own description names, with the description box on screen |

## DOM read-back (the text that actually rendered, not just pixels)

Subject page, after — module buttons and their lesson counts:
`1 Body Systems 6 lessons · 2 Cell & Tissue Biology 2 · 3 Nutrition & Health 4 · 4 Disease & Immunity 2 ·
5 The Environment & Health 2 · 6 Social Implications 3 · 7 Heredity & Variation 4` (= 23)
and `Preview Mode — You are viewing 2 of 23 lessons. Unlock full access to all 23 lessons!`

Subject page, before (base `modules.json` served): `… 2 of 19 lessons …` and the module list ends at
*6 Social Implications*; the URL `/lesson/human-social-biology/hsb-l7-1` reads **"Lesson not found ← Back to Subject"**.

Lesson pages, after (one read-back per lesson, `h1` / `objectives` / `concepts` / lab):
- `hsb-l7-1` — h1 *DNA, Genes and Chromosomes*; 2 objectives; concepts `DNA · Chromosomes and homologous pairs · Genes and alleles · Haploid and diploid cells · Dominant and recessive alleles`; lab `Heredity Terms` — items `Diploid cell, Chromosome, DNA, Gene, Allele` ↔ 5 targets
- `hsb-l7-2` — h1 *Monohybrid Inheritance and Genetic Diagrams*; 2 objectives; concepts `Monohybrid cross · Dominant and recessive alleles · Punnett square · Genotype and phenotype ratios · Codominance`; lab `Genetic Diagram` — 5 steps ↔ positions 1–5
- `hsb-l7-3` — h1 *Sex Determination and Sex-Linked Inheritance*; 2 objectives; concepts `Autosomes · Sex chromosomes and sex determination · Sex linkage · Carriers · Haemophilia and red-green colour blindness`; lab `Sex-Linked Inheritance` — `Autosomes, Sex chromosomes, Haemophilia, Carrier` ↔ 4 targets
- `hsb-l7-4` — h1 *Variation, Mutation and Genetic Engineering*; 2 objectives; concepts `Continuous variation · Discontinuous variation · Genetic and environmental causes of variation · Mutation and mutagens · Sickle-cell anaemia · Genetic engineering and selective breeding`; lab `Types of Variation` — 6 items ↔ *Continuous variation* / *Discontinuous variation*

Every Play-tab description's verb matches what renders (Match → match, Arrange → order, Sort → sort), and the
items named in the description are the items in the activity. `hsb-l7-2`'s full body read-back also shows
`Learning Objectives` and `Key Concepts` blocks and exposes the *Interactive Activity / 🧪 Interactive Lab /
Play / About* shell — the description box above the lab shows the lesson's own `experiment.description`.

## Method (reproducible)

1. **Three-way merged tree**, not the branch head: `git merge-tree --write-tree origin/main content/human-social-biology-heredity`
   → tree `38f5cb32`, committed locally only to build it (`32bef0e`). The render therefore contains main's
   Integrated Science figures as well as this branch's content.
2. `node_modules/.bin/vite build` + `node_modules/.bin/vite preview` — **one port per content state**
   (4210 after / 4211 before / 4212 lesson frames / 4213 addendum). This is not decoration: on the first
   attempt every frame on one port rendered the **base 19-lesson file** even though the served
   `dist/content/human-social-biology/modules.json` had 23 lessons — the browser's own HTTP cache answered,
   and the page quietly showed a stale state. A different port is a different cache key, and each state was
   then asserted (`modules=7 lessons=23` vs `modules=6 lessons=19`) *and* confirmed in the DOM before the shot.
3. The **before** state re-serves the base `modules.json` (`git show 79cc871:public/content/human-social-biology/modules.json`
   → `dist/content/…`), so the only difference between the before and after frames is the content change.
   `dist/` is build output and is never committed.
4. The four lesson frames and four Play frames sit behind the free-preview gate, so they were captured with a
   throwaway `return true; // SCREENSHOT-ONLY` first line inside `hasSubjectAccess` (`src/data/access.js`).
   It was reverted before this branch was committed: `grep -rl SCREENSHOT-ONLY src/` = **0 files**, and
   `git diff -- src/data/access.js` is empty. The signed-out truth for those lessons is
   `after-lesson-hsb-l7-1-gated-public-view.png`.
5. Screenshots are viewport shots after `documentElement.style.scrollBehavior='auto'` +
   `window.scrollTo(...)` + a **position read-back** (`sandbox top=60 height=610 scrollY=1325` for `hsb-l7-1`),
   and all 13 PNGs have distinct md5s — no frame is another state photographed twice.

## Honesty notes

- The script's own assertion log ended `FAILS=7`; three of those seven are assertion **artifacts, not defects**,
  and all are listed here: (i) "the new module title is rendered" tested a truncated 400-character text sample —
  the module list read-back above is the real check and it passes; (ii) the same assert in the *before* phase is
  labelled "must FAIL" and does; (iii) four "renders Key Concepts" asserts searched the same truncated sample,
  while `hsb-l7-2`'s full read-back (and every PNG) shows the block. One further failure, "src/ diff against
  origin/main is empty", is a wrong baseline — this branch legitimately changes `src/components/lessonSets.js`;
  the bypass revert is the `grep` + `git diff -- src/data/access.js` pair above.
- No marking, pass-outcome or urgency language appears in any filename or caption: these frames show that the
  content renders, not that a student will pass anything.
- This branch is the reason the Paper 2 heredity question can finally point at a lesson that teaches it; the
  re-tag is `hsb-p2-04: hsb-l2-2 → hsb-l7-2`, and no Paper 2 question is left tagged to `hsb-l2-2`.
- The bank swap that keeps Extra Practice at exactly 100 and the Knowledge Check at exactly 25 is disclosed in the
  PR body and pinned by `tools/check-human-social-biology-heredity.mjs`, including each retired item's redundancy.
