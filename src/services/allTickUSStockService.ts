/**
 * AllTick 美股服務
 * 使用 AllTick API 獲取美股資料
 * 免費版：10 個股票代號，每分鐘 10 次請求
 */

export interface AllTickStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  lastUpdated: string;
}

export interface AllTickQuoteResponse {
  ret_code: number;
  ret_msg: string;
  data: {
    code: string;
    name: string;
    last_price: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    change: number;
    change_rate: number;
    timestamp: number;
  };
}

export interface AllTickSearchResponse {
  ret_code: number;
  ret_msg: string;
  data: Array<{
    code: string;
    name: string;
    market: string;
    type: string;
  }>;
}

class AllTickUSStockService {
  private readonly API_TOKEN = 'YOUR_ALLTICK_TOKEN'; // 需要申請免費 token
  private readonly BASE_URL = 'https://quote.alltick.co/quote-stock-api';
  private cache = new Map<string, { data: AllTickStockData; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10分鐘快取 (免費版限制)
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // 免費版限制

  /**
   * 檢查 API 請求限制
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // 每分鐘重置計數器
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      console.warn('⚠️ AllTick API 請求限制：每分鐘最多 10 次請求');
      return false;
    }
    
    return true;
  }

  /**
   * 記錄 API 請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 AllTick API 使用量: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE} (本分鐘)`);
  }

  /**
   * 搜尋美股股票
   */
  async searchStocks(keywords: string): Promise<AllTickStockData[]> {
    try {
      if (!this.canMakeRequest()) {
        console.warn('⚠️ API 請求限制，使用快取或預設資料');
        return this.getPopularStocksData();
      }

      console.log('🔍 AllTick 搜尋美股:', keywords);

      const query = JSON.stringify({
        trace: `search_${Date.now()}`,
        data: {
          keyword: keywords.toUpperCase(),
          market: 'US'
        }
      });

      const url = `${this.BASE_URL}/search?token=${this.API_TOKEN}&query=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      this.recordRequest();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AllTickSearchResponse = await response.json();

      if (data.ret_code !== 0) {
        console.warn('⚠️ AllTick 搜尋失敗:', data.ret_msg);
        return [];
      }

      // 轉換搜尋結果並獲取報價
      const results: AllTickStockData[] = [];
      for (const item of data.data.slice(0, 5)) { // 限制前5個結果
        const quote = await this.getStockQuote(item.code);
        if (quote) {
          results.push(quote);
        }
      }

      console.log(`✅ AllTick 找到 ${results.length} 個美股結果`);
      return results;
    } catch (error) {
      console.error('❌ AllTick 搜尋美股失敗:', error);
      return this.getPopularStocksData();
    }
  }

  /**
   * 獲取美股即時報價
   */
  async getStockQuote(symbol: string): Promise<AllTickStockData | null> {
    try {
      // 檢查快取
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 使用 AllTick 快取資料:', symbol);
        return cached.data;
      }

      if (!this.canMakeRequest()) {
        console.warn('⚠️ API 請求限制，返回快取資料');
        return cached?.data || null;
      }

      console.log('🔄 AllTick 獲取美股報價:', symbol);

      const query = JSON.stringify({
        trace: `quote_${Date.now()}`,
        data: {
          code: symbol.toUpperCase(),
          market: 'US'
        }
      });

      const url = `${this.BASE_URL}/realtime?token=${this.API_TOKEN}&query=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      this.recordRequest();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AllTickQuoteResponse = await response.json();

      if (data.ret_code !== 0) {
        console.warn('⚠️ AllTick 獲取報價失敗:', data.ret_msg);
        return null;
      }

      const quote = data.data;
      const stockData: AllTickStockData = {
        symbol: quote.code,
        name: quote.name || quote.code,
        price: quote.last_price,
        change: quote.change,
        changePercent: quote.change_rate * 100,
        volume: quote.volume,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        lastUpdated: new Date(quote.timestamp * 1000).toISOString(),
      };

      // 快取資料
      this.cache.set(symbol, {
        data: stockData,
        timestamp: Date.now(),
      });

      console.log('✅ AllTick 成功獲取美股報價:', {
        symbol: stockData.symbol,
        price: stockData.price,
        change: stockData.change,
      });

      return stockData;
    } catch (error) {
      console.error('❌ AllTick 獲取美股報價失敗:', error);
      return null;
    }
  }

  /**
   * 獲取熱門股票資料 (備用方案)
   */
  private getPopularStocksData(): AllTickStockData[] {
    const popularStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 280.50 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2650.75 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 3200.00 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 800.25 },
    ];

    return popularStocks.map(stock => ({
      ...stock,
      change: 0,
      changePercent: 0,
      volume: 0,
      high: stock.price,
      low: stock.price,
      open: stock.price,
      lastUpdated: new Date().toISOString(),
    }));
  }

  /**
   * 獲取熱門美股列表
   */
  getPopularStocks(): string[] {
    return [
      'AAPL',  // Apple
      'MSFT',  // Microsoft
      'GOOGL', // Alphabet
      'AMZN',  // Amazon
      'TSLA',  // Tesla
      'META',  // Meta
      'NVDA',  // NVIDIA
      'NFLX',  // Netflix
      'DIS',   // Disney
      'PYPL',  // PayPal
    ];
  }

  /**
   * 檢查 API 是否可用
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.canMakeRequest()) {
        return false;
      }

      // 測試獲取 AAPL 的報價
      const quote = await this.getStockQuote('AAPL');
      return quote !== null;
    } catch (error) {
      console.error('❌ AllTick API 連接測試失敗:', error);
      return false;
    }
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🔄 AllTick 快取已清除');
  }

  /**
   * 獲取 API 使用統計
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      resetTime: new Date(this.lastResetTime + 60000).toLocaleTimeString(),
      cacheSize: this.cache.size,
    };
  }

  /**
   * 格式化股價顯示
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * 格式化變化百分比
   */
  formatChangePercent(changePercent: number): string {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }
}

// 創建單例實例
export const allTickUSStockService = new AllTickUSStockService();
