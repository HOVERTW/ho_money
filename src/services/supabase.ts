import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

// Supabase configuration
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Debug configuration
console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key exists:', !!supabaseAnonKey);

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
