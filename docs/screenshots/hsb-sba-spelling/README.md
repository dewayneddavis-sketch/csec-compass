# H&SB sba.json spelling fix — before/after render proof

Both frames are the **H&SB SBA tab, Task Breakdown card**, photographed from a real
production build (`node_modules/.bin/vite build` + `vite preview --port 4173`) at
`/subject/human-social-biology`, after clicking the **CSEC SBA** tab.

- `before-hsb-sba-task-breakdown.png` — `origin/main`'s `sba.json` served (only
  `dist/content/human-social-biology/sba.json` was swapped for the `git show
  origin/main:...` version, so the build is otherwise identical). The Discussion row
  reads **"Analyze results and link to health concepts."**
- `after-hsb-sba-task-breakdown.png` — the branch's `sba.json` served. The same row
  reads **"Analyse results and link to health concepts."**

Proof the two frames are two different states, not one state photographed twice:

- md5 `6d10a9bceff1e79f7e2778084595f83e` (before) vs
  `d53e15a9a9d81912a8a496108e3da364` (after).
- DOM read-back of `.sba-task-explain` before each shot returned the whole task list:
  `tasks=5 | … || Analyze results and link to health concepts.` (before) and
  `… || Analyse results and link to health concepts.` (after).
- The scrolled position was read back for both frames (`top=80 y=579`), so the same
  region is framed in each.

The SBA tab is behind the purchase gate, so this throwaway local build carried a
one-line bypass (`return true; // SCREENSHOT-ONLY` as the first statement of
`hasSubjectAccess` in `src/data/access.js`). It was reverted before commit — the PR
carries no `src/` change (`grep -rc SCREENSHOT-ONLY src/` = 0, `git diff -- src api`
empty). A real student sees exactly this panel once their purchase unlocks the tab.
