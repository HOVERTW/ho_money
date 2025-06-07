import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  registrationSuccess?: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearRegistrationSuccess: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  registrationSuccess: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      console.log('🔐 開始登錄:', email);
      const { data, error } = await authService.signIn(email, password);

      console.log('📝 登錄結果:', { data, error });

      if (error) {
        console.error('❌ 登錄錯誤:', error.message);
        set({ error: error.message, loading: false });
        return;
      }

      if (data.user && data.session) {
        console.log('✅ 登錄成功:', data.user.email);
        set({
          user: data.user,
          session: data.session,
          loading: false,
          error: null
        });
      } else {
        console.log('⚠️ 登錄返回空數據');
        set({
          loading: false,
          error: '登錄失敗，請檢查您的電子郵件和密碼'
        });
      }
    } catch (error) {
      console.error('💥 登錄異常:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false
      });
    }
  },

  signUp: async (email: string, password: string) => {
    console.log('🔐 AuthStore: 開始註冊流程:', email);
    set({ loading: true, error: null });

    try {
      console.log('🚀 AuthStore: 調用 authService.signUp...');
      const { data, error } = await authService.signUp(email, password);

      console.log('📝 AuthStore: 註冊結果:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: error?.message
      });

      if (error) {
        console.error('❌ AuthStore: 註冊錯誤:', error.message);
        set({ error: error.message, loading: false });
        return;
      }

      // 檢查是否有用戶數據
      if (data.user) {
        console.log('✅ AuthStore: 用戶已創建:', data.user.email);
        console.log('📧 AuthStore: 用戶確認狀態:', data.user.email_confirmed_at ? '已確認' : '未確認');

        if (data.session) {
          // 有 session，直接登錄
          console.log('🎉 AuthStore: 註冊成功並已登錄');
          set({
            user: data.user,
            session: data.session,
            loading: false,
            error: null
          });
        } else {
          // 沒有 session，這是正常的，需要電子郵件確認
          console.log('📧 AuthStore: 註冊成功，需要電子郵件確認');
          set({
            loading: false,
            error: null, // 不設置錯誤，因為這是成功的
            // 添加成功標記
            registrationSuccess: true
          });
        }
      } else {
        console.log('⚠️ AuthStore: 註冊返回空用戶');
        set({
          loading: false,
          error: '註冊失敗，請稍後再試'
        });
      }
    } catch (error) {
      console.error('💥 AuthStore: 註冊異常:', error);
      set({
        error: error instanceof Error ? error.message : '註冊時發生未知錯誤',
        loading: false
      });
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await authService.signInWithGoogle();

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
        error: error instanceof Error ? error.message : 'Google 登錄失敗',
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
  clearRegistrationSuccess: () => set({ registrationSuccess: false }),
}));

// 設置認證狀態監聽器
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 認證狀態變化:', event, session?.user?.email);

  const { setUser, setSession, setLoading } = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session) {
    console.log('✅ 用戶已登錄:', session.user.email);
    setUser(session.user);
    setSession(session);
    setLoading(false);
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 用戶已登出');
    setUser(null);
    setSession(null);
    setLoading(false);
  } else if (event === 'TOKEN_REFRESHED' && session) {
    console.log('🔄 Token 已刷新');
    setUser(session.user);
    setSession(session);
  }
});
