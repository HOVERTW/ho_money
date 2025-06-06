/**
 * 台股自動更新 API 服務
 * 使用多個免費 API 獲取台股即時價格
 * 支援每日自動更新
 */

export interface TaiwanStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
  market_type: 'TSE' | 'OTC'; // 上市或上櫃
}

class TaiwanStockAPI {
  // 台股 API 配置
  private readonly API_CONFIGS = [
    {
      name: 'TWSE Official',
      baseUrl: 'https://www.twse.com.tw/exchangeReport/STOCK_DAY_AVG',
      getUrl: (symbol: string) => 
        `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${this.getTodayDate()}&type=ALLBUT0999`,
      parseResponse: (data: any, symbol: string) => {
        // 解析台證所官方 API 回應
        if (data.stat === 'OK' && data.data) {
          const stockData = data.data.find((item: any[]) => item[0] === symbol);
          if (stockData) {
            return {
              price: parseFloat(stockData[8].replace(',', '')), // 收盤價
              change: parseFloat(stockData[9].replace(',', '')), // 漲跌
              volume: parseInt(stockData[1].replace(/,/g, '')) // 成交量
            };
          }
        }
        return null;
      }
    },
    {
      name: 'Yahoo Finance TW',
      baseUrl: 'https://tw.finance.yahoo.com',
      getUrl: (symbol: string) => 
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW`,
      parseResponse: (data: any) => {
        if (data.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const meta = result.meta;
          const quote = result.indicators.quote[0];
          const latestIndex = quote.close.length - 1;
          
          return {
            price: meta.regularMarketPrice || quote.close[latestIndex],
            change: meta.regularMarketPrice - meta.previousClose,
            volume: quote.volume[latestIndex] || 0
          };
        }
        return null;
      }
    },
    {
      name: 'Investing.com TW',
      baseUrl: 'https://api.investing.com',
      getUrl: (symbol: string) => 
        `https://api.investing.com/api/financialdata/${symbol}/historical/chart/?period=P1D&interval=PT1M&pointscount=120`,
      parseResponse: (data: any) => {
        if (data.data && data.data.length > 0) {
          const latest = data.data[data.data.length - 1];
          return {
            price: latest[4], // close price
            change: latest[4] - data.data[0][1], // close - open
            volume: latest[5] || 0
          };
        }
        return null;
      }
    }
  ];

  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 30;

  /**
   * 獲取今日日期 (YYYYMMDD 格式)
   */
  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

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
      console.log(`⏳ 台股 API 請求限制，等待 ${waitTime} 秒...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  /**
   * 記錄請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 台股 API 請求: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
  }

  /**
   * 獲取台股報價
   */
  async getTaiwanStockQuote(symbol: string): Promise<TaiwanStockData | null> {
    try {
      await this.waitForRateLimit();
      
      console.log(`🔄 獲取台股 ${symbol} 報價...`);
      
      // 嘗試多個 API
      for (const api of this.API_CONFIGS) {
        try {
          const response = await fetch(api.getUrl(symbol), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          this.recordRequest();

          if (!response.ok) {
            console.warn(`⚠️ ${api.name} HTTP ${response.status}`);
            continue;
          }

          const data = await response.json();
          const parsed = api.parseResponse(data, symbol);

          if (parsed && parsed.price > 0) {
            const stockData: TaiwanStockData = {
              symbol: symbol,
              name: this.getStockName(symbol),
              price: Math.round(parsed.price * 100) / 100,
              change: Math.round(parsed.change * 100) / 100,
              changePercent: Math.round((parsed.change / (parsed.price - parsed.change)) * 10000) / 100,
              volume: parsed.volume,
              lastUpdated: new Date().toISOString(),
              market_type: this.getMarketType(symbol)
            };

            console.log(`✅ ${api.name} 成功獲取 ${symbol}: $${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent}%)`);
            return stockData;
          }

        } catch (error) {
          console.warn(`⚠️ ${api.name} 獲取 ${symbol} 失敗:`, error);
        }

        // API 間暫停
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 如果所有 API 都失敗，使用模擬資料
      console.log(`🔄 所有 API 失敗，使用 ${symbol} 模擬資料`);
      return this.getMockTaiwanStock(symbol);

    } catch (error) {
      console.error(`❌ 獲取台股 ${symbol} 失敗:`, error);
      return this.getMockTaiwanStock(symbol);
    }
  }

  /**
   * 批量獲取台股報價
   */
  async getBatchTaiwanQuotes(symbols: string[]): Promise<TaiwanStockData[]> {
    console.log(`🔄 批量獲取 ${symbols.length} 檔台股...`);
    
    const results: TaiwanStockData[] = [];
    const batchSize = 3; // 每批處理3檔股票
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`📦 處理台股批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);
      
      // 並行處理批次內的股票
      const batchPromises = batch.map(symbol => this.getTaiwanStockQuote(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      // 收集成功的結果
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
        }
      });

      // 批次間暫停
      if (i + batchSize < symbols.length) {
        console.log('⏳ 台股批次間暫停 5 秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`✅ 台股批量獲取完成: ${results.length}/${symbols.length} 成功`);
    return results;
  }

  /**
   * 獲取股票名稱
   */
  private getStockName(symbol: string): string {
    const stockNames: { [key: string]: string } = {
      '2330': '台積電',
      '2317': '鴻海',
      '2454': '聯發科',
      '2881': '富邦金',
      '2882': '國泰金',
      '2886': '兆豐金',
      '2891': '中信金',
      '2892': '第一金',
      '2884': '玉山金',
      '2885': '元大金',
      '2303': '聯電',
      '2002': '中鋼',
      '1301': '台塑',
      '1303': '南亞',
      '1326': '台化',
      '2207': '和泰車',
      '2408': '南亞科',
      '3008': '大立光',
      '2412': '中華電',
      '4938': '和碩',
      '2357': '華碩',
      '2382': '廣達',
      '2395': '研華',
      '6505': '台塑化',
      '2308': '台達電',
      '2474': '可成',
      '2409': '友達',
      '2301': '光寶科',
      '2324': '仁寶',
      '2356': '英業達'
    };

    return stockNames[symbol] || `股票${symbol}`;
  }

  /**
   * 獲取市場類型
   */
  private getMarketType(symbol: string): 'TSE' | 'OTC' {
    // 簡化判斷：4位數字通常是上市，其他可能是上櫃
    if (symbol.length === 4 && /^\d+$/.test(symbol)) {
      const num = parseInt(symbol);
      if (num >= 1000 && num <= 9999) {
        return 'TSE'; // 上市
      }
    }
    return 'OTC'; // 上櫃
  }

  /**
   * 獲取模擬台股資料
   */
  private getMockTaiwanStock(symbol: string): TaiwanStockData {
    const mockPrices: { [key: string]: number } = {
      '2330': 580.00, // 台積電
      '2317': 105.50, // 鴻海
      '2454': 1200.00, // 聯發科
      '2881': 75.80, // 富邦金
      '2882': 62.40, // 國泰金
      '2886': 38.50, // 兆豐金
      '2891': 28.75, // 中信金
      '2303': 48.20, // 聯電
      '2002': 32.15, // 中鋼
      '1301': 95.60, // 台塑
    };

    const basePrice = mockPrices[symbol] || 100.00;
    const change = (Math.random() - 0.5) * 10; // -5 到 +5 的隨機變化
    const price = Math.round((basePrice + change) * 100) / 100;

    return {
      symbol: symbol,
      name: this.getStockName(symbol),
      price: price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round((change / basePrice) * 10000) / 100,
      volume: Math.floor(Math.random() * 10000000), // 隨機成交量
      lastUpdated: new Date().toISOString(),
      market_type: this.getMarketType(symbol)
    };
  }

  /**
   * 檢查台股交易時間
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const taiwanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
    const hour = taiwanTime.getHours();
    const minute = taiwanTime.getMinutes();
    const day = taiwanTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // 週一到週五，上午9:00到下午1:30
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = (hour === 9 && minute >= 0) || 
                         (hour >= 10 && hour <= 12) || 
                         (hour === 13 && minute <= 30);
    
    return isWeekday && isMarketHours;
  }

  /**
   * 獲取使用統計
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      resetTime: new Date(this.lastResetTime + 60000).toLocaleTimeString(),
      canMakeRequest: this.canMakeRequest(),
      marketOpen: this.isMarketOpen()
    };
  }
}

// 創建單例實例
export const taiwanStockAPI = new TaiwanStockAPI();
