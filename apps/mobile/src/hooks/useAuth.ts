import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        await loadProfile(authUser.id, authUser.email ?? "");
      } else {
        setLoading(false);
      }
    });

    // Listener de mudança de auth
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email ?? "");
        } else {
          setUser(null);
          setLoading(false);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };

    async function loadProfile(userId: string, email: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, tenant_id, full_name")
        .eq("id", userId)
        .single();

      if (profile) {
        setUser({
          id: userId,
          email,
          role: profile.role,
          tenantId: profile.tenant_id,
        });
      }
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, loading, signIn, signOut };
}
