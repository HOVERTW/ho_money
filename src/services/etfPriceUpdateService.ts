/**
 * ETF價格更新服務
 * 使用Yahoo Finance API更新ETF價格到Supabase
 */

import { supabaseConfig } from './supabase';

interface ETFQuoteData {
  symbol: string;
  price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  change_amount: number;
  change_percent: number;
  previous_close: number;
  price_date: string;
  updated_at: string;
}

interface ETFUpdateResult {
  success: boolean;
  updated_count: number;
  failed_count: number;
  errors: string[];
  duration: number;
}

export class ETFPriceUpdateService {
  private readonly YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private readonly REQUEST_DELAY = 1000; // 1秒延遲避免過快請求

  /**
   * 從Yahoo Finance獲取ETF報價
   */
  private async getETFQuoteFromYahoo(symbol: string): Promise<ETFQuoteData | null> {
    try {
      const url = `${this.YAHOO_FINANCE_BASE_URL}/${symbol}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        console.warn(`⚠️ 沒有找到 ${symbol} 的數據`);
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;

      // 獲取價格數據
      const currentPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.previousClose || 0;
      const openPrice = meta.regularMarketOpen || 0;
      const highPrice = meta.regularMarketDayHigh || 0;
      const lowPrice = meta.regularMarketDayLow || 0;
      const volume = meta.regularMarketVolume || 0;

      // 計算變化
      const changeAmount = currentPrice - previousClose;
      const changePercent = previousClose ? (changeAmount / previousClose * 100) : 0;

      // 獲取交易日期
      const marketTime = meta.regularMarketTime || Math.floor(Date.now() / 1000);
      const priceDate = new Date(marketTime * 1000).toISOString().split('T')[0];

      return {
        symbol,
        price: Math.round(currentPrice * 100) / 100,
        open_price: Math.round(openPrice * 100) / 100,
        high_price: Math.round(highPrice * 100) / 100,
        low_price: Math.round(lowPrice * 100) / 100,
        volume: Math.floor(volume),
        change_amount: Math.round(changeAmount * 100) / 100,
        change_percent: Math.round(changePercent * 100) / 100,
        previous_close: Math.round(previousClose * 100) / 100,
        price_date: priceDate,
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 報價失敗:`, error);
      return null;
    }
  }

  /**
   * 更新ETF價格到Supabase
   */
  private async updateETFPriceInDatabase(priceData: ETFQuoteData): Promise<boolean> {
    try {
      const updateData = {
        price: priceData.price,
        open_price: priceData.open_price,
        high_price: priceData.high_price,
        low_price: priceData.low_price,
        volume: priceData.volume,
        change_amount: priceData.change_amount,
        change_percent: priceData.change_percent,
        previous_close: priceData.previous_close,
        price_date: priceData.price_date,
        updated_at: priceData.updated_at
      };

      const result = await supabaseConfig.request(`us_stocks?symbol=eq.${priceData.symbol}&is_etf=eq.true`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      return true;
    } catch (error) {
      console.error(`❌ 更新 ${priceData.symbol} 到數據庫失敗:`, error);
      return false;
    }
  }

  /**
   * 從Supabase獲取ETF列表
   */
  private async getETFListFromDatabase(limit: number = 500): Promise<string[]> {
    try {
      const result = await supabaseConfig.request(`us_stocks?select=symbol&is_etf=eq.true&order=symbol&limit=${limit}`);
      
      if (Array.isArray(result)) {
        return result.map((etf: any) => etf.symbol);
      }
      
      return [];
    } catch (error) {
      console.error('❌ 獲取ETF列表失敗:', error);
      return [];
    }
  }

  /**
   * 批量更新ETF價格
   */
  async updateAllETFPrices(maxETFs: number = 438): Promise<ETFUpdateResult> {
    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    console.log('🚀 開始更新ETF價格...');
    console.log(`🎯 目標更新數量: ${maxETFs}`);

    try {
      // 獲取ETF列表
      const etfSymbols = await this.getETFListFromDatabase(maxETFs);
      
      if (etfSymbols.length === 0) {
        throw new Error('沒有找到ETF數據');
      }

      console.log(`📊 找到 ${etfSymbols.length} 個ETF`);

      // 分批處理ETF
      const batchSize = 10;
      for (let i = 0; i < etfSymbols.length; i += batchSize) {
        const batch = etfSymbols.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(etfSymbols.length / batchSize);

        console.log(`📦 處理批次 ${batchNum}/${totalBatches}: ${batch.join(', ')}`);

        // 並行處理批次內的ETF
        const batchPromises = batch.map(async (symbol) => {
          try {
            const quoteData = await this.getETFQuoteFromYahoo(symbol);
            
            if (quoteData) {
              const updateSuccess = await this.updateETFPriceInDatabase(quoteData);
              
              if (updateSuccess) {
                console.log(`✅ ${symbol}: $${quoteData.price} (${quoteData.change_percent >= 0 ? '+' : ''}${quoteData.change_percent.toFixed(2)}%)`);
                return { success: true, symbol };
              } else {
                console.log(`❌ ${symbol}: 數據庫更新失敗`);
                return { success: false, symbol, error: '數據庫更新失敗' };
              }
            } else {
              console.log(`❌ ${symbol}: 無法獲取報價`);
              return { success: false, symbol, error: '無法獲取報價' };
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.log(`❌ ${symbol}: ${errorMsg}`);
            return { success: false, symbol, error: errorMsg };
          }
        });

        // 等待批次完成
        const batchResults = await Promise.all(batchPromises);
        
        // 統計結果
        batchResults.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`${result.symbol}: ${result.error}`);
          }
        });

        // 批次間延遲
        if (i + batchSize < etfSymbols.length) {
          console.log('⏳ 批次間暫停2秒...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log('\n🎉 ETF價格更新完成！');
      console.log(`✅ 成功: ${successCount} 個ETF`);
      console.log(`❌ 失敗: ${failedCount} 個ETF`);
      console.log(`⏱️ 用時: ${duration} 秒`);

      return {
        success: successCount > 0,
        updated_count: successCount,
        failed_count: failedCount,
        errors: errors.slice(0, 10), // 只保留前10個錯誤
        duration
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ ETF價格更新失敗:', errorMsg);
      
      return {
        success: false,
        updated_count: successCount,
        failed_count: failedCount + 1,
        errors: [errorMsg, ...errors],
        duration: Math.round((Date.now() - startTime) / 1000)
      };
    }
  }

  /**
   * 更新熱門ETF價格（快速更新）
   */
  async updatePopularETFPrices(): Promise<ETFUpdateResult> {
    const popularETFs = [
      'SPY', 'QQQ', 'IWM', 'VOO', 'VTI', 'IVV', 'TQQQ', 'SQQQ',
      'GLD', 'TLT', 'LQD', 'HYG', 'SMH', 'SOXL', 'XLK', 'XLF',
      'EEM', 'FXI', 'IBIT', 'GBTC', 'ARKK', 'NVDL', 'TSLL', 'BITB'
    ];

    console.log('🔥 開始更新熱門ETF價格...');
    
    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const symbol of popularETFs) {
      try {
        const quoteData = await this.getETFQuoteFromYahoo(symbol);
        
        if (quoteData) {
          const updateSuccess = await this.updateETFPriceInDatabase(quoteData);
          
          if (updateSuccess) {
            console.log(`✅ ${symbol}: $${quoteData.price} (${quoteData.change_percent >= 0 ? '+' : ''}${quoteData.change_percent.toFixed(2)}%)`);
            successCount++;
          } else {
            console.log(`❌ ${symbol}: 數據庫更新失敗`);
            failedCount++;
            errors.push(`${symbol}: 數據庫更新失敗`);
          }
        } else {
          console.log(`❌ ${symbol}: 無法獲取報價`);
          failedCount++;
          errors.push(`${symbol}: 無法獲取報價`);
        }

        // 延遲避免過快請求
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${symbol}: ${errorMsg}`);
        failedCount++;
        errors.push(`${symbol}: ${errorMsg}`);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n🎉 熱門ETF價格更新完成！');
    console.log(`✅ 成功: ${successCount} 個ETF`);
    console.log(`❌ 失敗: ${failedCount} 個ETF`);
    console.log(`⏱️ 用時: ${duration} 秒`);

    return {
      success: successCount > 0,
      updated_count: successCount,
      failed_count: failedCount,
      errors,
      duration
    };
  }
}

// 創建並導出實例
export const etfPriceUpdateService = new ETFPriceUpdateService();
export default etfPriceUpdateService;
