import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "../lib/supabase";

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

  const signUp = useCallback(async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    const appUrl = import.meta.env.VITE_APP_URL || "https://csec-compass.vercel.app";
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: appUrl + "/auth" }
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

  const value = { user, session, loading, signUp, signIn, signOut, resetPassword, isAuthenticated: !!user };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export default AuthContext;