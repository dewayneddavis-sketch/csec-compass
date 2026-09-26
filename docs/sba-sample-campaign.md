# Completed sample SBA campaign — one worked example per subject

Owner request 2026-09-26 (addition 1): students asked to **see** a finished SBA, not only the
scoring breakdown the SBA / Paper 03 tab already gives. Every subject therefore gains ONE
**completed sample** — the category breakdown with marks awarded, plus the finished submission
end to end (cover page, aim, variables, apparatus, method, results table, graph description,
sample calculation, analysis, discussion, sources of error, conclusion, bibliography).

Rules that apply to every PR in this campaign:

- **Original content only.** Invented candidate, centre and lab details. No CXC exemplars, no real
  candidate's work, no reproduced poem/story/source text.
- **Copy-paste protected.** The sample renders with `user-select: none` plus copy / cut /
  context-menu / drag handlers switched off, and carries a "view only" note. It is meant to be
  studied, not pasted into a submission.
- **Additive only.** A new `completedSample` key inside the subject's existing `sba.json`; nothing
  already shipped is renamed, reordered or deleted. `content/` and `public/content/` stay
  byte-identical.
- **One subject = one branch = one PR**, harness green before the PR is opened.
- **Honest status.** `tools/check-sba-samples.mjs` reads the table below and fails if a subject is
  marked DONE without a `completedSample`, or has one while marked TODO.

Wave 6 and 7 below are flagged for the lead: Theatre Arts and Visual Arts submit a **practical
portfolio** rather than a written SBA/Paper 03 (Visual Arts has no written paper at all — the
portfolio *is* the assessment), and French/Spanish Paper 03 is the **oral examination**, so those
two samples show a completed oral-examination dossier instead of an SBA report.

| # | subject | exam surface | SBA marks in our guide | sample wave | status |
|---|---|---|---|---|---|
| 1 | biology | CSEC SBA | 40 | 1 - science SBA (P&D, ORR, A&I, M&M) | DONE |
| 2 | chemistry | CSEC SBA | 30 | 2 - science SBA | TODO |
| 3 | physics | CSEC SBA | 30 | 2 - science SBA | TODO |
| 4 | integrated-science | CSEC SBA | 27 | 2 - science SBA | TODO |
| 5 | human-social-biology | CSEC SBA | 18 | 2 - science SBA | TODO |
| 6 | information-technology | CSEC SBA | 60 | 3 - portfolio SBA | TODO |
| 7 | edpm | CSEC SBA | 56 | 3 - portfolio SBA | TODO |
| 8 | clothing-textile-and-fashion | CSEC SBA | 60 | 3 - portfolio SBA | TODO |
| 9 | food-and-nutrition | CSEC SBA | 50 | 3 - portfolio SBA | TODO |
| 10 | agriculture-double-option | CSEC SBA | 42 | 3 - portfolio SBA | TODO |
| 11 | social-studies | CSEC SBA | 20 | 4 - research / investigation SBA | TODO |
| 12 | caribbean-history | CSEC SBA | 25 | 4 - research / investigation SBA | TODO |
| 13 | principles-of-business | CSEC SBA | 50 | 4 - research / investigation SBA | TODO |
| 14 | principles-of-accounts | CSEC SBA | 20 | 4 - research / investigation SBA | TODO |
| 15 | english-a | CSEC SBA | 30 | 5 - language SBA | TODO |
| 16 | english-b | CSEC SBA | 40 | 5 - language SBA | TODO |
| 17 | mathematics | CSEC SBA | 18 | 5 - project SBA | TODO |
| 18 | physical-education | CSEC SBA | 54 | 6 - practical SBA | TODO |
| 19 | technical-drawing | CSEC SBA | 54 | 6 - practical SBA | TODO |
| 20 | theater-arts | CSEC SBA | 70 | 6 - practical portfolio (no written paper) | TODO |
| 21 | visual-arts | CSEC SBA | 70 | 6 - practical portfolio (no written paper) | TODO |
| 22 | french | Oral Exam / Paper 03 | n/a (oral) | 7 - oral examination dossier | TODO |
| 23 | spanish | Oral Exam / Paper 03 | n/a (oral) | 7 - oral examination dossier | TODO |

Ordering note: the campaign runs by the SBA marks carried in **our own guide** for each subject
(the `tasks` list in `content/<subject>/sba.json`), so the subjects whose SBA is the largest slice
of the assessed work come first. Marks in the table are read from those files, not assumed.
