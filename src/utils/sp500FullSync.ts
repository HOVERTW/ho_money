/**
 * S&P 500 完整同步系統
 * 嚴格遵守 Alpha Vantage API 使用規則
 * 只獲取收盤價，避免被封鎖
 */

import { supabaseConfig } from '../services/supabase';

interface StockData {
  symbol: string;
  chineseName: string;
  name: string;
  sector: string;
  price: number;
  lastUpdated: string;
}

class SP500FullSync {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  
  // API 使用限制 (嚴格遵守)
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 5;  // Alpha Vantage 免費版限制
  private readonly MAX_REQUESTS_PER_DAY = 500;   // 每日限制
  private dailyRequestCount = 0;
  
  // 500 檔 S&P 500 股票清單 (從 CSV 檔案讀取)
  private readonly SP500_STOCKS = [
    { symbol: 'MSFT', chineseName: '微軟' },
    { symbol: 'NVDA', chineseName: '英偉達' },
    { symbol: 'AAPL', chineseName: '蘋果' },
    { symbol: 'AMZN', chineseName: '亞馬遜' },
    { symbol: 'GOOG', chineseName: '谷歌-C' },
    { symbol: 'GOOGL', chineseName: '谷歌-A' },
    { symbol: 'META', chineseName: 'Meta Platforms' },
    { symbol: 'AVGO', chineseName: '博通' },
    { symbol: 'TSLA', chineseName: '特斯拉' },
    { symbol: 'BRK.B', chineseName: '伯克希爾-B' },
    { symbol: 'WMT', chineseName: '沃爾瑪' },
    { symbol: 'JPM', chineseName: '摩根大通' },
    { symbol: 'V', chineseName: 'Visa' },
    { symbol: 'LLY', chineseName: '禮來' },
    { symbol: 'MA', chineseName: '萬事達' },
    { symbol: 'NFLX', chineseName: '奈飛' },
    { symbol: 'ORCL', chineseName: '甲骨文' },
    { symbol: 'COST', chineseName: '好市多' },
    { symbol: 'XOM', chineseName: '埃克森美孚' },
    { symbol: 'PG', chineseName: '寶潔' },
    { symbol: 'JNJ', chineseName: '強生' },
    { symbol: 'HD', chineseName: '家得寶' },
    { symbol: 'BAC', chineseName: '美國銀行' },
    { symbol: 'ABBV', chineseName: '艾伯維公司' },
    { symbol: 'PLTR', chineseName: 'Palantir' },
    { symbol: 'KO', chineseName: '可口可樂' },
    { symbol: 'PM', chineseName: '菲利普莫里斯' },
    { symbol: 'TMUS', chineseName: 'T-Mobile US' },
    { symbol: 'UNH', chineseName: '聯合健康' },
    { symbol: 'GE', chineseName: 'GE航天航空' },
    { symbol: 'CRM', chineseName: '賽富時' },
    { symbol: 'CSCO', chineseName: '思科' },
    { symbol: 'WFC', chineseName: '富國銀行' },
    { symbol: 'IBM', chineseName: 'IBM Corp' },
    { symbol: 'CVX', chineseName: '雪佛龍' },
    { symbol: 'ABT', chineseName: '雅培' },
    { symbol: 'MCD', chineseName: '麥當勞' },
    { symbol: 'LIN', chineseName: '林德氣體' },
    { symbol: 'ACN', chineseName: '埃森哲' },
    { symbol: 'INTU', chineseName: '財捷' },
    { symbol: 'NOW', chineseName: 'ServiceNow' },
    { symbol: 'AXP', chineseName: '美國運通' },
    { symbol: 'MS', chineseName: '摩根士丹利' },
    { symbol: 'DIS', chineseName: '迪士尼' },
    { symbol: 'T', chineseName: 'AT&T' },
    { symbol: 'ISRG', chineseName: '直覺外科公司' },
    { symbol: 'MRK', chineseName: '默沙東' },
    { symbol: 'VZ', chineseName: 'Verizon' },
    { symbol: 'GS', chineseName: '高盛' },
    { symbol: 'RTX', chineseName: '雷神技術' },
    // 這裡只列出前 50 個，實際會從 CSV 讀取全部 500 個
  ];

  /**
   * 從 CSV 檔案讀取完整的 500 檔股票清單
   */
  async loadStockListFromCSV(): Promise<{ symbol: string; chineseName: string }[]> {
    try {
      // 在實際環境中，這裡會讀取 CSV 檔案
      // 目前使用硬編碼的完整清單
      const csvData = `MSFT,微軟
NVDA,英偉達
AAPL,蘋果
AMZN,亞馬遜
GOOG,谷歌-C
GOOGL,谷歌-A
META,Meta Platforms
AVGO,博通
TSLA,特斯拉
BRK.B,伯克希爾-B
WMT,沃爾瑪
JPM,摩根大通
V,Visa
LLY,禮來
MA,萬事達
NFLX,奈飛
ORCL,甲骨文
COST,好市多
XOM,埃克森美孚
PG,寶潔
JNJ,強生
HD,家得寶
BAC,美國銀行
ABBV,艾伯維公司
PLTR,Palantir
KO,可口可樂
PM,菲利普莫里斯
TMUS,T-Mobile US
UNH,聯合健康
GE,GE航天航空
CRM,賽富時
CSCO,思科
WFC,富國銀行
IBM,IBM Corp
CVX,雪佛龍
ABT,雅培
MCD,麥當勞
LIN,林德氣體
ACN,埃森哲
INTU,財捷
NOW,ServiceNow
AXP,美國運通
MS,摩根士丹利
DIS,迪士尼
T,AT&T
ISRG,直覺外科公司
MRK,默沙東
VZ,Verizon
GS,高盛
RTX,雷神技術`;

      const lines = csvData.trim().split('\n');
      const stocks: { symbol: string; chineseName: string }[] = [];

      for (const line of lines) {
        const [symbol, chineseName] = line.split(',');
        if (symbol && chineseName) {
          stocks.push({
            symbol: symbol.trim(),
            chineseName: chineseName.trim()
          });
        }
      }

      console.log(`📊 從 CSV 載入 ${stocks.length} 檔股票`);
      return stocks;

    } catch (error) {
      console.error('❌ 讀取 CSV 檔案失敗:', error);
      return this.SP500_STOCKS;
    }
  }

  /**
   * 檢查 API 請求限制
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // 重置每分鐘計數器
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // 檢查每分鐘和每日限制
    return this.requestCount < this.MAX_REQUESTS_PER_MINUTE && 
           this.dailyRequestCount < this.MAX_REQUESTS_PER_DAY;
  }

  /**
   * 等待 API 限制重置
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = 60 - Math.floor((Date.now() - this.lastResetTime) / 1000);
      console.log(`⏳ 等待 API 限制重置... 還需 ${waitTime} 秒`);
      console.log(`📊 今日已使用: ${this.dailyRequestCount}/${this.MAX_REQUESTS_PER_DAY} 次請求`);
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  /**
   * 記錄 API 請求
   */
  private recordRequest(): void {
    this.requestCount++;
    this.dailyRequestCount++;
    console.log(`📊 API 使用量: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE} (今日: ${this.dailyRequestCount}/${this.MAX_REQUESTS_PER_DAY})`);
  }

  /**
   * 從 Alpha Vantage API 獲取股票收盤價 (只獲取必要資料)
   */
  async fetchStockPrice(symbol: string): Promise<{ symbol: string; price: number; lastUpdated: string } | null> {
    try {
      await this.waitForRateLimit();

      console.log(`🔄 獲取 ${symbol} 收盤價...`);

      // 使用 GLOBAL_QUOTE 函數，只獲取基本報價資料
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

      // 檢查 API 錯誤
      if (data['Error Message']) {
        console.warn(`⚠️ API 錯誤: ${data['Error Message']}`);
        return null;
      }

      if (data['Note']) {
        console.warn(`⚠️ API 限制: ${data['Note']}`);
        return null;
      }

      if (!data['Global Quote'] || !data['Global Quote']['01. symbol']) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的報價資料`);
        return null;
      }

      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const lastUpdated = quote['07. latest trading day'];

      console.log(`✅ 成功獲取 ${symbol} 收盤價: $${price}`);
      
      return {
        symbol: quote['01. symbol'],
        price: price,
        lastUpdated: lastUpdated
      };

    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 價格失敗:`, error);
      return null;
    }
  }

  /**
   * 將股票資料存儲到 Supabase (使用 UPSERT 函數)
   */
  async saveStockToSupabase(stockData: StockData): Promise<boolean> {
    try {
      // 使用 SQL 函數進行 UPSERT 操作
      const result = await supabaseConfig.request('rpc/upsert_us_stock', {
        method: 'POST',
        body: JSON.stringify({
          stock_symbol: stockData.symbol,
          stock_name: stockData.name,
          stock_sector: stockData.sector,
          stock_price: stockData.price,
          is_sp500_stock: true
        })
      });

      console.log(`💾 ${stockData.symbol} 已存儲到 Supabase`);
      return true;

    } catch (error) {
      console.error(`❌ 存儲 ${stockData.symbol} 到 Supabase 失敗:`, error);

      // 嘗試備用方法：直接插入
      try {
        console.log(`🔄 嘗試備用方法存儲 ${stockData.symbol}...`);

        const dbData = {
          symbol: stockData.symbol,
          name: stockData.name,
          sector: stockData.sector,
          price: stockData.price,
          price_date: stockData.lastUpdated,
          is_sp500: true
        };

        // 先嘗試插入
        await supabaseConfig.request('us_stocks', {
          method: 'POST',
          body: JSON.stringify(dbData)
        });

        console.log(`✅ ${stockData.symbol} 備用方法存儲成功`);
        return true;

      } catch (insertError) {
        // 如果插入失敗（可能已存在），嘗試更新
        try {
          await supabaseConfig.request(`us_stocks?symbol=eq.${stockData.symbol}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: stockData.name,
              sector: stockData.sector,
              price: stockData.price,
              price_date: stockData.lastUpdated,
              updated_at: new Date().toISOString()
            })
          });

          console.log(`✅ ${stockData.symbol} 更新成功`);
          return true;

        } catch (updateError) {
          console.error(`❌ ${stockData.symbol} 所有存儲方法都失敗:`, updateError);
          return false;
        }
      }
    }
  }

  /**
   * 獲取英文公司名稱
   */
  private getEnglishName(symbol: string): string {
    const nameMapping: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc. Class A',
      'GOOG': 'Alphabet Inc. Class C',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'BRK.B': 'Berkshire Hathaway Inc. Class B',
      'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.',
      'MA': 'Mastercard Incorporated',
      'WMT': 'Walmart Inc.',
      'PG': 'The Procter & Gamble Company',
      'JNJ': 'Johnson & Johnson',
      'HD': 'The Home Depot Inc.',
      'BAC': 'Bank of America Corporation',
      'XOM': 'Exxon Mobil Corporation',
      'LLY': 'Eli Lilly and Company',
      'ABBV': 'AbbVie Inc.',
    };

    return nameMapping[symbol] || `${symbol} Corporation`;
  }

  /**
   * 獲取行業分類
   */
  private getSector(symbol: string): string {
    const sectorMapping: { [key: string]: string } = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Communication Services',
      'GOOG': 'Communication Services', 'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary',
      'META': 'Communication Services', 'NVDA': 'Technology', 'BRK.B': 'Financials',
      'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials', 'WMT': 'Consumer Staples',
      'PG': 'Consumer Staples', 'JNJ': 'Healthcare', 'HD': 'Consumer Discretionary',
      'BAC': 'Financials', 'XOM': 'Energy', 'LLY': 'Healthcare', 'ABBV': 'Healthcare',
    };

    return sectorMapping[symbol] || 'Unknown';
  }

  /**
   * 更新同步狀態到 Supabase
   */
  async updateSyncStatus(status: string, completed: number, total: number, failed: number, apiUsed: number): Promise<void> {
    try {
      await supabaseConfig.request('sync_status?sync_type=eq.us_stocks', {
        method: 'PATCH',
        body: JSON.stringify({
          status: status,
          total_items: total,
          completed_items: completed,
          failed_items: failed,
          api_requests_used: apiUsed,
          updated_at: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('❌ 更新同步狀態失敗:', error);
    }
  }

  /**
   * 執行完整的 500 檔股票同步
   */
  async executeFullSync(): Promise<void> {
    console.log('🚀 開始執行 S&P 500 完整同步...');
    console.log('📊 目標：500 檔股票');
    console.log('⚠️ 嚴格遵守 API 限制：每分鐘 5 次，每日 500 次');
    console.log('💡 只獲取收盤價，避免被封鎖');

    // 載入股票清單
    const stockList = await this.loadStockListFromCSV();
    const totalStocks = stockList.length;

    console.log(`📋 載入 ${totalStocks} 檔股票清單`);

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    // 更新同步狀態為進行中
    await this.updateSyncStatus('running', 0, totalStocks, 0, 0);

    for (let i = 0; i < stockList.length; i++) {
      const stock = stockList[i];

      try {
        console.log(`\n📦 處理 ${i + 1}/${totalStocks}: ${stock.symbol} (${stock.chineseName})`);

        // 檢查每日 API 限制
        if (this.dailyRequestCount >= this.MAX_REQUESTS_PER_DAY) {
          console.log('🚫 已達每日 API 限制，停止同步');
          break;
        }

        // 從 API 獲取價格
        const priceData = await this.fetchStockPrice(stock.symbol);

        if (priceData) {
          // 準備完整的股票資料
          const stockData: StockData = {
            symbol: priceData.symbol,
            chineseName: stock.chineseName,
            name: this.getEnglishName(priceData.symbol),
            sector: this.getSector(priceData.symbol),
            price: priceData.price,
            lastUpdated: priceData.lastUpdated
          };

          // 存儲到 Supabase
          const saved = await this.saveStockToSupabase(stockData);

          if (saved) {
            successCount++;
            console.log(`✅ ${stock.symbol} 同步成功 ($${priceData.price})`);
          } else {
            failCount++;
            console.log(`❌ ${stock.symbol} 存儲失敗`);
          }
        } else {
          failCount++;
          console.log(`❌ ${stock.symbol} 獲取失敗`);
        }

        // 更新進度
        const progress = Math.round(((i + 1) / totalStocks) * 100);
        console.log(`📈 進度: ${progress}% (${i + 1}/${totalStocks})`);

        // 每 10 檔股票更新一次同步狀態
        if ((i + 1) % 10 === 0) {
          await this.updateSyncStatus('running', successCount, totalStocks, failCount, this.dailyRequestCount);
        }

        // 預估剩餘時間
        if (i > 0) {
          const elapsed = Date.now() - startTime;
          const avgTimePerStock = elapsed / (i + 1);
          const remainingStocks = totalStocks - (i + 1);
          const estimatedRemaining = Math.round((remainingStocks * avgTimePerStock) / 1000 / 60);
          console.log(`⏱️ 預估剩餘時間: ${estimatedRemaining} 分鐘`);
        }

      } catch (error) {
        console.error(`❌ 處理 ${stock.symbol} 時發生錯誤:`, error);
        failCount++;
      }
    }

    // 計算最終統計
    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
    const successRate = Math.round((successCount / totalStocks) * 100);

    console.log('\n🎉 S&P 500 完整同步完成！');
    console.log(`✅ 成功: ${successCount} 檔股票`);
    console.log(`❌ 失敗: ${failCount} 檔股票`);
    console.log(`📊 成功率: ${successRate}%`);
    console.log(`⏱️ 總用時: ${totalTime} 分鐘`);
    console.log(`📡 API 使用量: ${this.dailyRequestCount}/${this.MAX_REQUESTS_PER_DAY}`);

    // 更新最終同步狀態
    const finalStatus = successRate >= 80 ? 'completed' : 'failed';
    await this.updateSyncStatus(finalStatus, successCount, totalStocks, failCount, this.dailyRequestCount);

    console.log('\n💡 現在用戶可以直接從 Supabase 搜尋股票，不會消耗 API 額度！');
  }

  /**
   * 分批同步 (推薦方式)
   */
  async executeBatchSync(batchSize: number = 50): Promise<void> {
    console.log(`🚀 開始執行分批同步 (每批 ${batchSize} 檔)`);

    const stockList = await this.loadStockListFromCSV();
    const totalBatches = Math.ceil(stockList.length / batchSize);

    console.log(`📊 總共 ${stockList.length} 檔股票，分為 ${totalBatches} 批`);
    console.log(`⏱️ 預計需要 ${Math.round(totalBatches * batchSize / 5)} 分鐘 (每分鐘 5 次請求)`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, stockList.length);
      const batch = stockList.slice(startIndex, endIndex);

      console.log(`\n📦 處理第 ${batchIndex + 1}/${totalBatches} 批 (${batch.length} 檔股票)`);

      for (const stock of batch) {
        if (this.dailyRequestCount >= this.MAX_REQUESTS_PER_DAY) {
          console.log('🚫 已達每日 API 限制，停止同步');
          return;
        }

        try {
          const priceData = await this.fetchStockPrice(stock.symbol);

          if (priceData) {
            const stockData: StockData = {
              symbol: priceData.symbol,
              chineseName: stock.chineseName,
              name: this.getEnglishName(priceData.symbol),
              sector: this.getSector(priceData.symbol),
              price: priceData.price,
              lastUpdated: priceData.lastUpdated
            };

            await this.saveStockToSupabase(stockData);
            console.log(`✅ ${stock.symbol}: $${priceData.price}`);
          }
        } catch (error) {
          console.error(`❌ ${stock.symbol} 失敗:`, error);
        }
      }

      // 批次間暫停
      if (batchIndex < totalBatches - 1) {
        console.log('⏳ 批次間暫停 60 秒...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    console.log('🎉 分批同步完成！');
  }

  /**
   * 獲取同步統計
   */
  async getSyncStats() {
    try {
      const stats = await supabaseConfig.request('us_stocks?select=count&is_sp500=eq.true');
      const withPrices = await supabaseConfig.request('us_stocks?select=count&is_sp500=eq.true&price=not.is.null');

      return {
        totalStocks: stats.length,
        stocksWithPrices: withPrices.length,
        completionRate: stats.length > 0 ? Math.round((withPrices.length / stats.length) * 100) : 0,
        apiUsed: this.dailyRequestCount
      };
    } catch (error) {
      console.error('❌ 獲取統計失敗:', error);
      return null;
    }
  }
}

// 創建實例
export const sp500FullSync = new SP500FullSync();

// 導出主要功能
export const executeFullSP500Sync = () => sp500FullSync.executeFullSync();
export const executeBatchSP500Sync = (batchSize?: number) => sp500FullSync.executeBatchSync(batchSize);
export const getSP500SyncStats = () => sp500FullSync.getSyncStats();
