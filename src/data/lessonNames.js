// Lesson-name resolution for the teacher dashboard.
//
// The platform records lab activity keyed by ids only — (subject_id, lesson_id,
// experiment_type) — because that is what the lesson page knows. A teacher
// cannot read "math-l1-1", so the dashboard resolves those ids against the same
// content tree the students work through and shows
// Subject -> Module -> Lesson name instead.
//
// Everything here is pure and fail-soft: if the content fetch fails, the caller
// still gets the raw lesson id (never an empty label, never a thrown error) —
// the teacher dashboard must keep showing data even when the catalog is
// unreachable.

/** @returns {{ subjects: Map<string,string>, lessons: Map<string,object> }} */
export function createLessonNameIndex() {
  return { subjects: new Map(), lessons: new Map() };
}

export function lessonIndexKey(subjectId, lessonId) {
  return `${subjectId == null ? "" : String(subjectId)}|${lessonId == null ? "" : String(lessonId)}`;
}

function isIndex(index) {
  return !!index && typeof index.lessons?.get === "function" && typeof index.subjects?.get === "function";
}

/** Human subject name for an id, or null when the catalog didn't provide one. */
export function subjectName(subjectId, index) {
  if (!isIndex(index) || subjectId == null) return null;
  const name = index.subjects.get(String(subjectId));
  return name || null;
}

/**
 * Resolve one lab row to names. Unknown ids degrade field-by-field, so a lesson
 * that was renamed or removed still shows its subject and raw id.
 */
export function resolveLabLesson(subjectId, lessonId, index) {
  const hit = isIndex(index) ? index.lessons.get(lessonIndexKey(subjectId, lessonId)) : null;
  const subjectIdStr = subjectId == null ? null : String(subjectId);
  const lessonIdStr = lessonId == null ? null : String(lessonId);
  if (hit) {
    return {
      known: true,
      subjectId: subjectIdStr,
      subjectName: hit.subjectName || subjectName(subjectIdStr, index),
      moduleId: hit.moduleId || null,
      moduleTitle: hit.moduleTitle || null,
      lessonId: lessonIdStr,
      lessonTitle: hit.lessonTitle || null,
    };
  }
  return {
    known: false,
    subjectId: subjectIdStr,
    subjectName: subjectName(subjectIdStr, index),
    moduleId: null,
    moduleTitle: null,
    lessonId: lessonIdStr,
    lessonTitle: null,
  };
}

/**
 * "Subject · Module · Lesson name" for a lab row. Falls back to whatever parts
 * are known and finally to the raw lesson id — never blank.
 */
export function labLessonPath(subjectId, lessonId, index) {
  const r = resolveLabLesson(subjectId, lessonId, index);
  const parts = [r.subjectName, r.moduleTitle, r.lessonTitle].filter(Boolean);
  // An id we could not resolve (renamed or removed lesson, or the catalog was
  // unreachable) still shows its raw id so the row stays traceable.
  if (!r.known && r.lessonId) parts.push(r.lessonId);
  if (parts.length) return parts.join(" · ");
  return r.lessonId || r.subjectId || "unknown lesson";
}

/** Short lesson name for tight layouts, falling back to the raw id. */
export function labLessonName(subjectId, lessonId, index) {
  const r = resolveLabLesson(subjectId, lessonId, index);
  return r.lessonTitle || r.lessonId || "unknown lesson";
}

/** Friendly experiment name ("Flashcard Trainer") instead of the raw slug. */
export function experimentLabel(experimentType, typeMap) {
  if (!experimentType) return null;
  const entry = typeMap && typeMap[experimentType];
  if (entry && entry.title) return entry.title;
  return String(experimentType);
}

/**
 * Fetch the catalog + each subject's modules and build the index.
 * Never throws: a failed request just leaves those names unresolved.
 */
export async function loadLessonNameIndex(subjectIds, options = {}) {
  const index = createLessonNameIndex();
  const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
  const ids = [...new Set((subjectIds || []).filter((id) => id != null && id !== "").map(String))];
  if (!fetchImpl || ids.length === 0) return index;

  try {
    const res = await fetchImpl("/content/subjects.json");
    if (res && res.ok) {
      const catalog = await res.json();
      for (const subject of Array.isArray(catalog) ? catalog : []) {
        if (subject && subject.id) index.subjects.set(String(subject.id), subject.name || null);
      }
    }
  } catch {
    /* names stay unresolved — the caller falls back to ids */
  }

  await Promise.all(
    ids.map(async (subjectId) => {
      try {
        const res = await fetchImpl(`/content/${subjectId}/modules.json`);
        if (!res || !res.ok) return;
        const modules = await res.json();
        for (const mod of Array.isArray(modules) ? modules : []) {
          if (!mod) continue;
          for (const lesson of Array.isArray(mod.lessons) ? mod.lessons : []) {
            if (!lesson || lesson.id == null) continue;
            index.lessons.set(lessonIndexKey(subjectId, lesson.id), {
              subjectId,
              subjectName: index.subjects.get(subjectId) || null,
              moduleId: mod.id == null ? null : String(mod.id),
              moduleTitle: mod.title || null,
              lessonId: String(lesson.id),
              lessonTitle: lesson.title || null,
            });
          }
        }
      } catch {
        /* this subject's lessons stay unresolved */
      }
    })
  );

  return index;
}
