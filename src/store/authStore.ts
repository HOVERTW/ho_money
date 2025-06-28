import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from '../services/supabase';
import { hybridAuthService } from '../services/hybridAuthService';
import { notificationManager } from '../components/NotificationManager';

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
      console.log('🔐 開始混合認證登錄:', email);
      const result = await hybridAuthService.signIn(email, password);

      console.log('📝 混合認證登錄結果:', {
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        source: result.source,
        error: result.error?.message
      });

      if (result.error) {
        console.error('❌ 混合認證登錄錯誤:', result.error.message);
        const errorMessage = result.error.message;
        set({ error: errorMessage, loading: false });
        // 通知已在 hybridAuthService 中處理
        return;
      }

      if (result.data.user && result.data.session) {
        console.log('✅ 混合認證登錄成功:', result.data.user.email, `(${result.source})`);
        set({
          user: result.data.user,
          session: result.data.session,
          loading: false,
          error: null
        });
        // 通知已在 hybridAuthService 中處理
      } else {
        console.log('⚠️ 混合認證登錄返回空數據');
        const errorMessage = '登錄失敗，請檢查您的電子郵件和密碼';
        set({
          loading: false,
          error: errorMessage
        });

        notificationManager.error('登錄失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 混合認證登錄異常:', error);
      const errorMessage = error instanceof Error ? error.message : '登錄過程中發生錯誤';
      set({
        error: errorMessage,
        loading: false
      });

      notificationManager.error('登錄失敗', errorMessage, true);
    }
  },

  signUp: async (email: string, password: string) => {
    console.log('🔐 AuthStore: 開始混合認證註冊流程:', email);
    set({ loading: true, error: null });

    try {
      console.log('🚀 AuthStore: 調用 hybridAuthService.signUp...');
      const result = await hybridAuthService.signUp(email, password);

      console.log('📝 AuthStore: 混合認證註冊結果:', {
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        source: result.source,
        error: result.error?.message
      });

      if (result.error) {
        console.error('❌ AuthStore: 混合認證註冊錯誤:', result.error.message);
        const errorMessage = result.error.message;
        set({ error: errorMessage, loading: false });
        // 通知已在 hybridAuthService 中處理
        return;
      }

      // 檢查是否有用戶數據
      if (result.data.user) {
        console.log('✅ AuthStore: 用戶已創建:', result.data.user.email, `(${result.source})`);

        if (result.data.session) {
          // 有 session，直接登錄成功
          console.log('🎉 AuthStore: 註冊成功並已登錄');
          set({
            user: result.data.user,
            session: result.data.session,
            loading: false,
            error: null
          });
          // 通知已在 hybridAuthService 中處理
        } else {
          // 沒有 session，但用戶已創建 - 視為成功
          console.log('✅ AuthStore: 註冊成功，用戶已創建');
          set({
            loading: false,
            error: null,
            registrationSuccess: true
          });

          notificationManager.success(
            '註冊成功',
            '帳號已創建成功！您現在可以使用這個帳號密碼登錄了',
            true
          );
        }
      } else {
        console.log('⚠️ AuthStore: 註冊返回空用戶');
        const errorMessage = '註冊失敗，請稍後再試';
        set({
          loading: false,
          error: errorMessage
        });

        notificationManager.error('註冊失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 AuthStore: 混合認證註冊異常:', error);
      const errorMessage = error instanceof Error ? error.message : '註冊時發生未知錯誤';
      set({
        error: errorMessage,
        loading: false
      });

      notificationManager.error('註冊失敗', errorMessage, true);
    }
  },

  signInWithGoogle: async () => {
    console.log('🔐 AuthStore: 開始 Google 登錄流程');
    set({ loading: true, error: null });

    try {
      const result = await hybridAuthService.signInWithGoogle();

      console.log('📝 AuthStore: Google 登錄結果:', {
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        source: result.source,
        error: result.error?.message
      });

      // 🔧 檢查是否是 pending 狀態（Web 重定向）
      if (result.pending) {
        console.log('🌐 AuthStore: Web 平台正在重定向到 Google OAuth');
        // 保持 loading 狀態，不顯示錯誤
        return;
      }

      if (result.error) {
        console.error('❌ AuthStore: Google 登錄錯誤:', result.error.message);
        const errorMessage = result.error.message;
        set({ error: errorMessage, loading: false });
        // 通知已在 hybridAuthService 中處理
        return;
      }

      if (result.data.user && result.data.session) {
        console.log('✅ AuthStore: Google 登錄成功:', result.data.user.email);
        set({
          user: result.data.user,
          session: result.data.session,
          loading: false,
          error: null
        });
        // 通知已在 hybridAuthService 中處理
      } else {
        console.log('⚠️ AuthStore: Google 登錄返回空數據');
        const errorMessage = 'Google 登錄失敗，請稍後再試';
        set({
          loading: false,
          error: errorMessage
        });

        notificationManager.error('Google 登錄失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 AuthStore: Google 登錄異常:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google 登錄失敗';
      set({
        error: errorMessage,
        loading: false
      });

      notificationManager.error('Google 登錄失敗', errorMessage, true);
    }
  },



  signOut: async () => {
    const currentState = get();

    // 🔧 防止重複登出
    if (currentState.loading || !currentState.user) {
      console.log('⚠️ AuthStore: 登出已在進行中或用戶未登錄');
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('🚪 AuthStore: 開始登出流程...');

      // 🔧 使用 hybridAuthService 而不是 authService
      await hybridAuthService.signOut();

      console.log('✅ AuthStore: 登出成功');

      set({
        user: null,
        session: null,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ AuthStore: 登出失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '登出失敗';
      set({
        error: errorMessage,
        loading: false
      });

      // 顯示錯誤通知
      notificationManager.error('登出失敗', errorMessage, true);
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

// 認證狀態監聽器已移至 AppNavigator.tsx 中統一處理
// 避免重複監聽導致的狀態衝突
