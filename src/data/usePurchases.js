import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// FAIL-CLOSED access hook.
// Any unknown state (logged out, still loading, API error, missing token)
// means NO access — the caller gets the 2-lesson preview + paywall.
// Only a verified purchase (or bundle grant) returned by
// /api/purchases/list unlocks a subject.
export function usePurchases() {
  const { user, session } = useAuth();
  const [purchases, setPurchases] = useState({ hasBundle: false, purchasedSubjects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setPurchases({ hasBundle: false, purchasedSubjects: [] });
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchPurchases() {
      setLoading(true);
      setError(null);
      try {
        // NOTE: the access token lives on the session, NOT on user.
        // (A previous version read user.access_token — always undefined —
        // so every check 401'd and hasAccess() failed OPEN to full access.)
        const token = session?.access_token;
        if (!token) throw new Error("No access token in session");
        const res = await fetch("/api/purchases/list", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw new Error("Purchases API returned " + res.status);
        const data = await res.json();
        if (!cancelled) {
          setPurchases({
            hasBundle: data.hasBundle === true,
            purchasedSubjects: Array.isArray(data.purchasedSubjects) ? data.purchasedSubjects : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          // Fail closed: discard any stale purchase state on error.
          setPurchases({ hasBundle: false, purchasedSubjects: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPurchases();
    return () => { cancelled = true; };
  }, [user, session]);

  function hasAccess(subjectId) {
    if (!user) return false;
    if (loading) return false;
    if (error) return false;
    if (purchases.hasBundle) return true;
    return purchases.purchasedSubjects.includes(subjectId);
  }

  return { ...purchases, loading, error: error != null, hasAccess };
}
