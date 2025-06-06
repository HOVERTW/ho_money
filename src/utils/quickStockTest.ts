/**
 * 快速股票測試
 * 測試 API 獲取和 Supabase 存儲
 */

import { supabaseConfig } from '../services/supabase';

interface QuickStockData {
  symbol: string;
  name: string;
  price: number;
  lastUpdated: string;
}

class QuickStockTest {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';

  /**
   * 獲取股票價格
   */
  async fetchStockPrice(symbol: string): Promise<QuickStockData | null> {
    try {
      console.log(`🔄 獲取 ${symbol} 價格...`);

      const params = new URLSearchParams({
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: this.API_KEY,
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['01. symbol']) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的報價資料`);
        return null;
      }

      const quote = data['Global Quote'];
      const result = {
        symbol: quote['01. symbol'],
        name: this.getCompanyName(symbol),
        price: parseFloat(quote['05. price']),
        lastUpdated: quote['07. latest trading day']
      };

      console.log(`✅ 成功獲取 ${symbol} 價格: $${result.price}`);
      return result;

    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 價格失敗:`, error);
      return null;
    }
  }

  /**
   * 簡化的存儲方法
   */
  async saveToSupabase(stockData: QuickStockData): Promise<boolean> {
    try {
      console.log(`💾 嘗試存儲 ${stockData.symbol} 到 Supabase...`);

      // 方法 1: 直接插入
      const insertData = {
        symbol: stockData.symbol,
        name: stockData.name,
        price: stockData.price,
        price_date: stockData.lastUpdated,
        sector: 'Technology',
        is_sp500: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const result = await supabaseConfig.request('us_stocks', {
          method: 'POST',
          body: JSON.stringify(insertData),
        });

        console.log(`✅ ${stockData.symbol} 插入成功`);
        return true;

      } catch (insertError) {
        console.log(`🔄 插入失敗，嘗試更新 ${stockData.symbol}...`);

        // 方法 2: 更新現有記錄
        try {
          const updateData = {
            name: stockData.name,
            price: stockData.price,
            price_date: stockData.lastUpdated,
            updated_at: new Date().toISOString()
          };

          await supabaseConfig.request(`us_stocks?symbol=eq.${stockData.symbol}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
          });

          console.log(`✅ ${stockData.symbol} 更新成功`);
          return true;

        } catch (updateError) {
          console.error(`❌ ${stockData.symbol} 更新也失敗:`, updateError);
          return false;
        }
      }

    } catch (error) {
      console.error(`❌ 存儲 ${stockData.symbol} 失敗:`, error);
      return false;
    }
  }

  /**
   * 獲取公司名稱
   */
  private getCompanyName(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc. Class A',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
    };

    return names[symbol] || `${symbol} Corporation`;
  }

  /**
   * 測試單一股票
   */
  async testSingleStock(symbol: string): Promise<boolean> {
    console.log(`\n🧪 測試 ${symbol}...`);

    try {
      // 1. 獲取價格
      const stockData = await this.fetchStockPrice(symbol);
      
      if (!stockData) {
        console.log(`❌ ${symbol} 獲取價格失敗`);
        return false;
      }

      // 2. 存儲到 Supabase
      const saved = await this.saveToSupabase(stockData);
      
      if (saved) {
        console.log(`🎉 ${symbol} 測試成功！價格: $${stockData.price}`);
        return true;
      } else {
        console.log(`❌ ${symbol} 存儲失敗`);
        return false;
      }

    } catch (error) {
      console.error(`❌ 測試 ${symbol} 時發生錯誤:`, error);
      return false;
    }
  }

  /**
   * 測試熱門股票
   */
  async testPopularStocks(): Promise<void> {
    console.log('🚀 開始測試熱門股票...');
    console.log('📊 目標：修正 Supabase 存儲問題');

    const testStocks = ['AAPL', 'MSFT', 'GOOGL'];
    let successCount = 0;

    for (const symbol of testStocks) {
      const success = await this.testSingleStock(symbol);
      if (success) {
        successCount++;
      }

      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    console.log(`\n📊 測試結果: ${successCount}/${testStocks.length} 成功`);
    
    if (successCount === testStocks.length) {
      console.log('🎉 所有測試通過！可以開始完整同步');
    } else {
      console.log('⚠️ 部分測試失敗，需要修正問題');
    }
  }

  /**
   * 驗證存儲的資料
   */
  async verifyStoredData(): Promise<void> {
    console.log('\n🔍 驗證存儲的資料...');

    try {
      const result = await supabaseConfig.request('us_stocks?select=symbol,name,price,updated_at&limit=10');
      
      if (result && result.length > 0) {
        console.log('✅ 成功讀取存儲的資料:');
        result.forEach((stock: any) => {
          console.log(`   ${stock.symbol}: ${stock.name} - $${stock.price}`);
        });
      } else {
        console.log('❌ 沒有找到存儲的資料');
      }

    } catch (error) {
      console.error('❌ 驗證資料失敗:', error);
    }
  }
}

// 創建實例並導出
export const quickStockTest = new QuickStockTest();

// 導出主要功能
export const testPopularStocks = () => quickStockTest.testPopularStocks();
export const testSingleStock = (symbol: string) => quickStockTest.testSingleStock(symbol);
export const verifyStoredData = () => quickStockTest.verifyStoredData();

// 立即執行測試
console.log('🧪 啟動快速股票測試...');
setTimeout(() => {
  testPopularStocks().then(() => {
    verifyStoredData();
  });
}, 2000);
