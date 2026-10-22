# Shared cell artwork — the animal cell's contents stay inside its membrane

Before/after frames for the shared animal-cell figures in Biology, Human & Social Biology and
Integrated Science. Crops are rendered from the SVGs at intrinsic scale (no resampling), so a
pixel in the frame is `1/scale` of an SVG unit.

| frame | what it shows |
|---|---|
| `before-bio-er.png` / `after-bio-er.png` | **the defect**: Biology's endoplasmic reticulum drawn across the top-left of the animal cell's membrane, and the same region after the fix. Crop `262,668 250x132` at 4x. |
| `before-bio-golgi.png` / `after-bio-golgi.png` | the Golgi body's three folds poking ~20px through the cell's lower-right membrane, and after shifting them inside. Crop `540,900 200x150` at 4.5x. |
| `before-bio-whole.png` / `after-bio-whole.png` | the whole animal cell, including the lower mitochondrion's rounded bottom-left corner and the "cell membrane" label leader that used to end 27px outside the cell. Crop `233,658 484x458` at 2x. |
| `before-hsb-er.png` / `after-hsb-er.png` | H&SB's own copy of the artwork: no reticulum is drawn there at all, but it carried the same floating "cell membrane" leader dot, which the shared fix moved onto the membrane. |
| `before-is-er.png` / `after-is-er.png` | Integrated Science's generated copy — same shared leader, same fix. |
| `before-is-golgi.png` / `after-is-golgi.png` | IS's Golgi folds, moved inside by the generator's shared constants. |

**Why the ER redraw is Biology-only:** the reticulum was drawn only in Biology's own copy. H&SB and IS never
drew one, so there was no such element there to move — the redraw is Biology-only because the defect was
never inherited, not because it was left unfixed. The shared items fixed in all three are the lower
mitochondrion and the "cell membrane" leader dot.

## The measurement, not an eyeball

`bounds.py` in this directory (committed with the frames; its raw output is `bounds-evidence.txt`) flattens every
drawing element in the animal cell, ray-casts each sampled point against the cell-membrane
outline, and allows for each element's own stroke half-width. Before the fix it reported 12
elements outside in Biology, 3 in H&SB and 8 in IS; after the fix all three report 0, and the
same check run against the plant cell's wall reports 0 there too.

## Regenerating the figures is a no-op
`tools/gen-human-social-biology-figures.py` is the generator of record for `hsb-plant-and-animal-cell.svg`
and it carries the fixed geometry, so re-running it (with or without `--trees`) rewrites the H&SB
figures byte-for-byte — the shipped file is its own generator's output. Until that was fixed the generator
still held the pre-fix numbers, so a routine run silently put the 27px-outside leader dot and the
mitochondrion back through the membrane.
Nothing in the harness suite regenerates a figure, so this is a property of the repo state, not an
enforced check: a checker that re-runs this generator and byte-compares its output with the shipped
file would make the drift fail loudly rather than depending on whoever next runs the generator.
## What did *not* change

Lesson copy, lesson ids, banks, counts and the `figures` entries are untouched — this is
artwork geometry only. The two strings the IS generator already asserted against Biology
(`BIO_WALL_RECT`, `BIO_BLOB`) are bit-for-bit unchanged; the generator now asserts the rest of
the shared animal-cell elements as well, so this class of drift fails loudly next time.
