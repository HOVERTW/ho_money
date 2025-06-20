import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from '../services/supabase';
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
      console.log('🔐 開始登錄:', email);
      const { data, error } = await authService.signIn(email, password);

      console.log('📝 登錄結果:', { data, error });

      if (error) {
        console.error('❌ 登錄錯誤:', error.message);
        const errorMessage = error.message;
        set({ error: errorMessage, loading: false });

        // 顯示登錄失敗通知
        notificationManager.error(
          '登錄失敗',
          errorMessage.includes('Invalid login credentials')
            ? '帳號或密碼錯誤，請檢查後重試'
            : errorMessage,
          true
        );
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

        // 顯示登錄成功通知
        notificationManager.success(
          '登錄成功',
          `歡迎回來，${data.user.email}！`,
          false
        );
      } else {
        console.log('⚠️ 登錄返回空數據');
        const errorMessage = '登錄失敗，請檢查您的電子郵件和密碼';
        set({
          loading: false,
          error: errorMessage
        });

        // 顯示登錄失敗通知
        notificationManager.error('登錄失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 登錄異常:', error);
      const errorMessage = error instanceof Error ? error.message : '登錄過程中發生錯誤';
      set({
        error: errorMessage,
        loading: false
      });

      // 顯示登錄異常通知
      notificationManager.error('登錄失敗', errorMessage, true);
    }
  },

  signUp: async (email: string, password: string) => {
    console.log('🔐 AuthStore: 開始註冊流程:', email);
    set({ loading: true, error: null });

    try {
      console.log('🚀 AuthStore: 調用 authService.createUserDirectly...');
      const { data, error } = await authService.createUserDirectly(email, password);

      console.log('📝 AuthStore: 註冊結果:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: error?.message
      });

      if (error) {
        console.error('❌ AuthStore: 註冊錯誤:', error.message);
        const errorMessage = error.message;
        set({ error: errorMessage, loading: false });

        // 顯示註冊失敗通知
        notificationManager.error(
          '註冊失敗',
          errorMessage.includes('already registered')
            ? '此電子郵件已被註冊，請使用其他郵箱或直接登錄'
            : errorMessage,
          true
        );
        return;
      }

      // 檢查是否有用戶數據
      if (data.user) {
        console.log('✅ AuthStore: 用戶已創建:', data.user.email);
        console.log('📧 AuthStore: 用戶確認狀態:', data.user.email_confirmed_at ? '已確認' : '未確認');

        if (data.session) {
          // 有 session，直接登錄成功
          console.log('🎉 AuthStore: 註冊成功並已登錄');
          set({
            user: data.user,
            session: data.session,
            loading: false,
            error: null
          });

          // 顯示註冊成功並登錄通知
          notificationManager.success(
            '註冊成功',
            `歡迎加入 FinTranzo，${data.user.email}！`,
            false
          );
        } else {
          // 沒有 session，但用戶已創建 - 視為成功
          console.log('✅ AuthStore: 註冊成功，用戶已創建');
          set({
            loading: false,
            error: null,
            registrationSuccess: true
          });

          // 顯示註冊成功通知，提示用戶可以直接登錄
          notificationManager.success(
            '註冊成功',
            '帳號已創建成功！請使用您的帳號密碼登錄',
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

        // 顯示註冊失敗通知
        notificationManager.error('註冊失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 AuthStore: 註冊異常:', error);
      const errorMessage = error instanceof Error ? error.message : '註冊時發生未知錯誤';
      set({
        error: errorMessage,
        loading: false
      });

      // 顯示註冊異常通知
      notificationManager.error('註冊失敗', errorMessage, true);
    }
  },

  signInWithGoogle: async () => {
    console.log('🔐 AuthStore: 開始 Google 登錄流程');
    set({ loading: true, error: null });

    try {
      const { data, error } = await authService.signInWithGoogle();

      console.log('📝 AuthStore: Google 登錄結果:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: error?.message
      });

      if (error) {
        console.error('❌ AuthStore: Google 登錄錯誤:', error.message);
        const errorMessage = error.message;
        set({ error: errorMessage, loading: false });

        // 顯示Google登錄失敗通知
        notificationManager.error(
          'Google 登錄失敗',
          errorMessage.includes('用戶取消')
            ? '您已取消 Google 登錄'
            : errorMessage.includes('網路')
            ? '網路連接異常，請檢查網路後重試'
            : errorMessage,
          true
        );
        return;
      }

      if (data.user && data.session) {
        console.log('✅ AuthStore: Google 登錄成功:', data.user.email);
        set({
          user: data.user,
          session: data.session,
          loading: false,
          error: null
        });

        // 顯示Google登錄成功通知
        notificationManager.success(
          'Google 登錄成功',
          `歡迎回來，${data.user.email}！`,
          false
        );
      } else {
        console.log('⚠️ AuthStore: Google 登錄返回空數據');
        const errorMessage = 'Google 登錄失敗，請稍後再試';
        set({
          loading: false,
          error: errorMessage
        });

        // 顯示Google登錄失敗通知
        notificationManager.error('Google 登錄失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 AuthStore: Google 登錄異常:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google 登錄失敗';
      set({
        error: errorMessage,
        loading: false
      });

      // 顯示Google登錄異常通知
      notificationManager.error('Google 登錄失敗', errorMessage, true);
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

// 認證狀態監聽器已移至 AppNavigator.tsx 中統一處理
// 避免重複監聽導致的狀態衝突
