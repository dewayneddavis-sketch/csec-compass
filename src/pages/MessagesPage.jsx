import { useAuth } from "../context/AuthContext";
import StudentMessages from "../components/StudentMessages";
import "./MessagesPage.css";

// The student's Messages page — the destination of the "Messages" link in the
// top navbar (owner direction 2026-09-27: Messages belongs in the navigation
// bar, not as a tab inside /account, which is where PR #103 first put it).
//
// The body is the SAME shared component the teacher dashboard mounts
// (src/components/StudentMessages.jsx → src/components/MessagesPanel.jsx) with
// the student's perspective copy — reused, never forked, so the two sides of a
// conversation cannot drift apart.
//
// The panel keeps no roster of its own: api/messages.js answers with the
// teachers linked to THIS account and nothing else, so this page cannot show,
// or claim, a teacher the account is not linked to. Nothing here changes who a
// student may talk to.
//
// Reachable only through ProtectedRoute in src/App.jsx, so there is always a
// signed-in user; the request carries the session token, never a stored or
// typed identity.
export default function MessagesPage() {
  const { user, session } = useAuth();

  return (
    <div className="msg-page">
      <h1>Messages</h1>
      <p className="msg-lead">
        Signed in as <strong>{user?.email}</strong>. These conversations are private between you and
        each teacher — your teachers read and answer them from their own dashboard.
      </p>
      <StudentMessages token={session?.access_token} me={user?.email} />
    </div>
  );
}
