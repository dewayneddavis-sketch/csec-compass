# Rendered Play-tab copy — before / after

Captured from the real app (vite dev on a private port, driven with a headless
browser) by clicking the **Interactive Lab** tab of `/subject/<id>` and reading
`.exp-sandbox`'s innerText. `before/` is the original `ExperimentSandbox.jsx`,
`after/` is this branch. Screenshots are in the same directories.

## before — the type-level promise vs the tool that renders

| subject | copy shown (type library) | tool that actually rendered |
|---|---|---|
| chemistry | "Lab Simulation — Explore chemical reactions and lab procedures interactively." | Chemistry Terms *flashcards* |
| english-a | "Writing Helper — Practice writing skills with prompts, outlines, and feedback tips." | English A Literary Terms *flashcards* |
| human-social-biology | "Body Explorer — Explore human anatomy with interactive diagrams." | **Match Literary Devices** (English A content — separate defect, reported) |
| information-technology | "Code Playground — Write and test code snippets with instant feedback." | Match Devices to Categories (drag) |
| principles-of-accounts | "Ledger Tool — Practice double-entry bookkeeping with an interactive ledger." | Classify Balance Sheet Items (drag) |
| principles-of-business | "Data Explorer — Visualize and interpret charts, graphs, and datasets." | Principles of Business Terms *flashcards* |
| social-studies | "Data Explorer — Visualize and interpret charts, graphs, and datasets." | Match Institutions to Functions (drag) |
| spanish | "Flashcard Trainer — Build vocabulary with flip-and-review flashcards." | Spanish Word Match (drag) |
| biology | "Cell Viewer — Explore cell structures with an interactive diagram." | Label the Animal Cell (drag) — **true** |
| french | "Flashcard Trainer — Build vocabulary with flip-and-review flashcards." | French Vocabulary deck — **true** |
| mathematics | "Graphing Calculator — Plot y = mx + b…" | Graphing Calculator — **true** |
| physics | "Circuit Builder — Build electrical circuits…" | Circuit Builder — **true** |

8 of the 12 contradict the tool. All 434 lessons were unaffected: every lesson
carries its own `experiment.description` (object form), which already won.

## after — the words come from the tool that renders

* chemistry → header "Interactive Lab", then "Chemistry Terms", the deck naming itself
* principles-of-accounts → "Classify Balance Sheet Items / Drag each item into Asset, Liability, or Equity."
* spanish → "Spanish Word Match / Drag each Spanish word to its English meaning."
* english-a → "English A Literary Terms" (flashcards)
* mathematics → copy **kept**: "Graphing Calculator — Plot y = mx + b with draggable sliders…" (true, and the calculator prints no heading of its own)
* physics → copy **kept**: "Circuit Builder — Build electrical circuits with batteries, bulbs, resistors, and switches." (true)

Raw DOM readback: `rendered-copy-before.txt` and `rendered-copy-after.txt`
(all 25 subjects, one line each).
