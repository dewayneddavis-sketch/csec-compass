import MessagesPanel from "./MessagesPanel";
import { CHAT_COPY } from "../data/teacherMessages.js";

// The teacher dashboard's Messages panel (chat PR 2 of 3).
//
// The panel itself is SHARED: src/components/MessagesPanel.jsx renders it and
// src/data/teacherMessages.js holds every sentence both sides use, so this
// panel and the student's Messages tab (/account, PR 3) cannot drift apart.
// This wrapper only names the teacher's perspective, and keeps /teacher's
// existing import and props exactly as they were.
export default function TeacherMessages({ token, me }) {
  return <MessagesPanel token={token} me={me} copy={CHAT_COPY.teacher} />;
}
