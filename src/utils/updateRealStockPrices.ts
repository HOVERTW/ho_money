/**
 * 更新真實股價資料
 * 使用 Alpha Vantage API 獲取最新股價並更新到 Supabase
 */

import { supabaseConfig } from '../services/supabase';

interface AlphaVantageQuoteResponse {
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

class RealStockPriceUpdater {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 5;

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
      console.log('⏳ 等待 API 限制重置...');
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
   * 獲取單一股票的真實報價
   */
  async getRealStockPrice(symbol: string): Promise<any | null> {
    try {
      await this.waitForRateLimit();

      console.log(`🔄 獲取 ${symbol} 真實報價...`);

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
      const stockData = {
        symbol: quote['01. symbol'],
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

      console.log(`✅ 成功獲取 ${symbol} 真實報價: $${stockData.price}`);
      return stockData;

    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 報價失敗:`, error);
      return null;
    }
  }

  /**
   * 更新股票價格到 Supabase
   */
  async updateStockPriceInDB(stockData: any): Promise<boolean> {
    try {
      const updateData = {
        price: stockData.price,
        open_price: stockData.open,
        high_price: stockData.high,
        low_price: stockData.low,
        volume: stockData.volume,
        change_amount: stockData.change,
        change_percent: stockData.changePercent,
        previous_close: stockData.previousClose,
        price_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      await supabaseConfig.request(`us_stocks?symbol=eq.${stockData.symbol}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      console.log(`💾 ${stockData.symbol} 價格已更新到資料庫: $${stockData.price}`);
      return true;

    } catch (error) {
      console.error(`❌ 更新 ${stockData.symbol} 到資料庫失敗:`, error);
      return false;
    }
  }

  /**
   * 更新熱門股票的真實價格
   */
  async updatePopularStockPrices(): Promise<void> {
    console.log('🔥 開始更新熱門股票真實價格...');

    const popularStocks = [
      'AAPL',  // Apple - 應該是 $200.850
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

    let successCount = 0;
    let failCount = 0;

    for (const symbol of popularStocks) {
      try {
        // 獲取真實報價
        const stockData = await this.getRealStockPrice(symbol);
        
        if (stockData) {
          // 更新到資料庫
          const updated = await this.updateStockPriceInDB(stockData);
          if (updated) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }

        // 避免 API 限制，每次請求後暫停
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ 處理 ${symbol} 時發生錯誤:`, error);
        failCount++;
      }
    }

    console.log(`🎉 熱門股票價格更新完成！成功: ${successCount}, 失敗: ${failCount}`);
  }

  /**
   * 更新指定股票的價格
   */
  async updateSpecificStock(symbol: string): Promise<boolean> {
    console.log(`🎯 更新 ${symbol} 的真實價格...`);

    try {
      const stockData = await this.getRealStockPrice(symbol);
      
      if (stockData) {
        return await this.updateStockPriceInDB(stockData);
      }
      
      return false;

    } catch (error) {
      console.error(`❌ 更新 ${symbol} 失敗:`, error);
      return false;
    }
  }

  /**
   * 驗證 AAPL 價格是否正確
   */
  async verifyAAPLPrice(): Promise<void> {
    console.log('🍎 驗證 AAPL 價格...');

    try {
      // 從 API 獲取最新價格
      const realPrice = await this.getRealStockPrice('AAPL');
      
      if (realPrice) {
        console.log(`📊 Alpha Vantage API 報價: $${realPrice.price}`);
        console.log(`📅 最後更新日期: ${realPrice.lastUpdated}`);
        
        // 檢查是否接近 $200.850
        const expectedPrice = 200.850;
        const difference = Math.abs(realPrice.price - expectedPrice);
        
        if (difference < 5) {
          console.log(`✅ 價格正確！差異: $${difference.toFixed(3)}`);
        } else {
          console.log(`⚠️ 價格差異較大: $${difference.toFixed(3)}`);
        }

        // 更新到資料庫
        await this.updateStockPriceInDB(realPrice);
        
        // 驗證資料庫中的價格
        const dbData = await supabaseConfig.request('us_stocks?symbol=eq.AAPL&select=symbol,name,price,updated_at');
        
        if (dbData && dbData.length > 0) {
          console.log(`💾 資料庫中的價格: $${dbData[0].price}`);
          console.log(`🕐 資料庫更新時間: ${dbData[0].updated_at}`);
        }

      } else {
        console.error('❌ 無法獲取 AAPL 價格');
      }

    } catch (error) {
      console.error('❌ 驗證 AAPL 價格失敗:', error);
    }
  }

  /**
   * 清除舊的測試資料並重新載入
   */
  async refreshStockData(): Promise<void> {
    console.log('🔄 刷新股票資料...');

    try {
      // 刪除舊的測試資料
      console.log('🗑️ 清除舊的測試資料...');
      await supabaseConfig.request('us_stocks', {
        method: 'DELETE',
      });

      console.log('✅ 舊資料已清除');

    } catch (error) {
      console.error('❌ 清除舊資料失敗:', error);
    }
  }
}

// 創建實例
export const realStockPriceUpdater = new RealStockPriceUpdater();

// 導出主要功能
export const updatePopularStockPrices = () => realStockPriceUpdater.updatePopularStockPrices();
export const updateSpecificStock = (symbol: string) => realStockPriceUpdater.updateSpecificStock(symbol);
export const verifyAAPLPrice = () => realStockPriceUpdater.verifyAAPLPrice();
export const refreshStockData = () => realStockPriceUpdater.refreshStockData();
