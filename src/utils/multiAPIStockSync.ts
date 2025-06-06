/**
 * 多 API 輪替股票同步系統
 * 使用多個免費 API 來獲取真實股價
 * 支援每日自動更新
 */

import { supabaseConfig } from '../services/supabase';

interface StockPrice {
  symbol: string;
  price: number;
  lastUpdated: string;
  source: string;
}

class MultiAPIStockSync {
  // 多個免費 API 配置
  private readonly API_CONFIGS = [
    {
      name: 'Alpha Vantage',
      key: 'QJTK95T7SA1661WM',
      baseUrl: 'https://www.alphavantage.co/query',
      dailyLimit: 25,
      getUrl: (symbol: string) => 
        `${this.API_CONFIGS[0].baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.API_CONFIGS[0].key}`,
      parseResponse: (data: any) => {
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          return parseFloat(data['Global Quote']['05. price']);
        }
        return null;
      }
    },
    {
      name: 'Finnhub',
      key: 'YOUR_FINNHUB_KEY', // 需要註冊 https://finnhub.io/
      baseUrl: 'https://finnhub.io/api/v1',
      dailyLimit: 60,
      getUrl: (symbol: string) => 
        `${this.API_CONFIGS[1].baseUrl}/quote?symbol=${symbol}&token=${this.API_CONFIGS[1].key}`,
      parseResponse: (data: any) => {
        if (data.c) { // current price
          return parseFloat(data.c);
        }
        return null;
      }
    },
    {
      name: 'Twelve Data',
      key: 'YOUR_TWELVE_DATA_KEY', // 需要註冊 https://twelvedata.com/
      baseUrl: 'https://api.twelvedata.com',
      dailyLimit: 100,
      getUrl: (symbol: string) => 
        `${this.API_CONFIGS[2].baseUrl}/price?symbol=${symbol}&apikey=${this.API_CONFIGS[2].key}`,
      parseResponse: (data: any) => {
        if (data.price) {
          return parseFloat(data.price);
        }
        return null;
      }
    },
    {
      name: 'Yahoo Finance (非官方)',
      key: '', // 不需要 API Key
      baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
      dailyLimit: 1000,
      getUrl: (symbol: string) => 
        `${this.API_CONFIGS[3].baseUrl}/${symbol}`,
      parseResponse: (data: any) => {
        if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
          return parseFloat(data.chart.result[0].meta.regularMarketPrice);
        }
        return null;
      }
    }
  ];

  private apiUsage: { [key: string]: number } = {};
  private currentAPIIndex = 0;

  /**
   * 獲取下一個可用的 API
   */
  private getNextAvailableAPI() {
    for (let i = 0; i < this.API_CONFIGS.length; i++) {
      const api = this.API_CONFIGS[this.currentAPIIndex];
      const usage = this.apiUsage[api.name] || 0;
      
      if (usage < api.dailyLimit) {
        return api;
      }
      
      this.currentAPIIndex = (this.currentAPIIndex + 1) % this.API_CONFIGS.length;
    }
    
    return null; // 所有 API 都達到限制
  }

  /**
   * 使用多 API 獲取股價
   */
  async fetchStockPrice(symbol: string): Promise<StockPrice | null> {
    let attempts = 0;
    const maxAttempts = this.API_CONFIGS.length;

    while (attempts < maxAttempts) {
      const api = this.getNextAvailableAPI();
      
      if (!api) {
        console.log('⚠️ 所有 API 都達到每日限制');
        break;
      }

      try {
        console.log(`🔄 使用 ${api.name} 獲取 ${symbol} 價格...`);
        
        const response = await fetch(api.getUrl(symbol));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const price = api.parseResponse(data);

        // 記錄 API 使用量
        this.apiUsage[api.name] = (this.apiUsage[api.name] || 0) + 1;

        if (price && price > 0) {
          console.log(`✅ ${api.name} 成功獲取 ${symbol}: $${price}`);
          
          return {
            symbol,
            price,
            lastUpdated: new Date().toISOString().split('T')[0],
            source: api.name
          };
        } else {
          console.log(`⚠️ ${api.name} 沒有返回有效價格`);
        }

      } catch (error) {
        console.error(`❌ ${api.name} 獲取 ${symbol} 失敗:`, error);
      }

      attempts++;
      this.currentAPIIndex = (this.currentAPIIndex + 1) % this.API_CONFIGS.length;
      
      // 避免過快請求
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`❌ 所有 API 都無法獲取 ${symbol} 價格`);
    return null;
  }

  /**
   * 每日自動更新任務
   */
  async dailyUpdateTask(): Promise<void> {
    console.log('🌅 開始每日股價更新任務...');
    console.log(`📅 更新日期: ${new Date().toLocaleDateString()}`);

    // 重點股票清單（可以從資料庫讀取）
    const priorityStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'V', 'MA', 'JPM',
      'WMT', 'PG', 'JNJ', 'HD', 'BAC', 'XOM', 'LLY', 'ABBV', 'KO', 'PFE'
    ];

    let successCount = 0;
    let failCount = 0;

    for (const symbol of priorityStocks) {
      try {
        const stockPrice = await this.fetchStockPrice(symbol);
        
        if (stockPrice) {
          // 存儲到 Supabase
          const saved = await this.saveToSupabase(stockPrice);
          
          if (saved) {
            successCount++;
            console.log(`✅ ${symbol} 更新成功: $${stockPrice.price} (${stockPrice.source})`);
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }

        // 避免過快請求
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ 更新 ${symbol} 時發生錯誤:`, error);
        failCount++;
      }
    }

    // 統計報告
    console.log('\n📊 每日更新完成！');
    console.log(`✅ 成功: ${successCount} 檔`);
    console.log(`❌ 失敗: ${failCount} 檔`);
    console.log('API 使用統計:');
    Object.entries(this.apiUsage).forEach(([api, count]) => {
      console.log(`  ${api}: ${count} 次`);
    });
  }

  /**
   * 存儲到 Supabase
   */
  private async saveToSupabase(stockPrice: StockPrice): Promise<boolean> {
    try {
      await supabaseConfig.request('rpc/upsert_us_stock', {
        method: 'POST',
        body: JSON.stringify({
          stock_symbol: stockPrice.symbol,
          stock_name: this.getCompanyName(stockPrice.symbol),
          stock_sector: this.getSector(stockPrice.symbol),
          stock_price: stockPrice.price,
          is_sp500_stock: true
        })
      });

      return true;
    } catch (error) {
      console.error(`❌ 存儲 ${stockPrice.symbol} 失敗:`, error);
      return false;
    }
  }

  private getCompanyName(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corporation', 'V': 'Visa Inc.',
      'GOOGL': 'Alphabet Inc. Class A', 'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.', 'NVDA': 'NVIDIA Corporation', 'MA': 'Mastercard Incorporated',
      'JPM': 'JPMorgan Chase & Co.', 'WMT': 'Walmart Inc.', 'PG': 'The Procter & Gamble Company',
    };
    return names[symbol] || `${symbol} Corporation`;
  }

  private getSector(symbol: string): string {
    const sectors: { [key: string]: string } = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'V': 'Financials',
      'GOOGL': 'Communication Services', 'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary',
      'META': 'Communication Services', 'NVDA': 'Technology', 'MA': 'Financials',
    };
    return sectors[symbol] || 'Unknown';
  }
}

// 創建實例
export const multiAPIStockSync = new MultiAPIStockSync();

// 導出功能
export const executeDailyUpdate = () => multiAPIStockSync.dailyUpdateTask();
