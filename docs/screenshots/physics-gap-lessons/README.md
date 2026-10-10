# Physics gap lessons — rendered before/after proof (PR #143, merged as main `695f738`)

These frames were captured against the **merged main tree**, not the branch head, so they show what
a student actually gets after PR #143 landed: **Physics goes from 8 lessons to 16**, with the eight
new lessons rendering real lesson content and a Play lab of their own.

Captured from a local production build (`npm run build` + `vite preview` on :4173) of
`content/physics-gap-screenshots`, branched from `origin/main` (`12cd301`). The lesson-figures
capability and the honest-copy fix are part of that tree; nothing in `src/` or `api/` is changed by
this PR — it is a docs-only proof.

## Frames

| File | State | What it shows |
|---|---|---|
| `before-subject-8-lessons.png` | before | `/subject/physics` with the pre-#143 content served: **Lessons Completed 0/8**, *Module 1: Mechanics — 2 lessons* |
| `after-subject-16-lessons.png` | after | same URL on merged main: **Lessons Completed 0/16**, *Module 1: Mechanics — 5 lessons* |
| `before-lesson-url-not-found.png` | before | `/lesson/physics/forces-and-newtons-laws` against the pre-#143 content: **"Lesson not found"** |
| `after-lesson-forces-and-newtons-laws.png` | after | same URL on merged main: the lesson renders — title, breadcrumb (*Mechanics / Forces and Newton's Laws*) and the real body copy (resultant force, Newton's three laws, momentum) |
| `after-play-forces-and-newtons-laws.png` | after | that lesson's **Play** tab: the *Forces and Newton's Laws* DragDropLabel lab ("Match each idea - First law, Second law, Third law, Momentum and Friction - to the statement it belongs with") with its drag items and drop zones |

## How the before/after pair was produced without two builds

`/subject/physics` and `/lesson/...` fetch `/content/physics/modules.json` at runtime, so it is not
baked into the bundle. One build was made from merged main; the "after" frames were shot, then
`dist/content/physics/modules.json` was replaced with the pre-#143 version
(`git show 7520853:public/content/physics/modules.json`) and the same URLs re-shot for "before".
The only difference between the two pairs is the content file — the app code is byte-identical.

## Verification

- Each frame's DOM was read back before shooting (screenshot paths absolute; PNGs checked one by one).
- `md5sum` of all five frames: `31ed884a` (after-subject), `8c5eb3c0` (before-subject), `f0feec35`
  (after-lesson), `0b111195` (after-play), `247de30b` (before-not-found) — **five distinct frames**,
  no state photographed twice.
- The purchase gate was bypassed for the shots with a throwaway `return true; // SCREENSHOT-ONLY`
  line in `src/data/access.js`; it was reverted before commit (`grep -rc SCREENSHOT-ONLY src/` = 0,
  `git diff origin/main -- src/ api/` empty). The shots show the real shipped components and the
  real shipped content; only the access gate was bypassed, and this PR carries no `src/` or `api/`
  change.
