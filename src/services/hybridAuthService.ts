/**
 * 混合認證服務
 * 優先使用本地認證，Supabase 作為備用
 * 確保 100% 可以工作的認證系統
 */

import { localAuthService, LocalAuthResponse } from './localAuthService';
import { authService as supabaseAuthService } from './supabase';
import { notificationManager } from '../components/NotificationManager';

// 統一的認證響應格式
export interface HybridAuthResponse {
  data: {
    user: any;
    session: any;
  };
  error: Error | null;
  source: 'local' | 'supabase';
}

class HybridAuthService {
  private useLocalAuth: boolean = true; // 默認使用本地認證

  /**
   * 設置認證模式
   */
  setAuthMode(useLocal: boolean) {
    this.useLocalAuth = useLocal;
    console.log(`🔧 HybridAuth: 切換到 ${useLocal ? '本地' : 'Supabase'} 認證模式`);
  }

  /**
   * 轉換本地認證響應為統一格式
   */
  private convertLocalResponse(response: LocalAuthResponse): HybridAuthResponse {
    return {
      data: response.data,
      error: response.error,
      source: 'local'
    };
  }

  /**
   * 轉換 Supabase 認證響應為統一格式
   */
  private convertSupabaseResponse(response: any): HybridAuthResponse {
    return {
      data: response.data || { user: null, session: null },
      error: response.error,
      source: 'supabase'
    };
  }

  /**
   * 登錄
   */
  async signIn(email: string, password: string): Promise<HybridAuthResponse> {
    console.log('🔐 HybridAuth: 開始登錄流程:', email);
    console.log('📋 使用認證模式:', this.useLocalAuth ? '本地認證' : 'Supabase認證');

    if (this.useLocalAuth) {
      try {
        console.log('🏠 嘗試本地認證...');
        const localResult = await localAuthService.signIn(email, password);
        
        if (localResult.data.user && !localResult.error) {
          console.log('✅ 本地認證成功');
          notificationManager.success(
            '登錄成功',
            `歡迎回來，${email}！（本地認證）`,
            false
          );
          return this.convertLocalResponse(localResult);
        } else {
          console.log('❌ 本地認證失敗，嘗試 Supabase...');
          // 本地認證失敗，嘗試 Supabase
          return await this.trySupabaseAuth(email, password, 'signIn');
        }
      } catch (error) {
        console.error('💥 本地認證異常，嘗試 Supabase...', error);
        return await this.trySupabaseAuth(email, password, 'signIn');
      }
    } else {
      // 直接使用 Supabase
      return await this.trySupabaseAuth(email, password, 'signIn');
    }
  }

  /**
   * 註冊（改進版，確保 Supabase 同步）
   */
  async signUp(email: string, password: string): Promise<HybridAuthResponse> {
    console.log('📝 HybridAuth: 開始註冊流程:', email);
    console.log('📋 使用認證模式:', this.useLocalAuth ? '本地優先' : 'Supabase優先');

    // 🎯 新策略：總是嘗試 Supabase 註冊以確保數據同步
    console.log('☁️ 優先嘗試 Supabase 註冊（確保數據同步）...');

    try {
      const supabaseResult = await this.trySupabaseAuth(email, password, 'signUp');

      if (supabaseResult.data.user && !supabaseResult.error) {
        console.log('✅ Supabase 註冊成功，數據已同步');

        // 🔄 同時在本地創建用戶備份
        if (this.useLocalAuth) {
          try {
            console.log('🏠 創建本地備份...');
            await localAuthService.signUp(email, password);
            console.log('✅ 本地備份創建成功');
          } catch (localError) {
            console.log('⚠️ 本地備份創建失敗，但 Supabase 註冊已成功');
          }
        }

        return supabaseResult;
      } else {
        console.log('❌ Supabase 註冊失敗，嘗試本地註冊...');

        // Supabase 失敗，使用本地註冊
        if (this.useLocalAuth) {
          const localResult = await localAuthService.signUp(email, password);

          if (localResult.data.user && !localResult.error) {
            console.log('✅ 本地註冊成功（Supabase 備用失敗）');
            notificationManager.warning(
              '註冊成功',
              `歡迎加入 FinTranzo，${email}！（本地模式，雲端同步暫時不可用）`,
              false
            );
            return this.convertLocalResponse(localResult);
          }
        }

        // 兩種方式都失敗
        console.log('❌ 所有註冊方式都失敗');
        return supabaseResult; // 返回 Supabase 的錯誤信息
      }
    } catch (error) {
      console.error('💥 註冊過程異常:', error);

      // 異常情況下嘗試本地註冊
      if (this.useLocalAuth) {
        try {
          console.log('🏠 異常情況下嘗試本地註冊...');
          const localResult = await localAuthService.signUp(email, password);

          if (localResult.data.user && !localResult.error) {
            console.log('✅ 本地註冊成功（異常恢復）');
            notificationManager.warning(
              '註冊成功',
              `歡迎加入 FinTranzo，${email}！（離線模式）`,
              false
            );
            return this.convertLocalResponse(localResult);
          }
        } catch (localError) {
          console.error('💥 本地註冊也失敗:', localError);
        }
      }

      // 所有方式都失敗
      notificationManager.error(
        '註冊失敗',
        '註冊服務暫時不可用，請稍後再試',
        true
      );

      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error('註冊失敗'),
        source: 'local'
      };
    }
  }

  /**
   * 嘗試 Supabase 認證
   */
  private async trySupabaseAuth(
    email: string, 
    password: string, 
    action: 'signIn' | 'signUp'
  ): Promise<HybridAuthResponse> {
    try {
      console.log(`☁️ 嘗試 Supabase ${action}...`);
      
      let supabaseResult;
      if (action === 'signIn') {
        supabaseResult = await supabaseAuthService.signIn(email, password);
      } else {
        supabaseResult = await supabaseAuthService.createUserDirectly(email, password);
      }
      
      if (supabaseResult.data.user && !supabaseResult.error) {
        console.log('✅ Supabase 認證成功');
        notificationManager.success(
          action === 'signIn' ? '登錄成功' : '註冊成功',
          `${action === 'signIn' ? '歡迎回來' : '歡迎加入 FinTranzo'}，${email}！（雲端認證）`,
          false
        );
        return this.convertSupabaseResponse(supabaseResult);
      } else {
        console.log('❌ Supabase 認證也失敗');
        const errorMessage = supabaseResult.error?.message || `${action === 'signIn' ? '登錄' : '註冊'}失敗`;
        
        notificationManager.error(
          action === 'signIn' ? '登錄失敗' : '註冊失敗',
          `本地和雲端認證都失敗：${errorMessage}`,
          true
        );
        
        return this.convertSupabaseResponse(supabaseResult);
      }
    } catch (error) {
      console.error('💥 Supabase 認證異常:', error);
      const errorMessage = error instanceof Error ? error.message : '認證服務異常';
      
      notificationManager.error(
        action === 'signIn' ? '登錄失敗' : '註冊失敗',
        `認證服務異常：${errorMessage}`,
        true
      );
      
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'supabase'
      };
    }
  }

  /**
   * Google 登錄
   */
  async signInWithGoogle(): Promise<HybridAuthResponse> {
    console.log('🔐 HybridAuth: Google 登錄（僅支援 Supabase）');
    
    try {
      const supabaseResult = await supabaseAuthService.signInWithGoogle();
      
      if (supabaseResult.data.user && !supabaseResult.error) {
        console.log('✅ Google 登錄成功');
        notificationManager.success(
          'Google 登錄成功',
          `歡迎回來，${supabaseResult.data.user.email}！`,
          false
        );
      } else {
        console.log('❌ Google 登錄失敗');
        const errorMessage = supabaseResult.error?.message || 'Google 登錄失敗';
        notificationManager.error(
          'Google 登錄失敗',
          errorMessage,
          true
        );
      }
      
      return this.convertSupabaseResponse(supabaseResult);
    } catch (error) {
      console.error('💥 Google 登錄異常:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google 登錄異常';
      
      notificationManager.error(
        'Google 登錄失敗',
        errorMessage,
        true
      );
      
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'supabase'
      };
    }
  }

  /**
   * 獲取當前會話
   */
  async getSession(): Promise<HybridAuthResponse> {
    if (this.useLocalAuth) {
      try {
        const localResult = await localAuthService.getSession();
        if (localResult.data.session) {
          return this.convertLocalResponse(localResult);
        }
      } catch (error) {
        console.error('💥 獲取本地會話失敗:', error);
      }
    }

    // 嘗試 Supabase 會話
    try {
      const supabaseResult = await supabaseAuthService.getCurrentSession();
      return this.convertSupabaseResponse(supabaseResult);
    } catch (error) {
      console.error('💥 獲取 Supabase 會話失敗:', error);
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error('獲取會話失敗'),
        source: 'local'
      };
    }
  }

  /**
   * 登出
   */
  async signOut(): Promise<void> {
    console.log('🚪 HybridAuth: 開始登出流程');
    
    try {
      // 同時清除本地和 Supabase 會話
      await Promise.all([
        localAuthService.signOut(),
        supabaseAuthService.signOut()
      ]);
      
      console.log('✅ 登出成功');
      notificationManager.success(
        '登出成功',
        '您已安全登出',
        false
      );
    } catch (error) {
      console.error('💥 登出失敗:', error);
      notificationManager.error(
        '登出失敗',
        '登出過程中發生錯誤',
        true
      );
    }
  }

  /**
   * 切換到本地認證模式
   */
  enableLocalAuth() {
    this.setAuthMode(true);
    notificationManager.info(
      '認證模式切換',
      '已切換到本地認證模式',
      false
    );
  }

  /**
   * 切換到 Supabase 認證模式
   */
  enableSupabaseAuth() {
    this.setAuthMode(false);
    notificationManager.info(
      '認證模式切換',
      '已切換到雲端認證模式',
      false
    );
  }

  /**
   * 清除所有認證數據（測試用）
   */
  async clearAllAuthData(): Promise<void> {
    try {
      await localAuthService.clearAllData();
      await supabaseAuthService.signOut();
      console.log('✅ 所有認證數據已清除');
    } catch (error) {
      console.error('💥 清除認證數據失敗:', error);
    }
  }
}

// 創建單例實例
export const hybridAuthService = new HybridAuthService();
export default hybridAuthService;
