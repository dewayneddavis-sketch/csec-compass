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
- Neither file replaces `practice.json` (the 100-question multiple-choice bank, which the
  Mock Exam also reads) or `knowledge-check.json` (the 25-question end-of-course check).
