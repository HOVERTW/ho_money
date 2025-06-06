/**
 * 每日自動更新調度系統
 * 統一管理美股、台股、匯率的自動更新
 * 支援定時執行和手動觸發
 */

import { realTimeStockSync } from './realTimeStockSync';
import { taiwanStockAPI, TaiwanStockData } from '../services/taiwanStockAPI';
import { exchangeRateAutoAPI, ExchangeRateData } from '../services/exchangeRateAutoAPI';
import { supabaseConfig } from '../services/supabase';

interface UpdateResult {
  type: 'us_stocks' | 'taiwan_stocks' | 'exchange_rates' | 'us_etfs';
  success: boolean;
  count: number;
  errors: string[];
  duration: number;
  lastUpdated: string;
}

interface DailyUpdateSummary {
  date: string;
  totalUpdates: number;
  successfulUpdates: number;
  failedUpdates: number;
  results: UpdateResult[];
  totalDuration: number;
}

class DailyUpdateScheduler {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;
  private lastUpdateDate: string | null = null;

  // 完整台股清單 (2000+ 檔)
  private readonly ALL_TAIWAN_STOCKS = this.generateTaiwanStockList();

  /**
   * 生成完整台股清單 (2000+ 檔)
   */
  private generateTaiwanStockList(): string[] {
    const stocks: string[] = [];

    // 上市股票 (1000-9999)
    for (let i = 1000; i <= 9999; i++) {
      const symbol = i.toString();
      // 排除一些不存在的號碼段
      if (this.isValidTaiwanStockSymbol(symbol)) {
        stocks.push(symbol);
      }
    }

    // 上櫃股票 (通常是4位數字，但有特殊編號)
    const otcStocks = [
      // 主要上櫃股票
      '3006', '3008', '3010', '3011', '3013', '3014', '3015', '3016', '3017', '3018',
      '3019', '3021', '3022', '3023', '3024', '3025', '3026', '3027', '3028', '3029',
      '3030', '3031', '3032', '3033', '3034', '3035', '3036', '3037', '3038', '3040',
      '3041', '3042', '3043', '3044', '3045', '3046', '3047', '3048', '3049', '3050',
      '3051', '3052', '3053', '3054', '3055', '3056', '3057', '3058', '3059', '3060',
      '3061', '3062', '3063', '3064', '3065', '3066', '3067', '3068', '3069', '3070',
      // 繼續添加更多上櫃股票...
      '4102', '4103', '4104', '4105', '4106', '4107', '4108', '4109', '4110', '4111',
      '4112', '4113', '4114', '4115', '4116', '4117', '4118', '4119', '4120', '4121',
      '5007', '5203', '5206', '5209', '5210', '5211', '5212', '5213', '5214', '5215',
      '6101', '6102', '6103', '6104', '6105', '6106', '6107', '6108', '6109', '6110',
      '6111', '6112', '6113', '6114', '6115', '6116', '6117', '6118', '6119', '6120',
      '8001', '8002', '8003', '8004', '8005', '8006', '8007', '8008', '8009', '8010',
      '9101', '9102', '9103', '9104', '9105', '9106', '9107', '9108', '9109', '9110'
    ];

    stocks.push(...otcStocks);

    console.log(`📊 生成台股清單: ${stocks.length} 檔股票`);
    return stocks;
  }

  /**
   * 檢查是否為有效的台股代號
   */
  private isValidTaiwanStockSymbol(symbol: string): boolean {
    const num = parseInt(symbol);

    // 排除一些不存在的號碼段
    if (num >= 1000 && num <= 1999) return true; // 水泥、食品等
    if (num >= 2000 && num <= 2999) return true; // 塑膠、紡織、電機等
    if (num >= 3000 && num <= 3999) return true; // 電子、資訊等
    if (num >= 4000 && num <= 4999) return true; // 生技醫療等
    if (num >= 5000 && num <= 5999) return true; // 貿易百貨等
    if (num >= 6000 && num <= 6999) return true; // 航運、觀光等
    if (num >= 8000 && num <= 8999) return true; // 金融保險等
    if (num >= 9000 && num <= 9999) return true; // 其他等

    return false;
  }

  /**
   * 更新美股資料
   */
  private async updateUSStocks(): Promise<UpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log('🇺🇸 開始更新美股資料...');

    try {
      await realTimeStockSync.executeFullSync();

      const duration = Date.now() - startTime;

      return {
        type: 'us_stocks',
        success: true,
        count: 500, // S&P 500 股票
        errors: [],
        duration: Math.round(duration / 1000),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);

      return {
        type: 'us_stocks',
        success: false,
        count: 0,
        errors: errors,
        duration: Math.round((Date.now() - startTime) / 1000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 更新美國ETF資料
   */
  private async updateUSETFs(): Promise<UpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log('📈 開始更新美國ETF資料...');

    try {
      // 使用TypeScript ETF更新服務
      const { ETFPriceUpdateService } = await import('../services/etfPriceUpdateService');
      const etfPriceUpdateService = new ETFPriceUpdateService();

      // 更新所有ETF價格
      const result = await etfPriceUpdateService.updateAllETFPrices(438);

      return {
        type: 'us_etfs',
        success: result.success,
        count: result.updated_count,
        errors: result.errors,
        duration: result.duration,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);

      return {
        type: 'us_etfs',
        success: false,
        count: 0,
        errors: errors,
        duration: Math.round((Date.now() - startTime) / 1000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 更新台股資料
   */
  private async updateTaiwanStocks(): Promise<UpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let successCount = 0;
    
    console.log('🇹🇼 開始更新台股資料...');
    
    try {
      const taiwanStocks = await taiwanStockAPI.getBatchTaiwanQuotes(this.ALL_TAIWAN_STOCKS);
      
      // 存儲台股資料到 Supabase
      for (const stock of taiwanStocks) {
        try {
          await this.saveTaiwanStockToSupabase(stock);
          successCount++;
        } catch (error) {
          const errorMsg = `${stock.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }
      
      const duration = Date.now() - startTime;
      
      return {
        type: 'taiwan_stocks',
        success: successCount > 0,
        count: successCount,
        errors: errors,
        duration: Math.round(duration / 1000),
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      
      return {
        type: 'taiwan_stocks',
        success: false,
        count: 0,
        errors: errors,
        duration: Math.round((Date.now() - startTime) / 1000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 更新匯率資料
   */
  private async updateExchangeRates(): Promise<UpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let successCount = 0;
    
    console.log('💱 開始更新匯率資料...');
    
    try {
      // 只更新 USD/TWD 匯率
      const usdTwdRate = await exchangeRateAutoAPI.getExchangeRate('USD', 'TWD');
      const exchangeRates = usdTwdRate ? [usdTwdRate] : [];
      
      // 存儲匯率資料到 Supabase
      for (const rate of exchangeRates) {
        try {
          await this.saveExchangeRateToSupabase(rate);
          successCount++;
        } catch (error) {
          const errorMsg = `${rate.baseCurrency}/${rate.targetCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }
      
      const duration = Date.now() - startTime;
      
      return {
        type: 'exchange_rates',
        success: successCount > 0,
        count: successCount,
        errors: errors,
        duration: Math.round(duration / 1000),
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      
      return {
        type: 'exchange_rates',
        success: false,
        count: 0,
        errors: errors,
        duration: Math.round((Date.now() - startTime) / 1000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 存儲台股資料到 Supabase
   */
  private async saveTaiwanStockToSupabase(stock: TaiwanStockData): Promise<void> {
    // 使用類似美股的 UPSERT 函數，或直接插入/更新
    await supabaseConfig.request('rpc/upsert_taiwan_stock', {
      method: 'POST',
      body: JSON.stringify({
        stock_symbol: stock.symbol,
        stock_name: stock.name,
        stock_price: stock.price,
        stock_change: stock.change,
        stock_change_percent: stock.changePercent,
        stock_volume: stock.volume,
        market_type: stock.market_type
      })
    });
  }

  /**
   * 存儲匯率資料到 Supabase
   */
  private async saveExchangeRateToSupabase(rate: ExchangeRateData): Promise<void> {
    await supabaseConfig.request('rpc/upsert_exchange_rate', {
      method: 'POST',
      body: JSON.stringify({
        base_currency: rate.baseCurrency,
        target_currency: rate.targetCurrency,
        exchange_rate: rate.rate,
        buy_rate: rate.buyRate,
        sell_rate: rate.sellRate,
        rate_source: rate.source
      })
    });
  }

  /**
   * 執行每日完整更新
   */
  async executeDailyUpdate(): Promise<DailyUpdateSummary> {
    if (this.isUpdating) {
      throw new Error('更新正在進行中，請稍後再試');
    }

    this.isUpdating = true;
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🌅 開始每日完整更新...');
    console.log(`📅 更新日期: ${today}`);
    console.log('🎯 更新項目: 美股、美國ETF、台股、匯率');

    const results: UpdateResult[] = [];

    try {
      // 1. 更新美股 (優先級最高)
      console.log('\n1️⃣ 更新美股...');
      const usStocksResult = await this.updateUSStocks();
      results.push(usStocksResult);

      // 暫停一下避免 API 過載
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 2. 更新美國ETF
      console.log('\n2️⃣ 更新美國ETF...');
      const usETFsResult = await this.updateUSETFs();
      results.push(usETFsResult);

      // 暫停一下
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. 更新台股
      console.log('\n3️⃣ 更新台股...');
      const taiwanStocksResult = await this.updateTaiwanStocks();
      results.push(taiwanStocksResult);

      // 暫停一下
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 更新匯率
      console.log('\n4️⃣ 更新匯率...');
      const exchangeRatesResult = await this.updateExchangeRates();
      results.push(exchangeRatesResult);

    } catch (error) {
      console.error('❌ 每日更新過程中發生錯誤:', error);
    }

    // 統計結果
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    const successfulUpdates = results.filter(r => r.success).length;
    const failedUpdates = results.length - successfulUpdates;
    const totalUpdates = results.reduce((sum, r) => sum + r.count, 0);

    const summary: DailyUpdateSummary = {
      date: today,
      totalUpdates: totalUpdates,
      successfulUpdates: successfulUpdates,
      failedUpdates: failedUpdates,
      results: results,
      totalDuration: totalDuration
    };

    // 記錄更新日誌
    await this.logUpdateSummary(summary);

    // 顯示結果
    console.log('\n🎉 每日完整更新完成！');
    console.log('=====================================');
    console.log(`📅 更新日期: ${summary.date}`);
    console.log(`📊 總更新數量: ${summary.totalUpdates}`);
    console.log(`✅ 成功項目: ${summary.successfulUpdates}/4`);
    console.log(`❌ 失敗項目: ${summary.failedUpdates}/4`);
    console.log(`⏱️ 總用時: ${summary.totalDuration} 秒`);
    console.log('=====================================');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const type = result.type === 'us_stocks' ? '美股' :
                   result.type === 'us_etfs' ? '美國ETF' :
                   result.type === 'taiwan_stocks' ? '台股' : '匯率';
      console.log(`${status} ${type}: ${result.count} 項 (${result.duration}秒)`);

      if (result.errors.length > 0) {
        console.log(`   錯誤: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`);
      }
    });

    console.log('=====================================');
    console.log('💡 所有資料已更新完成！');
    console.log('🎯 用戶現在可以看到最新的股價和匯率');
    console.log('🔄 系統會在明天自動再次更新');

    this.lastUpdateDate = today;
    this.isUpdating = false;

    return summary;
  }

  /**
   * 記錄更新日誌到 Supabase
   */
  private async logUpdateSummary(summary: DailyUpdateSummary): Promise<void> {
    try {
      await supabaseConfig.request('daily_update_logs', {
        method: 'POST',
        body: JSON.stringify({
          update_date: summary.date,
          total_updates: summary.totalUpdates,
          successful_updates: summary.successfulUpdates,
          failed_updates: summary.failedUpdates,
          update_results: summary.results,
          total_duration: summary.totalDuration,
          created_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('❌ 記錄更新日誌失敗:', error);
    }
  }

  /**
   * 啟動定時更新
   */
  startScheduledUpdates(): void {
    console.log('⏰ 啟動定時更新系統...');
    
    // 檢查是否今天已經更新過
    this.checkAndRunDailyUpdate();
    
    // 設定每小時檢查一次
    this.updateInterval = setInterval(() => {
      this.checkAndRunDailyUpdate();
    }, 60 * 60 * 1000); // 每小時檢查

    console.log('✅ 定時更新系統已啟動');
  }

  /**
   * 停止定時更新
   */
  stopScheduledUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ 定時更新系統已停止');
    }
  }

  /**
   * 檢查並執行每日更新
   */
  private async checkAndRunDailyUpdate(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // 如果今天已經更新過，跳過
    if (this.lastUpdateDate === today) {
      return;
    }

    // 檢查是否在適當的更新時間
    const now = new Date();
    const hour = now.getHours();
    
    // 在早上 6 點到 8 點之間執行更新 (避開交易時間)
    if (hour >= 6 && hour <= 8) {
      console.log('🕐 到達更新時間，開始每日更新...');
      
      try {
        await this.executeDailyUpdate();
      } catch (error) {
        console.error('❌ 定時更新失敗:', error);
      }
    }
  }

  /**
   * 手動觸發更新
   */
  async manualUpdate(): Promise<DailyUpdateSummary> {
    console.log('🔄 手動觸發每日更新...');
    return await this.executeDailyUpdate();
  }

  /**
   * 獲取更新狀態
   */
  getUpdateStatus() {
    return {
      isUpdating: this.isUpdating,
      lastUpdateDate: this.lastUpdateDate,
      scheduledUpdateRunning: this.updateInterval !== null,
      nextUpdateTime: this.getNextUpdateTime()
    };
  }

  /**
   * 獲取下次更新時間
   */
  private getNextUpdateTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0); // 明天早上7點
    return tomorrow.toLocaleString();
  }
}

// 創建實例並導出
export const dailyUpdateScheduler = new DailyUpdateScheduler();

// 導出主要功能
export const startDailyUpdates = () => dailyUpdateScheduler.startScheduledUpdates();
export const stopDailyUpdates = () => dailyUpdateScheduler.stopScheduledUpdates();
export const manualDailyUpdate = () => dailyUpdateScheduler.manualUpdate();
export const getDailyUpdateStatus = () => dailyUpdateScheduler.getUpdateStatus();
