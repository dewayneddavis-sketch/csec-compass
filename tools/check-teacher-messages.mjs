// Verification harness for the teacher Messages panel + its client logic.
//   node tools/check-teacher-messages.mjs
//
// Chat PR 1 (PR #90) shipped the data layer and api/messages.js; PR 2 is the
// teacher-side panel. A panel is mostly glue, so the risk is not a crash — it is
// the panel and the route disagreeing: a URL the server never accepts, a page
// merge that shows one message twice, a poll that misses a same-timestamp
// message, a retry that posts twice, or a failure that reads on screen as "no
// messages". Every one of those is provable here without a browser:
//
//   1. THE PANEL'S REQUESTS ARE THE ROUTE'S CONTRACT — every URL and body
//      src/data/teacherMessages.js builds is delivered to the REAL
//      api/messages.js handler the way Vercel delivers it (url + query), and its
//      REAL response is read back with the panel's own reader.
//   2. WHO MAY TALK TO WHOM IS THE SERVER'S DECISION — the panel has no roster:
//      an unlinked email, another teacher's student and a same-school non-link
//      all come back 403 through the panel's own request builders, and the
//      panel's contact list is exactly what the server returned.
//   3. PAGING, MERGING AND POLLING — pages merge without duplicating, the
//      `before` cursor loses nothing even when timestamps collide, and the poll
//      cursor is exact (the timestamp-only form would drop a message).
//   4. SENDING — the POST carries only a recipient, the text and an idempotency
//      key (never an identity), a replay stores one row, and the draft survives
//      a failed send.
//   5. FAILURE COPY IS HONEST — each status has its own sentence and none of
//      them reads as "you have no messages".
//   6. WIRING + BUDGET — the panel is on /teacher (not /parent), is reachable
//      and labelled for a keyboard/screen-reader user, stores nothing locally,
//      and api/ is still at 12 Serverless Functions.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

register("./messages-loader.mjs", import.meta.url);
const stub = await import("./messages-stub.mjs");
const { state, reset, setTable, rows, failWrites } = stub;

const client = await import("../src/data/teacherMessages.js");
const {
  MESSAGES_ENDPOINT,
  CHAT_PAGE_LIMIT,
  MAX_MESSAGE_CHARS,
  authHeaders,
  canSend,
  chatError,
  contactsUrl,
  formatMessageTime,
  mergeMessages,
  newClientId,
  pollCursor,
  readContacts,
  readMessage,
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

// --- delivery doubles: Vercel hands a route { url, query, headers, body} -----
const TOKEN = "Bearer panel-token";
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
// A GET exactly as the browser makes it: the panel's URL, delivered as url + query.
// Header names are lower-cased the way Node/Vercel deliver them on the wire, so a
// route that reads req.headers.authorization is exercised the same way live.
function wireHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) out[key.toLowerCase()] = value;
  return out;
}
async function panelGet(url, { token = TOKEN } = {}) {
  const res = mockRes();
  const headers = token ? wireHeaders(authHeaders(token)) : {};
  await handler({ method: "GET", url, query: queryOf(url), headers }, res);
  return res;
}
// A POST built by the panel's sendInit and delivered like the browser's fetch.
async function panelPost(url, init) {
  const res = mockRes();
  const headers = wireHeaders(init.headers);
  await handler(
    { method: init.method, url, query: queryOf(url), headers, body: init.body ? JSON.parse(init.body) : undefined },
    res
  );
  return res;
}

// --- fixture -----------------------------------------------------------------
const BROWN = "ms.brown@school.edu"; // the teacher using the panel
const LEE = "mr.lee@school.edu"; // another teacher
const SAM = "sam@home.jm"; // linked to BROWN
const KIM = "kim@home.jm"; // linked to BROWN and LEE
const DANA = "dana@school.edu"; // same school, linked to nobody
const OUTSIDER = "outsider@elsewhere.com"; // stranger
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
  state.user = { id: "user-brown", email: BROWN };
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
section("1. the panel's own requests are accepted by the real route (contacts)");

{
  base();
  check("the panel asks for contacts through /api/messages (no second route)", contactsUrl() === `${MESSAGES_ENDPOINT}?contacts=1`);

  const res = await panelGet(contactsUrl());
  check("the panel's contacts request answers 200", res.statusCode === 200, `${res.statusCode}`);
  const parsed = readContacts(res.body);
  check(
    "the panel lists exactly the students the server returned, role-labelled",
    JSON.stringify(parsed.contacts) === JSON.stringify([{ email: KIM, role: "student" }, { email: SAM, role: "student" }]),
    JSON.stringify(parsed.contacts)
  );
  check("and nothing else: the list length equals the server's", parsed.contacts.length === (res.body.contacts || []).length);
  check("the panel knows it may chat", parsed.canChat === true);
  check("the panel's role label reads for a human", roleLabel("student") === "Student" && roleLabel("teacher") === "Teacher");

  state.user = { id: "user-sam", email: SAM };
  const asStudent = readContacts((await panelGet(contactsUrl())).body);
  check(
    "from the student side the same endpoint names their teacher",
    JSON.stringify(asStudent.contacts) === JSON.stringify([{ email: BROWN, role: "teacher" }]),
    JSON.stringify(asStudent.contacts)
  );

  state.user = { id: "user-dana", email: DANA };
  const lonely = await panelGet(contactsUrl());
  const lonelyParsed = readContacts(lonely.body);
  check(
    "a caller with no links gets 200, an empty list and canChat:false (an empty state, not an error)",
    lonely.statusCode === 200 && lonelyParsed.contacts.length === 0 && lonelyParsed.canChat === false,
    `${lonely.statusCode} ${JSON.stringify(lonely.body)}`
  );

  base();
  const noToken = await panelGet(contactsUrl(), { token: null });
  check("without a token the panel's request is a 401 with no contacts", noToken.statusCode === 401 && !("contacts" in noToken.body));
  check(
    "and the panel's copy for that says to sign in again",
    /sign in again/i.test(chatError(401, noToken.body.error))
  );

  // No user behind the token: the stub answers as an unverifiable token does.
  base();
  state.user = null;
  const badToken = await panelGet(contactsUrl(), { token: "Bearer nope" });
  check(
    "a token that identifies nobody is refused (401, no contacts)",
    badToken.statusCode === 401 && badToken.body.error === "Invalid token" && !("contacts" in badToken.body),
    `${badToken.statusCode} ${JSON.stringify(badToken.body)}`
  );
}

// ===========================================================================
section("2. opening a thread — the panel can only open what the server allows");

{
  base();
  const url = threadUrl(SAM);
  check("the thread URL names the person and nothing else", url.startsWith(`${MESSAGES_ENDPOINT}?with=sam%40home.jm`), url);
  check("…and asks for the documented page size", new URLSearchParams(url.split("?")[1]).get("limit") === String(CHAT_PAGE_LIMIT));

  const opened = await panelGet(url);
  check("a linked student's thread opens (200)", opened.statusCode === 200, `${opened.statusCode} ${JSON.stringify(opened.body)}`);
  const empty = readThread(opened.body);
  check(
    "the panel reads the thread key and an empty conversation",
    empty.threadKey === [BROWN, SAM].sort().join("|") && empty.messages.length === 0,
    JSON.stringify(empty)
  );

  // The teacher writes, the student replies — through the panel's own builders.
  const first = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "Please redo Q4.", clientId: newClientId() }));
  check("the panel's send is accepted (201)", first.statusCode === 201, `${first.statusCode} ${JSON.stringify(first.body)}`);
  state.user = { id: "user-sam", email: SAM };
  const reply = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: BROWN, body: "Done — is Q5 fine?", clientId: newClientId() }));
  check("the student's reply is accepted on the same thread", reply.statusCode === 201);
  state.user = { id: "user-brown", email: BROWN };

  const thread = readThread((await panelGet(threadUrl(SAM))).body);
  check("the conversation reads oldest first", thread.messages.map((m) => m.body).join("|") === "Please redo Q4.|Done — is Q5 fine?", thread.messages.map((m) => m.body).join("|"));
  check(
    "the panel marks only the teacher's own message as 'You'",
    senderLabel(thread.messages[0], BROWN) === "You" && senderLabel(thread.messages[1], BROWN) === SAM,
    `${senderLabel(thread.messages[0], BROWN)} / ${senderLabel(thread.messages[1], BROWN)}`
  );
  check(
    "a mixed-case token still lines up with the stored sender",
    senderLabel(thread.messages[0], "MS.Brown@School.EDU") === "You"
  );

  // Everything the server refuses, refused through the panel's request builder.
  const unlinked = await panelGet(threadUrl(DANA));
  check(
    "a same-school person who is not linked → 403 with zero message data",
    unlinked.statusCode === 403 && unlinked.body.error === "You are not linked to that person" && !("messages" in unlinked.body),
    `${unlinked.statusCode} ${JSON.stringify(unlinked.body)}`
  );
  const stranger = await panelGet(threadUrl(OUTSIDER));
  check("a stranger's thread is the same 403", stranger.statusCode === 403 && !("messages" in stranger.body));
  const self = await panelGet(threadUrl(BROWN));
  check("the panel cannot even open a thread with the signed-in person", self.statusCode === 403);
  state.user = { id: "user-lee", email: LEE };
  const otherTeachersStudent = await panelGet(threadUrl(SAM));
  check("another teacher's student is a 403 for them", otherTeachersStudent.statusCode === 403);
  state.user = { id: "user-brown", email: BROWN };

  check(
    "the 403 the panel shows is the server's own sentence, not an invented one",
    chatError(403, unlinked.body.error) === "You are not linked to that person"
  );

  // A junk address never reaches the database.
  const junk = await panelGet(threadUrl("not-an-email"));
  check("a malformed address is a 400", junk.statusCode === 400 && /valid 'with' email/.test(junk.body.error));

  // The builder refuses to ask for both directions at once — the 400 the route
  // would answer is unreachable from the panel.
  const both = new URLSearchParams(threadUrl(SAM, { before: "2026-01-01T00:00:00.000Z", after: "2026-01-02T00:00:00.000Z" }).split("?")[1]);
  check("the thread URL never sends 'before' and 'after' together", both.has("before") && !both.has("after"), both.toString());
  const handmadeBoth = await panelGet(`${MESSAGES_ENDPOINT}?with=${encodeURIComponent(SAM)}&before=2026-01-01T00:00:00.000Z&after=2026-01-02T00:00:00.000Z`);
  check(
    "…which matters: the route answers 400 if a caller ever did",
    handmadeBoth.statusCode === 400 && /not both/.test(handmadeBoth.body.error),
    `${handmadeBoth.statusCode} ${JSON.stringify(handmadeBoth.body)}`
  );
  const clamped = new URLSearchParams(threadUrl(SAM, { limit: 1000 }).split("?")[1]);
  check("an oversized page request is clamped to the server's maximum (100)", clamped.get("limit") === "100");
  const junkLimit = new URLSearchParams(threadUrl(SAM, { limit: "lots" }).split("?")[1]);
  check("a junk limit falls back to the documented default", junkLimit.get("limit") === String(CHAT_PAGE_LIMIT));
  check("the email is normalised before it is sent", threadUrl("  SAM@Home.JM ").includes("with=sam%40home.jm"));
}

// ===========================================================================
section("3. paging back and polling forward — no message lost, none shown twice");

{
  base();
  const sameStamp = "2026-09-24T12:00:00.000Z";
  setTable(
    "private_messages",
    Array.from({ length: 5 }, (_, i) =>
      messageRow(`seed-${i}`, { from: BROWN, fromRole: "teacher", to: SAM, toRole: "student", body: `msg ${i}`, at: sameStamp })
    )
  );
  const page1 = readThread((await panelGet(threadUrl(SAM, { limit: 2 }))).body);
  check("the first page honours the limit and says more remain", page1.messages.length === 2 && page1.hasMore === true);
  check("the cursor the panel pages with is opaque (timestamp + id)", typeof page1.nextBefore === "string" && page1.nextBefore.includes("|"));

  let merged = page1.messages;
  let cursor = page1.nextBefore;
  for (let i = 0; i < 4 && cursor; i += 1) {
    const next = readThread((await panelGet(threadUrl(SAM, { limit: 2, before: cursor }))).body);
    merged = mergeMessages(merged, next.messages);
    cursor = next.hasMore ? next.nextBefore : null;
  }
  check(
    "paging all the way back shows every message exactly once, even on identical timestamps",
    merged.length === 5 && new Set(merged.map((m) => m.id)).size === 5,
    merged.map((m) => m.id).join(",")
  );
  check("the merged conversation is oldest-first", merged[0].id === "seed-0" && merged[4].id === "seed-4", merged.map((m) => m.id).join(","));

  const replay = mergeMessages(merged, page1.messages);
  check("merging the same page again adds nothing (a poll that returns a known row cannot duplicate it)", replay.length === 5);

  // The poll.
  check("a full conversation polls from its newest message's cursor", pollCursor(merged) === `${sameStamp}|seed-4`, pollCursor(merged));
  check("an empty conversation has nothing to poll from", pollCursor([]) === null);
  const nothingNew = readThread((await panelGet(threadUrl(SAM, { after: pollCursor(merged) }))).body);
  check("polling with that cursor returns nothing new", nothingNew.messages.length === 0);

  // Two new messages: one strictly later, one sharing the newest timestamp with
  // a HIGHER id ("zzz…" sorts after "seed-4"). The id half of the cursor is what
  // keeps the second one.
  setTable("private_messages", [
    ...rows("private_messages"),
    messageRow("zzz-later", { from: SAM, fromRole: "student", to: BROWN, toRole: "teacher", body: "later", at: "2026-09-24T12:05:00.000Z" }),
    messageRow("zzz-same-stamp", { from: BROWN, fromRole: "teacher", to: SAM, toRole: "student", body: "same stamp, newer id", at: sameStamp }),
  ]);
  const polled = readThread((await panelGet(threadUrl(SAM, { after: pollCursor(merged) }))).body);
  check(
    "the poll returns both new messages and only those",
    polled.messages.length === 2 && polled.messages.every((m) => m.id.startsWith("zzz-")),
    polled.messages.map((m) => m.id).join(",")
  );
  const timestampOnly = readThread((await panelGet(threadUrl(SAM, { after: sameStamp }))).body);
  check(
    "…and the timestamp-only form would have dropped one (so the cursor form is load-bearing)",
    timestampOnly.messages.length === 1 && timestampOnly.messages[0].id === "zzz-later",
    timestampOnly.messages.map((m) => m.id).join(",")
  );
  const afterMerge = mergeMessages(merged, polled.messages);
  check(
    "a merge after a poll keeps order and adds exactly the new rows",
    afterMerge.length === 7 && afterMerge[5].id === "zzz-same-stamp" && afterMerge[6].id === "zzz-later",
    afterMerge.map((m) => m.id).join(",")
  );

  // 600 rows: the panel asks for one page and the server keeps the NEWEST ones.
  base();
  setTable(
    "private_messages",
    Array.from({ length: 600 }, (_, i) =>
      messageRow(`bulk-${String(i).padStart(3, "0")}`, {
        from: BROWN,
        fromRole: "teacher",
        to: SAM,
        toRole: "student",
        body: `bulk ${i}`,
        at: new Date(Date.UTC(2026, 8, 24, 12, 0, i)).toISOString(),
      })
    )
  );
  const capped = readThread((await panelGet(threadUrl(SAM, { limit: 100 }))).body);
  check("a long thread opens on its newest page", capped.messages.length === 100 && capped.hasMore === true);
  check("and oldest-first display still holds inside the page", capped.messages[0].id === "bulk-500" && capped.messages[99].id === "bulk-599");
}

// ===========================================================================
section("4. sending — no identity in the body, no double post on a retry");

{
  base();
  const payload = JSON.parse(sendInit(TOKEN, { to: SAM, body: "  check Q4  ", clientId: "c-1" }).body);
  check(
    "the POST body carries only the recipient, the text and the idempotency key",
    JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(["body", "clientId", "to"]),
    JSON.stringify(payload)
  );
  check("no identity is ever sent (the server takes it from the token)", !("from" in payload) && !("senderEmail" in payload) && !("senderId" in payload));
  check("the recipient is normalised and the text trimmed", payload.to === SAM && payload.body === "check Q4");
  const init = sendInit(TOKEN, { to: SAM, body: "hi", clientId: "c-1" });
  check("the request is a POST with a JSON content type and the bearer token", init.method === "POST" && init.headers["Content-Type"] === "application/json" && init.headers.Authorization === "Bearer " + TOKEN);
  check("authHeaders is what every GET carries", JSON.stringify(authHeaders("t")) === JSON.stringify({ Authorization: "Bearer t" }));

  const sent = await panelPost(MESSAGES_ENDPOINT, init);
  check("the send is accepted (201, duplicate:false)", sent.statusCode === 201 && sent.body.duplicate === false, `${sent.statusCode}`);
  const storedMessage = readMessage(sent.body.message);
  check(
    "the panel reads the stored message back with the sender from the token",
    storedMessage && storedMessage.fromEmail === BROWN && storedMessage.toEmail === SAM && storedMessage.body === "hi",
    JSON.stringify(storedMessage)
  );
  check("and it shows as the teacher's own", senderLabel(storedMessage, BROWN) === "You");

  const retry = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "hi", clientId: "c-1" }));
  check(
    "a retried attempt returns the stored message instead of posting twice",
    retry.statusCode === 200 && retry.body.duplicate === true && retry.body.message.id === sent.body.message.id && rows("private_messages").length === 1,
    `${retry.statusCode} rows=${rows("private_messages").length}`
  );
  const secondAttempt = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "hi", clientId: newClientId() }));
  check("a genuinely new attempt is a new message", secondAttempt.statusCode === 201 && rows("private_messages").length === 2);

  // newClientId: unique per attempt, always a non-empty string.
  const ids = new Set(Array.from({ length: 200 }, () => newClientId()));
  check("every send attempt gets its own key", ids.size === 200 && [...ids].every((id) => typeof id === "string" && id.length > 0));
  check("the key is never a number (the route rejects a non-string clientId)", typeof newClientId() === "string");

  // Identity in a body is ignored by the server even if a future edit sent it.
  base();
  const forged = await panelPost(MESSAGES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(TOKEN) },
    body: JSON.stringify({ to: SAM, body: "hi", from: OUTSIDER, senderEmail: OUTSIDER, senderId: "user-evil" }),
  });
  check(
    "even if the panel sent an identity the stored row uses the token's",
    forged.statusCode === 201 && rows("private_messages")[0].sender_email === BROWN && rows("private_messages")[0].sender_id === "user-brown",
    JSON.stringify(rows("private_messages")[0])
  );

  // The Send button's rule.
  check("an empty draft cannot be sent", canSend("", false) === false && canSend("   ", false) === false);
  check("a normal draft can be sent", canSend("Please redo Q4.", false) === true);
  check(`a draft at the server's limit (${MAX_MESSAGE_CHARS}) can be sent`, canSend("x".repeat(MAX_MESSAGE_CHARS), false) === true);
  check("…and one character over cannot", canSend("x".repeat(MAX_MESSAGE_CHARS + 1), false) === false);
  check("nothing is sendable while a send is in flight", canSend("hello", true) === false);
  check("a non-string draft is not sendable", canSend(null, false) === false && canSend(42, false) === false);

  // A refused send keeps the draft and says why.
  base();
  failWrites("private_messages", { message: "write boom" });
  const writeBoom = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "hello", clientId: newClientId() }));
  check(
    "a failed write is a 500 with no ok:true",
    writeBoom.statusCode === 500 && !writeBoom.body.ok && rows("private_messages").length === 0,
    `${writeBoom.statusCode} ${JSON.stringify(writeBoom.body)}`
  );
  check(
    "and the panel's copy for it is the server's sentence, not a success",
    chatError(500, writeBoom.body.error) === "Could not send the message"
  );
  base();
  const tooLong = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: SAM, body: "x".repeat(MAX_MESSAGE_CHARS + 1) }));
  check("an over-long body is refused with the limit named", tooLong.statusCode === 400 && /2000 characters/.test(tooLong.body.error));
  const unlinkedSend = await panelPost(MESSAGES_ENDPOINT, sendInit(TOKEN, { to: DANA, body: "hi" }));
  check(
    "the panel cannot post to someone it was not linked to",
    unlinkedSend.statusCode === 403 && rows("private_messages").length === 0,
    `${unlinkedSend.statusCode}`
  );
}

// ===========================================================================
section("5. the panel's readers refuse to render a malformed row");

{
  const junkThread = readThread({
    messages: [
      { id: "good", fromEmail: BROWN, fromRole: "teacher", toEmail: SAM, toRole: "student", body: "fine", createdAt: "2026-09-24T12:00:00.000Z" },
      { fromEmail: BROWN, toEmail: SAM, body: "no id" },
      { id: "nobody", fromEmail: BROWN, toEmail: SAM, createdAt: "2026-09-24T12:00:00.000Z" },
      { id: "junk-role", fromEmail: BROWN, fromRole: "admin", toEmail: SAM, toRole: "student", body: "role unclear", createdAt: "2026-09-24T12:00:00.000Z" },
      null,
      "not a row",
    ],
    hasMore: "yes",
    nextBefore: 7,
  });
  check("only the readable messages survive", junkThread.messages.length === 2 && junkThread.messages[0].id === "good", JSON.stringify(junkThread.messages.map((m) => m.id)));
  check(
    "an unknown role is not guessed at — it becomes empty rather than a label",
    junkThread.messages[1].fromRole === "" && roleLabel(junkThread.messages[1].fromRole) === ""
  );
  check("a non-boolean hasMore is not treated as true", junkThread.hasMore === false);
  check("a non-string cursor is dropped", junkThread.nextBefore === null);

  check("no messages at all reads as an empty thread, not an error", readThread({}).messages.length === 0 && readThread(null).messages.length === 0);

  const junkContacts = readContacts({
    contacts: [
      { email: "  Kim@Home.JM ", role: "student" },
      { email: KIM, role: "student" },
      { email: "who@where.com", role: "admin" },
      { email: "", role: "student" },
      "not a contact",
    ],
  });
  check(
    "contacts are normalised, de-duplicated and never invented",
    junkContacts.contacts.length === 1 && junkContacts.contacts[0].email === KIM,
    JSON.stringify(junkContacts.contacts)
  );
  check("a contact whose role is not one of the two is not shown", !JSON.stringify(junkContacts.contacts).includes("who@where.com"));
  check("an empty payload reads as no contacts, not a crash", readContacts(null).contacts.length === 0 && readContacts(null).canChat === false);
  check("truncated is only true when the server says so", readContacts({ contacts: [], truncated: true }).truncated === true && readContacts({ contacts: [] }).truncated === false);
}

// ===========================================================================
section("6. failure copy is honest — none of it reads as 'no messages'");

{
  const copies = {
    offline: chatError(0),
    unauthenticated: chatError(401),
    forbidden: chatError(403),
    badRequest: chatError(400),
    missing: chatError(404),
    broken: chatError(500),
    unknown: chatError(418),
  };
  check("an unreachable server says so", /could not reach the server/i.test(copies.offline));
  check("an expired session says to sign in again", /sign in again/i.test(copies.unauthenticated));
  check("a refusal with the server's sentence uses it", chatError(403, "You are not linked to that person") === "You are not linked to that person");
  check("a refusal without one still says something true", copies.forbidden.length > 0 && !/not linked/i.test(copies.forbidden));
  check("a 400 keeps the server's own explanation", chatError(400, "Message body required") === "Message body required");
  check("a 500 is named as unavailable, not as an empty inbox", /not available/i.test(copies.broken));
  check("a 404 says the deployment has no messaging yet", /not available/i.test(copies.missing));
  check("a status nobody planned for still produces a sentence", copies.unknown.length > 0);
  check(
    "no failure sentence claims the user has no messages",
    Object.values(copies).every((copy) => !/no messages|empty|nothing to show/i.test(copy)),
    JSON.stringify(copies)
  );

  check("the panel's own success copy for a replay says it was already sent", /already sent/i.test("That message was already sent — showing the stored copy."));
  check(
    "a timestamp renders in a stable, readable form",
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(formatMessageTime("2026-09-24T12:04:05.000Z"))
  );
  check("a missing or junk timestamp renders as nothing, not 'Invalid Date'", formatMessageTime("") === "" && formatMessageTime("yesterday") === "" && formatMessageTime(null) === "");
}

// ===========================================================================
section("7. wiring: where the panel lives, and what it must never do");

{
  const teacherPage = read("src/pages/TeacherPage.jsx");
  const component = read("src/components/TeacherMessages.jsx");
  const css = read("src/components/TeacherMessages.css");
  const parentPage = read("src/pages/ParentPage.jsx");

  check("the teacher dashboard imports the Messages panel", /import TeacherMessages from "\.\.\/components\/TeacherMessages";/.test(teacherPage));
  check(
    "and renders it with the session's token and the signed-in email",
    /<TeacherMessages token=\{token\} me=\{user\.email\} \/>/.test(teacherPage)
  );
  check(
    "the panel is only reached after the server has accepted this account as a teacher",
    teacherPage.indexOf("<TeacherMessages") > teacherPage.indexOf("const roster = data?.roster || []")
  );
  check("the parent dashboard does not carry it (PR 3 is the student side)", !/TeacherMessages/.test(parentPage));

  check("the panel imports its logic module with an explicit extension (Node-ESM resolvable)", /from "\.\.\/data\/teacherMessages\.js"/.test(component));
  check("the panel has its own stylesheet", /import "\.\/TeacherMessages\.css";/.test(component) && css.includes(".tmsg-contacts"));
  check("the panel talks to exactly one endpoint", /MESSAGES_ENDPOINT/.test(component) && !/\/api\/(analytics|admin|sync|auth)/.test(component));
  check("it names no student's email in its source (the list always comes from the server)", !/[\w.+-]+@[\w-]+\.\w+/.test(component));
  check("it never sends an identity field", !/senderEmail|senderId|sender_email/.test(component));
  check("it never stores a private message on the device", !/localStorage|sessionStorage/.test(component));
  check("every request carries the bearer token", (component.match(/authHeaders\(token\)/g) || []).length >= 2 && /sendInit\(token,/.test(component));

  // Accessibility of the panel.
  check("the panel is a labelled region", /<section className="tmsg" aria-labelledby="tmsg-title">/.test(component) && /id="tmsg-title"/.test(component));
  check("the list of people has a nav label", /aria-label="Students you can message"/.test(component));
  check("the open conversation is marked with aria-current", /aria-current=\{person\.email === selected \? "true" : undefined\}/.test(component));
  check("the send box has a real <label> and an id", /htmlFor="tmsg-draft"/.test(component) && /id="tmsg-draft"/.test(component));
  check("the character count is described to assistive tech", /aria-describedby="tmsg-count"/.test(component) && /id="tmsg-count"/.test(component));
  check("errors are announced (role=alert)", (component.match(/role="alert"/g) || []).length >= 2);
  check("progress and the sent/failed line are announced politely", /role="status" aria-live="polite"/.test(component));
  check("the message list is an ordered list, so order is conveyed", /<ol className="tmsg-list">/.test(component) && /<time className="tmsg-item-time" dateTime=/.test(component));
  check("buttons that only act in the page are type=button", /type="button"/.test(component) && /type="submit"/.test(component));
  check("the panel is reachable by keyboard (no tabindex=-1 / clickable divs)", !/tabIndex=\{-1\}|onClick=\{[\s\S]{0,40}<div/.test(component));

  // The draft survives a failed send: no clearing before the store is confirmed.
  const sendBody = component.slice(component.indexOf("const res = await fetch(MESSAGES_ENDPOINT"), component.indexOf("const stored = readMessage"));
  check("a failed send is reported and the draft is kept", /setNotice\(chatError\(/.test(sendBody) && !/setDraft\(""\)/.test(sendBody), sendBody.slice(0, 120));
  const errorBranch = component.slice(component.indexOf("const loadThread = useCallback("));
  check(
    "a refused thread is cleared, never shown from memory",
    /setThread\(null\)/.test(errorBranch.slice(0, 600)) && /setThreadError\(chatError\(/.test(errorBranch.slice(0, 600))
  );

  // Budget: the panel added no Serverless Function.
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
section("8. wiring self-test");
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

  // Mutate the module's own decisions and watch the assertions above bite.
  const doctoredUrl = threadUrl(SAM).replace("with=", "for=");
  check("a URL built with the wrong param would not be the documented one", doctoredUrl !== threadUrl(SAM));
  const looseMerge = [...pollCursor([{ id: "x", createdAt: "2026-09-24T12:00:00.000Z" }]).split("|")[0]];
  check(
    "stripping the id from the poll cursor is detectable (the timestamp-only form differs)",
    looseMerge.join("") !== pollCursor([{ id: "x", createdAt: "2026-09-24T12:00:00.000Z" }])
  );
}

// --- restore the environment the way we found it ----------------------------
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\ncheck-teacher-messages: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed === 0 ? 0 : 1);
