import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function usePurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState({ hasBundle: false, purchasedSubjects: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) {
      setPurchases({ hasBundle: false, purchasedSubjects: [] });
      return;
    }
    async function fetchPurchases() {
      setLoading(true);
      try {
        const res = await fetch("/api/purchases/list", {
          headers: { Authorization: "Bearer " + user.access_token },
        });
        if (res.ok) {
          const data = await res.json();
          setPurchases({ hasBundle: data.hasBundle, purchasedSubjects: data.purchasedSubjects || [] });
          setError(false);
        } else {
          setError(true);
        }
      } catch { setError(true); } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, [user]);

  function hasAccess(subjectId) {
    if (!user) return true;
    // If API error (couldn't check), give benefit of doubt
    if (error) return true;
    if (purchases.hasBundle) return true;
    return purchases.purchasedSubjects.includes(subjectId);
  }

  return { ...purchases, loading, error, hasAccess };
}