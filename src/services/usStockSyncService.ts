/**
 * 美股資料同步服務
 * 使用 Alpha Vantage API 獲取 S&P 500 股票資料並同步到 Supabase
 */

import { supabaseConfig } from './supabase';

export interface USStockData {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
}

export interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export interface AlphaVantageOverviewResponse {
  Symbol: string;
  Name: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  [key: string]: any;
}

class USStockSyncService {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 5; // Alpha Vantage 限制

  /**
   * S&P 500 股票清單 (前 100 大，可擴展)
   */
  private readonly SP500_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
    'JPM', 'V', 'PG', 'XOM', 'HD', 'CVX', 'MA', 'BAC', 'ABBV', 'PFE',
    'AVGO', 'COST', 'DIS', 'KO', 'MRK', 'PEP', 'TMO', 'WMT', 'ABT', 'ACN',
    'CSCO', 'LIN', 'DHR', 'VZ', 'ADBE', 'TXN', 'CRM', 'NFLX', 'NKE', 'ORCL',
    'CMCSA', 'INTC', 'AMD', 'T', 'PM', 'HON', 'UPS', 'QCOM', 'RTX', 'LOW',
    'SPGI', 'INTU', 'IBM', 'GS', 'CAT', 'AMGN', 'BKNG', 'AXP', 'DE', 'BLK',
    'MDT', 'BA', 'GILD', 'SBUX', 'TJX', 'AMT', 'LRCX', 'SYK', 'ADP', 'VRTX',
    'TMUS', 'CVS', 'ZTS', 'MDLZ', 'ISRG', 'CI', 'MO', 'PLD', 'CB', 'SO',
    'DUK', 'REGN', 'CL', 'FIS', 'BSX', 'MMM', 'EOG', 'ITW', 'APD', 'CSX',
    'WM', 'EMR', 'SHW', 'NSC', 'GD', 'ICE', 'USB', 'COP', 'MCO', 'FCX'
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
   * 等待直到可以發送請求
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      console.log('⏳ 等待 API 限制重置...');
      await new Promise(resolve => setTimeout(resolve, 12000)); // 等待 12 秒
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
   * 獲取股票報價
   */
  async getStockQuote(symbol: string): Promise<USStockData | null> {
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

      const data: AlphaVantageQuoteResponse = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['01. symbol']) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的報價資料`);
        return null;
      }

      const quote = data['Global Quote'];
      return {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'], // 暫時使用代號作為名稱
        price: parseFloat(quote['05. price']),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        previousClose: parseFloat(quote['08. previous close']),
      };
    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 報價失敗:`, error);
      return null;
    }
  }

  /**
   * 獲取公司基本資訊
   */
  async getCompanyOverview(symbol: string): Promise<Partial<USStockData> | null> {
    try {
      await this.waitForRateLimit();

      console.log(`🔄 獲取 ${symbol} 公司資訊...`);

      const params = new URLSearchParams({
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: this.API_KEY,
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      this.recordRequest();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AlphaVantageOverviewResponse = await response.json();

      if (!data.Symbol) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的公司資訊`);
        return null;
      }

      return {
        symbol: data.Symbol,
        name: data.Name,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: data.MarketCapitalization ? parseInt(data.MarketCapitalization) : undefined,
      };
    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 公司資訊失敗:`, error);
      return null;
    }
  }

  /**
   * 同步單一股票到 Supabase
   */
  async syncStockToSupabase(stockData: USStockData, isETF: boolean = false): Promise<boolean> {
    try {
      console.log(`💾 同步 ${stockData.symbol} ${isETF ? '(ETF)' : '(股票)'} 到 Supabase...`);

      const endpoint = 'rpc/upsert_us_stock';
      const payload = {
        stock_symbol: stockData.symbol,
        stock_name: stockData.name,
        stock_sector: stockData.sector || (isETF ? 'ETF' : null),
        stock_industry: stockData.industry || null,
        stock_price: stockData.price,
        stock_open: stockData.open,
        stock_high: stockData.high,
        stock_low: stockData.low,
        stock_volume: stockData.volume,
        stock_change: stockData.change,
        stock_change_percent: stockData.changePercent,
        stock_previous_close: stockData.previousClose,
        stock_market_cap: stockData.marketCap || null,
        is_sp500_stock: !isETF,
        is_etf: isETF,
        asset_type: isETF ? 'ETF' : 'STOCK'
      };

      await supabaseConfig.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log(`✅ ${stockData.symbol} 同步成功`);
      return true;
    } catch (error) {
      console.error(`❌ 同步 ${stockData.symbol} 失敗:`, error);
      return false;
    }
  }

  /**
   * 批量同步 S&P 500 股票
   */
  async syncSP500Stocks(batchSize: number = 10): Promise<void> {
    console.log('🚀 開始同步 S&P 500 股票資料...');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < this.SP500_STOCKS.length; i += batchSize) {
      const batch = this.SP500_STOCKS.slice(i, i + batchSize);
      console.log(`📦 處理批次 ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);

      for (const symbol of batch) {
        try {
          // 獲取報價資料
          const quote = await this.getStockQuote(symbol);
          if (!quote) {
            failCount++;
            continue;
          }

          // 獲取公司資訊
          const overview = await this.getCompanyOverview(symbol);
          
          // 合併資料
          const stockData: USStockData = {
            ...quote,
            name: overview?.name || quote.name,
            sector: overview?.sector,
            industry: overview?.industry,
            marketCap: overview?.marketCap,
          };

          // 同步到 Supabase
          const success = await this.syncStockToSupabase(stockData);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }

        } catch (error) {
          console.error(`❌ 處理 ${symbol} 時發生錯誤:`, error);
          failCount++;
        }
      }

      // 批次間暫停
      if (i + batchSize < this.SP500_STOCKS.length) {
        console.log('⏳ 批次間暫停 30 秒...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log('🎉 S&P 500 同步完成！');
    console.log(`✅ 成功: ${successCount} 檔`);
    console.log(`❌ 失敗: ${failCount} 檔`);
  }

  /**
   * 更新指定股票的價格
   */
  async updateStockPrice(symbol: string, isETF: boolean = false): Promise<boolean> {
    try {
      const quote = await this.getStockQuote(symbol);
      if (!quote) return false;

      return await this.syncStockToSupabase(quote, isETF);
    } catch (error) {
      console.error(`❌ 更新 ${symbol} 價格失敗:`, error);
      return false;
    }
  }

  /**
   * 批量同步ETF價格
   */
  async syncETFPrices(etfSymbols: string[], batchSize: number = 5): Promise<void> {
    console.log(`🚀 開始同步 ${etfSymbols.length} 個ETF價格...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < etfSymbols.length; i += batchSize) {
      const batch = etfSymbols.slice(i, i + batchSize);
      console.log(`📦 處理ETF批次 ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);

      for (const symbol of batch) {
        try {
          // 獲取ETF報價資料
          const quote = await this.getStockQuote(symbol);
          if (!quote) {
            failCount++;
            continue;
          }

          // 同步到 Supabase (標記為ETF)
          const success = await this.syncStockToSupabase(quote, true);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }

        } catch (error) {
          console.error(`❌ 處理ETF ${symbol} 時發生錯誤:`, error);
          failCount++;
        }
      }

      // 批次間暫停
      if (i + batchSize < etfSymbols.length) {
        console.log('⏳ ETF批次間暫停 30 秒...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log('🎉 ETF價格同步完成！');
    console.log(`✅ 成功: ${successCount} 個ETF`);
    console.log(`❌ 失敗: ${failCount} 個ETF`);
  }

  /**
   * 獲取熱門ETF列表
   */
  getPopularETFList(): string[] {
    return [
      'SPY', 'QQQ', 'IWM', 'TQQQ', 'TLT', 'IVV', 'VOO', 'LQD', 'SOXL', 'SQQQ',
      'GLD', 'TSLL', 'IBIT', 'SMH', 'HYG', 'SOXX', 'FXI', 'XLI', 'XLF', 'EEM',
      'SOXS', 'BIL', 'EFA', 'XLK', 'XLV', 'AGG', 'RSP', 'XLP', 'SGOV', 'NVDL',
      'XLE', 'DIA', 'XBI', 'IEFA', 'XLY', 'ACWI', 'IEF', 'VTI', 'XLC', 'SPLG'
    ];
  }

  /**
   * 獲取同步統計
   */
  async getSyncStats() {
    try {
      const endpoint = 'rpc/get_us_stock_stats';
      const stats = await supabaseConfig.request(endpoint, {
        method: 'POST',
      });

      return stats[0] || null;
    } catch (error) {
      console.error('❌ 獲取同步統計失敗:', error);
      return null;
    }
  }

  /**
   * 獲取 S&P 500 清單
   */
  getSP500List(): string[] {
    return [...this.SP500_STOCKS];
  }
}

// 創建單例實例
export const usStockSyncService = new USStockSyncService();
