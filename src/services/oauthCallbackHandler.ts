/**
 * OAuth 回調處理服務
 * 專門處理 Google OAuth 重定向後的會話恢復
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import { notificationManager } from '../components/NotificationManager';

class OAuthCallbackHandler {
  private isProcessing = false;

  /**
   * 檢查並處理 OAuth 回調
   */
  async handleOAuthCallback(): Promise<boolean> {
    if (this.isProcessing) {
      console.log('🔄 OAuth 回調處理中，跳過重複處理');
      return false;
    }

    try {
      this.isProcessing = true;
      console.log('🔄 檢查 OAuth 回調...');

      // 只在 Web 環境中處理 URL 參數
      if (Platform.OS !== 'web') {
        console.log('📱 非 Web 環境，跳過 URL 參數檢查');
        return false;
      }

      // 檢查 URL 中的認證參數
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const tokenType = urlParams.get('token_type');
      const expiresIn = urlParams.get('expires_in');

      console.log('📋 URL 參數檢查:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenType,
        expiresIn
      });

      if (!accessToken) {
        console.log('ℹ️ 沒有 OAuth 回調參數，跳過處理');
        return false; // 🔧 直接返回，不執行任何 Supabase 操作
      }

      console.log('✅ 發現 OAuth 回調參數，開始處理...');

      // 使用 Supabase 的內建方法處理 OAuth 回調
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ OAuth 回調處理錯誤:', error.message);
        notificationManager.error(
          'Google 登錄失敗',
          `認證處理失敗: ${error.message}`,
          true
        );
        return false;
      }

      if (data.session && data.session.user) {
        console.log('🎉 OAuth 回調處理成功:', data.session.user.email);
        
        // 顯示成功通知
        notificationManager.success(
          'Google 登錄成功',
          `歡迎回來，${data.session.user.email}！`,
          false
        );

        // 清理 URL 參數
        this.cleanupUrlParams();

        return true;
      } else {
        console.log('⚠️ OAuth 回調未產生有效會話');
        
        // 嘗試手動設置會話
        if (accessToken && refreshToken) {
          console.log('🔧 嘗試手動設置會話...');
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('❌ 手動設置會話失敗:', sessionError.message);
            notificationManager.error(
              'Google 登錄失敗',
              `會話設置失敗: ${sessionError.message}`,
              true
            );
            return false;
          }

          if (sessionData.session && sessionData.session.user) {
            console.log('✅ 手動設置會話成功:', sessionData.session.user.email);
            
            notificationManager.success(
              'Google 登錄成功',
              `歡迎回來，${sessionData.session.user.email}！`,
              false
            );

            // 清理 URL 參數
            this.cleanupUrlParams();

            return true;
          }
        }

        notificationManager.error(
          'Google 登錄失敗',
          '無法建立有效的登錄會話',
          true
        );
        return false;
      }

    } catch (error) {
      console.error('💥 OAuth 回調處理異常:', error);
      notificationManager.error(
        'Google 登錄失敗',
        `處理異常: ${error instanceof Error ? error.message : '未知錯誤'}`,
        true
      );
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 清理 URL 參數
   */
  private cleanupUrlParams(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        // 移除 OAuth 相關的 URL 參數
        const url = new URL(window.location.href);
        const paramsToRemove = [
          'access_token',
          'refresh_token',
          'expires_in',
          'token_type',
          'type'
        ];

        paramsToRemove.forEach(param => {
          url.searchParams.delete(param);
        });

        // 更新 URL 但不重新加載頁面
        const newUrl = url.pathname + (url.search ? url.search : '');
        window.history.replaceState({}, document.title, newUrl);
        
        console.log('🧹 URL 參數已清理');
      } catch (error) {
        console.warn('⚠️ URL 參數清理失敗:', error);
      }
    }
  }

  /**
   * 檢查當前是否有有效會話
   */
  async checkCurrentSession(): Promise<boolean> {
    try {
      console.log('👤 檢查當前會話...');
      
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.log('❌ 會話檢查錯誤:', error.message);
        return false;
      }

      if (data.session && data.session.user) {
        console.log('✅ 發現有效會話:', data.session.user.email);
        return true;
      } else {
        console.log('ℹ️ 沒有有效會話');
        return false;
      }

    } catch (error) {
      console.error('💥 會話檢查異常:', error);
      return false;
    }
  }

  /**
   * 初始化 OAuth 回調處理
   * 應該在應用啟動時調用
   */
  async initialize(): Promise<void> {
    console.log('🚀 初始化 OAuth 回調處理器...');

    try {
      // 檢查當前會話
      const hasSession = await this.checkCurrentSession();
      
      if (!hasSession) {
        // 如果沒有會話，檢查是否有 OAuth 回調
        await this.handleOAuthCallback();
      }

      console.log('✅ OAuth 回調處理器初始化完成');
    } catch (error) {
      console.error('❌ OAuth 回調處理器初始化失敗:', error);
    }
  }

  /**
   * 監聽認證狀態變化
   */
  setupAuthListener(): void {
    console.log('🔄 設置認證狀態監聽器...');

    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 認證狀態變化: ${event}`);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            console.log('✅ 用戶已登錄:', session.user.email);
          }
          break;
        case 'SIGNED_OUT':
          console.log('👋 用戶已登出');
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token 已刷新');
          break;
        case 'USER_UPDATED':
          console.log('👤 用戶信息已更新');
          break;
        default:
          console.log('🔄 其他認證事件:', event);
      }
    });
  }
}

// 創建單例實例
export const oauthCallbackHandler = new OAuthCallbackHandler();

// 默認導出
export default oauthCallbackHandler;
