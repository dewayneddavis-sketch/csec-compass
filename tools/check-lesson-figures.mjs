#!/usr/bin/env node
// Harness: lesson figures (the optional `figures` array on a lesson).
//
// The contract is written up in content/LESSON-FIGURES-FORMAT.md and implemented once in
// src/data/lessonFigures.js. This harness guards, across EVERY subject:
//   1. every `figures` array in content/<subject>/modules.json is well formed — allowed
//      keys only, required keys present, truthful alt text, and a src that names its own
//      subject's figures directory,
//   2. every src resolves to a real file in BOTH trees (content/ and the served
//      public/content/ mirror), and those two files are byte-identical,
//   3. nothing under a figures/ directory is orphaned — a file no lesson references is a
//      figure nobody can ever see (the same "content exists but is invisible" bug class
//      the catalog and mock-paper harnesses guard),
//   4. the renderer wiring: normalizeModules() CARRIES the figures key (drop it and every
//      figure in the platform silently disappears), LessonView renders each figure as a
//      <figure>/<figcaption> with real alt text, and the figure block sits AFTER the
//      purchase-gate return so figures stay inside the gated lesson,
//   5. red/green control: the validator rejects each specific defect (proved on synthetic
//      input), and asFigures() drops what it cannot render.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { asFigures, figureProblems, FIGURE_ALLOWED_KEYS, FIGURE_REQUIRED_KEYS } from "../src/data/lessonFigures.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const hash = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => ok(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
const section = (t) => console.log(`\n== ${t}`);
const filesApi = { exists, read };

// ---------------------------------------------------------------- the real tree
section("1. every subject's modules.json: figures well formed");
const contentDir = path.join(root, "content");
const subjects = fs.readdirSync(contentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(contentDir, d.name, "modules.json")))
  .map((d) => d.name)
  .sort();
ok(subjects.length > 0, "at least one subject with modules.json");

let lessonsSeen = 0;
const declaredSrcs = [];
for (const id of subjects) {
  const mods = JSON.parse(read(`content/${id}/modules.json`));
  ok(Array.isArray(mods), `${id}: modules.json is an array`);
  for (const m of mods) {
    for (const l of (m.lessons || [])) {
      lessonsSeen++;
      const problems = figureProblems(l.figures, id, filesApi);
      ok(problems.length === 0, `${id}/${l.id}: ${problems.join("; ")}`);
      if (Array.isArray(l.figures)) {
        for (const f of l.figures) if (typeof f?.src === "string") declaredSrcs.push(f.src);
      }
    }
  }
}
console.log(`  • ${subjects.length} subjects, ${lessonsSeen} lessons scanned`);
console.log(`  • ${declaredSrcs.length} figure(s) declared in total${
  declaredSrcs.length ? "" : " — the capability is live and no lesson ships a picture yet"}`);

section("2. every declared src has a real file in both trees, byte-identical");
for (const src of declaredSrcs) {
  const rel = src.replace(/^\/content\//, "");
  const author = `content/${rel}`;
  const served = `public/content/${rel}`;
  ok(exists(author), `missing author copy content/${rel}`);
  ok(exists(served), `missing served copy public/content/${rel}`);
  if (exists(author) && exists(served)) eq(hash(author), hash(served), `${src}: author copy == served copy`);
}

section("3. content ↔ public mirrors stay byte-identical (every subject)");
let mirrored = 0;
for (const id of subjects) {
  const pair = [`content/${id}/modules.json`, `public/content/${id}/modules.json`];
  if (exists(pair[1])) { eq(hash(pair[0]), hash(pair[1]), `${id}/modules.json mirrored`); mirrored++; }
  else ok(false, `${id}/modules.json has no public mirror`);
}
console.log(`  • ${mirrored} modules.json pairs checked byte for byte`);
// The spec file itself lives in content/ AND public/content/, like the other content
// format doc — check-subject-catalog compares the two trees' file SETS, so a doc that
// only exists in one of them fails the suite. Guard it here too, where it belongs.
const SPEC = "LESSON-FIGURES-FORMAT.md";
if (exists(`content/${SPEC}`) && exists(`public/content/${SPEC}`)) {
  eq(hash(`content/${SPEC}`), hash(`public/content/${SPEC}`), `${SPEC} mirrored byte for byte`);
} else {
  ok(false, `${SPEC} must exist in both content/ and public/content/`);
}

section("4. no orphaned figure files (a figure nobody can ever see)");
const unreferenced = (declared, onDisk) => onDisk.filter((f) => !declared.includes(f));
const missing = (declared, onDisk) => declared.filter((f) => !onDisk.includes(f));
const diskFigures = [];
for (const id of subjects) {
  const dir = path.join(root, "public", "content", id, "figures");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(".")) continue;
    diskFigures.push(`/content/${id}/figures/${f}`);
  }
}
eq(unreferenced(declaredSrcs, diskFigures).length, 0,
  `figure files present but referenced by no lesson: ${unreferenced(declaredSrcs, diskFigures).join(", ")}`);
eq(missing(declaredSrcs, diskFigures).length, 0,
  `declared figures missing from the served tree: ${missing(declaredSrcs, diskFigures).join(", ")}`);
console.log(`  • ${diskFigures.length} figure file(s) on disk under public/content/*/figures/`);

section("5. renderer wiring (a dropped key = every figure silently disappears)");
const loader = read("src/data/contentLoader.js");
const view = read("src/pages/LessonView.jsx");
const css = read("src/pages/LessonView.css");
const contract = read("src/data/lessonFigures.js");
ok(loader.includes("figures: asFigures(l.figures)"), "normalizeModules() carries the figures key");
ok(loader.includes('from "./lessonFigures"'), "contentLoader uses the shared contract module");
ok(view.includes("lesson.figures?.length > 0"), "LessonView renders lesson.figures");
ok(view.includes('<figure className="lv-figure"'), "each figure is a <figure>");
ok(view.includes("<figcaption"), "each figure has a <figcaption>");
ok(/<img[^>]*\salt=\{fig\.alt\}/.test(view), "the <img> carries the figure's alt text");
ok(/<img[^>]*\sloading="lazy"/.test(view), "the <img> lazy-loads");
ok(!/dangerouslySetInnerHTML/.test(view), "figures are not injected as raw HTML");
ok(contract.includes("export function asFigures("), "the contract module exports the normaliser");
ok(contract.includes("export function figureProblems("), "the contract module exports the validator");
ok(FIGURE_ALLOWED_KEYS.join(",") === "src,alt,caption", "allowed keys are src,alt,caption");
ok(FIGURE_REQUIRED_KEYS.join(",") === "src,alt", "required keys are src,alt");
ok(css.includes(".lv-figure-img"), "LessonView.css styles the figure image");
ok(/\.lv-figure-img\{[^}]*max-width:100%/.test(css), "the figure image never exceeds the lesson column");
ok(/\.lv-figure-img\{[^}]*height:auto/.test(css), "the figure image keeps its aspect ratio");

// Figures must live INSIDE the gated lesson: the block has to come after the
// paywall return, not before it, or a locked lesson would leak its figures.
const gateAt = view.indexOf("This lesson requires full access");
const blockAt = view.indexOf("lv-figures");
ok(gateAt > -1 && blockAt > gateAt, "the figure block sits after the purchase-gate return");

section("6. red/green control — the validator must reject broken figures");
const good = {
  src: "/content/chemistry/figures/periodic-table-trends.svg",
  alt: "Periodic table with the first 20 elements labelled by group.",
  caption: "Radii shrink across a period.",
};
eq(figureProblems([good], "chemistry", null).length, 0, "control: a well-formed figure passes");
const bads = [
  ["missing alt", [{ src: good.src }], "chemistry"],
  ["empty alt", [{ src: good.src, alt: "   " }], "chemistry"],
  ["placeholder alt", [{ src: good.src, alt: "diagram" }], "chemistry"],
  ["typo key altt", [{ src: good.src, altt: good.alt }], "chemistry"],
  ["unknown extra key", [{ ...good, caption2: "x" }], "chemistry"],
  ["wrong subject directory", [{ src: "/content/biology/figures/cell.svg", alt: good.alt }], "chemistry"],
  ["raster extension", [{ src: "/content/chemistry/figures/table.png", alt: good.alt }], "chemistry"],
  ["remote URL", [{ src: "https://example.com/table.svg", alt: good.alt }], "chemistry"],
  ["path escape", [{ src: "/content/chemistry/figures/../../secret.svg", alt: good.alt }], "chemistry"],
  ["src with a query string", [{ src: "/content/chemistry/figures/t.svg?v=2", alt: good.alt }], "chemistry"],
  ["not an array", { src: good.src, alt: good.alt }, "chemistry"],
  ["empty array", [], "chemistry"],
];
for (const [label, figs, subj] of bads) {
  ok(figureProblems(figs, subj, null).length > 0, `control: rejects ${label}`);
}
const fileApi = (content) => ({ exists: () => true, read: () => content });
ok(figureProblems([good], "chemistry", { exists: () => false, read: () => "" }).length > 0,
  "control: rejects a src with no file on disk");
ok(figureProblems([good], "chemistry", fileApi("<html></html>")).length > 0,
  "control: rejects a file that is not an SVG");
ok(figureProblems([good], "chemistry", fileApi("<svg><rect/></svg>")).length > 0,
  "control: rejects an SVG with no viewBox (it would distort when scaled)");
ok(figureProblems([good], "chemistry", fileApi('<svg viewBox="0 0 1 1"><script>x</script></svg>')).length > 0,
  "control: rejects an SVG carrying a script");
ok(figureProblems([good], "chemistry", fileApi('<svg viewBox="0 0 1 1"><image href="x.png"/></svg>')).length > 0,
  "control: rejects an SVG embedding a raster image");
ok(figureProblems([good], "chemistry", fileApi('<svg viewBox="0 0 1 1"><use href="https://cdn.example.com/a.svg"/></svg>')).length > 0,
  "control: rejects an SVG referencing an external URL");
eq(unreferenced(["/content/chemistry/figures/a.svg"],
  ["/content/chemistry/figures/a.svg", "/content/chemistry/figures/b.svg"]).length, 1,
  "control: orphan detection finds a file no lesson references");
eq(missing(["/content/chemistry/figures/gone.svg"], []).length, 1,
  "control: missing-file detection finds a declared figure with no file");

section("7. the normaliser the renderer uses drops what it cannot show");
eq(asFigures(undefined).length, 0, "asFigures(undefined) -> []");
eq(asFigures("nope").length, 0, "asFigures(a string) -> []");
eq(asFigures([{ src: "x" }]).length, 0, "asFigures drops a figure with no alt (never an alt-less image)");
eq(asFigures([{ alt: "Some description here" }]).length, 0, "asFigures drops a figure with no src");
eq(asFigures([null, 7, []]).length, 0, "asFigures drops non-object entries");
const norm = asFigures([{ src: "  /a.svg  ", alt: "  A description here  ", caption: "  ", extra: 1 }]);
eq(norm.length, 1, "asFigures keeps a usable figure");
eq(norm[0].src, "/a.svg", "asFigures trims src");
eq(norm[0].alt, "A description here", "asFigures trims alt");
ok(!("caption" in norm[0]), "asFigures omits an empty caption");
ok(!("extra" in norm[0]), "asFigures does not pass unknown keys through");
eq(asFigures([{ src: "/a.svg", alt: "A description here" }, { src: "/b.svg", alt: "Another description" }]).length, 2,
  "asFigures keeps every usable figure, in order");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
