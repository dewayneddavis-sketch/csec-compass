# Typed-answer ("write") question format

Spec for the `write` question type used by CSEC Compass. Files:

- `content/social-studies/paper2.json` (mirrored at `public/content/social-studies/paper2.json`)
- `content/english-b/paper2.json` (mirrored at `public/content/english-b/paper2.json`)

Both are JSON **arrays** of items. This mirrors `practice.json` / `knowledge-check.json`
(also plain arrays), so existing fetch-a-JSON-array code paths can load them unchanged.

## Why

Paper 2 questions cannot be multiple-choice: the student must *type* an answer. Since an
automatic marker cannot judge free writing fairly, every item ships with a **model answer**
and a **mark scheme** so the student can self-assess: write, reveal, compare, tick the points
they made. Nothing in the UI should imply the typed answer is auto-graded.

## Item shape

```jsonc
{
  "id": "ss-p2-01",              // unique within the file
  "type": "write",               // ALWAYS "write" (this is the type discriminator)
  "paper": 2,                    // 2 = Paper 2 (typed responses)
  "section": "Section A",        // "Section A" / "Section B" (Social Studies),
                                 // "Drama" / "Poetry" / "Prose" / "Writing" (English B)
  "title": "Short label",        // shown in a question list / picker
  "topic": "ss-l1-2",            // MUST equal a lesson id in that subject's modules.json
  "commandWords": ["Identify", "Explain", "Suggest"],
  "marks": 24,                   // total marks for the item
  "suggestedMinutes": 28,        // time budget shown to the student
  "source": "…stimulus text…",   // scenario / source / extract. \n\n separates paragraphs
  "prompt": "…instruction…",     // what to do

  // EITHER structured parts…
  "parts": [
    {
      "label": "(a)",
      "prompt": "Identify TWO …",
      "marks": 4,
      "commandWords": ["Identify"],
      "modelAnswer": "…full model response for this part…",
      "markScheme": [ "1 mark for each …", "…" ]   // array of strings
    }
  ],

  // …OR (when there are no parts) item-level answer fields, used as-is:
  "modelAnswer": "…",
  "markScheme": [ "…" ],

  "planningHints": ["…", "…"],   // optional, show before the student types
  "examinerTips": "…"            // optional, show with the model answer
}
```

Rules the content guarantees (validated at authoring time):

1. `type` is always `"write"`.
2. `topic` is a real lesson id for that subject (`modules[].lessons[].id`).
3. If `parts` is present, `sum(part.marks) == marks`, and every part has `prompt`,
   `modelAnswer` and a non-empty `markScheme` array. `parts` is **never empty**.
4. If `parts` is absent, the item has top-level `prompt`, `modelAnswer` and `markScheme`.
   **A renderer must support both shapes** — Social Studies uses `parts` (structured
   `(a)(b)(c)` questions); English B uses the flat shape (one essay per item).
5. `markScheme` is always an array of strings. The marks are written inside the strings
   (e.g. `"1 mark for each accurate feature named (maximum 2 marks)."`) — the strings are
   deliberately human-readable mark-scheme wording, and `marks` on the part/item is the
   authoritative total.
6. `source` is always present and non-empty (used as the stimulus panel).

## Suggested UI behaviour

- Left/main panel: `source` (stimulus), then `prompt`, then a `textarea` for the answer.
- Show `suggestedMinutes` and `marks` as chips; show `commandWords` as reminder chips
  (the platform already has a command-words guide — link to it).
- "Show model answer" reveals `modelAnswer` plus the `markScheme` list, with a checkbox per
  mark-scheme line ("I made this point") and a running estimated score. Label it clearly:
  *self-assessment*, not a marked grade.
- Store the typed answer in `localStorage` (keyed by subject + item id) so a draft survives a
  refresh; if signed in, sync is optional.
- Parts render as sub-sections with their own textarea, marks and model answer.

## Counting

- Social Studies `paper2.json`: 10 items, 239 marks total.
- English B `paper2.json`: 9 items, 265 marks total.
- Agriculture Double Option `paper2.json`: 8 items, 217 marks total.
- Caribbean History `paper2.json`: 9 items, 270 marks total — 3 questions in each of
  Sections A, B and C at 30 marks each, matching the real Paper 02 (2 h 10 min), in which
  the candidate answers one question from each section.
- Neither file replaces `practice.json` (the multiple-choice practice bank, at least 100
  questions per subject and 172 for Mathematics, which the Mock Exam also reads) or
  `knowledge-check.json` (the 25-question end-of-course check, always exactly 25).

## Implemented renderer (engineer, 2026-09-18)

The type is live: `src/components/WriteQuestion.jsx` (one question/part) composed by
`src/components/Paper2Section.jsx`, shown in the **Paper 2** tab on the subject page.

- **The tab is data-driven.** SubjectPage probes `/content/<subject>/paper2.json`; the tab
  exists only when that file is present and a non-empty array. A new subject that ships
  `paper2.json` (and its `public/content/` mirror) gets the tab with no code change.
- Both item shapes are rendered: structured `parts` (each part = its own textarea, marks,
  model answer and mark scheme) and the flat single-answer shape.
- The tab sits behind the same paid gate as every other assessment tab; logged-out /
  unpurchased students see the standard unlock banner.
- Drafts: `localStorage["csec-paper2-<subject>-<itemId>"]` → `{ answers: {partKey: text},
  ticks: {partKey: [bool,…] } }`. `partKey` is `p0`, `p1`, … for structured items and
  `main` for flat items. Nothing is synced to Supabase yet.
- **Nothing is auto-graded.** The only number shown is the count of mark-scheme lines the
  student ticks; per-line marks are not inferred from the wording.
- Verified by `node tools/check-paper2.mjs` (data shape, mirrors, counts, no `write` items
  leaking into the auto-graded banks, and the tab/gate wiring).

