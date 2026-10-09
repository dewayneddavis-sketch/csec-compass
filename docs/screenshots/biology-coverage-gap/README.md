# Biology coverage-gap lessons — rendered before/after proof (PR #148, rebased commit 9dc4504)

Closes the rendered-proof gap on the PR that adds the 8 missing CSEC Biology lessons and re-tags the
off-lesson drills (task 33b20aee), **after the rebase onto `main` 0557bc4**. Docs only — these PNGs and
this README, nothing else. The PR's own diff is `content/biology/*` + `public/content/biology/*`
(+ its pre-existing `src/components/lessonSets.js` lab wiring and `tools/check-french-labs.mjs`).

## The 8 lessons (new in this PR)

| lesson id | lesson page (h1) | lab on the page | probes in the 100-bank |
|---|---|---|---|
| `nutrition-and-digestion` | Nutrition and Digestion | match: 7 enzymes/nutrients ↔ what each does | 15 |
| `transport-and-growth-in-plants` | Transport and Growth in Plants | match: 5 tissues/processes ↔ descriptions | 5 |
| `breathing-and-gas-exchange` | Breathing and Gas Exchange | match: 5 parts ↔ functions | 2 |
| `nervous-system-and-sense-organs` | Nervous System and Sense Organs | match: 7 parts ↔ roles | 6 |
| `disease-and-pathogens` | Disease and Pathogens | sort: 7 diseases ↔ Communicable / Non-communicable | 6 |
| `body-defences-and-immunity` | Body Defences and Immunity | match: 5 defences ↔ what each does | 4 |
| `reproduction-and-development` | Reproduction and Development | match: 6 parts/processes ↔ descriptions | 7 |
| `classification-of-living-things` | Living Things and Classification | order: the 7 classification groups | 3 |

## Before / after pairs

| before | after | what it shows |
|---|---|---|
| `before-subject-page-preview-mode.png` | `after-subject-page-preview-mode.png` | the subject page's own Preview Mode line — **2 of 10** lessons → **2 of 18** |
| — | `after-subject-page-full-lesson-list.png` | the module list with per-module counts (2/4/3/2/2/1/2/1/1 = 18) and the last module's lesson listed |
| `before-lesson-nutrition-and-digestion-url.png` — "Lesson not found" | `after-lesson-nutrition-and-digestion.png` — the real lesson | the same URL before and after the lessons existed |
| — | `after-lesson-nutrition-and-digestion-gated-public-view.png` | what a signed-out visitor gets for a gap lesson: "This lesson requires full access — Sign in to view the free 2-lesson preview, or unlock all 18 lessons." |
| — | `after-lesson-*.png` (8 frames) | each new lesson renders as a lesson (heading, written body, Learning Objectives, Key Concepts) |
| — | `after-lab-*.png` (8 frames) | each lesson's Interactive Lab renders the activity its description names, with the description box on screen and the Play tab active |
| — | `after-lesson-cell-structure-figure.png` | **#142's plant-and-animal-cell figure survives the rebase** and sits above the paragraph this PR appended |
| — | `after-lesson-circulatory-system-figure.png` | **#142's heart figure survives** and both sides of the resolved paragraph are on the page |
| — | `after-lesson-excretion-homeostasis-figure.png` | **#142's kidney/nephron figure survives** and the folded + appended copy is on the page |

## DOM read-back (the text that actually rendered, not just pixels)

Subject page, after (signed out): `"Preview Mode — You are viewing 2 of 18 lessons. Unlock full access to
all 18 lessons!"`. Subject page, before (main's `modules.json` served into the same build): the same line
reads `2 of 10`, and **none** of the 8 new lesson titles appears anywhere on the page.

Subject page, after, with the throwaway bypass: `moduleCount: 9`, per-module counts
`["2 lessons","4 lessons","3 lessons","2 lessons","2 lessons","1 lessons","2 lessons","1 lessons","1 lessons"]`,
`sumOfModuleCounts: 18`, and after clicking the ninth module `activeModule: "Module 9: Diversity &
Classification"` with `activeModuleLessonNames: ["Living Things and Classification"]`.

Gap-lesson URL, before: no `h1` (the "Lesson not found" page). Gap-lesson URL, after, signed out: no `h1`,
759 characters of lock copy.

Lesson bodies, all 8, after: `h1` = the lesson title, the first paragraph of that lesson's `content`
present in the DOM, `bodyChars` 2,691–4,045, and the lesson's own lab description string present.
Lab bodies, all 8: 403–598 characters of rendered activity.

Figure frames, after: `figures: [{src:"/content/biology/figures/plant-and-animal-cell.svg",
natural:"1000x1215", displayed:"804x977", complete:true}]` on `cell-structure`;
`heart-and-double-circulation.svg` 1000x1270 → 804x1021 on `circulatory-system`;
`kidney-and-nephron.svg` 1000x1330 → 804x1069 on `excretion-homeostasis`.

Both sides of the rebase, read out of the same DOM:

- `circulatory-system` — `"tricuspid valve"` (main's #142 paragraph) **and** `"Lifestyle affects the
  health"` (this PR's paragraph) both `true`.
- `excretion-homeostasis` — `"about a million of them"` (this PR's fact folded into #142's paragraph)
  **and** `"Hormones keep the internal environment steady"` (this PR's hormone paragraph) both `true`.
- `cell-structure` — `"total magnification"` (this PR's paragraph) `true` **and** the figure above.

## Method (so this set is reproducible)

- Content is fetched at runtime (`/content/biology/modules.json`), so **before** was rendered inside the
  same build by copying `origin/main`'s `public/content/biology/modules.json` over
  `dist/content/biology/modules.json` (confirmed over HTTP as 10 lessons against 18) and reloading;
  the branch copy was restored afterwards. `dist/` is build output and is never committed.
- The subject-page preview frames and the gated public view come from the **clean** build — that is why
  the honest Preview Mode line and the lock copy are visible.
- The frames that show lesson bodies and labs behind the free-preview gate were captured with a throwaway
  local `hasSubjectAccess` bypass. It was reverted before this branch was committed:
  `grep -rc SCREENSHOT-ONLY src/` = 0 in every file, the local rebuild is clean, and
  `git diff origin/main -- src/data/access.js` is empty. The branch's only `src/` diff is its own
  pre-existing `src/components/lessonSets.js` lab wiring; `git diff origin/main -- api/` is empty.
- Every PNG was md5-checked: **25 frames, 25 distinct hashes** (a repeated hash would mean one state
  photographed twice). The scroll position was read back for each scrolled frame (`top=60`/`top=70`).
- No marking, exam-outcome or urgency language appears in any filename or caption here: these frames
  document that content renders, not that a student will pass anything.
