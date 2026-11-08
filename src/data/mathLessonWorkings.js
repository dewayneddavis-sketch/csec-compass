// Worked solutions for the Mathematics PER-LESSON lab sets (Play tab).
//
// The defect this file exists for (measured 2026-11-08 on main b325760):
// `getLabWorking()` in src/data/mathWorking.js keyed its working by ACTIVITY
// TYPE, and `mathLabWorkings` only carries the nine `MATH_DRAG_TYPES`. The 32
// Mathematics lessons that own a per-lesson set in `lessonSets.mathematics` are
// all `matching-game` / `classifier-sim` (17 + 7) or `interactive-quiz` (8) with
// item ids reused across lessons (p1…p6), so the type lookup returned null,
// `reveal` was null, and a wrong drop showed "❌ Not quite" with no correct
// answer and no working. 8 of the 32 sit on `interactive-quiz`, a type that IS
// keyed, and failed only because their item ids do not line up with r1…r5 —
// which is exactly why the resolver must never fall through to the type table
// for a lesson that owns its own set.
//
// KEY SHAPE — lesson first, then item:
//
//     mathLessonWorkings[lessonId][itemId] = ["step 1", "step 2", …]
//
//   * `lessonId` is a lesson id from content/mathematics/modules.json, and it
//     MUST be a lesson that owns a set in `lessonSets.mathematics`. A lesson
//     without its own set keeps resolving through the type table
//     (`mathLabWorkings`), which is untouched by this file.
//   * `itemId` is the id of the item inside THAT lesson's own set (`pairs[].id`
//     for kind "match", `items[].id` for kind "sort"). Ids are only unique
//     within a set, which is the whole reason the type table could not express
//     this.
//   * The correct ANSWER is never stored here — it is read from the lab set
//     itself, so there is exactly one source of truth for it. Each array's LAST
//     step must state that item's answer.
//
// STAGE 1 (this commit) ships the file EMPTY and the lookup wired. Nothing is
// authored yet: the 32 lesson ids are listed in `PENDING` inside
// tools/check-math-working.mjs, and that harness asserts
// `PENDING ∪ authored === every live per-lesson set` exactly, so a lesson can
// neither silently escape the backfill nor have its key silently vanish. The
// backfill then empties lessons out of PENDING one module-owned slice at a time
// (consumer-arithmetic · sets · number-theory-computation · measurement ·
// algebra + relations · geometry + statistics = 181 items, ≈540 steps).
//
// WHAT THE HARNESS PROVES, HONESTLY: structure and the answer — that every
// authored key is a real lesson and a real item, that the last step states that
// item's answer, that per-lesson working beats type-level working, and that the
// answer is revealed for all 181 items whether or not any working exists yet.
// It does NOT prove the mathematics is correct. Correctness of each step is a
// review obligation carried by every backfill PR, together with an
// independently re-derived arithmetic table.

export const mathLessonWorkings = {};
