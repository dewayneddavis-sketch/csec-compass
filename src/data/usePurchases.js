import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { hasSubjectAccess } from "./access";

// FAIL-CLOSED access hook.
// Any unknown state (logged out, still loading, API error, missing token)
// means NO access — the caller gets the 2-lesson preview + paywall.
// Only a verified purchase, bundle, or school license returned by
// /api/purchases/list unlocks a subject.
const NO_ACCESS = {
  hasBundle: false,
  hasSchoolLicense: false,
  schoolLicenseSeats: 0,
  purchasedSubjects: [],
};

export function usePurchases() {
  const { user, session } = useAuth();
  const [purchases, setPurchases] = useState(NO_ACCESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setPurchases(NO_ACCESS);
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
            // School license = every subject unlocked for up to N students
            // (seats summed across licenses). Reported separately so the UI
            // can show the licence instead of "All Subjects Bundle".
            hasSchoolLicense: data.hasSchoolLicense === true,
            schoolLicenseSeats: Number.isFinite(data.schoolLicenseSeats) ? data.schoolLicenseSeats : 0,
            purchasedSubjects: Array.isArray(data.purchasedSubjects) ? data.purchasedSubjects : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          // Fail closed: discard any stale purchase state on error.
          setPurchases(NO_ACCESS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPurchases();
    return () => { cancelled = true; };
  }, [user, session]);

  // The rule itself lives in ./access.js (pure, so the harnesses can drive it
  // directly); this wrapper only supplies the hook's state.
  function hasAccess(subjectId) {
    return hasSubjectAccess(
      {
        user,
        loading,
        error: error != null,
        hasBundle: purchases.hasBundle,
        hasSchoolLicense: purchases.hasSchoolLicense,
        purchasedSubjects: purchases.purchasedSubjects,
      },
      subjectId
    );
  }

  return { ...purchases, loading, error: error != null, hasAccess };
}
