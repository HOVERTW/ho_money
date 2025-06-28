import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { createClient, AuthError, AuthResponse, User, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
// 🔧 移除 expo-auth-session 依賴以修復構建問題
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Debug configuration
console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key exists:', !!supabaseAnonKey);

// 創建 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // 🔧 啟用 URL 會話檢測以支持 OAuth 回調
  },
});

// 純 HTTP API 客戶端 - 不使用 Supabase SDK
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,

  // 通用 HTTP 請求方法
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
};

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  ASSETS: 'assets',
  LIABILITIES: 'liabilities',
  TAIWAN_STOCKS: 'taiwan_stocks',
  LATEST_TAIWAN_STOCKS: 'latest_taiwan_stocks',
  EXCHANGE_RATES: 'exchange_rates',
} as const;

// 台股相關的 HTTP API 函數
export const stockService = {
  // 測試連接
  testConnection: async () => {
    try {
      const data = await supabaseConfig.request('taiwan_stocks?select=code&limit=1');
      console.log('✅ Supabase 連接成功');
      return true;
    } catch (error) {
      console.error('❌ Supabase 連接失敗:', error);
      return false;
    }
  },

  // 搜尋股票
  searchStocks: async (searchTerm: string, marketType?: string, limit = 50) => {
    try {
      let endpoint = `taiwan_stocks?select=*&or=(code.ilike.*${searchTerm}*,name.ilike.*${searchTerm}*)`;

      if (marketType) {
        endpoint += `&market_type=eq.${marketType}`;
      }

      endpoint += `&order=volume.desc.nullslast&limit=${limit}`;

      const data = await supabaseConfig.request(endpoint);
      return data || [];
    } catch (error) {
      console.error('❌ 搜尋股票失敗:', error);
      return [];
    }
  },

  // 獲取熱門股票
  getPopularStocks: async (limit = 20) => {
    try {
      const data = await supabaseConfig.request(
        `taiwan_stocks?select=*&not.volume=is.null&order=volume.desc&limit=${limit}`
      );
      return data || [];
    } catch (error) {
      console.error('❌ 獲取熱門股票失敗:', error);
      return [];
    }
  },

  // 獲取市場統計
  getMarketStats: async () => {
    try {
      const data = await supabaseConfig.request('v_stock_summary?select=*');
      return data || [];
    } catch (error) {
      console.error('❌ 獲取市場統計失敗:', error);
      return [];
    }
  }
};

// 匯率相關的 HTTP API 函數
export const exchangeRateService = {
  // 測試匯率表連接
  testConnection: async () => {
    try {
      const data = await supabaseConfig.request('exchange_rates?select=currency&limit=1');
      console.log('✅ 匯率表連接成功');
      return true;
    } catch (error) {
      console.error('❌ 匯率表連接失敗:', error);
      return false;
    }
  },

  // 獲取最新匯率
  getLatestRate: async (currency = 'USD') => {
    try {
      const endpoint = `exchange_rates?currency=eq.${currency}&order=date.desc&limit=1`;
      const data = await supabaseConfig.request(endpoint);
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ 獲取最新匯率失敗:', error);
      return null;
    }
  },

  // 獲取指定日期的匯率
  getRateByDate: async (date: string, currency = 'USD') => {
    try {
      const endpoint = `exchange_rates?currency=eq.${currency}&date=eq.${date}`;
      const data = await supabaseConfig.request(endpoint);
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ 獲取指定日期匯率失敗:', error);
      return null;
    }
  }
};

// 認證服務
export const authService = {
  // 傳統電子郵件登錄
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('🔐 Supabase signIn 開始:', email);

    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      console.log('📝 Supabase signIn 詳細結果:', {
        user: result.data.user ? {
          id: result.data.user.id,
          email: result.data.user.email,
          email_confirmed_at: result.data.user.email_confirmed_at,
          created_at: result.data.user.created_at,
          confirmed_at: result.data.user.confirmed_at
        } : null,
        session: result.data.session ? {
          access_token: result.data.session.access_token ? 'exists' : 'missing',
          refresh_token: result.data.session.refresh_token ? 'exists' : 'missing',
          expires_at: result.data.session.expires_at
        } : 'null',
        error: result.error ? {
          message: result.error.message,
          status: result.error.status
        } : null
      });

      // 如果有錯誤，提供更詳細的錯誤信息
      if (result.error) {
        console.error('❌ 登錄錯誤詳情:', result.error);

        if (result.error.message.includes('Invalid login credentials')) {
          console.log('❌ 登錄憑證無效 - 可能原因:');
          console.log('1. 郵箱或密碼錯誤');
          console.log('2. 帳號需要郵件確認');
          console.log('3. 帳號不存在');

          // 提供更友好的錯誤信息
          const friendlyError = new Error('電子郵件或密碼不正確，或帳號尚未確認');
          return { data: { user: null, session: null }, error: friendlyError };
        } else if (result.error.message.includes('Email not confirmed')) {
          console.log('❌ 電子郵件尚未確認');
          const friendlyError = new Error('請先確認您的電子郵件地址');
          return { data: { user: null, session: null }, error: friendlyError };
        }
      }

      return result;
    } catch (error) {
      console.error('💥 Supabase signIn 錯誤:', error);
      throw error;
    }
  },

  // 傳統電子郵件註冊
  signUp: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('🔐 Supabase signUp 開始:', email);

    try {
      // 檢查 Supabase 配置
      console.log('🔗 Supabase URL:', supabaseUrl);
      console.log('🔑 Supabase Key 存在:', !!supabaseAnonKey);

      // 根據平台決定重定向 URL
      let emailRedirectTo: string;
      if (Platform.OS === 'web') {
        emailRedirectTo = process.env.EXPO_PUBLIC_REDIRECT_URL || window.location.origin;
      } else {
        // 🔧 使用固定的移動端重定向 URL
        emailRedirectTo = 'fintranzo://auth/confirm';
      }

      console.log('📧 電子郵件重定向 URL:', emailRedirectTo);

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectTo,
          data: {
            app_name: 'FinTranzo',
            platform: Platform.OS
          }
        }
      });

      console.log('📝 Supabase signUp 詳細結果:', {
        user: result.data.user ? {
          id: result.data.user.id,
          email: result.data.user.email,
          email_confirmed_at: result.data.user.email_confirmed_at,
          created_at: result.data.user.created_at
        } : null,
        session: result.data.session ? 'exists' : 'null',
        error: result.error ? {
          message: result.error.message,
          status: result.error.status
        } : null
      });

      return result;
    } catch (error) {
      console.error('💥 Supabase signUp 錯誤:', error);
      throw error;
    }
  },

  // 開發環境測試用戶創建（跳過郵件確認）
  createTestUser: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('🧪 創建測試用戶:', email);

    try {
      // 首先嘗試直接登錄，看看用戶是否已存在
      const loginResult = await supabase.auth.signInWithPassword({ email, password });

      if (loginResult.data.user && !loginResult.error) {
        console.log('✅ 測試用戶已存在，直接登錄成功');
        return loginResult;
      }

      // 如果登錄失敗，嘗試創建新用戶
      console.log('🔧 用戶不存在，創建新的測試用戶...');

      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.EXPO_PUBLIC_REDIRECT_URL || 'https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback'
        }
      });

      console.log('📝 測試用戶創建結果:', {
        user: signUpResult.data.user ? {
          id: signUpResult.data.user.id,
          email: signUpResult.data.user.email,
          email_confirmed_at: signUpResult.data.user.email_confirmed_at
        } : null,
        error: signUpResult.error?.message
      });

      // 🔧 修復：如果創建成功但需要郵件確認，嘗試自動確認
      if (signUpResult.data.user && !signUpResult.data.user.email_confirmed_at) {
        console.log('🔧 用戶已創建但需要郵件確認，嘗試自動登錄...');

        // 等待一下，然後嘗試直接登錄
        await new Promise(resolve => setTimeout(resolve, 1000));

        const autoLoginResult = await supabase.auth.signInWithPassword({ email, password });
        if (autoLoginResult.data.user && !autoLoginResult.error) {
          console.log('✅ 自動登錄成功，跳過郵件確認');
          return autoLoginResult;
        } else {
          console.log('⚠️ 自動登錄失敗，返回原始註冊結果');
          // 返回成功的註冊結果，但標記為需要確認
          return {
            data: {
              user: signUpResult.data.user,
              session: null // 沒有 session，但用戶已創建
            },
            error: null
          };
        }
      }

      return signUpResult;
    } catch (error) {
      console.error('💥 測試用戶創建錯誤:', error);
      throw error;
    }
  },

  // 🆕 改進的用戶註冊（確保同步到 Supabase）
  createUserDirectly: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('🚀 改進的用戶註冊:', email);

    try {
      // 首先檢查用戶是否已存在
      const existingUserCheck = await supabase.auth.signInWithPassword({ email, password });
      if (existingUserCheck.data.user && !existingUserCheck.error) {
        console.log('✅ 用戶已存在，直接登錄');
        return existingUserCheck;
      }

      console.log('🔧 開始新用戶註冊流程...');

      // 🎯 關鍵：使用正確的註冊參數
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          // 不設置 emailRedirectTo，避免郵件確認問題
          data: {
            // 添加用戶元數據
            app_name: 'FinTranzo',
            registration_source: 'web',
            created_via: 'direct_signup'
          }
        }
      });

      console.log('📝 註冊結果詳情:', {
        user: signUpResult.data.user ? {
          id: signUpResult.data.user.id,
          email: signUpResult.data.user.email,
          email_confirmed_at: signUpResult.data.user.email_confirmed_at,
          created_at: signUpResult.data.user.created_at
        } : null,
        session: signUpResult.data.session ? {
          access_token: signUpResult.data.session.access_token ? 'exists' : 'null',
          expires_at: signUpResult.data.session.expires_at
        } : null,
        error: signUpResult.error?.message
      });

      // 處理註冊結果
      if (signUpResult.error) {
        console.error('❌ 註冊失敗:', signUpResult.error.message);

        // 特殊處理：如果是用戶已存在，嘗試登錄
        if (signUpResult.error.message.includes('already registered')) {
          console.log('🔄 用戶已存在，嘗試登錄...');
          const loginResult = await supabase.auth.signInWithPassword({ email, password });
          if (loginResult.data.user && !loginResult.error) {
            console.log('✅ 已存在用戶登錄成功');
            return loginResult;
          }
        }

        return signUpResult;
      }

      // 註冊成功的情況
      if (signUpResult.data.user) {
        console.log('✅ 用戶已創建到 Supabase');
        console.log('👤 用戶ID:', signUpResult.data.user.id);
        console.log('📧 郵箱狀態:', signUpResult.data.user.email_confirmed_at ? '已確認' : '未確認');

        // 🎯 關鍵改進：如果沒有 session，嘗試立即登錄
        if (!signUpResult.data.session) {
          console.log('🔄 沒有 session，嘗試立即登錄...');

          // 等待一下讓數據庫同步
          await new Promise(resolve => setTimeout(resolve, 1000));

          const immediateLogin = await supabase.auth.signInWithPassword({ email, password });

          if (immediateLogin.data.user && immediateLogin.data.session) {
            console.log('✅ 立即登錄成功，用戶可直接使用');
            return immediateLogin;
          } else {
            console.log('⚠️ 立即登錄失敗，但用戶已創建');
            console.log('💡 可能需要在 Supabase Dashboard 中禁用郵件確認');

            // 返回用戶已創建的成功狀態
            return {
              data: {
                user: signUpResult.data.user,
                session: null
              },
              error: null
            };
          }
        } else {
          console.log('🎉 註冊成功並已自動登錄');
          return signUpResult;
        }
      }

      // 未知情況
      console.log('⚠️ 註冊結果不明確');
      return signUpResult;

    } catch (error) {
      console.error('💥 註冊過程異常:', error);

      // 如果是網路錯誤，提供更友好的錯誤信息
      if (error.message && error.message.includes('fetch')) {
        throw new Error('網路連接失敗，請檢查網路連接後重試');
      }

      throw error;
    }
  },

  // 🆕 手動確認用戶（開發環境使用）
  manualConfirmUser: async (email: string): Promise<{ success: boolean; message: string }> => {
    console.log('🔧 嘗試手動確認用戶:', email);

    try {
      // 注意：這個功能需要 service_role key，在生產環境中不應該使用
      // 這裡只是提供一個概念性的實現

      console.log('💡 手動確認用戶的方法:');
      console.log('1. 在 Supabase Dashboard 中:');
      console.log('   - 前往 Authentication > Users');
      console.log('   - 找到用戶:', email);
      console.log('   - 點擊用戶行');
      console.log('   - 點擊 "Confirm email" 按鈕');
      console.log('');
      console.log('2. 或者使用 SQL 命令:');
      console.log(`   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`);
      console.log('');
      console.log('3. 確認後用戶就可以正常登錄了');

      return {
        success: true,
        message: `請手動確認用戶 ${email} 的郵箱，然後用戶就可以正常登錄了`
      };
    } catch (error) {
      console.error('💥 手動確認用戶錯誤:', error);
      return {
        success: false,
        message: '手動確認用戶失敗'
      };
    }
  },

  // 手動確認用戶郵箱（開發環境使用）
  confirmUserEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    console.log('✉️ 手動確認用戶郵箱:', email);

    try {
      // 這個功能需要在 Supabase Dashboard 中手動操作
      // 或者使用 Admin API（需要 service_role key）
      console.log('💡 請在 Supabase Dashboard 中手動確認用戶郵箱:');
      console.log('1. 前往 Authentication > Users');
      console.log('2. 找到用戶:', email);
      console.log('3. 點擊用戶，然後點擊 "Confirm email"');

      return {
        success: true,
        message: '請在 Supabase Dashboard 中手動確認用戶郵箱'
      };
    } catch (error) {
      console.error('💥 郵箱確認錯誤:', error);
      return {
        success: false,
        message: '郵箱確認失敗'
      };
    }
  },

  // 登出
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // 重設密碼
  resetPassword: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email);
  },

  // Google 登錄
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
      console.log('🔐 開始 Google OAuth 流程...');
      console.log('📱 當前平台:', Platform.OS);

      // 根據平台決定重定向 URL
      let redirectUrl: string;

      if (Platform.OS === 'web') {
        // Web 平台使用環境變數或當前域名
        redirectUrl = process.env.EXPO_PUBLIC_REDIRECT_URL || window.location.origin;
        console.log('🌐 Web 重定向 URL:', redirectUrl);
      } else {
        // 🔧 使用固定的移動端重定向 URL
        redirectUrl = 'fintranzo://auth';
        console.log('📱 Mobile 重定向 URL:', redirectUrl);
      }

      console.log('🌐 開啟 Google OAuth 頁面...');
      console.log('🔗 使用重定向 URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('📝 Google OAuth 初始響應:', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message
      });

      if (error) {
        console.error('❌ Google 登錄錯誤:', error);
        return { data: { user: null, session: null }, error };
      }

      if (data.url) {
        console.log('🌐 OAuth URL:', data.url);

        if (Platform.OS === 'web') {
          // Web 平台：直接重定向到 Google OAuth 頁面
          console.log('🌐 Web 平台：重定向到 Google OAuth');
          window.location.href = data.url;

          // 返回一個特殊的 pending 狀態，表示正在重定向
          return {
            data: { user: null, session: null },
            error: null,
            pending: true // 🔧 添加 pending 標記表示正在重定向
          };
        } else {
          // 移動平台：使用 AuthSession 替代 WebBrowser
          console.log('📱 移動平台：開啟 AuthSession');

          try {
            const result = await WebBrowser.openAuthSessionAsync(
              data.url,
              redirectUrl,
              {
                // 使用系統瀏覽器而不是應用內瀏覽器
                preferEphemeralSession: false,
                showInRecents: true,
              }
            );

            console.log('📱 OAuth 結果:', result);

            if (result.type === 'success' && result.url) {
              console.log('✅ OAuth 成功，處理回調 URL:', result.url);

              // 使用 Supabase 的內建方法處理 OAuth 回調
              const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl(result.url);

              if (sessionError) {
                console.error('❌ Session 處理錯誤:', sessionError);
                return { data: { user: null, session: null }, error: sessionError };
              }

              if (sessionData.session) {
                console.log('✅ Google 登錄成功');
                return { data: sessionData, error: null };
              } else {
                console.log('⚠️ 未獲得有效 session');
                return {
                  data: { user: null, session: null },
                  error: new AuthError('未獲得有效的登錄會話')
                };
              }
            } else if (result.type === 'cancel') {
              console.log('⚠️ 用戶取消登錄');
              return {
                data: { user: null, session: null },
                error: new AuthError('用戶取消 Google 登錄')
              };
            } else {
              console.log('⚠️ OAuth 流程異常結束:', result.type);
              return {
                data: { user: null, session: null },
                error: new AuthError('OAuth 流程異常結束')
              };
            }
          } catch (authError) {
            console.error('❌ AuthSession 錯誤:', authError);
            return {
              data: { user: null, session: null },
              error: new AuthError(authError instanceof Error ? authError.message : 'AuthSession 失敗')
            };
          }
        }
      }

      return {
        data: { user: null, session: null },
        error: new AuthError('OAuth 流程失敗')
      };
    } catch (error) {
      console.error('❌ Google 登錄異常:', error);
      return {
        data: { user: null, session: null },
        error: new AuthError(error instanceof Error ? error.message : 'Google 登錄失敗')
      };
    }
  },



  // 獲取當前用戶
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // 獲取當前 session
  getCurrentSession: async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

// 數據庫服務 - 支援 RLS (Row Level Security)
export const dbService = {
  // 通用讀取方法
  read: async (table: string, query?: string) => {
    try {
      let queryBuilder = supabase.from(table).select(query || '*');

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`❌ 讀取 ${table} 失敗:`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error(`❌ 讀取 ${table} 異常:`, error);
      return { data: null, error };
    }
  },

  // 通用創建方法
  create: async (table: string, data: any) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        console.error(`❌ 創建 ${table} 失敗:`, error);
        return { data: null, error };
      }

      return { data: result, error: null };
    } catch (error) {
      console.error(`❌ 創建 ${table} 異常:`, error);
      return { data: null, error };
    }
  },

  // 通用更新方法
  update: async (table: string, id: string, data: any) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select();

      if (error) {
        console.error(`❌ 更新 ${table} 失敗:`, error);
        return { data: null, error };
      }

      return { data: result, error: null };
    } catch (error) {
      console.error(`❌ 更新 ${table} 異常:`, error);
      return { data: null, error };
    }
  },

  // 通用刪除方法
  delete: async (table: string, id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`❌ 刪除 ${table} 失敗:`, error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error(`❌ 刪除 ${table} 異常:`, error);
      return { error };
    }
  },

  // 用戶專用方法 - 只獲取當前用戶的數據
  readUserData: async (table: string, query?: string) => {
    try {
      console.log(`🔍 開始讀取用戶 ${table} 數據...`);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ 用戶未登錄，無法讀取數據');
        return { data: null, error: new Error('用戶未登錄') };
      }

      console.log(`👤 用戶 ID: ${user.id}, 讀取表: ${table}`);

      let queryBuilder = supabase
        .from(table)
        .select(query || '*')
        .eq('user_id', user.id);

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`❌ 讀取用戶 ${table} 失敗:`, error);
        return { data: null, error };
      }

      console.log(`✅ 成功讀取 ${data?.length || 0} 筆 ${table} 記錄`);
      if (data && data.length > 0) {
        console.log(`📊 ${table} 數據示例:`, data[0]);
      }

      return { data, error: null };
    } catch (error) {
      console.error(`❌ 讀取用戶 ${table} 異常:`, error);
      return { data: null, error };
    }
  },

  // 創建用戶數據 - 自動添加 user_id (支援單個對象或數組)
  createUserData: async (table: string, data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('用戶未登錄') };
      }

      // 處理數組或單個對象
      const isArray = Array.isArray(data);
      const dataArray = isArray ? data : [data];

      // 為每個項目添加 user_id
      const dataWithUserId = dataArray.map(item => ({
        ...item,
        user_id: user.id,
      }));

      console.log(`📝 準備 upsert ${dataWithUserId.length} 筆 ${table} 記錄`);

      // 使用 upsert 避免重複資料，根據 id 和 user_id 進行衝突檢測
      const { data: result, error } = await supabase
        .from(table)
        .upsert(dataWithUserId, {
          onConflict: 'id,user_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`❌ 創建用戶 ${table} 失敗:`, error);
        return { data: null, error };
      }

      console.log(`✅ 成功 upsert ${result?.length || 0} 筆 ${table} 記錄`);
      return { data: isArray ? result : result?.[0], error: null };
    } catch (error) {
      console.error(`❌ 創建用戶 ${table} 異常:`, error);
      return { data: null, error };
    }
  },
};

// 認證狀態監聽器
export const setupAuthListener = (callback: (user: User | null, session: Session | null) => void) => {
  console.log('🔄 設置認證狀態監聽器...');

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event, session?.user?.email);

    // 處理不同的認證事件
    switch (event) {
      case 'SIGNED_IN':
        console.log('✅ 用戶已登錄:', session?.user?.email);
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
      case 'PASSWORD_RECOVERY':
        console.log('🔑 密碼重置請求');
        break;
      default:
        console.log('🔄 認證狀態變化:', event);
    }

    callback(session?.user || null, session);
  });

  return subscription;
};
