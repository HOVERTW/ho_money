/**
 * 美股查詢服務
 * 從 Supabase 資料庫讀取美股資料，提供搜尋和查詢功能
 */

import { supabaseConfig } from './supabase';

export interface USStockInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  change_amount: number;
  change_percent: number;
  market_cap?: number;
  price_date: string;
  updated_at: string;
  is_etf?: boolean;
  asset_type?: string;
}

export interface USStockSearchResult {
  symbol: string;
  name: string;
  sector?: string;
  price: number;
  change_percent: number;
  market_cap?: number;
  is_etf?: boolean;
  asset_type?: string;
}

export interface USStockStats {
  total_stocks: number;
  stock_count: number;
  etf_count: number;
  sp500_count: number;
  sectors_count: number;
  last_updated: string;
  avg_price: number;
}

class USStockQueryService {
  private cache = new Map<string, { data: USStockInfo; timestamp: number }>();
  private searchCache = new Map<string, { data: USStockSearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取
  private readonly SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 搜尋快取 2分鐘

  constructor() {
    // 初始化時清除快取，確保ETF標籤修復生效
    console.log('🔄 初始化美股查詢服務，清除舊快取');
  }

  /**
   * 搜尋美股 (包含股票和ETF)
   */
  async searchStocks(
    searchTerm: string,
    sp500Only: boolean = true,
    limit: number = 20,
    includeETF: boolean = true
  ): Promise<USStockSearchResult[]> {
    try {
      const cacheKey = `${searchTerm}_${sp500Only}_${limit}_${includeETF}`;

      // 檢查搜尋快取
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_DURATION) {
        console.log('📦 使用搜尋快取:', searchTerm);
        return cached.data;
      }

      console.log('🔍 搜尋美股:', searchTerm, includeETF ? '(包含ETF)' : '(僅股票)');

      const endpoint = 'rpc/search_us_stocks';
      const payload = {
        search_term: searchTerm,
        sp500_only: sp500Only,
        limit_count: limit
      };

      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 確保普通股票搜索結果包含ETF標籤
      let results: USStockSearchResult[] = (data || []).map((stock: any) => ({
        ...stock,
        is_etf: stock.is_etf || false,
        asset_type: stock.asset_type || (stock.is_etf ? 'ETF' : 'STOCK')
      }));

      // 如果包含ETF，也搜索ETF
      if (includeETF) {
        try {
          const etfEndpoint = 'rpc/search_us_etf';
          const etfPayload = {
            search_term: searchTerm,
            limit_count: Math.floor(limit / 2) // ETF佔一半結果
          };

          const etfData = await supabaseConfig.request(etfEndpoint, {
            method: 'POST',
            body: JSON.stringify(etfPayload),
          });

          const etfResults: USStockSearchResult[] = (etfData || []).map((etf: any) => ({
            ...etf,
            is_etf: true,
            asset_type: 'ETF'
          }));

          // 去除重複的股票代號，ETF優先顯示
          const etfSymbols = new Set(etfResults.map(etf => etf.symbol));
          const uniqueStockResults = results.filter(stock => !etfSymbols.has(stock.symbol));

          // 合併結果，ETF優先顯示
          results = [...etfResults, ...uniqueStockResults].slice(0, limit);

          console.log(`✅ 找到 ${etfResults.length} 個ETF, ${uniqueStockResults.length} 個股票 (去重後)`);
        } catch (etfError) {
          console.warn('⚠️ ETF搜索失敗:', etfError);
        }
      }

      // 快取搜尋結果
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      console.log(`✅ 總共找到 ${results.length} 個結果`);
      return results;

    } catch (error) {
      console.error('❌ 搜尋美股失敗:', error);
      return [];
    }
  }

  /**
   * 專門搜尋ETF
   */
  async searchETFs(
    searchTerm: string,
    limit: number = 20
  ): Promise<USStockSearchResult[]> {
    try {
      const cacheKey = `etf_${searchTerm}_${limit}`;

      // 檢查搜尋快取
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_DURATION) {
        console.log('📦 使用ETF搜尋快取:', searchTerm);
        return cached.data;
      }

      console.log('🔍 搜尋ETF:', searchTerm);

      const endpoint = 'rpc/search_us_etf';
      const payload = {
        search_term: searchTerm,
        limit_count: limit
      };

      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const results: USStockSearchResult[] = (data || []).map((etf: any) => ({
        ...etf,
        is_etf: true,
        asset_type: 'ETF'
      }));

      // 快取搜尋結果
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      console.log(`✅ 找到 ${results.length} 個ETF結果`);
      return results;

    } catch (error) {
      console.error('❌ 搜尋ETF失敗:', error);
      return [];
    }
  }

  /**
   * 獲取熱門ETF
   */
  async getPopularETFs(limit: number = 10): Promise<USStockSearchResult[]> {
    try {
      const cacheKey = `popular_etf_${limit}`;

      // 檢查快取
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 使用熱門ETF快取');
        return cached.data;
      }

      console.log('🔥 獲取熱門ETF...');

      const endpoint = 'us_etf_view?select=symbol,name,sector,price,change_percent,market_cap&order=market_cap.desc.nullslast';
      const data = await supabaseConfig.request(`${endpoint}&limit=${limit}`);

      const results: USStockSearchResult[] = (data || []).map((etf: any) => ({
        ...etf,
        is_etf: true,
        asset_type: 'ETF'
      }));

      // 快取結果
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      console.log(`✅ 獲取 ${results.length} 個熱門ETF`);
      return results;
    } catch (error) {
      console.error('❌ 獲取熱門ETF失敗:', error);
      return this.getFallbackPopularETFs();
    }
  }

  /**
   * 根據股票代號獲取詳細資訊
   */
  async getStockBySymbol(symbol: string): Promise<USStockInfo | null> {
    try {
      // 檢查快取
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 使用股票快取:', symbol);
        return cached.data;
      }

      console.log('🔄 獲取股票資訊:', symbol);

      const endpoint = 'rpc/get_us_stock_by_symbol';
      const payload = {
        stock_symbol: symbol.toUpperCase()
      };

      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!data || data.length === 0) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的資料`);
        return null;
      }

      const stockInfo: USStockInfo = data[0];

      // 快取資料
      this.cache.set(symbol, {
        data: stockInfo,
        timestamp: Date.now(),
      });

      console.log(`✅ 成功獲取 ${symbol} 資訊`);
      return stockInfo;
    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 資訊失敗:`, error);
      return null;
    }
  }

  /**
   * 獲取熱門股票 (按市值排序)
   */
  async getPopularStocks(limit: number = 20): Promise<USStockSearchResult[]> {
    try {
      const cacheKey = `popular_${limit}`;
      
      // 檢查快取
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 使用熱門股票快取');
        return cached.data;
      }

      console.log('🔥 獲取熱門股票...');

      const endpoint = 'rpc/get_popular_us_stocks';
      const payload = {
        limit_count: limit
      };

      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 確保結果包含正確的ETF標籤
      const results: USStockSearchResult[] = (data || []).map((stock: any) => ({
        ...stock,
        is_etf: stock.is_etf || false,
        asset_type: stock.asset_type || (stock.is_etf ? 'ETF' : 'STOCK')
      }));

      // 快取結果
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      console.log(`✅ 獲取 ${results.length} 個熱門股票`);
      return results;
    } catch (error) {
      console.error('❌ 獲取熱門股票失敗:', error);
      return this.getFallbackPopularStocks();
    }
  }

  /**
   * 按行業獲取股票
   */
  async getStocksBySector(sector: string, limit: number = 20): Promise<USStockSearchResult[]> {
    try {
      console.log(`🏢 獲取 ${sector} 行業股票...`);

      const endpoint = 'rpc/get_us_stocks_by_sector';
      const payload = {
        target_sector: sector,
        limit_count: limit
      };

      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 確保結果包含正確的ETF標籤
      const results: USStockSearchResult[] = (data || []).map((stock: any) => ({
        ...stock,
        is_etf: stock.is_etf || false,
        asset_type: stock.asset_type || (stock.is_etf ? 'ETF' : 'STOCK')
      }));
      console.log(`✅ 獲取 ${results.length} 個 ${sector} 股票`);
      return results;
    } catch (error) {
      console.error(`❌ 獲取 ${sector} 行業股票失敗:`, error);
      return [];
    }
  }

  /**
   * 獲取美股統計資訊
   */
  async getStockStats(): Promise<USStockStats | null> {
    try {
      console.log('📊 獲取美股統計...');

      const endpoint = 'rpc/get_us_stock_stats';
      const data = await supabaseConfig.request(endpoint, {
        method: 'POST',
      });

      if (!data || data.length === 0) {
        return null;
      }

      const stats: USStockStats = data[0];
      console.log('✅ 獲取美股統計成功:', stats);
      return stats;
    } catch (error) {
      console.error('❌ 獲取美股統計失敗:', error);
      return null;
    }
  }

  /**
   * 獲取所有行業列表
   */
  async getSectors(): Promise<string[]> {
    try {
      console.log('🏢 獲取行業列表...');

      const endpoint = 'us_stocks?select=sector&sector=not.is.null';
      const data = await supabaseConfig.request(endpoint);

      const sectors = [...new Set(data.map((item: any) => item.sector))].filter(Boolean);
      console.log(`✅ 獲取 ${sectors.length} 個行業`);
      return sectors;
    } catch (error) {
      console.error('❌ 獲取行業列表失敗:', error);
      return ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Communication Services'];
    }
  }

  /**
   * 測試資料庫連接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 測試美股資料庫連接...');

      const endpoint = 'us_stocks?select=symbol&limit=1';
      const data = await supabaseConfig.request(endpoint);

      console.log('✅ 美股資料庫連接成功');
      return true;
    } catch (error) {
      console.error('❌ 美股資料庫連接失敗:', error);
      return false;
    }
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
    this.searchCache.clear();
    console.log('🔄 美股查詢快取已清除');
  }

  /**
   * 備用熱門股票資料
   */
  private getFallbackPopularStocks(): USStockSearchResult[] {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 150.25, change_percent: 1.2, market_cap: 2500000000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 280.50, change_percent: 0.8, market_cap: 2100000000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', price: 2650.75, change_percent: -0.5, market_cap: 1800000000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', price: 3200.00, change_percent: 1.5, market_cap: 1600000000000 },
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', price: 800.25, change_percent: 2.1, market_cap: 800000000000 },
    ];
  }

  /**
   * 備用熱門ETF資料
   */
  private getFallbackPopularETFs(): USStockSearchResult[] {
    return [
      { symbol: 'SPY', name: '標普500指數ETF-SPDR', sector: 'ETF', price: 450.25, change_percent: 0.8, market_cap: 400000000000, is_etf: true, asset_type: 'ETF' },
      { symbol: 'QQQ', name: '納指100ETF-Invesco QQQ Trust', sector: 'ETF', price: 380.50, change_percent: 1.2, market_cap: 200000000000, is_etf: true, asset_type: 'ETF' },
      { symbol: 'IWM', name: '羅素2000ETF-iShares', sector: 'ETF', price: 220.75, change_percent: -0.3, market_cap: 150000000000, is_etf: true, asset_type: 'ETF' },
      { symbol: 'VOO', name: '標普500ETF-Vanguard', sector: 'ETF', price: 420.00, change_percent: 0.9, market_cap: 300000000000, is_etf: true, asset_type: 'ETF' },
      { symbol: 'VTI', name: '整體股市指數ETF-Vanguard', sector: 'ETF', price: 250.25, change_percent: 0.7, market_cap: 280000000000, is_etf: true, asset_type: 'ETF' },
    ];
  }

  /**
   * 格式化股價顯示
   */
  formatPrice(price: number | null): string {
    if (price === null || price === undefined) {
      return 'N/A';
    }
    return `$${price.toFixed(2)}`;
  }

  /**
   * 格式化變化百分比
   */
  formatChangePercent(changePercent: number | null): string {
    if (changePercent === null || changePercent === undefined) {
      return 'N/A';
    }
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  /**
   * 格式化市值
   */
  formatMarketCap(marketCap: number | null): string {
    if (marketCap === null || marketCap === undefined) {
      return 'N/A';
    }
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(1)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  }

  /**
   * 獲取快取統計
   */
  getCacheStats() {
    return {
      stockCacheSize: this.cache.size,
      searchCacheSize: this.searchCache.size,
      cacheDuration: this.CACHE_DURATION / 1000 + ' 秒',
      searchCacheDuration: this.SEARCH_CACHE_DURATION / 1000 + ' 秒',
    };
  }
}

// 創建單例實例
export const usStockQueryService = new USStockQueryService();
