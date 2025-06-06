import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

// 台股資料介面
export interface TaiwanStock {
  id?: number;
  date: string;
  code: string;
  name: string;
  closing_price: number;
  created_at?: string;
  updated_at?: string;
}

// 台股 API 回應介面
interface StockApiResponse {
  Date: string;
  Code: string;
  Name: string;
  ClosingPrice: string;
  MonthlyAveragePrice: string;
}

// 搜尋結果介面
export interface StockSearchResult {
  code: string;
  name: string;
  closing_price: number;
  price_date: string;
}

// 台股價格影響介面
export interface StockPriceImpact {
  stock_code: string;
  stock_name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  cost_basis: number;
  current_value: number;
  unrealized_gain_loss: number;
  return_rate: number;
  impact_type: 'gain' | 'loss';
  last_updated: string;
  time_range_label?: string;
  base_price?: number;
}

// 時間範圍類型
export type TimeRange = 'today' | 'week' | 'month' | 'total';

// 台股影響排行榜
export interface StockImpactRanking {
  timeRange: TimeRange;
  topGains: StockPriceImpact[];
  topLosses: StockPriceImpact[];
  totalGains: number;
  totalLosses: number;
  netImpact: number;
}

class TaiwanStockService {
  private readonly API_BASE_URL = 'https://openapi.twse.com.tw/v1';

  /**
   * 測試 Supabase 連接
   */
  async testSupabaseConnection(): Promise<boolean> {
    try {
      console.log('🔍 測試 Supabase 連接...');

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
        console.error('❌ Supabase 連接失敗: HTTP', response.status);
        return false;
      }

      console.log('✅ Supabase 連接成功');
      return true;
    } catch (error) {
      console.error('❌ Supabase 連接測試失敗:', error);
      return false;
    }
  }

  /**
   * 從台灣證交所 API 獲取所有上市股票的日收盤價
   */
  async fetchStockDataFromAPI(): Promise<StockApiResponse[]> {
    try {
      console.log('🔄 開始從台灣證交所 API 獲取股票資料...');

      const response = await fetch(`${this.API_BASE_URL}/exchangeReport/STOCK_DAY_AVG_ALL`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
      }

      const data: StockApiResponse[] = await response.json();
      console.log(`✅ 成功獲取 ${data.length} 筆股票資料`);

      return data;
    } catch (error) {
      console.error('❌ 獲取股票資料失敗:', error);
      throw error;
    }
  }

  /**
   * 將 API 資料轉換為資料庫格式
   */
  private transformApiDataToDbFormat(apiData: StockApiResponse[]): TaiwanStock[] {
    return apiData
      .filter(item => {
        // 只處理有效的收盤價，避免空資料
        const closingPrice = parseFloat(item.ClosingPrice);
        return item.ClosingPrice && !isNaN(closingPrice) && closingPrice > 0;
      })
      .map(item => ({
        date: item.Date,
        code: item.Code,
        name: item.Name,
        closing_price: parseFloat(item.ClosingPrice),
      }));
  }

  /**
   * 將股票資料儲存到 Supabase
   */
  async saveStockDataToSupabase(stockData: TaiwanStock[]): Promise<void> {
    try {
      console.log('🔄 開始儲存股票資料到 Supabase...');

      // 分批處理，避免一次插入太多資料
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < stockData.length; i += batchSize) {
        const batch = stockData.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('taiwan_stocks')
          .upsert(batch, {
            onConflict: 'date,code',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 儲存失敗:`, error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 儲存成功: ${batch.length} 筆`);
        }
      }

      console.log(`📊 儲存完成 - 成功: ${successCount} 筆, 失敗: ${errorCount} 筆`);
    } catch (error) {
      console.error('❌ 儲存股票資料失敗:', error);
      throw error;
    }
  }

  /**
   * 更新股票資料（從 API 獲取並儲存）
   */
  async updateStockData(): Promise<void> {
    try {
      console.log('🚀 開始更新股票資料...');

      // 1. 從 API 獲取資料
      const apiData = await this.fetchStockDataFromAPI();

      // 2. 轉換資料格式
      const stockData = this.transformApiDataToDbFormat(apiData);

      // 3. 儲存到 Supabase
      await this.saveStockDataToSupabase(stockData);

      console.log('🎉 股票資料更新完成！');
    } catch (error) {
      console.error('❌ 更新股票資料失敗:', error);
      throw error;
    }
  }

  /**
   * 根據股票代號獲取最新價格
   */
  async getLatestStockPrice(stockCode: string): Promise<StockSearchResult | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_latest_stock_price', { stock_code: stockCode });

      if (error) {
        console.error('❌ 獲取股票價格失敗:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log(`📊 找不到股票代號 ${stockCode} 的資料`);
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('❌ 獲取股票價格失敗:', error);
      return null;
    }
  }

  /**
   * 搜尋股票（支援代號或名稱）
   */
  async searchStocks(searchTerm: string): Promise<StockSearchResult[]> {
    try {
      console.log(`🔍 搜尋股票: ${searchTerm}`);

      const response = await fetch(
        `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/taiwan_stocks?select=code,name,closing_price,price_date&or=(code.ilike.*${searchTerm}*,name.ilike.*${searchTerm}*)&limit=5`,
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
        console.error('❌ 搜尋失敗: HTTP', response.status);
        return [];
      }

      const data = await response.json();
      const results: StockSearchResult[] = (data || []).map((stock: any) => ({
        code: stock.code,
        name: stock.name,
        closing_price: parseFloat(stock.closing_price) || 0,
        price_date: stock.price_date || '',
      }));

      console.log(`✅ 搜尋找到 ${results.length} 筆股票資料`);
      return results;
    } catch (error) {
      console.error('❌ 搜尋股票失敗:', error);
      return [];
    }
  }

  /**
   * 獲取所有股票的最新價格
   */
  async getAllLatestStocks(): Promise<StockSearchResult[]> {
    try {
      const response = await supabase
        .from('taiwan_stocks')
        .select('code, name, closing_price, monthly_average_price, price_date')
        .order('code');

      if (response.status !== 200) {
        console.error('❌ 獲取所有股票失敗:', response.statusText);
        return [];
      }

      const results: StockSearchResult[] = (response.data || []).map((stock: any) => ({
        code: stock.code,
        name: stock.name,
        closing_price: parseFloat(stock.closing_price) || 0,
        monthly_average_price: parseFloat(stock.monthly_average_price) || 0,
        price_date: stock.price_date || '',
      }));

      return results;
    } catch (error) {
      console.error('❌ 獲取所有股票失敗:', error);
      return [];
    }
  }

  /**
   * 根據股票代號獲取單一股票資料
   */
  async getStockByCode(stockCode: string): Promise<StockSearchResult | null> {
    try {
      console.log(`🔍 獲取股票資料: ${stockCode}`);

      const response = await fetch(
        `${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/taiwan_stocks?select=code,name,closing_price,price_date&code=eq.${stockCode}&limit=1`,
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
        console.error('❌ 獲取股票資料失敗: HTTP', response.status);
        return null;
      }

      const data = await response.json();

      if (data.length === 0) {
        console.warn(`⚠️ 找不到股票代號: ${stockCode}`);
        return null;
      }

      const stock = data[0];
      console.log(`✅ 獲取股票資料成功: ${stock.name} (${stock.code})`);

      return {
        code: stock.code,
        name: stock.name,
        closing_price: parseFloat(stock.closing_price) || 0,
        price_date: stock.price_date || '',
      };
    } catch (error) {
      console.error('❌ 獲取股票資料失敗:', error);
      return null;
    }
  }

  /**
   * 檢查資料是否需要更新（檢查最新資料日期）
   */
  async checkIfDataNeedsUpdate(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('taiwan_stocks')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        console.log('📊 沒有找到股票資料，需要初始化');
        return true;
      }

      const latestDate = new Date(data[0].date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // 如果最新資料不是昨天的，就需要更新
      const needsUpdate = latestDate < yesterday;

      console.log(`📊 最新資料日期: ${latestDate.toISOString().split('T')[0]}`);
      console.log(`📊 是否需要更新: ${needsUpdate ? '是' : '否'}`);

      return needsUpdate;
    } catch (error) {
      console.error('❌ 檢查資料更新狀態失敗:', error);
      return true; // 發生錯誤時，預設需要更新
    }
  }
}

// 建立單例實例
export const taiwanStockService = new TaiwanStockService();

// 導出類型
export type { StockApiResponse };
