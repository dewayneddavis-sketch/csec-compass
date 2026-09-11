import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getSubjectModules, normalizeModules } from "./contentLoader";
import {
  getLocalAttempts,
  fetchServerSummary,
  mergeAttempts,
  aggregateWeakTopics,
  passRateTrend,
} from "./analytics";

// Loads all quiz attempts for a subject (local + server merged, deduped),
// plus derived weak-topic aggregation and pass-rate trend.
// refreshKey can be bumped to force a reload (e.g. after recording a new attempt).
export function useQuizAnalytics(subjectId, refreshKey) {
  const { session } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const local = subjectId ? getLocalAttempts(subjectId) : [];
      const server = subjectId ? await fetchServerSummary(subjectId, session) : null;
      if (cancelled) return;
      const merged = mergeAttempts(local, server?.attempts);
      setAttempts(merged);
      setTopics(aggregateWeakTopics(merged));
      setTrend(passRateTrend(merged));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [subjectId, session, refreshKey]);

  return { attempts, topics, trend, loading };
}

// Builds a lesson lookup (topic lesson id -> { title, moduleTitle }) for the
// targeted revision path links.
export function useLessonLookup(subjectId) {
  const [lookup, setLookup] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mods = await getSubjectModules(subjectId);
      if (cancelled) return;
      const map = {};
      for (const m of normalizeModules(mods)) {
        for (const l of m.lessons) map[l.id] = { title: l.title, moduleTitle: m.title };
      }
      setLookup(map);
    })();
    return () => { cancelled = true; };
  }, [subjectId]);
  return lookup;
}