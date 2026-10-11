# Human & Social Biology Paper 2 tab - before/after proof

Local production build (`node_modules/.bin/vite build`) served with `vite preview` on port
4173, driven with `agent-browser`. The bank is fetched at runtime from
`/content/human-social-biology/paper2.json`, so the **same build** serves both states: the
BEFORE frame was taken with that JSON removed from `dist/`, then restored.

| frame | what it proves | DOM read-back |
|---|---|---|
| `before-no-paper2-tab.png` | with no bank on disk there is **no Paper 2 tab at all** | `path=/subject/human-social-biology`, tabs = `Lessons, Interactive Lab, Knowledge Check, Extra Practice, Mock Exam, Progress, CSEC SBA` - **no Paper 2** - and `paper2tab=false` |
| `after-paper2-tab-visible-gated-locked.png` | with the bank shipped, the Paper 2 tab appears in the same tab row | the tab row contains **`Paper 2`** |
| `after-paper2-tab-open-locked-banner.png` | the tab is still **behind the paid gate** for a logged-out visitor | the panel reads `Paper 2 is locked. Unlock full access to practise the typed-answer Paper 2 questions.` |
| `after-paper2-bank-open.png` | with the gate bypassed for that one frame, the bank itself renders | `h3=CSEC Paper 2 - typed answers, self-assessed` | `stat=6 questions . 90 marks in total . each question shows its own time budget.` | picker items = 6 | groups = `Section A`, `Section B` | first question = `Practical investigation: water movement in potato tissue` | tags = `Section A / 15 marks / 20 minutes suggested` |

The first two frames are the same URL, the same build and the same viewport, and the only
difference between them is the presence of the bank file - that is the proof that the tab is
data-driven rather than hard-coded. The third frame is captured logged out, so it also proves
this PR did **not** widen access to anything.

`after-paper2-bank-open.png` was captured with the purchase gate bypassed for that one frame
only: the pure predicate in `src/data/access.js` was given a temporary
`return true; // SCREENSHOT-ONLY`, the tree was rebuilt and the frame was taken; the patch was
then **reverted** (`grep -rl SCREENSHOT-ONLY src/` -> 0 files, `git diff -- src api` -> 0 lines)
and the honest tree rebuilt. No bypass survives in this PR.

`md5sum` of the frames (all four different - no state photographed twice):

```
e264a9dac0070c4a0176b4cdf1d562f9  before-no-paper2-tab.png
3e1565cc10985b1fb5e19123be06a0ae  after-paper2-tab-visible-gated-locked.png
e8ea2ff8d05facce24759cf497678880  after-paper2-tab-open-locked-banner.png
b5713bfe657ab7571ffccac16261650f  after-paper2-bank-open.png
```

