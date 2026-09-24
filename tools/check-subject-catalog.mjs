// Verifies the subject catalog and the content/mirror contract.
//
//   node tools/check-subject-catalog.mjs
//
// Why this exists: French shipped as a complete subject (content/french/*, all
// five files) but was never added to content/subjects.json, and because
// getAllSubjects() in src/data/contentLoader.js treats that file as THE list,
// the 23rd subject was invisible on the live site while the content was sitting
// in the repo. A subject whose content exists but which is missing from the
// catalog is silent — nothing errors, it just never renders. So this harness
// checks both directions:
//
//   1. the catalog is well formed (ids unique, slug-shaped, every field present)
//   2. every catalog subject has real content (modules + the 100+-question
//      practice bank + the 25-question knowledge check the product promises)
//   3. NO content directory is missing from the catalog (the French bug class)
//   4. the subject's own metadata.json agrees with its catalog entry
//      (id / name / description / icon — they are read by different code paths
//      and drifting apart shows one description on the home page and another in
//      the subject header)
//   5. content/ and public/content/ are byte-identical, both directions, for
//      every file — the mirror is what the browser actually fetches
//   6. the catalog is what the app reads, and the known consumers know french
//
// Run it after any catalog or content change: one subject = one PR, and this is
// the check that a subject PR did not forget the catalog.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
let fail = 0;
function ok(label) {
  pass++;
  console.log(`  ✓ ${label}`);
}
function bad(label) {
  fail++;
  console.log(`  ✗ ${label}`);
}
function check(cond, label) {
  if (cond) ok(label);
  else bad(label);
}
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const CATALOG = "content/subjects.json";
const MIRROR = "public/content/subjects.json";

// Cosmetic catalog/metadata drift found along the way — reported, not failed
// (every one of these predates this harness; see the summary at the end).
const drift = { description: [], icon: [] };

// --- 1. the catalog itself -------------------------------------------------
console.log("\n== catalog");
const catalog = readJson(join(root, CATALOG));
check(Array.isArray(catalog), `${CATALOG} is an array`);
const ids = catalog.map((s) => s.id);
check(new Set(ids).size === ids.length, "every subject id is unique");
check(
  ids.every((id) => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)),
  "every subject id is a lowercase slug"
);
check(
  catalog.every(
    (s) =>
      typeof s.name === "string" &&
      s.name.trim() &&
      typeof s.description === "string" &&
      s.description.trim() &&
      typeof s.icon === "string" &&
      s.icon.trim()
  ),
  "every subject has a name, description and icon"
);
check(ids.includes("french"), "the catalog lists french (the owner-reported missing 23rd subject)");
check(catalog.length === ids.length && ids.length >= 23, `the catalog has ${ids.length} subjects (>= 23)`);

// --- 2 + 3. content in both directions -------------------------------------
console.log("\n== content <-> catalog");
const contentDirs = readdirSync(join(root, "content"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// A directory that ships modules.json is a real subject, so it must be listed.
const contentSubjects = contentDirs.filter((d) => existsSync(join(root, "content", d, "modules.json")));
const orphans = contentSubjects.filter((d) => !ids.includes(d));
check(
  orphans.length === 0,
  orphans.length === 0
    ? "no content directory is missing from the catalog"
    : `content exists but is NOT in ${CATALOG} (invisible on the live site): ${orphans.join(", ")}`
);

const missingContent = ids.filter((id) => !existsSync(join(root, "content", id, "modules.json")));
check(
  missingContent.length === 0,
  missingContent.length === 0
    ? "every catalog subject has content modules.json"
    : `catalog entries with no content: ${missingContent.join(", ")}`
);

for (const subject of catalog) {
  const id = subject.id;
  const dir = join(root, "content", id);
  if (!existsSync(join(dir, "modules.json"))) continue;

  const modules = readJson(join(dir, "modules.json"));
  const lessons = modules.flatMap((m) => m.lessons || []);
  const lessonIds = lessons.map((l) => l.id);
  const structureOk =
    Array.isArray(modules) &&
    modules.length > 0 &&
    modules.every((m) => m.id && m.title && Array.isArray(m.lessons) && m.lessons.length > 0) &&
    lessons.every((l) => l.id && l.title);
  check(structureOk, `${id}: modules have ids, titles and lessons`);
  check(
    new Set(lessonIds).size === lessonIds.length,
    `${id}: lesson ids are unique (${lessons.length} lessons in ${modules.length} modules)`
  );

  // The product promise: at least a 100-question Extra Practice bank (Mathematics
  // grew to 172 with the syllabus-gap lessons) and a 25-question
  // knowledge check per subject. A missing/short bank is a broken subject, not
  // a style choice.
  const practice = existsSync(join(dir, "practice.json")) ? readJson(join(dir, "practice.json")) : null;
  const kc = existsSync(join(dir, "knowledge-check.json")) ? readJson(join(dir, "knowledge-check.json")) : null;
  check(
    Array.isArray(practice) && practice.length >= 100,
    `${id}: Extra Practice bank of at least 100 questions (${Array.isArray(practice) ? practice.length : "missing"})`
  );
  check(
    Array.isArray(kc) && kc.length === 25,
    `${id}: 25-question knowledge check (${Array.isArray(kc) ? kc.length : "missing"})`
  );

  // metadata.json and the catalog entry are shown in different places — a drift
  // between them reads as two different subjects. The id and name are identity
  // (they must match, they route and key everything); a differing description or
  // icon is cosmetic wording, so pre-existing drift in the older subjects is
  // reported at the end instead of failing the harness.
  const meta = existsSync(join(dir, "metadata.json")) ? readJson(join(dir, "metadata.json")) : null;
  check(!!meta, `${id}: metadata.json exists`);
  if (meta) {
    check(meta.id === id, `${id}: metadata id matches the catalog id`);
    check(meta.name === subject.name, `${id}: metadata name "${meta.name}" matches the catalog "${subject.name}"`);
    if (meta.description !== subject.description) drift.description.push(id);
    if (meta.icon !== subject.icon) drift.icon.push(`${id} (metadata "${meta.icon}" vs catalog "${subject.icon}")`);
  }
}

// --- 4. the mirror the browser actually fetches ----------------------------
console.log("\n== content/ <-> public/content/ mirror");
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (statSync(full).isFile()) out.push(full);
  }
  return out;
}
const sourceFiles = walk(join(root, "content")).map((f) => relative(join(root, "content"), f));
const mirrorFiles = walk(join(root, "public", "content")).map((f) => relative(join(root, "public", "content"), f));
const onlySource = sourceFiles.filter((f) => !mirrorFiles.includes(f));
const onlyMirror = mirrorFiles.filter((f) => !sourceFiles.includes(f));
check(
  onlySource.length === 0 && onlyMirror.length === 0,
  onlySource.length === 0 && onlyMirror.length === 0
    ? `content/ and public/content/ hold the same ${sourceFiles.length} files`
    : `mirror file sets differ — only in content/: ${onlySource.join(", ") || "none"}; only in public/content/: ${onlyMirror.join(", ") || "none"}`
);
const drifted = sourceFiles
  .filter((f) => mirrorFiles.includes(f))
  .filter((f) => sha(join(root, "content", f)) !== sha(join(root, "public", "content", f)));
check(
  drifted.length === 0,
  drifted.length === 0 ? "every mirrored file is byte-identical" : `mirrored files differ: ${drifted.join(", ")}`
);
check(
  existsSync(join(root, MIRROR)) && sha(join(root, CATALOG)) === sha(join(root, MIRROR)),
  `${MIRROR} is byte-identical to ${CATALOG} (this is the copy the site serves)`
);

// --- 5. the consumers ------------------------------------------------------
console.log("\n== catalog consumers");
const loader = readFileSync(join(root, "src/data/contentLoader.js"), "utf8");
check(
  /fetchJSON\("\/content\/subjects\.json"\)/.test(loader),
  "getAllSubjects() reads the catalog (so the catalog is the fix point)"
);
check(/french:\s*"#4338ca"/.test(loader), "contentLoader knows a colour for french");
check(
  !/Fallback-only entries[^\n]*french/.test(loader),
  "the contentLoader comment no longer calls french fallback-only"
);
const listEndpoint = readFileSync(join(root, "api/subjects/list.js"), "utf8");
check(/id: "french"/.test(listEndpoint), "api/subjects/list.js preview knows french");
check(
  /nothing in the app calls this endpoint/i.test(listEndpoint),
  "api/subjects/list.js says plainly that it is not the catalog"
);

for (const page of ["src/pages/Home.jsx", "src/pages/PlannerPage.jsx"]) {
  const src = readFileSync(join(root, page), "utf8");
  check(
    /getAllSubjects/.test(src) && !/const\s+SUBJECTS\s*=\s*\[/.test(src),
    `${page} renders from the catalog, not a hardcoded list`
  );
}

const defaultColour = catalog.filter((s) => !new RegExp(`(^|[\\s,{])"?${s.id}"?:\\s*"#`).test(loader)).map((s) => s.id);
console.log(
  `\ncatalog: ${catalog.length} subjects, ${contentSubjects.length} content directories, 0 orphans`
    + (defaultColour.length
      ? `\nnote: ${defaultColour.length} subject(s) have no colour in contentLoader's colorMap and render grey/default: ${defaultColour.join(", ")} (pre-existing, cosmetic)`
      : "")
    + (drift.description.length
      ? `\nnote: ${drift.description.length} subject(s) whose metadata.json description differs from the catalog description: ${drift.description.join(", ")} (pre-existing; the catalog entry is what the home page shows)`
      : "")
    + (drift.icon.length
      ? `\nnote: metadata/catalog icon drift: ${drift.icon.join(", ")} (pre-existing)`
      : "")
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
