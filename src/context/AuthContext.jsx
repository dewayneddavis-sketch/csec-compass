import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "../lib/supabase";
import { setSyncSession, syncStoredProgress } from "../data/lessonProgress";
import { ACCOUNT_ROLE_METADATA_KEY, accountRoleFromUser, cleanAccountRole } from "../data/accountRoles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); setUser(session?.user ?? null); setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // The teacher dashboard reads user_progress, which only the student's own
  // browser can write. Point the shared progress store at the current session
  // (so signing out stops the pushes at once) and, on sign-in, push what this
  // device already has — a student who ticked lessons while signed out, or
  // before this existed, would otherwise stay invisible to their teacher.
  useEffect(() => {
    setSyncSession(session);
    if (session) syncStoredProgress();
  }, [session]);

  // Creating an account now carries the owner's identity declaration (owner
  // instruction 2026-11-05): "the person must identify I am a student, I am a
  // Teacher, I am a Parent". It is stored in the account's own Supabase
  // user_metadata — a field Supabase already keeps, so NO migration is needed —
  // and it only decides which dashboard we OFFER. It grants nothing: see the
  // long note at the top of src/data/accountRoles.js.
  //
  // The role stays OPTIONAL here on purpose. Both signup forms require it, but
  // an older caller (or a retry) that passes nothing must still be able to
  // create an account rather than be broken by this change; such an account
  // simply has no declaration and reads as "".
  const signUp = useCallback(async (email, password, role) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    const appUrl = import.meta.env.VITE_APP_URL || "https://csec-compass.vercel.app";
    const declared = cleanAccountRole(role);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: appUrl + "/auth",
        ...(declared ? { data: { [ACCOUNT_ROLE_METADATA_KEY]: declared } } : {}),
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null); setSession(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl + "/auth/reset-password",
    });
    return { data, error };
  }, []);

  // The identity this account declared when it was created ("" when it never
  // declared one — an older account). Used ONLY to decide which dashboard entry
  // point to offer; it is never sent to the server as proof of anything.
  const accountRole = accountRoleFromUser(user);

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    accountRole,
    isAuthenticated: !!user,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export default AuthContext;