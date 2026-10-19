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

## The measurement, not an eyeball

`tools/bounds.py` (kept off-repo; the numbers are reproduced in the PR body) flattens every
drawing element in the animal cell, ray-casts each sampled point against the cell-membrane
outline, and allows for each element's own stroke half-width. Before the fix it reported 12
elements outside in Biology, 3 in H&SB and 8 in IS; after the fix all three report 0, and the
same check run against the plant cell's wall reports 0 there too.

## What did *not* change

Lesson copy, lesson ids, banks, counts and the `figures` entries are untouched — this is
artwork geometry only. The two strings the IS generator already asserted against Biology
(`BIO_WALL_RECT`, `BIO_BLOB`) are bit-for-bit unchanged; the generator now asserts the rest of
the shared animal-cell elements as well, so this class of drift fails loudly next time.
