// Lesson figures — the contract for the optional `figures` array on a lesson.
//
// A lesson in content/<subject>/modules.json may carry an optional `figures` array:
//
//   { "id": "…", "title": "…", "figures": [
//       { "src": "/content/chemistry/figures/periodic-table-trends.svg",
//         "alt": "Periodic table with electronegativity …",
//         "caption": "Electronegativity increases across a period…" } ] }
//
// Everything about that contract lives here, in ONE place:
//   • the allowed and required keys (so a typo like `altt` fails a harness instead of
//     quietly rendering an image with no alt text),
//   • the src shape (served path under /content/<subject>/figures/, original SVG only),
//   • asFigures() — the fail-safe normaliser the renderer uses,
//   • figureProblems() — the validator the harness uses.
//
// The spec is written out for content authors in content/LESSON-FIGURES-FORMAT.md.
//
// Why SVG only: figures must be ORIGINAL, data-drawn vector diagrams (the Jamaica-law
// all-original rule, and science accuracy — an AI-generated periodic table or electron
// shell is wrong in the details). A raster/photo asset is not accepted by this contract;
// if the owner ever licences a real image, that is a deliberate change to our constants.

/** Keys a figure object may carry — anything else is a mistake (e.g. `altt`, `caption2`). */
export const FIGURE_ALLOWED_KEYS = Object.freeze(["src", "alt", "caption"]);

/** Keys every figure object MUST carry. `caption` is optional. */
export const FIGURE_REQUIRED_KEYS = Object.freeze(["src", "alt"]);

/**
 * The served path shape: /content/<subject>/figures/<name>.svg
 * - must start at the site root (a served path, not a relative or remote URL),
 * - the subject segment must match the subject whose modules.json carries it,
 * - only [a-z0-9._-] in the file name: no spaces, no "..", no query string, no hash,
 * - `.svg` only (see the note above).
 */
export const FIGURE_SRC_RE = /^\/content\/([a-z0-9-]+)\/figures\/([a-z0-9][a-z0-9._-]*\.svg)$/;

/** Placeholder alt text that would be untrue or useless to a screen reader. */
const BAD_ALT = /^(image|img|picture|photo|figure|diagram|graph|chart|picture of|an image|alt|tbd|todo|n\/a|none|xxx?)$/i;

/**
 * The renderer's normaliser. Never throws, never invents fields: it keeps only figures
 * that are safe to show, trimmed, and drops anything malformed (so a broken content
 * entry can never render an image with no alt text — it just does not render).
 * Returns [] when there is nothing usable, which is the normal case today.
 */
export function asFigures(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const f of value) {
    if (!f || typeof f !== "object" || Array.isArray(f)) continue;
    const src = typeof f.src === "string" ? f.src.trim() : "";
    const alt = typeof f.alt === "string" ? f.alt.trim() : "";
    if (!src || !alt) continue;
    const fig = { src, alt };
    const caption = typeof f.caption === "string" ? f.caption.trim() : "";
    if (caption) fig.caption = caption;
    out.push(fig);
  }
  return out;
}

/**
 * Validate one lesson's `figures` value.
 *
 * @param figures        the raw value off the lesson (any type)
 * @param subjectId      the subject whose modules.json carries it
 * @param files          optional { exists(relPath), read(relPath) } for the on-disk
 *                       assertions; omit it to check shape only.
 * @returns {string[]}   a problem per defect, phrased for a harness failure message
 *                       ([] means the figures are well formed).
 */
export function figureProblems(figures, subjectId, files) {
  const problems = [];
  if (figures === undefined || figures === null) return problems; // absent = fine
  if (!Array.isArray(figures)) return [`figures must be an array, got ${typeof figures}`];
  if (figures.length === 0) return [`figures is an empty array — omit the key instead`];

  figures.forEach((f, i) => {
    const where = `figures[${i}]`;
    if (!f || typeof f !== "object" || Array.isArray(f)) {
      problems.push(`${where} is not an object`);
      return;
    }
    for (const k of Object.keys(f)) {
      if (!FIGURE_ALLOWED_KEYS.includes(k)) problems.push(`${where}.${k} is not an allowed key (allowed: ${FIGURE_ALLOWED_KEYS.join(", ")})`);
    }
    for (const k of FIGURE_REQUIRED_KEYS) {
      if (typeof f[k] !== "string" || !f[k].trim()) problems.push(`${where}.${k} is required and must be a non-empty string`);
    }
    if (typeof f.caption === "string" && !f.caption.trim()) problems.push(`${where}.caption is empty — omit the key instead`);

    if (typeof f.alt === "string") {
      const alt = f.alt.trim();
      if (alt && alt.length < 15) problems.push(`${where}.alt is too short to describe the figure (${alt.length} chars)`);
      if (BAD_ALT.test(alt)) problems.push(`${where}.alt is a placeholder, not a description ("${alt}")`);
    }

    if (typeof f.src !== "string") return;
    const src = f.src.trim();
    const m = FIGURE_SRC_RE.exec(src);
    if (!m) {
      problems.push(`${where}.src "${src}" is not /content/<subject>/figures/<name>.svg`);
      return;
    }
    if (subjectId && m[1] !== subjectId) {
      problems.push(`${where}.src belongs to subject "${m[1]}" but the lesson is in "${subjectId}"`);
    }
    if (src !== f.src) problems.push(`${where}.src has stray whitespace`);

    if (files) {
      const rel = `public${src}`; // served mirror: /content/x/... -> public/content/x/...
      if (!files.exists(rel)) {
        problems.push(`${where}.src "${src}" has no file at ${rel}`);
      } else {
        const text = files.read(rel);
        if (!text || !text.trim()) problems.push(`${where}.src "${src}" is empty`);
        else if (!/<svg[\s>]/i.test(text)) problems.push(`${where}.src "${src}" is not an SVG (no <svg> element)`);
        else {
          if (!/\bviewBox\s*=/i.test(text)) problems.push(`${where}.src "${src}" has no viewBox, so it cannot scale without distortion`);
          if (/<image[\s>]/i.test(text)) problems.push(`${where}.src "${src}" embeds a raster <image>`);
          if (/<script[\s>]/i.test(text)) problems.push(`${where}.src "${src}" contains a <script> — figures are static art`);
          if (/(href|src)\s*=\s*"(https?:)?\/\//i.test(text)) problems.push(`${where}.src "${src}" references an external URL`);
        }
      }
    }
  });
  return problems;
}
