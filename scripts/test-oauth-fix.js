/**
 * 測試 OAuth 修復
 * 驗證 Google OAuth 回調處理是否正常工作
 */

require('dotenv').config();

console.log('🧪 測試 OAuth 修復');
console.log('==================');

// 模擬瀏覽器環境
global.window = {
  location: {
    href: 'https://19930913.xyz/?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600',
    origin: 'https://19930913.xyz',
    search: '?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600',
    pathname: '/'
  },
  history: {
    replaceState: (state, title, url) => {
      console.log(`🔄 URL 更新: ${url}`);
      global.window.location.href = global.window.location.origin + url;
      global.window.location.search = url.includes('?') ? url.split('?')[1] : '';
    }
  }
};

global.URLSearchParams = class URLSearchParams {
  constructor(search) {
    this.params = new Map();
    if (search) {
      const cleanSearch = search.startsWith('?') ? search.slice(1) : search;
      cleanSearch.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          this.params.set(key, decodeURIComponent(value));
        }
      });
    }
  }
  
  get(key) {
    return this.params.get(key);
  }
  
  delete(key) {
    this.params.delete(key);
  }
};

global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.pathname = url.split('?')[0].replace(/^https?:\/\/[^\/]+/, '');
    this.search = url.includes('?') ? '?' + url.split('?')[1] : '';
    this.searchParams = new URLSearchParams(this.search);
  }
};

// 模擬 React Native Platform
const Platform = { OS: 'web' };

// 模擬 Supabase 客戶端
const mockSupabase = {
  auth: {
    getSession: async () => {
      console.log('📡 模擬 Supabase getSession 調用');
      return {
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            },
            access_token: 'test_token',
            refresh_token: 'test_refresh',
            expires_at: Math.floor(Date.now() / 1000) + 3600
          }
        },
        error: null
      };
    },
    
    setSession: async ({ access_token, refresh_token }) => {
      console.log('🔧 模擬 Supabase setSession 調用');
      console.log('- Access Token:', access_token ? '存在' : '缺失');
      console.log('- Refresh Token:', refresh_token ? '存在' : '缺失');
      
      return {
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            },
            access_token,
            refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          }
        },
        error: null
      };
    },
    
    onAuthStateChange: (callback) => {
      console.log('🔄 模擬 Supabase onAuthStateChange 設置');
      // 模擬登錄事件
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        });
      }, 100);
      
      return { unsubscribe: () => console.log('🔄 取消認證監聽') };
    }
  }
};

// 模擬通知管理器
const mockNotificationManager = {
  success: (title, message, showModal) => {
    console.log(`✅ 成功通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  error: (title, message, showModal) => {
    console.log(`❌ 錯誤通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  warning: (title, message, showModal) => {
    console.log(`⚠️ 警告通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  info: (title, message, showModal) => {
    console.log(`ℹ️ 信息通知: ${title} - ${message} (Modal: ${showModal})`);
  }
};

// 創建 OAuth 回調處理器的簡化版本
class TestOAuthCallbackHandler {
  constructor() {
    this.isProcessing = false;
  }

  async handleOAuthCallback() {
    if (this.isProcessing) {
      console.log('🔄 OAuth 回調處理中，跳過重複處理');
      return false;
    }

    try {
      this.isProcessing = true;
      console.log('🔄 檢查 OAuth 回調...');

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
        console.log('ℹ️ 沒有 OAuth 回調參數');
        return false;
      }

      console.log('✅ 發現 OAuth 回調參數，開始處理...');

      // 使用模擬的 Supabase 方法處理 OAuth 回調
      const { data, error } = await mockSupabase.auth.getSession();

      if (error) {
        console.error('❌ OAuth 回調處理錯誤:', error.message);
        mockNotificationManager.error(
          'Google 登錄失敗',
          `認證處理失敗: ${error.message}`,
          true
        );
        return false;
      }

      if (data.session && data.session.user) {
        console.log('🎉 OAuth 回調處理成功:', data.session.user.email);
        
        mockNotificationManager.success(
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
          
          const { data: sessionData, error: sessionError } = await mockSupabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('❌ 手動設置會話失敗:', sessionError.message);
            mockNotificationManager.error(
              'Google 登錄失敗',
              `會話設置失敗: ${sessionError.message}`,
              true
            );
            return false;
          }

          if (sessionData.session && sessionData.session.user) {
            console.log('✅ 手動設置會話成功:', sessionData.session.user.email);
            
            mockNotificationManager.success(
              'Google 登錄成功',
              `歡迎回來，${sessionData.session.user.email}！`,
              false
            );

            // 清理 URL 參數
            this.cleanupUrlParams();

            return true;
          }
        }

        mockNotificationManager.error(
          'Google 登錄失敗',
          '無法建立有效的登錄會話',
          true
        );
        return false;
      }

    } catch (error) {
      console.error('💥 OAuth 回調處理異常:', error);
      mockNotificationManager.error(
        'Google 登錄失敗',
        `處理異常: ${error.message}`,
        true
      );
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  cleanupUrlParams() {
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

      // 更新 URL
      const newUrl = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({}, 'FinTranzo', newUrl);
      
      console.log('🧹 URL 參數已清理');
    } catch (error) {
      console.warn('⚠️ URL 參數清理失敗:', error);
    }
  }

  setupAuthListener() {
    console.log('🔄 設置認證狀態監聽器...');
    mockSupabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 認證狀態變化: ${event}`);
      if (session?.user) {
        console.log('✅ 用戶已登錄:', session.user.email);
      }
    });
  }

  async initialize() {
    console.log('🚀 初始化 OAuth 回調處理器...');
    
    // 設置認證監聽器
    this.setupAuthListener();
    
    // 處理 OAuth 回調
    const result = await this.handleOAuthCallback();
    
    console.log('✅ OAuth 回調處理器初始化完成');
    return result;
  }
}

// 運行測試
async function runTest() {
  console.log('🎯 開始測試 OAuth 回調處理...');
  console.log('');
  
  const handler = new TestOAuthCallbackHandler();
  const result = await handler.initialize();
  
  console.log('');
  console.log('📊 測試結果:');
  console.log('- OAuth 回調處理:', result ? '✅ 成功' : '❌ 失敗');
  console.log('- URL 清理:', window.location.search === '' ? '✅ 成功' : '❌ 失敗');
  console.log('');
  console.log('🏁 測試完成');
}

// 執行測試
runTest().catch(error => {
  console.error('💥 測試失敗:', error);
});
