/**
 * 台股搜尋服務
 * 專門用於資產管理中的股票代號/名稱自動填入功能
 */

import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { supabase } from './supabase';

export interface StockInfo {
  code: string;
  name: string;
  closing_price: number;
  market_type: 'TSE' | 'OTC' | 'ETF';
}

export class StockSearchService {
  /**
   * 根據股票代號搜尋股票資訊
   */
  static async searchByCode(code: string): Promise<StockInfo | null> {
    try {
      if (!code || code.trim().length === 0) {
        return null;
      }

      const cleanCode = code.trim().toUpperCase();
      console.log(`🔍 搜尋股票代號: ${cleanCode}`);

      const response = await fetch(
        `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/taiwan_stocks?select=code,name,closing_price,market_type&code=eq.${cleanCode}`,
        {
          method: 'GET',
          headers: {
            'apikey': EXPO_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.log(`⚠️ 找不到股票代號 ${cleanCode}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const stock = data[0];
        console.log(`✅ 找到股票: ${stock.code} ${stock.name} NT$${stock.closing_price}`);
        return {
          code: stock.code,
          name: stock.name,
          closing_price: stock.closing_price,
          market_type: stock.market_type
        };
      }

      return null;
    } catch (error) {
      console.error('❌ 搜尋股票代號失敗:', error);
      return null;
    }
  }

  /**
   * 根據股票代號前綴搜尋股票資訊
   */
  static async searchByCodePrefix(codePrefix: string): Promise<StockInfo[]> {
    try {
      if (!codePrefix || codePrefix.trim().length === 0) {
        return [];
      }

      const cleanPrefix = codePrefix.trim().toUpperCase();
      console.log(`🔍 搜尋股票代號前綴: ${cleanPrefix}`);

      const response = await fetch(
        `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/taiwan_stocks?select=code,name,closing_price,market_type&code=ilike.${cleanPrefix}*&limit=10`,
        {
          method: 'GET',
          headers: {
            'apikey': EXPO_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('❌ 搜尋股票代號失敗: HTTP', response.status);
        return [];
      }

      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`✅ 找到 ${data.length} 檔相關股票`);
        return data.map((item: any) => ({
          code: item.code,
          name: item.name,
          closing_price: item.closing_price,
          market_type: item.market_type
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ 搜尋股票代號失敗:', error);
      return [];
    }
  }

  /**
   * 代號搜尋 - 只支援股票代號搜尋
   */
  static async smartSearch(query: string): Promise<{
    exact?: StockInfo;
    suggestions: StockInfo[];
  }> {
    try {
      if (!query || query.trim().length === 0) {
        return { suggestions: [] };
      }

      const cleanQuery = query.trim().toUpperCase();

      // 只支援數字或數字+字母的組合（股票代號格式）
      if (!/^[0-9]+[A-Z]*$/i.test(cleanQuery)) {
        return { suggestions: [] };
      }

      // 先嘗試精確匹配
      const exactMatch = await this.searchByCode(cleanQuery);
      if (exactMatch) {
        return {
          exact: exactMatch,
          suggestions: []
        };
      }

      // 如果沒有精確匹配，搜尋前綴匹配
      const suggestions = await this.searchByCodePrefix(cleanQuery);
      return { suggestions };

    } catch (error) {
      console.error('❌ 代號搜尋失敗:', error);
      return { suggestions: [] };
    }
  }

  /**
   * 獲取熱門台股 (用於推薦)
   */
  static async getPopularStocks(limit: number = 20): Promise<StockInfo[]> {
    try {
      console.log(`📊 獲取熱門台股 (前${limit}名)`);

      const { data, error } = await supabase
        .from('taiwan_stocks')
        .select('code, name, closing_price, market_type, volume')
        .not('volume', 'is', null)
        .order('volume', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ 獲取熱門股票失敗:', error);
        return [];
      }

      if (data && data.length > 0) {
        console.log(`✅ 獲取 ${data.length} 檔熱門股票`);
        return data.map((item: any) => ({
          code: item.code,
          name: item.name,
          closing_price: item.closing_price,
          market_type: item.market_type
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ 獲取熱門股票失敗:', error);
      return [];
    }
  }

  /**
   * 測試連接
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/taiwan_stocks?select=code&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': EXPO_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('❌ 股票資料庫連接失敗: HTTP', response.status);
        return false;
      }

      console.log('✅ 股票資料庫連接正常');
      return true;
    } catch (error) {
      console.error('❌ 股票資料庫連接測試失敗:', error);
      return false;
    }
  }
}

export default StockSearchService;
