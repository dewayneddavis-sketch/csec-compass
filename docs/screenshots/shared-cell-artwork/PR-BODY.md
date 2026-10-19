fix(figures): the shared animal-cell artwork stays inside its membrane

The Biology plant+animal cell SVG is the source of the animal-cell artwork that Human &
Social Biology and Integrated Science both reuse. Measured geometry (tools/bounds.py: flatten
every element in the animal cell, ray-cast each point against the membrane outline, allow for
each element's own stroke half-width) found elements drawn outside that membrane in all three
copies:

  Biology            12 elements outside    -> 0
  Human & Social Bio  3 elements outside    -> 0
  Integrated Science  8 elements outside    -> 0
  (the plant cell half: 0 before, 0 after)

Worst offenders before:

  * endoplasmic reticulum, top fold          24.1px outside   (Biology only)
  * endoplasmic reticulum, middle fold        2.7px outside   (Biology only)
  * "cell membrane" label leader dot         27.3px outside   (all three)
  * Golgi body, lowest fold                  20.1px outside   (Biology + IS)
  * "Golgi body" label leader dot            22.2px outside   (Biology)
  * lower mitochondrion (bottom-left corner)  5.6px outside   (all three)

WHAT CHANGED (artwork geometry only — no lesson copy, no lesson ids, no banks, no counts, no
figure entries added or removed)

1. Endoplasmic reticulum (Biology, the reported defect). Redrawn as three compact internal
   folds between the membrane and the upper mitochondrion (x 356..472, bases y 722/740/758,
   amplitude 5; was x 312..468, bases 700/722/744, amplitude 10). The band the membrane leaves
   above the mitochondrion is only ~50px at its narrowest, so the old 156x64 stack could not be
   translated inside it — the folds are redrawn smaller, which is the judgement call the task
   anticipated. Its label leader now lands on the reticulum (234,760)->(356,758).
2. Golgi body (Biology + IS): the same three folds shifted 32px left so they clear the
   lower-right membrane. Its label leader now lands on the fold it names: (766,988)->(653,984).
3. Lower mitochondrion (all three): raised 14px (y 1022 -> 1008) so its rounded bottom-left
   clears the membrane; its fold moved with it (y centre 1046 -> 1032) and its label leader now
   ends on the organelle, (234,1050)->(352,1046), instead of 10px short of it in the cytoplasm.
4. "Cell membrane" label leader (all three): the dot used to end at (300,704), ~27px out in
   white space; it now ends at (310,734), just inside the membrane -- the same convention the
   plant cell's "cell membrane" leader already uses in this artwork.

HOW THE COPIES WERE BROUGHT ALONG (shared-asset-first, never a fork)

* Biology is the source: content/biology/figures/plant-and-animal-cell.svg.
* Integrated Science's is-cells-plant-animal.svg was REGENERATED, not hand-patched:
  python3 tools/gen-integrated-science-figures.py. The new constants BIO_MITO_LOWER,
  BIO_GOLGI_FOLDS and BIO_CELL_MEMBRANE_LEADER_ENDPOINT are now asserted by
  assert_borrowed_geometry() against Biology's shipped SVG, alongside the wall rect and the
  cell outline it already checked. Merchancial check: the assertion fires — perturbing
  Biology's mitochondrion y makes the generator exit 1, restoring it exits 0 (see below).
* H&SB's own copy carries the two shared elements it has (no reticulum, no Golgi are drawn
  there) byte-identically to Biology's strings.

HONEST CORRECTION TO THE TASK PREMISE

The task said the reticulum defect was "inherited by H&SB's and Integrated Science's cell
figures". It was not: neither copy draws a reticulum at all (H&SB's reduced label set has no
"endoplasmic reticulum" label, and IS's is-l2-1 figure deliberately draws only the structures
its lesson names). So the reticulum fix is Biology-only; the other three items above ARE shared
and are what genuinely needed bringing along in all three.

VERIFICATION

* mirrors byte-identical: content/<subject>/figures/*.svg == public/content/<subject>/figures/*.svg
* generator byte-reproducible: re-running it leaves the IS SVG unchanged
* harnesses green on this tree: check-lesson-figures 606/0, check-subject-catalog 193/0,
  check-lesson-content-types 1468/1468
* rendered before/after frames + the containment numbers: docs/screenshots/shared-cell-artwork/
* the borrowed contract strings (BIO_WALL_RECT, BIO_BLOB) are unchanged, and nothing under
  dist/ is touched.
