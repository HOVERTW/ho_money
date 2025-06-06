/**
 * 匯率服務
 * 負責獲取和管理美元兌台幣匯率
 */

import { supabaseConfig } from './supabase';

export interface ExchangeRateData {
  date: string;
  currency: string;
  cash_buy: number;
  cash_sell: number;
  spot_buy: number;
  spot_sell: number;
}

export interface ExchangeRateResponse {
  msg: string;
  status: number;
  data: ExchangeRateData[];
}

class ExchangeRateService {
  private readonly API_URL = 'https://api.finmindtrade.com/api/v3/data';
  private cachedRate: ExchangeRateData | null = null;
  private lastFetchDate: string | null = null;

  /**
   * 從 Supabase 獲取最新美元匯率
   */
  async getLatestUSDRateFromSupabase(): Promise<ExchangeRateData | null> {
    try {
      console.log('🔄 從 Supabase 獲取最新美元匯率...');

      // 使用 HTTP API 查詢最新的美元匯率
      const endpoint = 'exchange_rates?currency=eq.USD&order=date.desc&limit=1';
      const data = await supabaseConfig.request(endpoint);

      if (!data || data.length === 0) {
        console.warn('⚠️ Supabase 中沒有匯率資料');
        return null;
      }

      const rate = data[0];
      const exchangeRateData: ExchangeRateData = {
        date: rate.date,
        currency: rate.currency,
        cash_buy: parseFloat(rate.cash_buy),
        cash_sell: parseFloat(rate.cash_sell),
        spot_buy: parseFloat(rate.spot_buy),
        spot_sell: parseFloat(rate.spot_sell),
      };

      console.log('✅ 成功從 Supabase 獲取匯率:', {
        date: exchangeRateData.date,
        spot_buy: exchangeRateData.spot_buy,
        spot_sell: exchangeRateData.spot_sell,
        mid_rate: (exchangeRateData.spot_buy + exchangeRateData.spot_sell) / 2
      });

      return exchangeRateData;
    } catch (error) {
      console.error('❌ 從 Supabase 獲取匯率失敗:', error);
      return null;
    }
  }

  /**
   * 獲取當日美元兌台幣匯率（優先使用 Supabase）
   */
  async getCurrentUSDRate(): Promise<ExchangeRateData | null> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 格式

      // 如果已經有當日的快取資料，直接返回
      if (this.cachedRate && this.lastFetchDate === today) {
        return this.cachedRate;
      }

      console.log('🔄 獲取當日美元匯率...', today);

      // 優先從 Supabase 獲取匯率
      const supabaseRate = await this.getLatestUSDRateFromSupabase();
      if (supabaseRate) {
        // 快取資料
        this.cachedRate = supabaseRate;
        this.lastFetchDate = today;
        return supabaseRate;
      }

      // 如果 Supabase 沒有資料，嘗試從 FinMind API 獲取
      console.log('⚠️ Supabase 無資料，嘗試從 FinMind API 獲取...');
      return await this.getLatestUSDRateFromAPI();
    } catch (error) {
      console.error('❌ 獲取當日匯率失敗:', error);
      return this.getDefaultUSDRate();
    }
  }

  /**
   * 從 FinMind API 獲取匯率（備用方案）
   */
  async getLatestUSDRateFromAPI(): Promise<ExchangeRateData | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const params = {
        dataset: 'TaiwanExchangeRate',
        data_id: 'USD',
        date: today,
      };

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${this.API_URL}?${queryString}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      if (data.status !== 200 || !data.data || data.data.length === 0) {
        console.warn('⚠️ API 當日匯率資料不可用，嘗試獲取最近的匯率');
        return await this.getLatestUSDRate();
      }

      // 取得當日最新的匯率資料
      const latestRate = data.data[data.data.length - 1];

      console.log('✅ 成功從 API 獲取當日美元匯率:', {
        date: latestRate.date,
        spot_buy: latestRate.spot_buy,
        spot_sell: latestRate.spot_sell
      });

      return latestRate;
    } catch (error) {
      console.error('❌ 從 API 獲取匯率失敗:', error);
      return await this.getLatestUSDRate();
    }
  }

  /**
   * 獲取最近可用的美元兌台幣匯率（回溯7天）
   */
  async getLatestUSDRate(): Promise<ExchangeRateData | null> {
    try {
      console.log('🔄 獲取最近可用的美元匯率...');

      // 回溯7天查找最近的匯率資料
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const params = {
          dataset: 'TaiwanExchangeRate',
          data_id: 'USD',
          date: dateString,
        };

        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.API_URL}?${queryString}`);
        
        if (response.ok) {
          const data: ExchangeRateResponse = await response.json();
          
          if (data.status === 200 && data.data && data.data.length > 0) {
            const latestRate = data.data[data.data.length - 1];
            
            console.log('✅ 找到最近的美元匯率:', {
              date: latestRate.date,
              spot_buy: latestRate.spot_buy,
              spot_sell: latestRate.spot_sell
            });

            return latestRate;
          }
        }
      }

      console.warn('⚠️ 無法獲取最近7天的匯率資料，使用預設匯率');
      return this.getDefaultUSDRate();
    } catch (error) {
      console.error('❌ 獲取最近匯率失敗:', error);
      return this.getDefaultUSDRate();
    }
  }

  /**
   * 獲取預設美元匯率（當 API 無法使用時）
   * 基於 2025-06-01 即期中間價 29.925
   */
  private getDefaultUSDRate(): ExchangeRateData {
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      currency: 'USD',
      cash_buy: 29.8,
      cash_sell: 30.05,
      spot_buy: 29.9,
      spot_sell: 29.95,
    };
  }

  /**
   * 獲取即期中間價（用於美股/加密貨幣標準匯率）
   */
  async getMidRate(): Promise<number> {
    const rate = await this.getCurrentUSDRate();
    if (rate && this.isValidRate(rate.spot_buy) && this.isValidRate(rate.spot_sell)) {
      return (rate.spot_buy + rate.spot_sell) / 2;
    }
    return 29.925; // 預設即期中間價 (2025-06-01)
  }

  /**
   * 獲取即期買入匯率（用於美股/加密貨幣買入時）
   */
  async getBuyRate(): Promise<number> {
    // 統一使用即期中間價
    return await this.getMidRate();
  }

  /**
   * 獲取即期賣出匯率（用於美股/加密貨幣賣出時）
   */
  async getSellRate(): Promise<number> {
    // 統一使用即期中間價
    return await this.getMidRate();
  }

  /**
   * 將美元金額轉換為台幣
   */
  async convertUSDToTWD(usdAmount: number, useRate?: number): Promise<number> {
    const rate = useRate || await this.getSellRate();
    return usdAmount * rate;
  }

  /**
   * 將台幣金額轉換為美元
   */
  async convertTWDToUSD(twdAmount: number, useRate?: number): Promise<number> {
    const rate = useRate || await this.getBuyRate();
    return twdAmount / rate;
  }

  /**
   * 格式化匯率顯示
   */
  formatRate(rate: number): string {
    return rate.toFixed(3);
  }

  /**
   * 清除快取（用於強制重新獲取匯率）
   */
  clearCache(): void {
    this.cachedRate = null;
    this.lastFetchDate = null;
    console.log('🔄 匯率快取已清除');
  }

  /**
   * 檢查匯率是否為有效值
   */
  private isValidRate(rate: number): boolean {
    return rate > 0 && rate !== -99.0; // -99.0 是 API 中的無效值標記
  }

  /**
   * 獲取匯率狀態信息
   */
  async getRateStatus(): Promise<{
    isAvailable: boolean;
    lastUpdate: string;
    source: 'current' | 'recent' | 'default';
  }> {
    const rate = await this.getCurrentUSDRate();
    const today = new Date().toISOString().split('T')[0];
    
    if (!rate) {
      return {
        isAvailable: false,
        lastUpdate: today,
        source: 'default'
      };
    }

    const source = rate.date === today ? 'current' : 
                   rate.date >= this.getDateDaysAgo(7) ? 'recent' : 'default';

    return {
      isAvailable: this.isValidRate(rate.spot_buy) && this.isValidRate(rate.spot_sell),
      lastUpdate: rate.date,
      source
    };
  }

  /**
   * 獲取N天前的日期字串
   */
  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}

// 創建單例實例
export const exchangeRateService = new ExchangeRateService();
