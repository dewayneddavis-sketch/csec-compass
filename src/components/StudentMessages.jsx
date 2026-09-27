import MessagesPanel from "./MessagesPanel";
import { CHAT_COPY } from "../data/teacherMessages.js";

// The student's Messages view (chat PR 3 of 3): the SAME panel the teacher
// dashboard uses, with the student's perspective copy, mounted on the student's
// own page. It lived on /account (first as a card, then as a tab) until the owner
// moved it to the top navbar's /messages page on 2026-09-27.
//
// It shows only the teachers LINKED to this student's email address, because
// api/messages.js answers with the caller's own links and nothing else — the
// panel keeps no roster of its own and cannot name a teacher the server did not
// return. A teacher who is not linked gets 403 with zero message data, and the
// panel shows that refusal as its own honest sentence rather than an empty
// conversation.
//
// The student's identity is never sent: every request carries only the auth
// token, the recipient, the text and an idempotency key.
export default function StudentMessages({ token, me }) {
  return <MessagesPanel token={token} me={me} copy={CHAT_COPY.student} />;
}
