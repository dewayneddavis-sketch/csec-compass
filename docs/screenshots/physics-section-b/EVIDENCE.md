# Physics Section B — Thermal Physics and Kinetic Theory — delivered evidence

**Subtotal: 23 chapters = 10 REUSE + 4 EXTEND + 9 NEW** (audit `/home/team/shared/physics-coverage-audit.md` §5).
Branch `content/physics-section-b`, PR against `main`. Generator: `tools/gen-physics-section-b.py`.

## NEW (9 lessons, all inside the `thermal-physics` module, inserted at its head)

| lesson id | lab deck |
|---|---|
| `thermal-thermometers-and-thermometric-properties` | match |
| `thermal-temperature-scales-and-fixed-points` | match |
| `thermal-states-of-matter` | sort |
| `thermal-determining-specific-heat-capacity` | match |
| `thermal-determining-specific-latent-heat` | match |
| `thermal-evaporation-and-boiling` | sort |
| `thermal-absorption-and-emission-of-radiation` | match |
| `thermal-good-absorbers-and-emitters` | match |
| `thermal-energy-transfer-device-design` | sort |

Every lesson carries `id/title/content/objectives/concepts` + `experiment` as an **object**
`{type, description}` (needed because these tools print their own heading), a `lessonSets.physics`
entry, a recognised type (`matching-game` / `classifier-sim`), `concepts` as an array of strings,
and no figures (none of the audit's Section B rows calls for one).

## EXTEND (4) — pure insertions into named existing lessons; the ids are untouched

| existing lesson id | chapter added | form |
|---|---|---|
| `temperature-heat` | Historical Heat Theories (caloric → kinetic theory) | 1 paragraph + 3 concepts appended |
| `gas-laws` | Kelvin Temperature Scale | 1 paragraph + 3 concepts appended |
| `gas-laws` | Kinetic Theory and Gas Laws | 1 paragraph + 3 concepts appended (**gas-laws extended twice, exactly as the audit lists it**) |
| `specific-and-latent-heat` | Effects of Thermal Expansion | 1 paragraph + 3 concepts appended |

Each was asserted to be a **pure insertion**: `new.content == old.content + "\n\n" + paragraph`
(this also proves the generator did not re-serialise the file), `new.concepts == old.concepts + [3]`,
and `title` / `objectives` / `experiment` byte-identical.

## REUSE (10) — already taught; nothing written

Thermal Energy Transfer · Temperature and Molecular Kinetic Energy · Gas Laws Application ·
Specific Heat Capacity and Heat Capacity · Energy Calculation with Specific Heat Capacity ·
Phase Change and Latent Heat · Latent Heat Application · Conduction of Thermal Energy ·
Convection of Thermal Energy · Radiation of Thermal Energy.

## Delivery mechanics and the proofs that hold it up

- **Counted, line-local raw-text splices — never a whole-file re-serialise.** `modules.json` keeps its
  `\uXXXX` escaping, 4-space indent and key order.
- **Idempotent.** Second run: `already applied: all nine thermal- lessons are present in modules.json`
  and md5 of all three touched files unchanged (`md5sum -c` OK) — nothing was written.
- **Mirror byte-identical.** `content/physics/modules.json` == `public/content/physics/modules.json`,
  `sha256 9158e2667a7a35b897d1342d25271f4712303ccd77f06a2c2600ab1c9a42616f`, 69,279 → 110,802 bytes.
- **Diff vs main:** hunks only inside the thermal region (`@@ -116 @@`, `-123 +123,4`,
  `-133 +136`, `-139 +142,7`, `-149 +158`, `-159 +168,4`, and a **pure insertion**
  `@@ -164,0 +177,183 @@`). **9 lesson ids added, 0 removed.** The 6 rewritten lines are exactly the
  3 EXTEND content lines (append-only, asserted) and the 3 trailing commas added to the extended
  `concepts` arrays. `lessonSets.js`: one pure insertion, 148 lines.
- **Banks untouched during the build:** no `practice.json` / `knowledge-check.json` in the diff.
- **Lab decks trace to their own lesson.** All 9 decks (6 match, 3 sort — 61 displayed strings) were
  checked to appear verbatim (case/dash/whitespace-folded) in that lesson's own
  title+content+objectives+concepts corpus, so no deck invents vocabulary and no deck names a sibling
  lesson. 22 strings were reworded to meet that rule before the write.
- **Harness: the PARTITION check, byte-identical to Sections A/C/D** —
  `tools/check-physics-gap-labs.mjs` md5 `961936cf946c8aaf83202e5202bc0021`. **No harness edit is
  needed for a new section**; the 9 new lessons are per-lesson-keyed and covered exactly once.

## Harness suite on this branch — 40 harnesses, every one rc=0

`check-physics-gap-labs` 606/0 · `check-lesson-content-types` **1528/1528** (main 1501 + 27 = 3 per new
lesson) · `check-teacher-lab-names` **575/575** (main 566 + 9) · `check-lesson-figures` **626/626**
(main 617 + 9) · `check-play-copy` 51/51 · `check-lab-set-ownership` 30/30 · `check-paper2` 446/0 ·
`check-subject-catalog` 193/193 · `check-mock-paper` · `check-show-your-work` 82/82 ·
`check-sba-samples` 2553/0 · `check-teacher-dashboard` 384/384 · and 27 more.
Full per-harness log: `/home/team/shared/physics-section-b-harness-suite.txt`.

## NOT DONE — disclosed, not implied

- **The production-build render read-back (lesson page + its Play tab, and the purchase gate) was not
  run.** It needs a throwaway `SCREENSHOT-ONLY` splice into the pure `hasSubjectAccess()` predicate in
  `src/data/access.js` plus a production build: the new lessons sit *after* the 2-lesson free preview,
  so the tab renders the lock banner otherwise. **No `src/` change is carried by this PR** (the only
  `src/` file touched is `lessonSets.js`, which the harnesses and the decks above cover). The render
  read-back is owed at the gate.
- Section B's rows were **not** restated row-by-row in the audit file — that is dev-3's audit-side work.
