/**
 * 負債管理服務
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventEmitter, EVENTS } from './eventEmitter';
import { supabase, TABLES } from './supabase';
import { enhancedSyncService } from './enhancedSyncService';
import { timestampSyncService } from './timestampSyncService';
import { generateUUID, ensureValidUUID } from '../utils/uuid';

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
      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 用戶已登錄，從 Supabase 加載負債...');
        await this.loadFromSupabase();
      } else {
        console.log('📝 用戶未登錄，從本地存儲加載負債...');
        await this.loadFromStorage();
      }

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
   * 從 Supabase 加載負債數據
   */
  private async loadFromSupabase(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ 用戶未登錄，無法從 Supabase 加載負債');
        return;
      }

      console.log('🔄 從 Supabase 加載用戶負債...', user.id);

      const { data: liabilitiesData, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 從 Supabase 加載負債失敗:', error);
        // 如果 Supabase 加載失敗，嘗試從本地存儲加載
        await this.loadFromStorage();
        return;
      }

      if (liabilitiesData && liabilitiesData.length > 0) {
        // 🔧 修復負債讀取：使用正確的欄位映射，包含所有字段
        this.liabilities = liabilitiesData.map(liability => ({
          id: liability.id,
          name: liability.name,
          type: liability.type,
          balance: liability.balance || 0, // 🔧 修復：直接使用 balance 欄位
          interest_rate: liability.interest_rate || 0,
          dueDate: liability.due_date || null,
          monthly_payment: liability.monthly_payment || 0,
          payment_account: liability.payment_account || '',
          payment_day: liability.payment_day || 1,
          // 🔧 新增：正確映射期數相關字段
          payment_periods: liability.payment_periods || null,
          remaining_periods: liability.remaining_periods || liability.payment_periods || null,
          last_payment_date: liability.last_payment_date || null,
          next_payment_date: liability.next_payment_date || null,
          sort_order: liability.sort_order || 0,
          createdAt: liability.created_at,
          updatedAt: liability.updated_at
        }));

        console.log(`✅ 從 Supabase 加載了 ${this.liabilities.length} 個負債`);

        // 顯示負債詳情
        this.liabilities.forEach((liability, index) => {
          console.log(`  ${index + 1}. ${liability.name} (${liability.type}) - 餘額: ${liability.balance}`);
        });

        // 保存到本地存儲
        await AsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(this.liabilities));
        console.log('💾 負債數據已保存到本地存儲');
      } else {
        console.log('📝 Supabase 中沒有負債數據');
        this.liabilities = [];
      }

    } catch (error) {
      console.error('❌ 從 Supabase 加載負債異常:', error);
      // 如果出現異常，嘗試從本地存儲加載
      await this.loadFromStorage();
    }
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
   * 終極修復：保存負債數據到本地存儲（禁用自動雲端同步）
   */
  private async saveToStorage(): Promise<void> {
    try {
      // 終極修復：只保存到本地存儲，禁用自動雲端同步
      await AsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(this.liabilities));
      console.log('💾 終極修復：負債數據已保存到本地存儲（禁用自動雲端同步）');

      // 終極修復：不自動同步到雲端，避免重複上傳
      console.log('🚫 終極修復：已禁用負債自動雲端同步，防止重複上傳');
    } catch (error) {
      console.error('❌ 保存負債數據失敗:', error);
    }
  }

  /**
   * 同步負債數據到 Supabase (修復：使用upsert避免重複)
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

      // 深度修復：根據CSV文件確認的實際數據庫結構使用正確的欄位名稱
      const convertedLiabilities = this.liabilities.map((liability: LiabilityData) => ({
        id: liability.id, // 修復：包含ID用於upsert
        user_id: user.id,
        name: liability.name,
        type: liability.type,
        balance: liability.balance, // 深度修復：CSV確認實際數據庫使用balance欄位存儲負債金額
        interest_rate: liability.interest_rate || 0,
        monthly_payment: liability.monthly_payment || 0, // 深度修復：CSV確認有monthly_payment欄位
        sort_order: liability.sort_order || 0, // 深度修復：CSV確認有sort_order欄位
        payment_account: liability.payment_account || null,
        payment_day: liability.payment_day || null,
        payment_periods: liability.payment_periods || null,
        last_payment_date: liability.last_payment_date || null,
        next_payment_date: liability.next_payment_date || null,
        remaining_periods: liability.remaining_periods || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 修復：使用upsert避免重複數據，不再先刪除
      if (convertedLiabilities.length > 0) {
        const { error: upsertError } = await supabase
          .from(TABLES.LIABILITIES)
          .upsert(convertedLiabilities, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('❌ 同步負債數據到雲端失敗:', upsertError);
        } else {
          // 深度修復：驗證負債數據是否真的同步成功，檢查balance欄位
          const { data: verifyData, error: verifyError } = await supabase
            .from(TABLES.LIABILITIES)
            .select('id, balance, interest_rate, monthly_payment')
            .eq('user_id', user.id);

          if (verifyError) {
            console.error('❌ 負債數據同步驗證失敗:', verifyError);
          } else {
            const actualCount = verifyData?.length || 0;
            console.log(`✅ 修復：負債數據upsert成功，雲端實際有 ${actualCount} 筆記錄`);

            // 深度修復：驗證balance欄位是否正確同步
            verifyData?.forEach(item => {
              console.log(`📊 負債ID: ${item.id}, Balance: ${item.balance}, Interest Rate: ${item.interest_rate}, Monthly Payment: ${item.monthly_payment}`);

              // 深度修復：檢查balance欄位是否有值
              if (!item.balance) {
                console.warn(`⚠️ 負債 ${item.id} 的balance欄位為空`);
              } else {
                console.log(`✅ 負債 ${item.id} 的balance欄位正確: ${item.balance}`);
              }
            });
          }
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
    // 🔧 修復：確保 ID 是有效的 UUID
    liability.id = ensureValidUUID(liability.id);

    // 🔧 修復：驗證必需字段
    if (!liability.name || liability.name.trim() === '') {
      throw new Error('負債名稱不能為空');
    }

    if (!liability.type || liability.type.trim() === '') {
      liability.type = 'other';
    }

    if (typeof liability.balance !== 'number' || liability.balance < 0) {
      liability.balance = 0;
    }

    // 如果沒有指定排序順序，設置為最後
    if (liability.sort_order === undefined) {
      const maxOrder = Math.max(...this.liabilities.map(l => l.sort_order || 0), -1);
      liability.sort_order = maxOrder + 1;
    }

    this.liabilities.push(liability);
    this.notifyListeners();
    await this.saveToStorage();

    // ⚡ 時間戳記即時同步
    try {
      await timestampSyncService.addToQueue('liability', liability, 'create');
      console.log('⚡ 負債已添加到時間戳記同步隊列:', liability.name);
    } catch (syncError) {
      console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
    }

    // 發射事件
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

      // ⚡ 時間戳記即時同步
      try {
        await timestampSyncService.addToQueue('liability', this.liabilities[index], 'update');
        console.log('⚡ 負債更新已添加到時間戳記同步隊列:', id);
      } catch (syncError) {
        console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
      }
    }
  }

  /**
   * 刪除負債
   */
  async deleteLiability(id: string): Promise<void> {
    const liability = this.liabilities.find(l => l.id === id);
    this.liabilities = this.liabilities.filter(l => l.id !== id);
    this.notifyListeners();
    await this.saveToStorage();

    // ⚡ 時間戳記即時同步刪除
    try {
      await timestampSyncService.addToQueue('liability', { id }, 'delete');
      console.log('⚡ 負債刪除已添加到時間戳記同步隊列:', id);
    } catch (syncError) {
      console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
    }
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

  /**
   * 清除所有數據並重置為空狀態
   */
  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 清除負債服務的所有數據...');

      // 清除內存數據
      this.liabilities = [];

      // 清除本地存儲
      await AsyncStorage.removeItem(STORAGE_KEYS.LIABILITIES);

      // 重置初始化狀態
      this.isInitialized = false;

      // 通知監聽器
      this.notifyListeners();

      console.log('✅ 負債服務數據清除完成');
    } catch (error) {
      console.error('❌ 清除負債服務數據失敗:', error);
    }
  }
}

// 創建單例實例
export const liabilityService = new LiabilityService();
