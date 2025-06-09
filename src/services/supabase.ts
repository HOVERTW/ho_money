import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { createClient, AuthError, AuthResponse, User, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
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
    detectSessionInUrl: false,
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
      const result = await supabase.auth.signInWithPassword({ email, password });

      console.log('📝 Supabase signIn 詳細結果:', {
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

      // 如果有錯誤，提供更詳細的錯誤信息
      if (result.error) {
        if (result.error.message.includes('Invalid login credentials')) {
          console.log('❌ 登錄憑證無效 - 可能原因:');
          console.log('1. 郵箱或密碼錯誤');
          console.log('2. 帳號需要郵件確認');
          console.log('3. 帳號不存在');
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

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.EXPO_PUBLIC_REDIRECT_URL || 'https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback'
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

      // 如果創建成功但需要郵件確認，提供提示
      if (signUpResult.data.user && !signUpResult.data.user.email_confirmed_at) {
        console.log('⚠️ 用戶已創建但需要郵件確認');
        console.log('💡 建議: 在 Supabase Dashboard 中手動確認用戶郵箱');
      }

      return signUpResult;
    } catch (error) {
      console.error('💥 測試用戶創建錯誤:', error);
      throw error;
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
      // 根據平台決定重定向 URL
      let redirectUrl: string;

      if (Platform.OS === 'web') {
        // Web 平台使用當前域名
        redirectUrl = window.location.origin;
        console.log('🌐 Web 重定向 URL:', redirectUrl);
      } else {
        // 移動平台使用 Expo 的重定向 URI
        redirectUrl = makeRedirectUri({
          scheme: 'fintranzo',
          path: 'auth',
        });
        console.log('📱 Mobile 重定向 URL:', redirectUrl);
      }

      console.log('🌐 開啟 Google OAuth 頁面...');

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

          // 返回一個 pending 狀態，因為頁面會重定向
          return {
            data: { user: null, session: null },
            error: null
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
                error: new AuthError('用戶取消登錄')
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
