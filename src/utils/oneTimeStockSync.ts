/**
 * 一次性股票資料同步
 * 使用 Alpha Vantage API 獲取股價並存儲到 Supabase
 * 用戶之後直接從 Supabase 讀取，不再消耗 API
 */

import { supabaseConfig } from '../services/supabase';

interface StockPriceData {
  symbol: string;
  name: string;
  chineseName: string;
  sector: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
  lastUpdated: string;
}

class OneTimeStockSync {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 5;

  // 重點股票清單 (先同步這些，其他可以後續添加)
  private readonly PRIORITY_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', chineseName: '蘋果', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', chineseName: '微軟', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', chineseName: '谷歌-A', sector: 'Communication Services' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', chineseName: '亞馬遜', sector: 'Consumer Discretionary' },
    { symbol: 'TSLA', name: 'Tesla Inc.', chineseName: '特斯拉', sector: 'Consumer Discretionary' },
    { symbol: 'META', name: 'Meta Platforms Inc.', chineseName: 'Meta Platforms', sector: 'Communication Services' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', chineseName: '英偉達', sector: 'Technology' },
    { symbol: 'NFLX', name: 'Netflix Inc.', chineseName: '奈飛', sector: 'Communication Services' },
    { symbol: 'DIS', name: 'The Walt Disney Company', chineseName: '迪士尼', sector: 'Communication Services' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.', chineseName: 'PayPal', sector: 'Financials' },
    { symbol: 'ADBE', name: 'Adobe Inc.', chineseName: 'Adobe', sector: 'Technology' },
    { symbol: 'CRM', name: 'Salesforce Inc.', chineseName: '賽富時', sector: 'Technology' },
    { symbol: 'ORCL', name: 'Oracle Corporation', chineseName: '甲骨文', sector: 'Technology' },
    { symbol: 'IBM', name: 'International Business Machines Corporation', chineseName: 'IBM', sector: 'Technology' },
    { symbol: 'INTC', name: 'Intel Corporation', chineseName: '英特爾', sector: 'Technology' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', chineseName: '美國超微公司', sector: 'Technology' },
    { symbol: 'QCOM', name: 'QUALCOMM Incorporated', chineseName: '高通', sector: 'Technology' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', chineseName: '思科', sector: 'Technology' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', chineseName: '博通', sector: 'Technology' },
    { symbol: 'TXN', name: 'Texas Instruments Incorporated', chineseName: '德州儀器', sector: 'Technology' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', chineseName: '摩根大通', sector: 'Financials' },
    { symbol: 'BAC', name: 'Bank of America Corporation', chineseName: '美國銀行', sector: 'Financials' },
    { symbol: 'WFC', name: 'Wells Fargo & Company', chineseName: '富國銀行', sector: 'Financials' },
    { symbol: 'GS', name: 'The Goldman Sachs Group Inc.', chineseName: '高盛', sector: 'Financials' },
    { symbol: 'MS', name: 'Morgan Stanley', chineseName: '摩根士丹利', sector: 'Financials' },
    { symbol: 'V', name: 'Visa Inc.', chineseName: 'Visa', sector: 'Financials' },
    { symbol: 'MA', name: 'Mastercard Incorporated', chineseName: '萬事達', sector: 'Financials' },
    { symbol: 'AXP', name: 'American Express Company', chineseName: '美國運通', sector: 'Financials' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', chineseName: '伯克希爾-B', sector: 'Financials' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', chineseName: '強生', sector: 'Healthcare' },
    { symbol: 'PFE', name: 'Pfizer Inc.', chineseName: '輝瑞', sector: 'Healthcare' },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', chineseName: '聯合健康', sector: 'Healthcare' },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', chineseName: '默沙東', sector: 'Healthcare' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', chineseName: '艾伯維公司', sector: 'Healthcare' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', chineseName: '禮來', sector: 'Healthcare' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', chineseName: '賽默飛世爾', sector: 'Healthcare' },
    { symbol: 'ABT', name: 'Abbott Laboratories', chineseName: '雅培', sector: 'Healthcare' },
    { symbol: 'BMY', name: 'Bristol Myers Squibb Company', chineseName: '施貴寶', sector: 'Healthcare' },
    { symbol: 'AMGN', name: 'Amgen Inc.', chineseName: '安進', sector: 'Healthcare' },
    { symbol: 'GILD', name: 'Gilead Sciences Inc.', chineseName: '吉利德科學', sector: 'Healthcare' },
    { symbol: 'WMT', name: 'Walmart Inc.', chineseName: '沃爾瑪', sector: 'Consumer Staples' },
    { symbol: 'PG', name: 'The Procter & Gamble Company', chineseName: '寶潔', sector: 'Consumer Staples' },
    { symbol: 'KO', name: 'The Coca-Cola Company', chineseName: '可口可樂', sector: 'Consumer Staples' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', chineseName: '百事可樂', sector: 'Consumer Staples' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation', chineseName: '好市多', sector: 'Consumer Staples' },
    { symbol: 'HD', name: 'The Home Depot Inc.', chineseName: '家得寶', sector: 'Consumer Discretionary' },
    { symbol: 'MCD', name: 'McDonald\'s Corporation', chineseName: '麥當勞', sector: 'Consumer Discretionary' },
    { symbol: 'NKE', name: 'NIKE Inc.', chineseName: '耐克', sector: 'Consumer Discretionary' },
    { symbol: 'SBUX', name: 'Starbucks Corporation', chineseName: '星巴克', sector: 'Consumer Discretionary' },
    { symbol: 'LOW', name: 'Lowe\'s Companies Inc.', chineseName: '勞氏', sector: 'Consumer Discretionary' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', chineseName: '埃克森美孚', sector: 'Energy' },
    { symbol: 'CVX', name: 'Chevron Corporation', chineseName: '雪佛龍', sector: 'Energy' },
    { symbol: 'COP', name: 'ConocoPhillips', chineseName: '康菲石油', sector: 'Energy' },
  ];

  /**
   * 檢查 API 請求限制
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
   * 等待 API 限制重置
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = 60 - Math.floor((Date.now() - this.lastResetTime) / 1000);
      console.log(`⏳ 等待 API 限制重置... 還需 ${waitTime} 秒`);
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  /**
   * 記錄 API 請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 Alpha Vantage API 使用量: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
  }

  /**
   * 從 Alpha Vantage API 獲取股票報價
   */
  async fetchStockPrice(symbol: string): Promise<StockPriceData | null> {
    try {
      await this.waitForRateLimit();

      console.log(`🔄 獲取 ${symbol} 報價...`);

      const params = new URLSearchParams({
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: this.API_KEY,
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      this.recordRequest();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['01. symbol']) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的報價資料`);
        return null;
      }

      const quote = data['Global Quote'];
      
      // 找到對應的股票資訊
      const stockInfo = this.PRIORITY_STOCKS.find(s => s.symbol === symbol);
      
      const stockData: StockPriceData = {
        symbol: quote['01. symbol'],
        name: stockInfo?.name || `${symbol} Corporation`,
        chineseName: stockInfo?.chineseName || symbol,
        sector: stockInfo?.sector || 'Unknown',
        price: parseFloat(quote['05. price']),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        previousClose: parseFloat(quote['08. previous close']),
        lastUpdated: quote['07. latest trading day'],
      };

      console.log(`✅ 成功獲取 ${symbol} 報價: $${stockData.price}`);
      return stockData;

    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 報價失敗:`, error);
      return null;
    }
  }

  /**
   * 將股票資料存儲到 Supabase
   */
  async saveToSupabase(stockData: StockPriceData): Promise<boolean> {
    try {
      const dbData = {
        symbol: stockData.symbol,
        name: stockData.name,
        sector: stockData.sector,
        industry: null,
        price: stockData.price,
        open_price: stockData.open,
        high_price: stockData.high,
        low_price: stockData.low,
        volume: stockData.volume,
        change_amount: stockData.change,
        change_percent: stockData.changePercent,
        previous_close: stockData.previousClose,
        market_cap: stockData.marketCap,
        price_date: stockData.lastUpdated,
        is_sp500: true,
        updated_at: new Date().toISOString()
      };

      // 使用 UPSERT 操作 (INSERT 或 UPDATE)
      await supabaseConfig.request('us_stocks', {
        method: 'POST',
        body: JSON.stringify(dbData),
        headers: {
          'Prefer': 'resolution=merge-duplicates'
        }
      });

      console.log(`💾 ${stockData.symbol} 已存儲到 Supabase`);
      return true;

    } catch (error) {
      console.error(`❌ 存儲 ${stockData.symbol} 到 Supabase 失敗:`, error);
      return false;
    }
  }

  /**
   * 執行一次性同步
   */
  async executeOneTimeSync(): Promise<void> {
    console.log('🚀 開始一次性股票資料同步...');
    console.log(`📊 將同步 ${this.PRIORITY_STOCKS.length} 支重點股票`);
    console.log('⚠️ 這將消耗 API 額度，但之後用戶查詢將直接從 Supabase 讀取');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < this.PRIORITY_STOCKS.length; i++) {
      const stock = this.PRIORITY_STOCKS[i];
      
      try {
        console.log(`\n📦 處理 ${i + 1}/${this.PRIORITY_STOCKS.length}: ${stock.symbol} (${stock.chineseName})`);
        
        // 從 API 獲取價格
        const stockData = await this.fetchStockPrice(stock.symbol);
        
        if (stockData) {
          // 存儲到 Supabase
          const saved = await this.saveToSupabase(stockData);
          
          if (saved) {
            successCount++;
            console.log(`✅ ${stock.symbol} 同步成功`);
          } else {
            failCount++;
            console.log(`❌ ${stock.symbol} 存儲失敗`);
          }
        } else {
          failCount++;
          console.log(`❌ ${stock.symbol} 獲取失敗`);
        }

        // 進度顯示
        const progress = Math.round(((i + 1) / this.PRIORITY_STOCKS.length) * 100);
        console.log(`📈 進度: ${progress}% (${i + 1}/${this.PRIORITY_STOCKS.length})`);

      } catch (error) {
        console.error(`❌ 處理 ${stock.symbol} 時發生錯誤:`, error);
        failCount++;
      }
    }

    console.log('\n🎉 一次性同步完成！');
    console.log(`✅ 成功: ${successCount} 支股票`);
    console.log(`❌ 失敗: ${failCount} 支股票`);
    console.log(`📊 成功率: ${Math.round((successCount / this.PRIORITY_STOCKS.length) * 100)}%`);
    console.log('\n💡 現在用戶可以直接從 Supabase 搜尋股票，不會消耗 API 額度！');
  }

  /**
   * 獲取同步統計
   */
  async getSyncStats() {
    try {
      const totalStocks = await supabaseConfig.request('us_stocks?select=count');
      const stocksWithPrices = await supabaseConfig.request('us_stocks?select=count&price=not.is.null');
      const latestUpdate = await supabaseConfig.request('us_stocks?select=updated_at&order=updated_at.desc&limit=1');
      
      return {
        totalStocks: totalStocks.length,
        stocksWithPrices: stocksWithPrices.length,
        lastUpdate: latestUpdate.length > 0 ? latestUpdate[0].updated_at : null,
        completionRate: totalStocks.length > 0 ? Math.round((stocksWithPrices.length / totalStocks.length) * 100) : 0
      };
    } catch (error) {
      console.error('❌ 獲取同步統計失敗:', error);
      return null;
    }
  }
}

// 創建實例
export const oneTimeStockSync = new OneTimeStockSync();

// 導出主要功能
export const executeOneTimeSync = () => oneTimeStockSync.executeOneTimeSync();
export const getSyncStats = () => oneTimeStockSync.getSyncStats();
