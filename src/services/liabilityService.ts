/**
 * 負債管理服務
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventEmitter, EVENTS } from './eventEmitter';
import { supabase, TABLES } from './supabase';

// 本地存儲的鍵名
const STORAGE_KEYS = {
  LIABILITIES: '@FinTranzo:liabilities'
} as const;

export interface LiabilityData {
  id: string;
  name: string;
  type: string;
  balance: number;
  interest_rate?: number;
  monthly_payment?: number;
  sort_order?: number; // 添加排序字段
  // 自動還款相關字段
  payment_account?: string; // 還款帳戶
  payment_day?: number; // 月還款日期 (1-31)
  payment_periods?: number; // 還款期數
  last_payment_date?: string; // 上次還款日期
  next_payment_date?: string; // 下次還款日期
  remaining_periods?: number; // 剩餘期數
}

class LiabilityService {
  private liabilities: LiabilityData[] = [];
  private listeners: Array<(liabilities: LiabilityData[]) => void> = [];
  private isInitialized = false;

  constructor() {
    // 不在構造函數中初始化，改為異步初始化

    // 暫時停用事件監聽以避免循環依賴
    // eventEmitter.on(EVENTS.DATA_SYNC_COMPLETED, this.handleDataSyncCompleted.bind(this));
  }

  /**
   * 異步初始化負債服務
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.isInitialized = true;
      console.log(`✅ 負債服務已初始化，加載了 ${this.liabilities.length} 項負債`);
    } catch (error) {
      console.error('❌ 負債服務初始化失敗:', error);
      // 如果加載失敗，使用空列表
      this.liabilities = [];
      this.isInitialized = true;
    }
    this.notifyListeners();
  }

  /**
   * 強制重新加載數據（用於雲端同步後）
   */
  async forceReload(): Promise<void> {
    console.log('🔄 強制重新加載負債數據...');
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * 處理數據同步完成事件
   */
  private async handleDataSyncCompleted(): Promise<void> {
    console.log('📡 收到數據同步完成事件，重新加載負債數據...');
    await this.forceReload();
  }

  /**
   * 從本地存儲加載負債數據
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const liabilitiesData = await AsyncStorage.getItem(STORAGE_KEYS.LIABILITIES);
      if (liabilitiesData) {
        this.liabilities = JSON.parse(liabilitiesData);
        console.log('📦 從本地存儲加載負債數據:', this.liabilities.length, '項');
      } else {
        // 如果沒有保存的負債，使用空列表
        this.liabilities = [];
        console.log('📝 沒有保存的負債數據，從空列表開始');
      }
    } catch (error) {
      console.error('❌ 從本地存儲加載負債數據失敗:', error);
      this.liabilities = [];
    }
  }

  /**
   * 保存負債數據到本地存儲和雲端
   */
  private async saveToStorage(): Promise<void> {
    try {
      // 1. 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(this.liabilities));
      console.log('💾 負債數據已保存到本地存儲');

      // 2. 如果用戶已登錄，同時保存到雲端
      await this.syncToSupabase();
    } catch (error) {
      console.error('❌ 保存負債數據失敗:', error);
    }
  }

  /**
   * 同步負債數據到 Supabase
   */
  private async syncToSupabase(): Promise<void> {
    try {
      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 用戶未登錄，跳過負債雲端同步');
        return;
      }

      console.log('🔄 開始同步負債數據到雲端...');

      // 轉換負債數據格式以匹配 Supabase 表結構
      const convertedLiabilities = this.liabilities.map((liability: LiabilityData) => ({
        user_id: user.id,
        name: liability.name,
        type: liability.type,
        balance: liability.balance,
        interest_rate: liability.interest_rate || 0,
        monthly_payment: liability.monthly_payment || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 先清除用戶的現有負債數據
      const { error: deleteError } = await supabase
        .from(TABLES.LIABILITIES)
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ 清除舊負債數據失敗:', deleteError);
        return;
      }

      // 插入新的負債數據
      if (convertedLiabilities.length > 0) {
        const { error: insertError } = await supabase
          .from(TABLES.LIABILITIES)
          .insert(convertedLiabilities);

        if (insertError) {
          console.error('❌ 同步負債數據到雲端失敗:', insertError);
        } else {
          console.log(`✅ 已同步 ${convertedLiabilities.length} 筆負債數據到雲端`);
        }
      } else {
        console.log('📝 沒有負債數據需要同步');
      }

    } catch (error) {
      console.error('❌ 同步負債數據到雲端異常:', error);
    }
  }

  /**
   * 添加監聽器
   */
  addListener(listener: (liabilities: LiabilityData[]) => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除監聽器
   */
  removeListener(listener: (liabilities: LiabilityData[]) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.liabilities]));
  }

  /**
   * 獲取所有負債（按排序順序）
   */
  getLiabilities(): LiabilityData[] {
    return [...this.liabilities].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  /**
   * 🔥 修復4：根據ID獲取單個負債
   */
  getLiability(id: string): LiabilityData | undefined {
    return this.liabilities.find(l => l.id === id);
  }

  /**
   * 添加負債
   */
  async addLiability(liability: LiabilityData): Promise<void> {
    // 如果沒有指定排序順序，設置為最後
    if (liability.sort_order === undefined) {
      const maxOrder = Math.max(...this.liabilities.map(l => l.sort_order || 0), -1);
      liability.sort_order = maxOrder + 1;
    }
    this.liabilities.push(liability);
    this.notifyListeners();
    await this.saveToStorage();

    // 🔥 發射負債添加事件
    console.log('🔥 負債添加事件發射:', liability.name);
    eventEmitter.emit(EVENTS.LIABILITY_ADDED, liability);
    eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, { type: 'liability_added', liability });
  }

  /**
   * 更新負債
   */
  async updateLiability(id: string, updatedLiability: Partial<LiabilityData>): Promise<void> {
    const index = this.liabilities.findIndex(l => l.id === id);
    if (index !== -1) {
      this.liabilities[index] = { ...this.liabilities[index], ...updatedLiability };
      this.notifyListeners();
      await this.saveToStorage();
    }
  }

  /**
   * 刪除負債
   */
  async deleteLiability(id: string): Promise<void> {
    this.liabilities = this.liabilities.filter(l => l.id !== id);
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 設置負債列表
   */
  async setLiabilities(liabilities: LiabilityData[]): Promise<void> {
    this.liabilities = [...liabilities];
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 更新負債排序
   */
  async updateLiabilityOrder(reorderedLiabilities: LiabilityData[]): Promise<void> {
    // 更新排序順序
    reorderedLiabilities.forEach((liability, index) => {
      liability.sort_order = index;
    });

    // 更新負債列表
    this.liabilities = [...reorderedLiabilities];
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 計算總負債
   */
  getTotalLiabilities(): number {
    return this.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  }

  /**
   * 計算月付款總額
   */
  getTotalMonthlyPayments(): number {
    return this.liabilities.reduce((sum, liability) => sum + (liability.monthly_payment || 0), 0);
  }

  /**
   * 根據類型獲取負債
   */
  getLiabilitiesByType(type: string): LiabilityData[] {
    return this.liabilities.filter(liability => liability.type === type);
  }

  /**
   * 計算下次還款日期
   */
  private calculateNextPaymentDate(paymentDay: number, lastPaymentDate?: string): string {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 如果有上次還款日期，從上次還款日期的下個月開始計算
    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (lastPaymentDate) {
      const lastPayment = new Date(lastPaymentDate);
      targetMonth = lastPayment.getMonth() + 1;
      targetYear = lastPayment.getFullYear();

      // 處理跨年情況
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }
    } else {
      // 如果沒有上次還款日期，檢查本月是否已過還款日
      if (today.getDate() >= paymentDay) {
        targetMonth++;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
        }
      }
    }

    // 處理月份天數不足的情況
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualPaymentDay = Math.min(paymentDay, daysInMonth);

    return new Date(targetYear, targetMonth, actualPaymentDay).toISOString();
  }

  /**
   * 處理自動還款
   */
  processAutomaticPayments(): { processedPayments: any[], errors: string[] } {
    const today = new Date();
    const processedPayments: any[] = [];
    const errors: string[] = [];

    this.liabilities.forEach(liability => {
      // 檢查是否設置了自動還款
      if (!liability.monthly_payment || !liability.payment_account || !liability.payment_day) {
        return;
      }

      // 檢查是否到了還款日期
      const nextPaymentDate = liability.next_payment_date ? new Date(liability.next_payment_date) : null;
      if (!nextPaymentDate || today < nextPaymentDate) {
        return;
      }

      try {
        // 執行還款
        const paymentResult = this.executePayment(liability);
        if (paymentResult.success) {
          processedPayments.push(paymentResult);
        } else {
          errors.push(`${liability.name}: ${paymentResult.error}`);
        }
      } catch (error) {
        errors.push(`${liability.name}: 還款處理失敗`);
      }
    });

    return { processedPayments, errors };
  }

  /**
   * 執行單筆還款（已移至 automaticPaymentService）
   * @deprecated 使用 automaticPaymentService.executePayment 代替
   */
  private executePayment(liability: LiabilityData): { success: boolean, error?: string, payment?: any } {
    // 此方法已移至 automaticPaymentService，保留用於向後兼容
    console.warn('executePayment 已移至 automaticPaymentService');
    return { success: false, error: '請使用 automaticPaymentService' };
  }

  /**
   * 設置負債的自動還款
   */
  setupAutomaticPayment(liabilityId: string, paymentAccount: string, paymentDay: number): boolean {
    const liability = this.liabilities.find(l => l.id === liabilityId);
    if (!liability || !liability.monthly_payment) {
      return false;
    }

    const nextPaymentDate = this.calculateNextPaymentDate(paymentDay);

    this.updateLiability(liabilityId, {
      payment_account: paymentAccount,
      payment_day: paymentDay,
      next_payment_date: nextPaymentDate,
    });

    return true;
  }

  /**
   * 取消負債的自動還款
   */
  cancelAutomaticPayment(liabilityId: string): boolean {
    this.updateLiability(liabilityId, {
      payment_account: undefined,
      payment_day: undefined,
      next_payment_date: undefined,
      last_payment_date: undefined,
    });

    return true;
  }
}

// 創建單例實例
export const liabilityService = new LiabilityService();
