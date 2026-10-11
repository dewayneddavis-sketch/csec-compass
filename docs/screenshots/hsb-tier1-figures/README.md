# H&SB Tier-1 lesson figures — rendered in-app proof (locked lessons)

Six original SVG figures over three Human & Social Biology lessons, photographed
**inside the running app** — not as files — so the question "do the pictures
actually paint for a student?" has a rendered answer.

Branch: `content/human-social-biology-tier1-figures`, head **86e9523**
(rebased onto `main` d0fb4af; the branch sits directly on `main`, so the branch
head *is* the three-way merged tree).

| lesson | figures | after | before |
|---|---|---|---|
| `hsb-l1-1` Skeletal and Muscular Systems | `hsb-skeleton.svg`, `hsb-joints-and-muscles.svg` | `after-hsb-l1-1.png` (+ `-figures`) | `before-hsb-l1-1.png` (+ `-figures`) |
| `hsb-l1-2` Circulatory and Respiratory Systems | `hsb-heart-and-double-circulation.svg`, `hsb-blood-and-gas-exchange.svg` | `after-hsb-l1-2.png` (+ `-figures`) | `before-hsb-l1-2.png` (+ `-figures`) |
| `hsb-l2-1` Cell Structure and Function | `hsb-plant-and-animal-cell.svg`, `hsb-specialised-cells.svg` | `after-hsb-l2-1.png` (+ `-figures`) | `before-hsb-l2-1.png` (+ `-figures`) |

`-figures` frames are the 1280x720 viewport scrolled to the figure block; the
plain frames are `--full` page shots, so one image carries the whole lesson
(prose, both figures, objectives, concepts, lab).

## How it was produced

1. `npm run build` at head 86e9523, served with
   `npx vite preview --port 4325 --strictPort` (never the platform site server).
2. **Purchase gate bypass (throwaway, reverted before this commit).** One line
   `return true; // SCREENSHOT-ONLY` prepended to the pure predicate
   `hasSubjectAccess()` in `src/data/access.js`, so `hsb-l1-2` and `hsb-l2-1`
   render as a full-access student sees them instead of the lock banner.
   (`hsb-l1-1` is also a 2-lesson free-preview lesson; the bypass was kept on for
   all three so every frame is the same access state.)
3. **After pass** — for each lesson: open the deep link, read the DOM back,
   `scrollIntoView`-style scroll with a read-back of `scrollY` and the element's
   `top`, then screenshot the full page and the scrolled viewport.
4. **Before pass** — no second build. The lesson content is fetched at runtime
   from `dist/content/...`, so the served file was swapped for the pre-PR one:
   `git show origin/main:public/content/human-social-biology/modules.json >
   dist/content/human-social-biology/modules.json` and the dist `figures/` dir
   removed, then the same three lessons re-opened. Confirmed served
   (`curl localhost:4325/content/human-social-biology/modules.json | grep -c '"figures"'`
   → `0`) before shooting. `dist/` is build output and is never committed.

## DOM read-back (raw, unedited)

`dom-readback-after.txt` — three lessons, each `figureCount: 2`, every `img`
`complete: true`, `naturalWidth: 1000`, `naturalHeight` 1210 / 1370 / 1270 / 1450
/ 1245 / 760, and the caption text read straight out of `.lv-figure-caption`
(`"Figure 1. …"`, `"Figure 2. …"`); `lockBanner: false` on all three.

`dom-readback-before.txt` — the same three URLs, `figureCount: 0`,
`figures: []`, `lockBanner: false`.

Both files are the raw one-line JSON the page returned, so they can be diffed.

## Position read-back (what proves each viewport frame is where it claims)

Plain (unscrolled) pages, `scrollBehavior` forced to `auto`, scroll to
`target.top - 80`, then the position re-read and printed:

| pass | lesson | read-back |
|---|---|---|
| after | hsb-l1-1 | `y=832 top=80 target=lv-figures` |
| after | hsb-l1-2 | `y=922 top=80 target=lv-figures` |
| after | hsb-l2-1 | `y=742 top=80 target=lv-figures` |
| before | hsb-l1-1 | `y=832 top=80 target=lv-objectives` |
| before | hsb-l1-2 | `y=772 top=80 target=lv-objectives` |
| before | hsb-l2-1 | `y=682 top=80 target=lv-objectives` |

In the before state there is no `.lv-figures` node at all, so the routine falls
back to `.lv-objectives` — itself the proof that the figure block is absent from
the DOM, not merely unpainted. (The `before` lines are in
`scroll-readback-before.txt`; the `after` lines were printed by the capture run.)

## Every frame is a distinct state

```
05fd5f99613edc7726b3f2adc803c2a7  after-hsb-l1-1-figures.png
d906057cd91ad074ad5248d2faec76d1  after-hsb-l1-1.png
5eaafa669c516091dbe9270a590760db  after-hsb-l1-2-figures.png
5bf34c2eaf6e3300fc816ace629490ca  after-hsb-l1-2.png
1ad45b6d5bb605cc0fe301d979296fbd  after-hsb-l2-1-figures.png
cba900ecf71bf7aaf9162ce5157a1897  after-hsb-l2-1.png
1cae38f0cbdc082931784a78000b09f6  before-hsb-l1-1-figures.png
ca6813521f605cc41a8e20e7cf7e345f  before-hsb-l1-1.png
0b01b7bf1b263d80c2fdfbfde075e579  before-hsb-l1-2-figures.png
c2c75a40c06087ee2ad89ea6ff19e6f2  before-hsb-l1-2.png
424c802af425ae0fe890d3d60a4ea281  before-hsb-l2-1-figures.png
79088fc8fb3c877ff9afb3208695aa4a  before-hsb-l2-1.png
```

Twelve frames, twelve distinct hashes — no state photographed twice.

## Gate reverted, and proved

```
$ grep -rl SCREENSHOT-ONLY src/ api/ | wc -l
0
$ git diff --stat HEAD -- src/ api/ | wc -l
0
$ git status --short
?? docs/screenshots/hsb-tier1-figures/
```

This commit therefore carries **only** the frames, the read-backs and the README
— no `src/` or `api/` change.

## Harnesses at this head

Full suite green on 86e9523 (39/39 `tools/check-*.mjs`, no failures), including:

```
check-lesson-figures.mjs       588 passed, 0 failed
check-lesson-content-types.mjs 1468/1468 green
```

## Honest limits

- These are frames of a **local production build**, not of csec-compass.com —
  the live site picks the figures up when this PR merges and deploys.
- The only thing bypassed is the access gate; the component, the content JSON
  and the SVGs in the frames are the shipped ones.
- The before/after pair isolates this PR's content change (two `figures` arrays,
  one appended paragraph, one appended sentence). The rebase also carries main's
  own "practise" fix in the Nutrition lesson through unchanged.
