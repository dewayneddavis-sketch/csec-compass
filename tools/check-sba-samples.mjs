#!/usr/bin/env node
// Harness: the completed (copy-paste-protected) sample SBA per subject.
//
// Owner request 2026-09-26, addition 1: students must be able to SEE a finished SBA,
// not just the scoring breakdown. This harness guards, for every subject that ships one:
//   * the campaign tracker (docs/sba-sample-campaign.md) tells the truth about which
//     subjects are done, and lists every catalog subject exactly once,
//   * the completedSample block is structurally complete -- and its category list mirrors
//     the subject's own Task Breakdown, which is the whole point of the visual guide,
//   * every data table is rectangular and every page has real prose,
//   * the renderer really does protect the sample (user-select none + copy/cut/context
//     menu/drag handlers off + a view-only note) and still renders "Completed Sample {noun}",
//   * the sample is original work (no CXC exemplar claim), and
//   * content/ and public/content/ stay byte-identical.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const raw = readJson("content/subjects.json");
const catalog = (Array.isArray(raw) ? raw : raw.subjects || []).map((s) => s.id).filter(Boolean);

// ---------------------------------------------------------------- tracker
section("1. the campaign tracker lists every subject and tells the truth");
const trackerPath = "docs/sba-sample-campaign.md";
ok(exists(trackerPath), `${trackerPath} exists`);
const tracker = read(trackerPath);
const rows = tracker.split("\n")
    .filter((l) => l.trim().startsWith("|") && !/^\|\s*-+/.test(l.trim()) && !/subject/i.test(l.split("|")[1] || ""))
    .map((l) => l.split("|").map((c) => c.trim()).filter((c) => c.length > 0));
const tracked = new Map();
for (const r of rows) {
    if (r.length < 5) continue;
    if (!/^(DONE|TODO)/i.test(r[r.length - 1])) continue;   // skip the header row
    tracked.set(r[1], r[r.length - 1].toUpperCase());
}
for (const id of catalog) ok(tracked.has(id), `tracker lists ${id}`);
const dataRows = rows.filter((r) => r.length >= 5 && /^(DONE|TODO)/i.test(r[r.length - 1]));
ok(tracked.size === dataRows.length, "tracker has no duplicate subject rows");
ok(new Set([...catalog]).size >= 23, `catalog still lists 23 subjects (got ${new Set(catalog).size})`);

const hasSample = (id) => {
    try { return !!readJson(`content/${id}/sba.json`).completedSample; } catch { return false; }
};
for (const [id, status] of tracked) {
    const done = status.startsWith("DONE");
    ok(done === hasSample(id),
        `${id}: tracker says ${status} and completedSample is ${hasSample(id) ? "present" : "absent"}`);
}

// ------------------------------------------------------- subject samples
const shipped = [...tracked.keys()].filter((id) => hasSample(id));
section(`2. every shipped sample is complete and mirrors its own Task Breakdown (${shipped.length} shipped)`);
for (const id of shipped) {
    const guide = readJson(`content/${id}/sba.json`);
    const c = guide.completedSample;
    const at = `${id}.completedSample`;
    ok(typeof c.title === "string" && c.title.length > 25, `${at}: has a descriptive title`);
    ok(/view|only|original/i.test(c.viewOnlyNote || ""), `${at}: carries a view-only note`);
    ok(/not a real candidate|invented|original/i.test(c.viewOnlyNote || ""),
        `${at}: the note says the sample is original, not a real candidate's work`);
    const blob = JSON.stringify(c);
    ok(!/exemplar/i.test(blob) || /not a (real )?(CXC )?exemplar|no CXC exemplar/i.test(blob),
        `${at}: never claims to be a CXC exemplar`);
    ok(Array.isArray(c.profile) && c.profile.length >= 3, `${at}: candidate/centre profile present`);
    ok((c.profile || []).every((p) => p.label && p.value), `${at}: every profile row has a label and a value`);

    const tasks = (guide.tasks || []).map((t) => t.section);
    const cats = c.categories || [];
    ok(cats.length >= 3, `${at}: at least 3 categories (got ${cats.length})`);
    if (tasks.length > 0) {
        ok(cats.length === tasks.length,
            `${at}: one category row per Task Breakdown entry (${cats.length} vs ${tasks.length})`);
        for (const t of tasks) ok(cats.some((x) => x.section === t), `${at}: category row for "${t}"`);
    }
    for (const cat of cats) {
        const max = parseInt(cat.marks, 10);
        const got = parseInt(cat.awarded, 10);
        ok(Number.isFinite(max) && Number.isFinite(got) && got <= max && got > 0,
            `${at}: "${cat.section}" awards ${cat.awarded} of ${cat.marks}`);
        ok(typeof cat.comment === "string" && cat.comment.length > 60,
            `${at}: "${cat.section}" explains what earned the marks`);
    }

    const pages = c.pages || [];
    ok(pages.length >= 8, `${at}: a full submission (${pages.length} pages, need >= 8)`);
    const headings = pages.map((p) => (p.heading || "").toLowerCase()).join(" | ");
    for (const wanted of ["method", "result", "conclusion", "discussion"]) {
        ok(headings.includes(wanted), `${at}: the finished report includes a ${wanted} page`);
    }
    for (const [i, pg] of pages.entries()) {
        ok(typeof pg.heading === "string" && pg.heading.trim().length >= 3, `${at}: page ${i + 1} has a heading`);
        const hasBody = typeof pg.body === "string" && pg.body.trim().length > 40;
        const hasBullets = Array.isArray(pg.bullets) && pg.bullets.length > 0;
        const hasTable = pg.table && Array.isArray(pg.table.rows) && pg.table.rows.length > 0;
        ok(hasBody || hasBullets || hasTable, `${at}: page ${i + 1} ("${pg.heading}") has real content`);
        if (hasTable) {
            const cols = pg.table.columns || [];
            ok(cols.length >= 2, `${at}: "${pg.heading}" table has column headings`);
            ok(pg.table.rows.every((r) => r.length === cols.length),
                `${at}: "${pg.heading}" table is rectangular`);
            ok(pg.table.rows.every((r) => r.every((cell) => String(cell).trim().length > 0)),
                `${at}: "${pg.heading}" table has no empty cells`);
        }
    }
    ok(Array.isArray(c.examinerNotes) && c.examinerNotes.length >= 3,
        `${at}: explains why the sample scores full marks`);
    ok(pages.some((p) => (p.body || "").length > 400),
        `${at}: at least one page carries developed prose, not just headings`);
    const mirrored = [`content/${id}/sba.json`, `public/content/${id}/sba.json`];
    for (const f of mirrored) ok(exists(f), `${f} exists`);
    ok(read(mirrored[0]) === read(mirrored[1]), `${id}: content and public sba.json are byte-identical`);
}

// --------------------------------------------------------------- renderer
section("3. the renderer shows the sample but protects it");
const jsx = read("src/components/SBASection.jsx");
const css = read("src/components/SBASection.css");
ok(jsx.includes("data.completedSample"), "SBASection reads completedSample from the subject guide");
ok(jsx.includes("Completed Sample {noun}"), "the sample is headed with the subject-aware noun");
ok(jsx.includes("Sample {noun}"), "the original shorthand heading string is still present (label harness depends on it)");
ok(jsx.includes("userSelect: \"none\""), "the sample wrapper disables text selection");
ok(/onCopy=\{blockCopy\}/.test(jsx) && /onCut=\{blockCopy\}/.test(jsx), "copy and cut are blocked on the sample");
ok(/onContextMenu=\{blockCopy\}/.test(jsx), "the context menu is blocked on the sample");
ok(/onDragStart=\{blockCopy\}/.test(jsx), "dragging the sample out is blocked");
ok(/const blockCopy = \(e\) => e.preventDefault\(\);/.test(jsx), "blockCopy cancels the event");
ok(jsx.includes("sba-viewonly") && jsx.includes("completed.viewOnlyNote"), "the view-only note is rendered from the subject's own text");
ok(/\.sba-protected\{[^}]*user-select:none/.test(css), "CSS also sets user-select:none on the protected block");
ok(/\.sba-protected\{[^}]*webkit-user-select:none/.test(css), "CSS sets the webkit user-select prefix");
ok(jsx.includes("completedSample") && jsx.includes("categories") && jsx.includes("examinerNotes"),
    "the renderer walks the category list, the report pages and the examiner notes");

// -------------------------------------------------------- campaign health
section("4. campaign health");
const summary = [];
for (const [id, status] of tracked) summary.push(`${id}:${status.startsWith("DONE") ? "done" : "todo"}`);
console.log("   " + summary.join("  "));
ok(shipped.length >= 1, "at least one subject ships a completed sample");
console.log(`\ncheck-sba-samples: ${pass} passed, ${fail} failed  (${shipped.length}/${tracked.size} subjects shipped)`);
process.exit(fail === 0 ? 0 : 1);
