// Verification harness for the STUDENT's Messages tab (chat PR 3).
//   node tools/check-student-messages.mjs
//
// Chat PR 1 (PR #90) shipped api/messages.js, PR 2 (PR #100) the teacher panel.
// PR 3 is the other side of the same conversation: a Messages view inside the
// student's own page (/account), reusing the panel and the client module.
//
// The risks on THIS side are different from the teacher's, so they are what this
// file proves, with the REAL api/messages.js handler behind the offline Supabase
// stub and with the panel RENDERED (esbuild + react-dom/server), not regexed:
//
//   1. A STUDENT'S ROSTER IS THEIR TEACHERS — and nobody else. The student's own
//      contacts request returns teachers; another student, a stranger, a teacher
//      linked only to someone else, and the student themselves all come back 403
//      with zero message data.
//   2. A STUDENT'S WORDS ARE A STUDENT'S — the tab renders CHAT_COPY.student, so
//      it can never tell a student to "link a student" or otherwise show the
//      teacher's instructions (the exact bug a shared panel invites).
//   3. SENDING, REPLAYING AND PAGING still hold from the student's side, and the
//      stored row is stamped sender_role "student" / recipient_role "teacher".
//   4. HONEST FAILURE COPY — no status reads as an empty inbox.
//   5. WIRING + BUDGET — the tab lives on /account (the student's page, behind
//      the sign-in gate), reuses the shared panel, stores nothing locally, and
//      api/ is still at the 12-function cap.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

register("./messages-loader.mjs", import.meta.url);
const stub = await import("./messages-stub.mjs");
const { state, reset, setTable, rows } = stub;

const client = await import("../src/data/teacherMessages.js");
const tabs = await import("../src/data/accountTabs.js");
const { ACCOUNT_TABS, nextTabId } = tabs;
const {
  CHAT_COPY,
  MESSAGES_ENDPOINT,
  MAX_MESSAGE_CHARS,
  authHeaders,
  canSend,
  chatError,
  contactsUrl,
  contactsWord,
  mergeMessages,
  newClientId,
  pollCursor,
  readContacts,
  readThread,
  roleLabel,
  sendInit,
  senderLabel,
  threadUrl,
} = client;

let passed = 0;
let failed = 0;
let quiet = false;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    if (!quiet) console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    if (!quiet) console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}

const handler = (await import("../api/messages.js")).default;

// --- delivery doubles, exactly as Vercel/Browser deliver a request ----------
const TOKEN = "Bearer student-token";
function queryOf(url) {
  const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  return Object.fromEntries(new URLSearchParams(qs));
}
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    setHeader(key, value) {
      res.headers[key.toLowerCase()] = value;
    },
  };
  return res;
}
function wireHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) out[key.toLowerCase()] = value;
  return out;
}
async function tabGet(url, { token = TOKEN } = {}) {
  const res = mockRes();
  const headers = token ? wireHeaders(authHeaders(token)) : {};
  await handler({ method: "GET", url, query: queryOf(url), headers }, res);
  return res;
}
async function tabPost(url, init) {
  const res = mockRes();
  const headers = wireHeaders(init.headers);
  await handler(
    { method: init.method, url, query: queryOf(url), headers, body: init.body ? JSON.parse(init.body) : undefined },
    res
  );
  return res;
}

// --- fixture -----------------------------------------------------------------
const SAM = "sam@home.jm"; // the student using the tab, linked to MS BROWN
const BROWN = "ms.brown@school.edu"; // Sam's teacher
const LEE = "mr.lee@school.edu"; // someone else's teacher
const KIM = "kim@home.jm"; // another student (linked to BROWN and LEE, not to Sam)
const OUTSIDER = "outsider@elsewhere.com";
const links = [
  { id: "l1", teacher_email: BROWN, student_email: SAM },
  { id: "l2", teacher_email: BROWN, student_email: KIM },
  { id: "l3", teacher_email: LEE, student_email: KIM },
];
const USER_IDS = { [BROWN]: "user-brown", [LEE]: "user-lee", [SAM]: "user-sam", [KIM]: "user-kim" };
function base() {
  reset();
  process.env.VITE_SUPABASE_URL = "https://messages.check.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-checks-only";
  setTable("teacher_students", links);
  setTable("private_messages", []);
  state.user = { id: "user-sam", email: SAM }; // signed in as the STUDENT
}
function messageRow(id, { from, fromRole, to, toRole, body, at }) {
  return {
    id,
    thread_key: [from, to].sort().join("|"),
    sender_id: USER_IDS[from] || "user-unknown",
    sender_email: from,
    sender_role: fromRole,
    recipient_email: to,
    recipient_role: toRole,
    body,
    client_id: null,
    created_at: at,
  };
}

// ===========================================================================
section("1. a student's contacts request returns their teachers — and only them");

{
  base();
  const res = await tabGet(contactsUrl());
  check("the student tab asks the one documented endpoint", contactsUrl() === `${MESSAGES_ENDPOINT}?contacts=1`);
  check("the request answers 200", res.statusCode === 200, `${res.statusCode}`);
  const parsed = readContacts(res.body);
  check(
    "the list is exactly this student's teacher, role-labelled",
    JSON.stringify(parsed.contacts) === JSON.stringify([{ email: BROWN, role: "teacher" }]),
    JSON.stringify(parsed.contacts)
  );
  check("and it cannot be widened: the other teacher and the other student are absent", !JSON.stringify(parsed.contacts).includes(LEE) && !JSON.stringify(parsed.contacts).includes(KIM));
  check("the student is never listed as their own contact", !JSON.stringify(parsed.contacts).includes(SAM));
  check("the tab knows it may chat", parsed.canChat === true);
  check("the role chip reads as a human role", roleLabel("teacher") === "Teacher");

  // A student with no teacher link at all: an empty state, never an error, and
  // never somebody else's teacher.
  setTable("teacher_students", [{ id: "l2", teacher_email: BROWN, student_email: KIM }]);
  const lonely = await tabGet(contactsUrl());
  const lonelyParsed = readContacts(lonely.body);
  check(
    "a student whose teacher never linked them gets 200 + an empty list, not a 403",
    lonely.statusCode === 200 && lonelyParsed.contacts.length === 0 && lonelyParsed.canChat === false,
    `${lonely.statusCode} ${JSON.stringify(lonely.body)}`
  );

  base();
  const noToken = await tabGet(contactsUrl(), { token: null });
  check("with no session the tab shows 401 and no contacts", noToken.statusCode === 401 && !("contacts" in noToken.body));
  check("…and the copy for it says to sign in again", /sign in again/i.test(chatError(401, noToken.body.error)));
}

// ===========================================================================
section("2. a student can open ONLY their own teacher's thread");

{
  base();
  const opened = await tabGet(threadUrl(BROWN));
  check("the linked teacher's thread opens (200)", opened.statusCode === 200, `${opened.statusCode} ${JSON.stringify(opened.body)}`);
  const thread = readThread(opened.body);
  check(
    "the thread key is the pair of them, and the conversation starts empty",
    thread.threadKey === [SAM, BROWN].sort().join("|") && thread.messages.length === 0,
    JSON.stringify(thread)
  );

  const otherStudent = await tabGet(threadUrl(KIM));
  check(
    "another student's thread is a 403 with zero message data (the privacy line)",
    otherStudent.statusCode === 403 && otherStudent.body.error === "You are not linked to that person" && !("messages" in otherStudent.body),
    `${otherStudent.statusCode} ${JSON.stringify(otherStudent.body)}`
  );
  const otherTeacher = await tabGet(threadUrl(LEE));
  check("a teacher who did not link them is the same 403 (the tab cannot browse a staffroom)", otherTeacher.statusCode === 403 && !("messages" in otherTeacher.body));
  const stranger = await tabGet(threadUrl(OUTSIDER));
  check("a stranger is the same 403", stranger.statusCode === 403 && !("messages" in stranger.body));
  const self = await tabGet(threadUrl(SAM));
  check("a student cannot open a thread with their own account", self.statusCode === 403);
  check("the 403 shown is the server's own sentence, not an invented one", chatError(403, otherStudent.body.error) === "You are not linked to that person");

  // …and the same wall holds for writing, which is the half that could leak a note.
  const writeToStudent = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: KIM, body: "hi", clientId: newClientId() }));
  check(
    "a student cannot POST to another student",
    writeToStudent.statusCode === 403 && rows("private_messages").length === 0,
    `${writeToStudent.statusCode}`
  );
  const writeToStranger = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: OUTSIDER, body: "hi", clientId: newClientId() }));
  check("a student cannot POST to a stranger", writeToStranger.statusCode === 403 && rows("private_messages").length === 0);

  // A malformed address never reaches the database.
  const junk = await tabGet(threadUrl("not-an-email"));
  check("a malformed address is a 400 before any lookup", junk.statusCode === 400 && /valid 'with' email/.test(junk.body.error));
}

// ===========================================================================
section("3. sending from the student's side, and what the row records");

{
  base();
  const payload = JSON.parse(sendInit(TOKEN, { to: BROWN, body: "  is my project ok?  ", clientId: "s-1" }).body);
  check(
    "the POST carries only the recipient, the text and the idempotency key",
    JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(["body", "clientId", "to"]),
    JSON.stringify(payload)
  );
  check("no identity is ever sent from the student's tab either", !("from" in payload) && !("senderEmail" in payload) && !("senderId" in payload));
  check("the recipient is normalised and the text trimmed", payload.to === BROWN && payload.body === "is my project ok?");

  const sent = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: BROWN, body: "is my project ok?", clientId: "s-1" }));
  check("the send is accepted (201)", sent.statusCode === 201 && sent.body.duplicate === false, `${sent.statusCode}`);
  const stored = rows("private_messages")[0];
  check(
    "the stored row is stamped from the token: this student, this teacher",
    stored.sender_email === SAM && stored.sender_id === "user-sam" && stored.recipient_email === BROWN,
    JSON.stringify(stored)
  );
  check(
    "…with sender_role student and recipient_role teacher (what a teacher's roster reads)",
    stored.sender_role === "student" && stored.recipient_role === "teacher",
    `${stored.sender_role}/${stored.recipient_role}`
  );

  const retry = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: BROWN, body: "is my project ok?", clientId: "s-1" }));
  check(
    "a retried send shows the stored message instead of posting twice",
    retry.statusCode === 200 && retry.body.duplicate === true && rows("private_messages").length === 1,
    `${retry.statusCode} rows=${rows("private_messages").length}`
  );
  const again = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: BROWN, body: "is my project ok?", clientId: newClientId() }));
  check("a genuinely new attempt is a new message", again.statusCode === 201 && rows("private_messages").length === 2);

  // The teacher replies; the student's own word for their own message must hold
  // in both directions.
  state.user = { id: "user-brown", email: BROWN };
  const reply = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "Yes — tighten Q3.", clientId: newClientId() }));
  check("the teacher's reply lands on the same thread", reply.statusCode === 201);
  state.user = { id: "user-sam", email: SAM };

  const thread = readThread((await tabGet(threadUrl(BROWN))).body);
  check(
    "the conversation reads oldest first",
    thread.messages.map((m) => m.body).join("|") === "is my project ok?|is my project ok?|Yes — tighten Q3.",
    thread.messages.map((m) => m.body).join("|")
  );
  check(
    "only the student's own messages say 'You'",
    senderLabel(thread.messages[0], SAM) === "You" && senderLabel(thread.messages[2], SAM) === BROWN
  );
  check("a mixed-case token still lines up with the stored row", senderLabel(thread.messages[0], " SAM@Home.JM ") === "You");

  check("an empty draft cannot be sent", canSend("   ", false) === false && canSend(null, false) === false);
  check("a draft at the limit can be sent, one over cannot", canSend("x".repeat(MAX_MESSAGE_CHARS), false) === true && canSend("x".repeat(MAX_MESSAGE_CHARS + 1), false) === false);
  const tooLong = await tabPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: BROWN, body: "x".repeat(MAX_MESSAGE_CHARS + 1) }));
  check("the server names the limit for an over-long body", tooLong.statusCode === 400 && /2000 characters/.test(tooLong.body.error));
}

// ===========================================================================
section("4. paging and polling from the student's side (no message lost twice)");

{
  base();
  const sameStamp = "2026-09-25T09:00:00.000Z";
  setTable(
    "private_messages",
    Array.from({ length: 4 }, (_, i) =>
      messageRow(`s-${i}`, { from: BROWN, fromRole: "teacher", to: SAM, toRole: "student", body: `note ${i}`, at: sameStamp })
    )
  );
  let merged = [];
  let cursor = null;
  const page1 = readThread((await tabGet(threadUrl(BROWN, { limit: 3 }))).body);
  check("the student's first page honours the limit and offers more", page1.messages.length === 3 && page1.hasMore === true);
  merged = page1.messages;
  cursor = page1.nextBefore;
  check("the cursor is opaque (timestamp + id), not a bare timestamp", typeof cursor === "string" && cursor.includes("|"), String(cursor));
  const page2 = readThread((await tabGet(threadUrl(BROWN, { limit: 3, before: cursor }))).body);
  merged = mergeMessages(merged, page2.messages);
  check(
    "walking back with that cursor shows every message exactly once even on one timestamp",
    merged.length === 4 && new Set(merged.map((m) => m.id)).size === 4,
    merged.map((m) => m.id).join(",")
  );
  check("the merged conversation is oldest-first", merged[0].id === "s-0" && merged[3].id === "s-3");

  const polled = readThread((await tabGet(threadUrl(BROWN, { after: pollCursor(merged) }))).body);
  check("polling from the newest message returns nothing new yet", polled.messages.length === 0);
  const timestampOnly = readThread((await tabGet(threadUrl(BROWN, { after: sameStamp }))).body);
  check(
    "…and the timestamp-only form would drop same-stamp messages (the cursor form is load-bearing)",
    timestampOnly.messages.length === 0 && pollCursor(merged) !== sameStamp
  );

  setTable("private_messages", [
    ...rows("private_messages"),
    messageRow("zzz-new", { from: SAM, fromRole: "student", to: BROWN, toRole: "teacher", body: "thanks!", at: sameStamp }),
  ]);
  const after = readThread((await tabGet(threadUrl(BROWN, { after: pollCursor(merged) }))).body);
  check(
    "a same-timestamp message with a higher id IS returned by the poll",
    after.messages.length === 1 && after.messages[0].id === "zzz-new",
    after.messages.map((m) => m.id).join(",")
  );
  check("merging it in adds exactly one message", mergeMessages(merged, after.messages).length === 5);
}

// ===========================================================================
section("5. the tab's OWN words: CHAT_COPY.student, rendered for real");

{
  // Render the two wrappers with esbuild + react-dom/server. This is the check a
  // regex could not make: it is the markup the page would actually produce.
  const { build } = await import("esbuild").catch(() => ({ build: null }));
  const outdir = "node_modules/.cache/check-student-messages";
  let rendered = null;
  if (build) {
    await build({
      entryPoints: {
        "teacher": "src/components/TeacherMessages.jsx",
        "student": "src/components/StudentMessages.jsx",
      },
      outdir,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      external: ["react", "react-dom"],
      loader: { ".css": "empty" },
      logLevel: "silent",
      absWorkingDir: root,
    });
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = async (file, props) => {
      const mod = await import(`../${outdir}/${file}.js`);
      return renderToStaticMarkup(React.createElement(mod.default, props));
    };
    rendered = {
      student: await html("student", { token: "t", me: SAM }),
      teacher: await html("teacher", { token: "t", me: BROWN }),
      signedOut: await html("student", { token: null, me: SAM }),
    };
  }
  check("the tab renders at all (esbuild + react-dom/server produced markup)", !!rendered && rendered.student.length > 100, rendered && rendered.student.slice(0, 80));

  if (rendered) {
    const strip = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const student = strip(rendered.student);
    const teacher = strip(rendered.teacher);
    check("the student's tab says 'the teachers linked to you'", /the teachers linked to you/i.test(student), student.slice(0, 120));
    check("…and never calls the other side 'students'", !/students linked to you/i.test(student));
    check(
      "…and never shows the teacher's instructions ('Link a student', 'your dashboard', 'the Links card')",
      !/link a student/i.test(student) && !/your dashboard/i.test(student) && !/links card/i.test(student),
      student.slice(0, 200)
    );
    check("…nor the teacher-only empty state", !/No students are linked/i.test(student));
    check(
      "the student's loading line names teachers",
      /Loading your linked teachers/i.test(student),
      student.slice(0, 160)
    );
    check(
      "the teacher's panel still says exactly what it said in PR 2 (students, links, nobody else)",
      /students linked to you/i.test(teacher) && /a student you have not linked cannot be messaged/i.test(teacher) && !/teachers linked to you/i.test(teacher),
      teacher.slice(0, 160)
    );
    check(
      "the two perspectives are genuinely different renders (the copy is not ignored)",
      student !== teacher && /teachers/.test(student) && /students/.test(teacher)
    );
    check("a signed-out visitor is told to sign in, and sees no conversation", /Sign in to see your messages/i.test(strip(rendered.signedOut)));
    check("the tab is a labelled region titled Messages", /aria-labelledby="tmsg-title"/.test(rendered.student) && /id="tmsg-title"/.test(rendered.student));
    check("every rendered request-bound control is a real button/textarea", !/tabindex="-1"/i.test(rendered.student));
  }

  // The heading word is taken from the roles the SERVER returned.
  check("a student's contacts list is headed 'Teachers you can message'", contactsWord([{ role: "teacher" }], CHAT_COPY.student) === "teachers");
  check("a teacher's is headed 'Students you can message'", contactsWord([{ role: "student" }], CHAT_COPY.teacher) === "students");
  check(
    "a caller linked both ways reads 'People', not a half-wrong heading",
    contactsWord([{ role: "student" }, { role: "teacher" }], CHAT_COPY.student) === "people"
  );
  check("nothing returned yet reads 'People' too (and the heading is not rendered then)", contactsWord([], CHAT_COPY.student) === "people" && contactsWord(null, CHAT_COPY.student) === "people");
  check("role strings and contact objects are both accepted (a mis-call cannot read as 'no links')", contactsWord(["teacher"], CHAT_COPY.student) === "teachers" && contactsWord([{ email: SAM }], CHAT_COPY.student) === "people");

  for (const side of ["teacher", "student"]) {
    const copy = CHAT_COPY[side];
    const keys = ["otherRole", "otherPlural", "intro", "empty", "refusedHint", "footnote", "pick", "loading"];
    check(`CHAT_COPY.${side} supplies every sentence the panel asks for`, keys.every((k) => typeof copy[k] === "string" && copy[k].trim().length > 0), Object.keys(copy).join(","));
  }
  check("the student's empty state names a teacher and promises nothing it cannot keep", /^No teacher is linked/.test(CHAT_COPY.student.empty) && !/link a student/i.test(CHAT_COPY.student.empty));
  check("the teacher's empty state still points at the Links card above it", /Link the students you teach with the card above/.test(CHAT_COPY.teacher.empty));
  check(
    "neither perspective's copy names the wrong side",
    !/students linked to you/i.test(CHAT_COPY.student.intro) && !/teachers linked to you/i.test(CHAT_COPY.teacher.intro)
  );
}

// ===========================================================================
section("6. failure copy: nothing reads as 'no messages'");

{
  const copies = {
    offline: chatError(0),
    unauthenticated: chatError(401),
    forbidden: chatError(403),
    broken: chatError(500),
    missing: chatError(404),
  };
  check("an unreachable server says so (and does not blame the student)", /could not reach the server/i.test(copies.offline));
  check("an expired session says to sign in again", /sign in again/i.test(copies.unauthenticated));
  check("a 500 is named as unavailable, not as an empty inbox", /not available/i.test(copies.broken));
  check("a 404 says the deployment has no messaging yet", /not available/i.test(copies.missing));
  check("a refusal without the server's sentence still says something true", copies.forbidden.length > 0 && !/not linked/i.test(copies.forbidden));
  check(
    "no failure sentence claims the student has no messages",
    Object.values(copies).every((copy) => !/no messages|empty|nothing to show/i.test(copy)),
    JSON.stringify(copies)
  );

  // …and the empty state itself is reachable only when the server actually
  // answered, never as a stand-in for a failure.
  const panel = read("src/components/MessagesPanel.jsx");
  const errorAt = panel.indexOf("contactsError && !loadingContacts");
  const emptyAt = panel.indexOf("!contactsError && people.length === 0");
  check("the panel shows the refusal branch before the empty branch", errorAt > 0 && emptyAt > errorAt, `${errorAt} / ${emptyAt}`);
  check("the empty branch is gated on there being no contacts error", emptyAt > 0);
}

// ===========================================================================
section("7. wiring: where the tab lives, what it must never do, and the budget");

{
  const app = read("src/App.jsx");
  const accountPage = read("src/pages/AccountPage.jsx");
  const studentWrapper = read("src/components/StudentMessages.jsx");
  const teacherWrapper = read("src/components/TeacherMessages.jsx");
  const panel = read("src/components/MessagesPanel.jsx");
  const css = read("src/components/MessagesPanel.css");

  check(
    "the student's tab is on /account — the student's own page, not /teacher",
    /<Route path="\/account" element=\{<ProtectedRoute><AccountPage \/><\/ProtectedRoute>\} \/>/.test(app)
  );
  check("…and that route is behind the sign-in gate", /ProtectedRoute/.test(app.split('path="/account"')[1].slice(0, 80)));
  check("the account page imports the student tab", /import StudentMessages from "\.\.\/components\/StudentMessages";/.test(accountPage));
  check(
    "…and renders it with the session token and the signed-in email",
    /<StudentMessages token=\{session\?\.access_token\} me=\{user\.email\} \/>/.test(accountPage)
  );
  check("the account page resolves the session it passes down", /const \{ user, session, signOut, loading \} = useAuth\(\)/.test(accountPage));
  check(
    "the tab is a panel of the account page now, not a card at the bottom of the grid",
    /<AccountTabPanel id="messages" active=\{tab === "messages"\}>/.test(accountPage) &&
      /import \{ AccountTabBar, AccountTabPanel \} from "\.\.\/components\/AccountTabs";/.test(accountPage)
  );
  check("the student tab does not also carry the teacher panel", !/TeacherMessages/.test(accountPage));

  check(
    "the wrapper adds words, not logic (no state, no effect, no request of its own)",
    !/useState|useEffect|useRef|fetch\(|await /.test(studentWrapper) && (studentWrapper.match(/return /g) || []).length === 1
  );
  check("the student wrapper passes CHAT_COPY.student", /copy=\{CHAT_COPY\.student\}/.test(studentWrapper));
  check("the teacher wrapper still passes CHAT_COPY.teacher (PR 2 unbroken)", /copy=\{CHAT_COPY\.teacher\}/.test(teacherWrapper));
  check("both wrappers import the shared module by explicit extension (Node-ESM resolvable)", /from "\.\.\/data\/teacherMessages\.js"/.test(studentWrapper) && /from "\.\.\/data\/teacherMessages\.js"/.test(teacherWrapper));
  check("neither wrapper talks to the network itself", !/fetch\(/.test(studentWrapper) && !/fetch\(/.test(teacherWrapper));
  check("the wrappers share ONE panel (no second copy of the conversation UI)", /from "\.\/MessagesPanel"/.test(studentWrapper) && /from "\.\/MessagesPanel"/.test(teacherWrapper));

  check("the panel keeps the run of every perspective-dependent sentence out of its own source", !/link a student/i.test(panel) && !/No students are linked/.test(panel) && !/Choose a student/.test(panel));
  check(
    "…and uses the copy for all of them",
    ["intro", "empty", "refusedHint", "footnote", "pick", "loading"].every((key) => panel.includes(`copy.${key}`)),
    "missing one"
  );
  check("it names no student's or teacher's email in its source (the list always comes from the server)", !/[\w.+-]+@[\w-]+\.\w+/.test(panel));
  check("it never sends an identity field", !/senderEmail|senderId|sender_email/.test(panel));
  check("it never stores a private message on the device", !/localStorage|sessionStorage/.test(panel));
  check(
    "it asks the server for nothing without a session (the contacts request sits behind the no-token guard)",
    panel.indexOf("if (!token)") > 0 && panel.indexOf("fetch(contactsUrl()") > panel.indexOf("if (!token)")
  );
  check("it talks to exactly one endpoint", /MESSAGES_ENDPOINT/.test(panel) && !/\/api\/(analytics|admin|sync|auth|purchases)/.test(panel));
  check("it carries the bearer token on every request and an idempotency key on the send", (panel.match(/authHeaders\(token\)/g) || []).length >= 2 && /sendInit\(token,/.test(panel));
  check("its stylesheet is the one it imports", /import "\.\/MessagesPanel\.css";/.test(panel) && css.includes(".tmsg-contacts"));

  // Budget: this PR added no Serverless Function.
  const FUNCTION_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
  const isIgnored = (rel) => rel.split("/").some((seg) => seg.startsWith("_") && seg !== "");
  function walk(dir, out = []) {
    for (const entry of readdirSync(join(root, dir))) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const rel = `${dir}/${entry}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
      else out.push(rel);
    }
    return out;
  }
  const apiFiles = walk("api");
  const routeFiles = apiFiles.filter((f) => FUNCTION_EXT.test(f) && !isIgnored(relative("api", f)));
  check(
    "this PR adds no api/ function (still 12, the Hobby cap)",
    routeFiles.length === 12 && routeFiles.includes("api/messages.js"),
    `${routeFiles.length}: ${routeFiles.sort().join(", ")}`
  );
  check("api/ has no bracketed (Next.js-only) filenames", apiFiles.filter((f) => /[[\]]/.test(f)).length === 0);
}

// ===========================================================================
section("8. the account page: Messages is one tap from the top");

{
  // The owner's complaint was findability: the panel shipped as a card at the
  // BOTTOM of the account grid, after Profile, Subscription, My Subjects and
  // Family. This section renders the REAL src/pages/AccountPage.jsx and proves
  // the tab bar is above the cards, that Messages is a real tab, and that the
  // tab/panel ARIA contract holds in the actual markup.
  //
  // AccountPage gets the signed-in identity from useAuth, the plan from
  // usePurchases and the subject list from contentLoader — three things that want
  // a live session or the network. They are redirected to a stub by an esbuild
  // plugin below; the page, the tab bar, the panels and the Messages panel inside
  // them are the real shipped code.
  const { writeFileSync } = await import("node:fs");
  const { build } = await import("esbuild").catch(() => ({ build: null }));
  const outdir = "node_modules/.cache/check-student-messages";
  let page = null;

  if (build) {
    const stubFile = join(root, outdir, "account-stubs.js");
    writeFileSync(
      stubFile,
      [
        "// Generated by tools/check-student-messages.mjs — the three data hooks of",
        "// AccountPage, stubbed so the page renders without a session or a network.",
        "export function useAuth() {",
        "  if (globalThis.__CHECK_SIGNED_OUT__) return { user: null, session: null, signOut() {}, loading: false, isAuthenticated: false };",
        "  return { user: { email: 'sam@home.jm', created_at: '2026-01-05T00:00:00.000Z' },",
        "           session: { access_token: 'check-token' }, signOut() {}, loading: false, isAuthenticated: true };",
        "}",
        "export function usePurchases() {",
        "  return { hasAccess: () => false, hasBundle: false, hasSchoolLicense: false, schoolLicenseSeats: 0, purchasedSubjects: [] };",
        "}",
        "export async function getAllSubjects() { return []; }",
        "",
      ].join("\n")
    );
    const stubHooks = {
      name: "stub-account-hooks",
      setup(b) {
        b.onResolve({ filter: /(AuthContext|usePurchases|contentLoader)$/ }, (args) =>
          String(args.importer).includes("AccountPage") ? { path: stubFile } : undefined
        );
      },
    };
    await build({
      entryPoints: { "account-page": "src/pages/AccountPage.jsx" },
      outdir,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      external: ["react", "react-dom", "react-router-dom"],
      loader: { ".css": "empty" },
      logLevel: "silent",
      absWorkingDir: root,
      plugins: [stubHooks],
    });
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { MemoryRouter } = await import("react-router-dom");
    const AccountPage = (await import(`../${outdir}/account-page.js`)).default;
    const render = (url, signedOut = false) => {
      globalThis.__CHECK_SIGNED_OUT__ = signedOut;
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(AccountPage))
      );
      delete globalThis.__CHECK_SIGNED_OUT__;
      return html;
    };
    page = { overview: render("/account"), messages: render("/account?tab=messages"), guest: render("/account", true) };
  }
  check("the account page renders (esbuild + react-dom/server produced markup)", !!page && page.overview.length > 500, page && page.overview.slice(0, 80));

  if (page) {
    const openTag = (html, needle, tag) => {
      const at = html.indexOf(needle);
      if (at === -1) return "";
      return html.slice(html.lastIndexOf(`<${tag}`, at), html.indexOf(">", at) + 1);
    };
    const tabButton = (html, id) => openTag(html, `id="acct-tab-${id}"`, "button");
    const tabPanel = (html, id) => openTag(html, `id="acct-panel-${id}"`, "div");
    const strip = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    // 1. a real tab bar, above every card.
    check("the page renders a real tablist", /role="tablist"/.test(page.overview) && /aria-label="My account sections"/.test(page.overview));
    check(
      "every tab is a real <button role=tab>, never a clickable div",
      (page.overview.match(/<button[^>]*role="tab"/g) || []).length === 2 && !/<div[^>]*role="tab"/.test(page.overview)
    );
    check(
      "the two tabs are Overview and Messages",
      /id="acct-tab-overview"[^>]*>Overview</.test(page.overview) && /id="acct-tab-messages"[^>]*>Messages</.test(page.overview)
    );
    check(
      "the tab bar sits ABOVE the cards it used to be buried under (the owner's complaint)",
      page.overview.indexOf('role="tablist"') < page.overview.indexOf("Profile") &&
        page.overview.indexOf('role="tablist"') < page.overview.indexOf("My Subjects") &&
        page.overview.indexOf('role="tablist"') < page.overview.indexOf("Account Actions"),
      `${page.overview.indexOf('role="tablist"')} / ${page.overview.indexOf("My Subjects")}`
    );

    // 2. the selected tab, and the panel it controls.
    check("Overview is the tab you land on", /aria-selected="true"/.test(tabButton(page.overview, "overview")) && /aria-selected="false"/.test(tabButton(page.overview, "messages")));
    check("exactly one tab is selected at a time", (page.overview.match(/aria-selected="true"/g) || []).length === 1);
    check(
      "the overview panel is the visible one by default, and the messages panel is inert",
      !/hidden/.test(tabPanel(page.overview, "overview")) && /hidden/.test(tabPanel(page.overview, "messages")),
      `${tabPanel(page.overview, "overview")} || ${tabPanel(page.overview, "messages")}`
    );
    check(
      "the Messages tab selects and reveals its panel on a deep link (/account?tab=messages)",
      /aria-selected="true"/.test(tabButton(page.messages, "messages")) &&
        /aria-selected="false"/.test(tabButton(page.messages, "overview")) &&
        !/hidden/.test(tabPanel(page.messages, "messages")) &&
        /hidden/.test(tabPanel(page.messages, "overview")),
      tabPanel(page.messages, "messages")
    );
    check(
      "…and the student's own wording comes with it",
      /the teachers linked to you/i.test(strip(page.messages)) && !/link a student/i.test(strip(page.messages))
    );

    // 3. ARIA wiring: every tab points at a panel that exists, and back again.
    for (const id of ["overview", "messages"]) {
      const button = tabButton(page.overview, id);
      check(`the ${id} tab's aria-controls resolves to a panel in the markup`, button.includes(`aria-controls="acct-panel-${id}"`) && page.overview.includes(`id="acct-panel-${id}"`), button);
      check(`the ${id} panel is labelled by its own tab`, tabPanel(page.overview, id).includes(`aria-labelledby="acct-tab-${id}"`));
    }
    check("both panels are tabpanels", (page.overview.match(/role="tabpanel"/g) || []).length === 2);
    check(
      "the Messages panel really contains the shared StudentMessages panel",
      (() => {
        const panel = page.messages.slice(page.messages.indexOf('id="acct-panel-messages"'));
        return panel.slice(0, 4000).includes('class="tmsg"') && panel.includes('id="tmsg-title"');
      })()
    );

    // 4. keyboard: roving tabIndex + arrow/Home/End keys (without the keys a
    //    roving tabIndex would trap a keyboard user on the selected tab).
    check("the selected tab is the one in the tab order", /tabindex="0"/.test(tabButton(page.overview, "overview")) && /tabindex="-1"/.test(tabButton(page.overview, "messages")));
    check("arrow keys move right and wrap around", nextTabId("overview", "ArrowRight") === "messages" && nextTabId("messages", "ArrowRight") === "overview");
    check("arrow keys move left and wrap around", nextTabId("messages", "ArrowLeft") === "overview" && nextTabId("overview", "ArrowLeft") === "messages");
    check("Home and End jump to the first and last tab", nextTabId("messages", "Home") === "overview" && nextTabId("overview", "End") === "messages");
    check("any other key is left alone (typing, Tab and Escape are not hijacked)", nextTabId("overview", "Tab") === null && nextTabId("overview", "a") === null && nextTabId("overview", "Enter") === null);
    check("an unknown selected id moves nowhere rather than throwing", nextTabId("nope", "ArrowRight") === null);
    check("the bar handles those keys itself", /onKeyDown=\{onKeyDown\}/.test(read("src/components/AccountTabs.jsx")) && /event\.preventDefault\(\)/.test(read("src/components/AccountTabs.jsx")));

    // 5. the tab bar itself is still the account page's, and a signed-out visitor
    //    gets no tab bar pointing at a panel that needs a session.
    check(
      "the tab bar is the account page's, and its tabs come from the shared list",
      /<AccountTabBar active=\{tab\} onSelect=\{selectTab\} \/>/.test(read("src/pages/AccountPage.jsx")) &&
        /className="acct-tabs"/.test(read("src/components/AccountTabs.jsx")) &&
        /from "\.\.\/data\/accountTabs\.js"/.test(read("src/components/AccountTabs.jsx")) &&
        !/const ACCOUNT_TABS = \[/.test(read("src/components/AccountTabs.jsx"))
    );
    check("the tab list is exactly Overview then Messages (the shared source)", ACCOUNT_TABS.length === 2 && ACCOUNT_TABS[0].id === "overview" && ACCOUNT_TABS[1].label === "Messages", JSON.stringify(ACCOUNT_TABS));
    check("a signed-out visitor sees the sign-in card and no tabs", /Please Log In/.test(strip(page.guest)) && !/role="tablist"/.test(page.guest));

    // 6. the old buried card is gone for good (a regression guard).
    check(
      "the Messages card at the bottom of the grid is gone from the page and its CSS",
      !/acct-messages/.test(read("src/pages/AccountPage.jsx")) && !/acct-messages/.test(read("src/pages/Account.css"))
    );
    check(
      "an inactive panel is really hidden (no display rule of ours out-specifies [hidden])",
      /\.acct-panel\[hidden\]\{display:none\}/.test(read("src/pages/Account.css"))
    );
    check(
      "the bar is styled as a real tab strip, not a small link",
      /\.acct-tab\{[^}]*padding:\.6rem 1rem/.test(read("src/pages/Account.css")) &&
        /\.acct-tab\.is-active\{[^}]*color:#2563eb/.test(read("src/pages/Account.css"))
    );
  }
}

// ===========================================================================
section("9. wiring self-test (the checks above can fail)");

{
  const p0 = passed;
  const f0 = failed;
  quiet = true;
  check("probe-false", false);
  check("probe-true", true);
  quiet = false;
  const wired = failed === f0 + 1 && passed === p0 + 1;
  passed = p0;
  failed = f0;
  check("a false condition fails and a true one passes (check() is not vacuous)", wired);

  // Mutations of the decisions this file leans on.
  check(
    "a copy table with the teacher's wording swapped in would be caught",
    CHAT_COPY.student.intro !== CHAT_COPY.teacher.intro && CHAT_COPY.student.pick !== CHAT_COPY.teacher.pick
  );
  const swapped = contactsWord([{ role: "student" }], CHAT_COPY.student);
  check("a heading taken from the wrong perspective differs from the right one", swapped !== contactsWord([{ role: "teacher" }], CHAT_COPY.student));
  check("stripping the id from the poll cursor is detectable", pollCursor([{ id: "x", createdAt: "2026-09-25T09:00:00.000Z" }]) !== "2026-09-25T09:00:00.000Z");
  check("the thread URL stays a 'with' URL", threadUrl(BROWN).includes("with="));
}

// --- restore the environment the way we found it ----------------------------
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\ncheck-student-messages: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed === 0 ? 0 : 1);
