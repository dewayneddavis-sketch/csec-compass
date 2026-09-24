// How many lessons of a subject are usable without a purchase. SubjectPage
// derives its lesson gate and its "viewing N of M" banner from this, LessonView
// derives its deep-link guard, and the Compass Guide quotes it — one number, so
// the guide can never advertise a bigger free preview than the app allows.
export const FREE_PREVIEW_LESSONS = 2;

// The fail-closed access predicate, as a pure function.
//
// Extracted from usePurchases() (which cannot be imported outside React) so
// tools/check-subject-pricing.mjs can drive the REAL predicate over the REAL
// /api/purchases/list response after a real checkout+webhook chain — instead of
// asserting on a copy of the rule that could drift from the one the app uses.
//
// Access is only ever granted by a verified server answer:
//   - signed out                -> no access
//   - still loading             -> no access
//   - /api/purchases/list error -> no access (a failed call grants nothing)
//   - bundle or school license  -> every subject
//   - a per-subject purchase    -> exactly that subject id
export function hasSubjectAccess(state, subjectId) {
  const { user, loading, error, hasBundle, hasSchoolLicense, purchasedSubjects } = state || {};
  if (!user) return false;
  if (loading) return false;
  if (error) return false;
  if (!subjectId) return false;
  if (hasBundle || hasSchoolLicense) return true;
  return Array.isArray(purchasedSubjects) && purchasedSubjects.includes(subjectId);
}
