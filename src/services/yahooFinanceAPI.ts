/**
 * Yahoo Finance API 客戶端
 * 免費、穩定、無需 API Key
 * 支援即時股價查詢
 */

export interface YahooStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  lastUpdated: string;
  currency: string;
  exchangeName: string;
}

export interface YahooQuoteResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        currentTradingPeriod: any;
        tradingPeriods: any;
        dataGranularity: string;
        range: string;
        validRanges: string[];
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

class YahooFinanceAPI {
  private readonly BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private readonly QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
  
  // 請求計數器
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 100; // 保守估計

  /**
   * 檢查請求限制
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    return this.requestCount < this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * 等待請求限制重置
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = 60 - Math.floor((Date.now() - this.lastResetTime) / 1000);
      console.log(`⏳ Yahoo Finance 請求限制，等待 ${waitTime} 秒...`);
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  /**
   * 記錄請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 Yahoo Finance 請求: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
  }

  /**
   * 獲取單一股票報價
   */
  async getStockQuote(symbol: string): Promise<YahooStockData | null> {
    try {
      await this.waitForRateLimit();
      
      console.log(`🔄 Yahoo Finance 獲取 ${symbol} 報價...`);
      
      const response = await fetch(`${this.BASE_URL}/${symbol}?interval=1d&range=1d`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      this.recordRequest();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: YahooQuoteResponse = await response.json();

      if (!data.chart?.result?.[0]) {
        console.warn(`⚠️ Yahoo Finance 沒有找到 ${symbol} 的資料`);
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];

      // 獲取最新的價格資料
      const latestIndex = quote.close.length - 1;
      const currentPrice = meta.regularMarketPrice || quote.close[latestIndex];
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      const stockData: YahooStockData = {
        symbol: symbol,
        price: Math.round(currentPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: quote.volume[latestIndex] || 0,
        previousClose: Math.round(previousClose * 100) / 100,
        open: quote.open[latestIndex] || currentPrice,
        dayHigh: quote.high[latestIndex] || currentPrice,
        dayLow: quote.low[latestIndex] || currentPrice,
        lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString(),
        currency: meta.currency || 'USD',
        exchangeName: meta.exchangeName || 'NASDAQ'
      };

      console.log(`✅ Yahoo Finance 成功獲取 ${symbol}: $${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent}%)`);
      
      return stockData;

    } catch (error) {
      console.error(`❌ Yahoo Finance 獲取 ${symbol} 失敗:`, error);
      return null;
    }
  }

  /**
   * 批量獲取股票報價
   */
  async getBatchQuotes(symbols: string[]): Promise<YahooStockData[]> {
    console.log(`🔄 Yahoo Finance 批量獲取 ${symbols.length} 檔股票...`);
    
    const results: YahooStockData[] = [];
    const batchSize = 5; // 每批處理5檔股票
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`📦 處理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);
      
      // 並行處理批次內的股票
      const batchPromises = batch.map(symbol => this.getStockQuote(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      // 收集成功的結果
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
        }
      });

      // 批次間暫停，避免過快請求
      if (i + batchSize < symbols.length) {
        console.log('⏳ 批次間暫停 3 秒...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`✅ Yahoo Finance 批量獲取完成: ${results.length}/${symbols.length} 成功`);
    return results;
  }

  /**
   * 搜尋股票
   */
  async searchStocks(query: string): Promise<any[]> {
    try {
      await this.waitForRateLimit();
      
      console.log(`🔍 Yahoo Finance 搜尋: ${query}`);
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );

      this.recordRequest();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.quotes) {
        console.log(`✅ Yahoo Finance 搜尋到 ${data.quotes.length} 個結果`);
        return data.quotes;
      }

      return [];

    } catch (error) {
      console.error(`❌ Yahoo Finance 搜尋失敗:`, error);
      return [];
    }
  }

  /**
   * 檢查市場狀態
   */
  async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen?: string; nextClose?: string }> {
    try {
      // 使用 SPY (S&P 500 ETF) 來檢查市場狀態
      const spyData = await this.getStockQuote('SPY');
      
      if (!spyData) {
        return { isOpen: false };
      }

      // 簡單的市場時間檢查（美東時間）
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const hour = easternTime.getHours();
      const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
      
      // 週一到週五，上午9:30到下午4:00
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = hour >= 9 && hour < 16;
      const isOpen = isWeekday && isMarketHours;

      return {
        isOpen,
        nextOpen: isOpen ? undefined : '09:30 ET',
        nextClose: isOpen ? '16:00 ET' : undefined
      };

    } catch (error) {
      console.error('❌ 檢查市場狀態失敗:', error);
      return { isOpen: false };
    }
  }

  /**
   * 獲取使用統計
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      resetTime: new Date(this.lastResetTime + 60000).toLocaleTimeString(),
      canMakeRequest: this.canMakeRequest()
    };
  }
}

// 創建單例實例
export const yahooFinanceAPI = new YahooFinanceAPI();
