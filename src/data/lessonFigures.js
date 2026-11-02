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
          if (/<script[\s>]/i.test(text)) problems.push(`${where}.src "${src}" contains a <script> — figures may animate declaratively (SMIL), never with scripting`);
          if (/(href|src)\s*=\s*"(https?:)?\/\//i.test(text)) problems.push(`${where}.src "${src}" references an external URL`);
        }
      }
    }
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Animated figures (owner directive 2026-10-23)
//
// Animated figures are still SVG and still static art in every other sense: the
// animation is DECLARATIVE (SMIL) inside the file, because a browser runs
// declarative animation inside the <img> the lesson renders but runs no scripting
// there. <script> stays banned above, so animation is the only way a figure moves.
//
// The rules an animated figure has to keep, all checked from the shipped file:
//   • it still passes figureProblems() — same schema, same all-original SVG;
//   • it carries at least as many animation elements as its row in the harness
//     table says, of the kinds that row names;
//   • every animation element names what it animates (attributeName, or type for
//     animateTransform), lasts a positive duration, and has repeatCount="indefinite"
//     (a figure that plays once and freezes looks broken in a lesson);
//   • at least one values list holds two DIFFERENT numbers — "values='0 0;0 0'"
//     is animation markup that never moves anything;
//   • every animation element sits inside an element that CARRIES AN ID: the
//     movable part is named, which is what makes the animation checkable at all
//     (an animation directly inside <svg>, or inside an id-less <g>, is orphaned);
//   • it is wired into the lesson its row names, and that lesson's figures array
//     is still well formed.
// ---------------------------------------------------------------------------

/** An attribute off a start tag's raw attribute text, or null. */
function attrOf(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs || "");
  return m ? (m[2] !== undefined ? m[2] : m[3]) : null;
}

/** A duration attribute in seconds, or null when it does not parse. */
export function durationSeconds(value) {
  const m = /^\s*([0-9]*\.?[0-9]+)\s*(h|min|s|ms)?\s*$/.exec(typeof value === "string" ? value : "");
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[3] || "s";
  return unit === "ms" ? n / 1000 : unit === "min" ? n * 60 : unit === "h" ? n * 3600 : n;
}

/** The distinct numbers inside a SMIL values list ("0 0;165 0" -> 3). */
export function distinctNumbers(values) {
  if (typeof values !== "string" || !values.trim()) return 0;
  const nums = values.match(/-?[0-9]*\.?[0-9]+/g) || [];
  return new Set(nums.map((n) => Number(n))).size;
}

/**
 * Read the declarative animation out of an SVG file's text.
 *
 * A tiny tag scanner, not a regex over the whole document: it keeps a stack so
 * each animation element knows the element it sits inside, which is what the
 * "the movable part is named" rule depends on.
 *
 * @param {string} text  the SVG file's text
 * @returns {{count:number, kinds:string[], durations:string[], valuesLists:string[],
 *            parentsWithId:boolean[], animations:Array<object>}}
 */
export function animationEvidence(text) {
  const src = typeof text === "string" ? text : "";
  const animations = [];
  const stack = [];
  const tag = /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tag.exec(src))) {
    if (m[1]) { stack.pop(); continue; }
    const name = m[2].toLowerCase();
    const attrs = m[3] || "";
    if (name === "animate" || name === "animatetransform" || name === "animatemotion" || name === "set") {
      const parent = stack[stack.length - 1];
      const isTransform = name === "animatetransform";
      const attributeName = attrOf(attrs, "attributeName");
      const type = attrOf(attrs, "type");
      animations.push({
        kind: isTransform ? "animateTransform" : name,
        attributeName,
        type,
        key: isTransform ? `animateTransform:${type || ""}` : `${name}:${attributeName || ""}`,
        values: attrOf(attrs, "values"),
        dur: attrOf(attrs, "dur"),
        repeatCount: attrOf(attrs, "repeatCount"),
        parentTag: parent ? parent.name : null,
        parentId: parent ? parent.id : null,
        orphaned: !parent || parent.name === "svg" || !parent.id,
      });
    }
    if (!m[4]) stack.push({ name, id: attrOf(attrs, "id") });
  }
  return {
    count: animations.length,
    kinds: animations.map((a) => a.key),
    durations: animations.map((a) => a.dur),
    valuesLists: animations.map((a) => a.values),
    parentsWithId: animations.map((a) => Boolean(a.parentId) && !a.orphaned),
    animations,
  };
}

/**
 * Validate the animated figures named by a harness table.
 *
 * @param {Array} entries  one row per simulation:
 *        {name, subject, src, lesson, min, need[], dur, modules}
 *        where `modules` is that subject's parsed modules.json (the wiring check)
 *        and `need` is the list of animation keys (see animationEvidence) the row
 *        requires.
 * @param files  {exists(relPath), read(relPath), sha256(relPath)} over the repo
 * @returns {string[]} a problem per defect ([] means the animated figures are sound)
 */
export function animationProblems(entries, files) {
  const problems = [];
  if (!Array.isArray(entries)) return ["the animation table must be an array of rows"];
  for (const e of entries) {
    if (!e || typeof e !== "object") { problems.push("an animation table row is not an object"); continue; }
    const where = e.name || e.src || "a simulation";
    if (typeof e.src !== "string" || !FIGURE_SRC_RE.test(e.src)) {
      problems.push(`${where}: src "${e.src}" is not /content/<subject>/figures/<name>.svg`);
      continue;
    }
    const rel = e.src.replace(/^\/content\//, "");
    const author = `content/${rel}`;
    const served = `public/content/${rel}`;
    for (const p of [author, served]) if (!files.exists(p)) problems.push(`${where}: no file at ${p}`);
    if (!files.exists(served)) continue;
    const text = files.read(served) || "";
    if (!text.trim() || !/<svg[\s>]/i.test(text)) { problems.push(`${where}: ${served} is not an SVG`); continue; }
    if (files.exists(author) && files.sha256(author) !== files.sha256(served)) {
      problems.push(`${where}: the two trees differ — ${author} and ${served} must be byte-identical`);
    }

    const ev = animationEvidence(text);
    if (ev.count < (e.min ?? 1)) {
      problems.push(`${where}: ${ev.count} animation element(s), expected at least ${e.min ?? 1} — a figure with no live animation is a static picture`);
    }
    if (ev.count === 0) continue;

    for (const a of ev.animations) {
      const what = `<${a.kind}${a.type ? ` type="${a.type}"` : ""}${a.attributeName ? ` attributeName="${a.attributeName}"` : ""}>`;
      if (a.kind !== "animateTransform" && !a.attributeName) {
        problems.push(`${where}: ${what} names no attribute to animate`);
      }
      if (a.kind === "animateTransform" && !a.type) {
        problems.push(`${where}: ${what} names no transform type`);
      }
      const secs = durationSeconds(a.dur);
      if (secs === null || !(secs > 0)) problems.push(`${where}: ${what} has dur="${a.dur}" — a duration must be positive`);
      if (a.repeatCount !== "indefinite") {
        problems.push(`${where}: ${what} has repeatCount="${a.repeatCount}" — an animation must loop indefinitely`);
      }
      if (a.orphaned) {
        problems.push(`${where}: ${what} sits in <${a.parentTag || "nothing"}> which carries no id — the movable part must be named`);
      }
    }

    if (!ev.animations.some((a) => distinctNumbers(a.values) >= 2)) {
      problems.push(`${where}: no animation's values list holds two different numbers — the markup animates but nothing moves`);
    }

    for (const k of (e.need || [])) {
      if (!ev.kinds.includes(k)) {
        problems.push(`${where}: no ${k} animation — found ${ev.kinds.join(", ") || "none"}`);
      }
    }
    if (e.dur !== undefined) {
      for (const a of ev.animations) {
        const secs = durationSeconds(a.dur);
        if (secs !== null && Math.abs(secs - e.dur) > 1e-9) {
          problems.push(`${where}: an animation lasts ${secs}s, expected ${e.dur}s (the value the lesson's own arithmetic gives)`);
        }
      }
    }

    // wiring: the sim must be on the lesson the table names, and that lesson's
    // figures array must still be well formed.
    if (Array.isArray(e.modules)) {
      const lessons = e.modules.flatMap((mod) => (mod && Array.isArray(mod.lessons) ? mod.lessons : []));
      const named = lessons.find((l) => l && l.id === e.lesson);
      if (!named) {
        problems.push(`${where}: lesson "${e.lesson}" does not exist, so the simulation is wired to nothing`);
      } else {
        const srcs = Array.isArray(named.figures) ? named.figures.map((f) => f && f.src) : [];
        if (!srcs.includes(e.src)) {
          problems.push(`${where}: lesson "${e.lesson}" does not list ${e.src} in its figures — the simulation is shipped but wired nowhere`);
        }
        const fp = figureProblems(named.figures, e.subject, files);
        if (fp.length) problems.push(`${where}: lesson "${e.lesson}" figures: ${fp.join("; ")}`);
      }
    }
  }
  return problems;
}
