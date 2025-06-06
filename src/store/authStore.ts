import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await authService.signIn(email, password);
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      if (data.user && data.session) {
        set({ 
          user: data.user, 
          session: data.session, 
          loading: false,
          error: null 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false 
      });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await authService.signUp(email, password);
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      if (data.user && data.session) {
        set({ 
          user: data.user, 
          session: data.session, 
          loading: false,
          error: null 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false 
      });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await authService.signOut();
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ 
        user: null, 
        session: null, 
        loading: false,
        error: null 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false 
      });
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await authService.resetPassword(email);
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ loading: false, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false 
      });
    }
  },

  setUser: (user: User | null) => set({ user }),
  setSession: (session: Session | null) => set({ session }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
