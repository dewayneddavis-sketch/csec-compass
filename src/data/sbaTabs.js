// Per-subject labelling for the exam-support tab that ships as "CSEC SBA".
//
// Three families:
//  - "sba"  the CSEC School-Based Assessment portfolio            -> "CSEC SBA"
//  - "oral" French/Spanish Paper 03, which IS the oral examination -> "Oral Exam / Paper 03"
//  - C&G    City & Guilds subjects have NO SBA portfolio at all. Their two labels
//           differ from each other (Math: a written assessment; English: its third
//           component is spoken), so they are a per-subject OVERRIDE rather than a
//           third boolean — a third boolean could not tell the two apart.
//
// Every label the tab, the banner, the section heading and the sample table show
// comes from this module, so no component can drift back to a hardcoded "CSEC SBA".
// The C&G copy asserts no assessment mechanics: it names what we teach and what our
// own worked sample shows, never a paper number, mark weight, grade or pass mark
// (owner decision 2026-09-29).

/** Per-subject overrides, keyed by subject id (see CITY_GUILDS_SUBJECTS). */
const OVERRIDES = {
  "city-guilds-mathematics": {
    tab: "Assessment Guide",
    guide: "Assessment Guide",
    noun: "assessment guide",
    heading: "City & Guilds Mathematics — Assessment Guide",
    comingSoon: "A step-by-step assessment guide for this subject is being prepared.",
    sampleHeading: "How this sample earns its marks, part by part",
    sampleColumn: "What the marker looks for",
  },
  "city-guilds-english": {
    tab: "Speaking & Listening Guide",
    guide: "Speaking & Listening Guide",
    noun: "Speaking & Listening guide",
    heading: "City & Guilds English — Speaking, Listening & Communicating",
    comingSoon: "A step-by-step Speaking & Listening guide for this subject is being prepared.",
    sampleHeading: "How this sample earns its marks, part by part",
    sampleColumn: "What the marker looks for",
  },
};

/** Subjects whose exam-support tab is the oral exam, not an SBA portfolio. */
export const ORAL_EXAM_SUBJECTS = ["french", "spanish"];
/** Subjects with no SBA portfolio and no CSEC paper numbering — City & Guilds. */
export const CITY_GUILDS_SUBJECTS = ["city-guilds-mathematics", "city-guilds-english"];

export const SBA_TAB_LABEL = "CSEC SBA";
export const ORAL_EXAM_TAB_LABEL = "Oral Exam / Paper 03";

/** The panel's own <h3>, per family. */
export const SBA_SECTION_HEADING = "CSEC School-Based Assessment";
export const ORAL_SECTION_HEADING = "CSEC Paper 03 — Oral Examination";

/** The "guide is being prepared" sentence, per family. */
export const SBA_COMING_SOON = "A step-by-step School-Based Assessment guide for this subject is being prepared.";
export const ORAL_COMING_SOON = "A step-by-step guide to the Paper 03 oral examination for this subject is being prepared.";

/** The worked-sample table's own words, per family. */
export const SBA_SAMPLE_HEADING = "How this sample earns each SBA category";
export const ORAL_SAMPLE_HEADING = "How this dossier was marked, part by part";
export const SBA_SAMPLE_COLUMN = "What the examiner sees";
export const ORAL_SAMPLE_COLUMN = "What the examiner hears";

function norm(subjectId) {
  return typeof subjectId === "string" ? subjectId.trim().toLowerCase() : "";
}

function overrideFor(subjectId) {
  return OVERRIDES[norm(subjectId)] || null;
}

export function isOralExamSubject(subjectId) {
  return ORAL_EXAM_SUBJECTS.includes(norm(subjectId));
}

export function isCityGuildsSubject(subjectId) {
  return CITY_GUILDS_SUBJECTS.includes(norm(subjectId));
}

/** Tab label for the exam-support tab. */
export function sbaTabLabel(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.tab;
  return isOralExamSubject(subjectId) ? ORAL_EXAM_TAB_LABEL : SBA_TAB_LABEL;
}

/** Long form used in headings/banners: "SBA Guide" / "Oral Exam Guide" / "Assessment Guide". */
export function sbaGuideLabel(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.guide;
  return isOralExamSubject(subjectId) ? "Oral Exam Guide" : "SBA Guide";
}

/** Short form used inside sentences: "SBA" / "Oral Exam" / "assessment guide". */
export function sbaTabNoun(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.noun;
  return isOralExamSubject(subjectId) ? "Oral Exam" : "SBA";
}

/** The panel's <h3>: every family's heading lives in ONE place. */
export function sbaSectionHeading(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.heading;
  return isOralExamSubject(subjectId) ? ORAL_SECTION_HEADING : SBA_SECTION_HEADING;
}

/** The "guide is being prepared" sentence. */
export function sbaComingSoonCopy(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.comingSoon;
  return isOralExamSubject(subjectId) ? ORAL_COMING_SOON : SBA_COMING_SOON;
}

/** The worked-sample table's <h5>. */
export function sbaSampleHeading(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.sampleHeading;
  return isOralExamSubject(subjectId) ? ORAL_SAMPLE_HEADING : SBA_SAMPLE_HEADING;
}

/** The worked-sample table's fourth column header. */
export function sbaSampleColumnLabel(subjectId) {
  const o = overrideFor(subjectId);
  if (o) return o.sampleColumn;
  return isOralExamSubject(subjectId) ? ORAL_SAMPLE_COLUMN : SBA_SAMPLE_COLUMN;
}
