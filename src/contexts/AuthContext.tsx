import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Workspace } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  workspace: Workspace | null;
  loading: boolean;
  workspaceLoading: boolean;
  tableUnavailable: boolean;
  refreshWorkspace: () => Promise<Workspace | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  const fetchWorkspace = useCallback(async (userId: string): Promise<Workspace | null> => {
    setWorkspaceLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          setTableUnavailable(true);
        }
        setWorkspace(null);
        return null;
      }

      setTableUnavailable(false);
      const ws = data as Workspace | null;
      setWorkspace(ws);
      return ws;
    } catch {
      setWorkspace(null);
      return null;
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      return null;
    }
    return fetchWorkspace(user.id);
  }, [user, fetchWorkspace]);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkspace(session.user.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkspace(session.user.id);
      } else {
        setWorkspace(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchWorkspace]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        workspace,
        loading,
        workspaceLoading,
        tableUnavailable,
        refreshWorkspace,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

