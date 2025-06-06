import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { createClient, AuthError, AuthResponse, User, Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

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
    return await supabase.auth.signInWithPassword({ email, password });
  },

  // 傳統電子郵件註冊
  signUp: async (email: string, password: string): Promise<AuthResponse> => {
    return await supabase.auth.signUp({ email, password });
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
      // 生成隨機 state 參數
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString()
      );

      const redirectUrl = AuthSession.makeRedirectUri({
        useProxy: true,
      });

      console.log('🔗 Redirect URL:', redirectUrl);

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
        // 開啟瀏覽器進行 OAuth 流程
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          // 從 URL 中提取 session 資訊
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            return { data: sessionData, error: sessionError };
          }
        }
      }

      return { data: { user: null, session: null }, error: new AuthError('OAuth 流程失敗') };
    } catch (error) {
      console.error('❌ Google 登錄異常:', error);
      return {
        data: { user: null, session: null },
        error: new AuthError(error instanceof Error ? error.message : 'Google 登錄失敗')
      };
    }
  },

  // Apple 登錄
  signInWithApple: async (): Promise<AuthResponse> => {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        useProxy: true,
      });

      console.log('🍎 Apple 登錄 Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('❌ Apple 登錄錯誤:', error);
        return { data: { user: null, session: null }, error };
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            return { data: sessionData, error: sessionError };
          }
        }
      }

      return { data: { user: null, session: null }, error: new AuthError('Apple OAuth 流程失敗') };
    } catch (error) {
      console.error('❌ Apple 登錄異常:', error);
      return {
        data: { user: null, session: null },
        error: new AuthError(error instanceof Error ? error.message : 'Apple 登錄失敗')
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('用戶未登錄') };
      }

      let queryBuilder = supabase
        .from(table)
        .select(query || '*')
        .eq('user_id', user.id);

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`❌ 讀取用戶 ${table} 失敗:`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error(`❌ 讀取用戶 ${table} 異常:`, error);
      return { data: null, error };
    }
  },

  // 創建用戶數據 - 自動添加 user_id
  createUserData: async (table: string, data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('用戶未登錄') };
      }

      const dataWithUserId = {
        ...data,
        user_id: user.id,
      };

      const { data: result, error } = await supabase
        .from(table)
        .insert(dataWithUserId)
        .select();

      if (error) {
        console.error(`❌ 創建用戶 ${table} 失敗:`, error);
        return { data: null, error };
      }

      return { data: result, error: null };
    } catch (error) {
      console.error(`❌ 創建用戶 ${table} 異常:`, error);
      return { data: null, error };
    }
  },
};
