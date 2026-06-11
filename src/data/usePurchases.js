import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function usePurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState({ hasBundle: false, purchasedSubjects: [] });
  const [loading, setLoading] = useState(false);

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
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, [user]);

  function hasAccess(subjectId) {
    if (!user) return true;
    if (purchases.hasBundle) return true;
    return purchases.purchasedSubjects.includes(subjectId);
  }

  return { ...purchases, loading, hasAccess };
}