/**
 * 美股服務
 * 使用 Alpha Vantage API 獲取美股資料
 */

export interface USStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

export interface USStockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
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

export interface AlphaVantageSearchResponse {
  bestMatches: Array<{
    '1. symbol': string;
    '2. name': string;
    '3. type': string;
    '4. region': string;
    '5. marketOpen': string;
    '6. marketClose': string;
    '7. timezone': string;
    '8. currency': string;
    '9. matchScore': string;
  }>;
}

class USStockService {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private cache = new Map<string, { data: USStockData; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

  /**
   * 搜尋美股股票
   */
  async searchStocks(keywords: string): Promise<USStockSearchResult[]> {
    try {
      console.log('🔍 搜尋美股:', keywords);

      const params = new URLSearchParams({
        function: 'SYMBOL_SEARCH',
        keywords: keywords.toUpperCase(),
        apikey: this.API_KEY,
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AlphaVantageSearchResponse = await response.json();

      if (!data.bestMatches) {
        console.warn('⚠️ 沒有找到匹配的美股');
        return [];
      }

      const results = data.bestMatches
        .filter(match => match['4. region'] === 'United States') // 只要美國股票
        .slice(0, 10) // 限制前10個結果
        .map(match => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          region: match['4. region'],
          marketOpen: match['5. marketOpen'],
          marketClose: match['6. marketClose'],
          timezone: match['7. timezone'],
          currency: match['8. currency'],
          matchScore: parseFloat(match['9. matchScore']),
        }));

      console.log(`✅ 找到 ${results.length} 個美股結果`);
      return results;
    } catch (error) {
      console.error('❌ 搜尋美股失敗:', error);
      return [];
    }
  }

  /**
   * 獲取美股即時報價
   */
  async getStockQuote(symbol: string): Promise<USStockData | null> {
    try {
      // 檢查快取
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 使用快取的美股資料:', symbol);
        return cached.data;
      }

      console.log('🔄 獲取美股報價:', symbol);

      const params = new URLSearchParams({
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: this.API_KEY,
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AlphaVantageQuoteResponse = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['01. symbol']) {
        console.warn('⚠️ 沒有找到股票資料:', symbol);
        return null;
      }

      const quote = data['Global Quote'];
      const stockData: USStockData = {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'], // Alpha Vantage 的 quote API 不提供公司名稱
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        currency: 'USD',
        lastUpdated: quote['07. latest trading day'],
      };

      // 快取資料
      this.cache.set(symbol, {
        data: stockData,
        timestamp: Date.now(),
      });

      console.log('✅ 成功獲取美股報價:', {
        symbol: stockData.symbol,
        price: stockData.price,
        change: stockData.change,
      });

      return stockData;
    } catch (error) {
      console.error('❌ 獲取美股報價失敗:', error);
      return null;
    }
  }

  /**
   * 批量獲取多個股票報價
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, USStockData>> {
    const results = new Map<string, USStockData>();
    
    // 為了避免 API 限制，逐個獲取
    for (const symbol of symbols) {
      const quote = await this.getStockQuote(symbol);
      if (quote) {
        results.set(symbol, quote);
      }
      
      // 避免 API 限制，每次請求間隔 200ms
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🔄 美股快取已清除');
  }

  /**
   * 檢查 API 是否可用
   */
  async testConnection(): Promise<boolean> {
    try {
      // 測試獲取 AAPL 的報價
      const quote = await this.getStockQuote('AAPL');
      return quote !== null;
    } catch (error) {
      console.error('❌ Alpha Vantage API 連接測試失敗:', error);
      return false;
    }
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
      'ADBE',  // Adobe
      'CRM',   // Salesforce
      'ORCL',  // Oracle
      'IBM',   // IBM
      'INTC',  // Intel
    ];
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
export const usStockService = new USStockService();
