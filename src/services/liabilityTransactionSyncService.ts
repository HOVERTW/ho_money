/**
 * 負債與循環交易同步服務
 * 負責在新增或編輯負債時，自動創建對應的循環支出交易
 */

import { liabilityService, LiabilityData } from './liabilityService';
import { recurringTransactionService } from './recurringTransactionService';
import { transactionDataService } from './transactionDataService';
import { RecurringFrequency } from '../types';
import { eventEmitter, EVENTS } from './eventEmitter';

export interface LiabilityTransactionSync {
  liabilityId: string;
  recurringTransactionId: string;
  isActive: boolean;
}

class LiabilityTransactionSyncService {
  private syncMappings: LiabilityTransactionSync[] = [];

  /**
   * 當新增或編輯負債時，同步創建或更新循環交易
   */
  async syncLiabilityToRecurringTransaction(liability: LiabilityData): Promise<void> {
    console.log('🔄 方法2 - 開始同步負債到循環交易:', liability.name);

    // 檢查是否需要創建循環交易
    if (!this.shouldCreateRecurringTransaction(liability)) {
      console.log('⚠️ 負債不滿足循環交易條件，跳過同步');
      // 如果不需要循環交易，但之前有創建過，則停用它
      await this.deactivateRecurringTransaction(liability.id);
      return;
    }

    console.log('✅ 負債滿足循環交易條件，開始同步');

    try {
      // 檢查是否已經存在對應的循環交易
      const existingSync = this.syncMappings.find(sync => sync.liabilityId === liability.id);

      if (existingSync) {
        console.log('🔄 更新現有的循環交易');
        // 更新現有的循環交易
        await this.updateRecurringTransaction(liability, existingSync.recurringTransactionId);
      } else {
        console.log('➕ 創建新的循環交易');
        // 創建新的循環交易
        await this.createRecurringTransaction(liability);
      }

      // 🔥 方法2：立即創建當月交易記錄
      console.log('🔥 方法2 - 立即創建當月交易記錄');
      await this.ensureCurrentMonthTransaction(liability);

      // 🔥 方法2：發射多個事件確保同步
      console.log('🔥 方法2 - 發射同步事件');
      eventEmitter.emit(EVENTS.LIABILITY_ADDED, liability);
      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, {
        type: 'liability_sync_completed',
        liability: liability,
        timestamp: Date.now()
      });
      eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
        type: 'liability_sync_completed',
        liability: liability,
        timestamp: Date.now()
      });

      console.log('✅ 方法2 - 負債同步完成，所有事件已發射');
    } catch (error) {
      console.error('❌ 同步負債到循環交易失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查是否應該創建循環交易
   */
  private shouldCreateRecurringTransaction(liability: LiabilityData): boolean {
    const hasMonthlyPayment = !!liability.monthly_payment;
    const hasPaymentAccount = !!liability.payment_account;
    const hasPaymentDay = !!liability.payment_day;
    const hasPositiveBalance = liability.balance > 0;

    console.log('🔍 檢查負債循環交易條件:', {
      name: liability.name,
      monthly_payment: liability.monthly_payment,
      payment_account: liability.payment_account,
      payment_day: liability.payment_day,
      balance: liability.balance,
      hasMonthlyPayment,
      hasPaymentAccount,
      hasPaymentDay,
      hasPositiveBalance,
    });

    const result = hasMonthlyPayment && hasPaymentAccount && hasPaymentDay && hasPositiveBalance;
    console.log('✅ 循環交易條件檢查結果:', result);

    return result;
  }

  /**
   * 創建新的循環交易
   */
  private async createRecurringTransaction(liability: LiabilityData): Promise<void> {
    // 🔥 關鍵修復：傳遞正確的原始目標日期
    const originalTargetDay = liability.payment_day!;
    const startDateString = this.calculateStartDate(liability);

    console.log('🔥 創建循環交易 - 關鍵參數:', {
      originalTargetDay: originalTargetDay,
      startDate: startDateString,
      amount: liability.monthly_payment,
      description: liability.name
    });

    // 添加到循環交易服務
    const createdTransaction = recurringTransactionService.createRecurringTransaction({
      amount: liability.monthly_payment!,
      type: 'expense',
      description: liability.name, // 直接使用負債名稱，不加"月付金"
      category: '還款',
      account: liability.payment_account!,
      frequency: RecurringFrequency.MONTHLY,
      startDate: new Date(startDateString),
      maxOccurrences: liability.payment_periods, // 確保傳遞期數
      originalTargetDay: originalTargetDay, // 🔥 關鍵：傳遞原始目標日期
    });

    console.log('✅ 循環交易已創建:', createdTransaction.id);

    // 記錄同步映射
    this.syncMappings.push({
      liabilityId: liability.id,
      recurringTransactionId: createdTransaction.id,
      isActive: true,
    });

    console.log(`✅ 已為負債 "${liability.name}" 創建循環交易，ID: ${createdTransaction.id}`);

    // 驗證循環交易是否正確保存
    const allRecurringTransactions = recurringTransactionService.getRecurringTransactions();
    console.log('🔍 驗證：所有循環交易數量:', allRecurringTransactions.length);
    console.log('🔍 驗證：剛創建的循環交易:', allRecurringTransactions.find(rt => rt.id === createdTransaction.id));

    // 生成未來交易並檢查
    const futureTransactions = recurringTransactionService.generateFutureRecurringTransactions(12);
    console.log('🔍 驗證：未來交易數量:', futureTransactions.length);
    console.log('🔍 驗證：相關的未來交易:', futureTransactions.filter(ft =>
      ft.description === liability.name && ft.amount === liability.monthly_payment
    ));

    // 發射事件通知其他組件刷新
    console.log('📡 發射循環交易創建事件');
    eventEmitter.emit(EVENTS.RECURRING_TRANSACTION_CREATED, {
      recurringTransactionId: createdTransaction.id,
      liabilityId: liability.id,
      liability: liability
    });

    // 發射財務數據更新事件，強制所有頁面刷新
    console.log('📡 發射財務數據更新事件');
    eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
      type: 'debt_payment_added',
      amount: liability.monthly_payment,
      category: '還款',
      recurringTransactionId: createdTransaction.id
    });

    // 發射負債還款添加事件
    console.log('📡 發射負債還款添加事件');
    eventEmitter.emit(EVENTS.DEBT_PAYMENT_ADDED, {
      amount: liability.monthly_payment,
      account: liability.payment_account,
      liabilityName: liability.name,
      recurringTransactionId: createdTransaction.id
    });

    // 🔥 修復：不在這裡立即創建實際交易記錄，避免重複
    // 實際交易記錄將由 ensureCurrentMonthTransaction 統一處理
    console.log('✅ 循環交易創建完成，實際交易記錄將由統一方法處理');
  }

  /**
   * 更新現有的循環交易
   */
  private async updateRecurringTransaction(liability: LiabilityData, recurringTransactionId: string): Promise<void> {
    const updates = {
      amount: liability.monthly_payment!,
      description: `${liability.name} 月付金`,
      account: liability.payment_account!,
      original_target_day: liability.payment_day!,
      max_occurrences: liability.payment_periods || undefined,
      end_date: this.calculateEndDate(liability),
      updated_at: new Date().toISOString(),
    };

    // 更新循環交易
    recurringTransactionService.updateRecurringTransaction(recurringTransactionId, updates);

    console.log(`✅ 已更新負債 "${liability.name}" 的循環交易`);
  }

  /**
   * 停用循環交易
   */
  async deactivateRecurringTransaction(liabilityId: string): Promise<void> {
    const existingSync = this.syncMappings.find(sync => sync.liabilityId === liabilityId);

    if (existingSync) {
      // 停用循環交易
      recurringTransactionService.updateRecurringTransaction(existingSync.recurringTransactionId, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      // 更新同步映射
      existingSync.isActive = false;

      console.log(`⏸️ 已停用負債的循環交易`);
    }
  }

  /**
   * 計算循環交易開始日期
   */
  private calculateStartDate(liability: LiabilityData): string {
    const today = new Date();
    const currentDay = today.getDate();
    const paymentDay = liability.payment_day!;

    console.log('📅 計算開始日期:', {
      today: today.toISOString().split('T')[0],
      currentDay,
      paymentDay
    });

    let startDate: Date;

    if (currentDay < paymentDay) {
      // 如果還沒到本月的還款日，從本月開始
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // 🔥 修復1：正確處理月末日期調整邏輯
      // 獲取當月的最後一天
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // 🔥 關鍵修復：只有當設定日期超過該月最大天數時才調整
      let actualPaymentDay: number;
      if (paymentDay > lastDayOfCurrentMonth) {
        // 如果設定的還款日超過當月最大天數，使用當月最後一天
        actualPaymentDay = lastDayOfCurrentMonth;
        console.log(`🔥🔥🔥 修復1生效 - 月末日期調整: 原定${paymentDay}號，${currentYear}年${currentMonth + 1}月只有${lastDayOfCurrentMonth}天，調整為${lastDayOfCurrentMonth}號`);
      } else {
        // 如果當月有該日期，直接使用原始日期
        actualPaymentDay = paymentDay;
      }

      // 🔥 修復：使用安全的日期創建方法，避免時區問題
      startDate = new Date(currentYear, currentMonth, actualPaymentDay, 12, 0, 0, 0); // 設定為中午12點避免時區問題

      // 驗證日期是否正確
      if (startDate.getDate() !== actualPaymentDay || startDate.getMonth() !== currentMonth) {
        console.error(`❌ 開始日期創建錯誤: 期望${actualPaymentDay}號，實際${startDate.getDate()}號`);
        startDate = new Date(currentYear, currentMonth, lastDayOfCurrentMonth, 12, 0, 0, 0);
      }

      console.log('📅 本月還款日未到，從本月開始:', startDate.toISOString().split('T')[0], `(設定${paymentDay}號，實際${actualPaymentDay}號)`);
    } else {
      // 如果已經到了或過了本月的還款日，從下個月開始
      const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;

      // 🔥 修復1：正確處理月末日期調整邏輯
      // 獲取下個月的最後一天
      const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

      // 🔥 關鍵修復：只有當設定日期超過該月最大天數時才調整
      let actualPaymentDay: number;
      if (paymentDay > lastDayOfNextMonth) {
        // 如果設定的還款日超過下個月最大天數，使用下個月最後一天
        actualPaymentDay = lastDayOfNextMonth;
        console.log(`🔥🔥🔥 修復1生效 - 月末日期調整: 原定${paymentDay}號，${nextYear}年${nextMonth + 1}月只有${lastDayOfNextMonth}天，調整為${lastDayOfNextMonth}號`);
      } else {
        // 如果下個月有該日期，直接使用原始日期
        actualPaymentDay = paymentDay;
        console.log(`🔥🔥🔥 修復1生效 - 無需調整: ${nextYear}年${nextMonth + 1}月有${lastDayOfNextMonth}天，${paymentDay}號正常`);
      }

      // 🔥 修復：使用安全的日期創建方法，避免時區問題
      startDate = new Date(nextYear, nextMonth, actualPaymentDay, 12, 0, 0, 0); // 設定為中午12點避免時區問題

      // 驗證日期是否正確
      if (startDate.getDate() !== actualPaymentDay || startDate.getMonth() !== nextMonth) {
        console.error(`❌ 開始日期創建錯誤: 期望${actualPaymentDay}號，實際${startDate.getDate()}號`);
        startDate = new Date(nextYear, nextMonth, lastDayOfNextMonth, 12, 0, 0, 0);
      }

      console.log('📅 本月還款日已過，從下個月開始:', startDate.toISOString().split('T')[0], `(設定${paymentDay}號，實際${actualPaymentDay}號)`);
    }

    const result = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('📅 最終開始日期:', result);
    return result;
  }

  /**
   * 計算循環交易結束日期
   */
  private calculateEndDate(liability: LiabilityData): string | undefined {
    if (!liability.payment_periods) {
      return undefined; // 無限期
    }

    const startDate = new Date(this.calculateStartDate(liability));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + liability.payment_periods - 1);

    return endDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * 🔥 修復4：刪除負債時，同步刪除循環交易和所有相關交易記錄
   */
  async deleteLiabilityRecurringTransaction(liabilityId: string): Promise<void> {
    console.log('🔥 修復4 - 開始刪除負債相關的所有交易:', liabilityId);

    // 1. 獲取負債信息
    const liability = liabilityService.getLiability(liabilityId);
    if (!liability) {
      console.log('⚠️ 修復4 - 找不到負債，跳過刪除');
      return;
    }

    console.log('🔥 修復4 - 負債信息:', liability.name);

    // 2. 刪除循環交易
    const existingSync = this.syncMappings.find(sync => sync.liabilityId === liabilityId);
    if (existingSync) {
      console.log('🔥 修復4 - 刪除循環交易:', existingSync.recurringTransactionId);
      recurringTransactionService.deleteRecurringTransaction(existingSync.recurringTransactionId);

      // 移除同步映射
      this.syncMappings = this.syncMappings.filter(sync => sync.liabilityId !== liabilityId);
    }

    // 3. 🔥 修復4：刪除所有相關的實際交易記錄
    const allTransactions = transactionDataService.getTransactions();
    const relatedTransactions = allTransactions.filter(transaction =>
      transaction.category === '還款' &&
      transaction.description === liability.name
    );

    console.log(`🔥 修復4 - 找到 ${relatedTransactions.length} 筆相關交易記錄需要刪除`);

    for (const transaction of relatedTransactions) {
      console.log(`🗑️ 修復4 - 刪除交易記錄: ${transaction.id} - ${transaction.description} - ${transaction.amount}`);
      await transactionDataService.deleteTransaction(transaction.id);
    }

    // 4. 🔥 修復4：發射事件通知所有頁面刷新
    console.log('🔥 修復4 - 發射刷新事件');
    eventEmitter.emit(EVENTS.LIABILITY_DELETED, {
      liabilityId: liabilityId,
      liabilityName: liability.name,
      deletedTransactionsCount: relatedTransactions.length
    });
    eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, {
      type: 'liability_deleted',
      liabilityId: liabilityId,
      timestamp: Date.now()
    });

    console.log(`✅ 修復4 - 已刪除負債 "${liability.name}" 的循環交易和 ${relatedTransactions.length} 筆交易記錄`);
  }

  /**
   * 獲取負債對應的循環交易ID
   */
  getRecurringTransactionId(liabilityId: string): string | undefined {
    const sync = this.syncMappings.find(sync => sync.liabilityId === liabilityId);
    return sync?.recurringTransactionId;
  }

  /**
   * 檢查負債是否有對應的循環交易
   */
  hasRecurringTransaction(liabilityId: string): boolean {
    const sync = this.syncMappings.find(sync => sync.liabilityId === liabilityId);
    return sync?.isActive || false;
  }

  /**
   * 獲取所有同步映射
   */
  getAllSyncMappings(): LiabilityTransactionSync[] {
    return [...this.syncMappings];
  }

  /**
   * 初始化服務，重建現有負債的同步映射
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 開始初始化負債循環交易同步服務...');

      const liabilities = liabilityService.getLiabilities();
      console.log('📋 找到負債數量:', liabilities.length);

      for (const liability of liabilities) {
        console.log('🔍 檢查負債:', liability.name, {
          monthly_payment: liability.monthly_payment,
          payment_account: liability.payment_account,
          payment_day: liability.payment_day,
          balance: liability.balance
        });

        if (this.shouldCreateRecurringTransaction(liability)) {
          console.log('✅ 負債滿足同步條件，開始處理:', liability.name);

          // 檢查是否已經有對應的循環交易
          const existingRecurringTransactions = recurringTransactionService.getRecurringTransactions();
          const matchingTransaction = existingRecurringTransactions.find(rt =>
            rt.description.includes(liability.name) &&
            rt.category === '還款' &&
            rt.amount === liability.monthly_payment
          );

          if (matchingTransaction) {
            console.log('🔄 找到現有循環交易，重建映射');
            // 重建同步映射
            this.syncMappings.push({
              liabilityId: liability.id,
              recurringTransactionId: matchingTransaction.id,
              isActive: matchingTransaction.is_active,
            });
          } else {
            console.log('➕ 未找到對應循環交易，創建新的');
            // 創建缺失的循環交易
            await this.createRecurringTransaction(liability);
          }

          // 🔥 修復：移除重複調用，統一由 forceCreateCurrentMonthTransactions 處理
          console.log('✅ 負債同步映射已建立，實際交易記錄將統一處理');
        } else {
          console.log('⚠️ 負債不滿足同步條件，跳過:', liability.name);
        }
      }

      console.log('✅ 負債循環交易同步服務初始化完成，同步映射數量:', this.syncMappings.length);
    } catch (error) {
      console.error('❌ 負債循環交易同步服務初始化失敗:', error);
    }
  }

  /**
   * 確保當月有實際交易記錄（改進版，增強重複檢查）
   */
  private async ensureCurrentMonthTransaction(liability: LiabilityData): Promise<void> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 檢查當月是否已經有還款交易記錄
    const existingTransactions = transactionDataService.getTransactions();
    const currentMonthPayments = existingTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getFullYear() === currentYear &&
             transactionDate.getMonth() === currentMonth &&
             transaction.category === '還款' &&
             transaction.description === liability.name &&
             transaction.amount === liability.monthly_payment;
    });

    console.log(`🔍 負債 "${liability.name}" 當月還款交易數量: ${currentMonthPayments.length}`);

    if (currentMonthPayments.length === 0) {
      console.log(`🔥 負債 "${liability.name}" 當月沒有還款交易記錄，立即創建`);

      // 🔥 修復2：正確處理月末日期調整邏輯
      const paymentDay = liability.payment_day || 1;

      // 獲取當月的最後一天
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // 🔥 關鍵修復：只有當設定日期超過該月最大天數時才調整
      let actualPaymentDay: number;
      if (paymentDay > lastDayOfCurrentMonth) {
        // 如果設定的還款日超過當月最大天數，使用當月最後一天
        actualPaymentDay = lastDayOfCurrentMonth;
        console.log(`🔥🔥🔥 修復2生效 - 月末日期調整: 原定${paymentDay}號，${currentYear}年${currentMonth + 1}月只有${lastDayOfCurrentMonth}天，調整為${lastDayOfCurrentMonth}號`);
      } else {
        // 如果當月有該日期，直接使用原始日期
        actualPaymentDay = paymentDay;
        console.log(`🔥🔥🔥 修復2生效 - 無需調整: ${currentYear}年${currentMonth + 1}月有${lastDayOfCurrentMonth}天，${paymentDay}號正常`);
      }

      // 🔥 關鍵修復：確保日期創建正確，避免時區問題
      // 設定為中午12點避免時區轉換問題
      const paymentDate = new Date(currentYear, currentMonth, actualPaymentDay, 12, 0, 0, 0);

      // 驗證日期是否正確
      if (paymentDate.getDate() !== actualPaymentDay || paymentDate.getMonth() !== currentMonth) {
        console.error(`❌ 日期創建錯誤: 期望${actualPaymentDay}號，實際${paymentDate.getDate()}號`);
        // 如果日期不正確，強制使用月末最後一天
        paymentDate.setDate(lastDayOfCurrentMonth);
        paymentDate.setHours(12, 0, 0, 0); // 確保時間也正確
        console.log(`🔧 強制修正為月末: ${lastDayOfCurrentMonth}號`);
      }

      console.log(`📅 日期創建: 設定${paymentDay}號 -> 實際${actualPaymentDay}號 -> ${paymentDate.toLocaleDateString('zh-TW')} (${paymentDate.getDate()}號)`);

      const actualTransaction = {
        id: `ensure_debt_payment_${liability.id}_${Date.now()}`,
        amount: liability.monthly_payment!,
        type: 'expense' as const,
        description: liability.name,
        category: '還款',
        account: liability.payment_account!,
        date: paymentDate.toISOString(),
        is_recurring: true,
        recurring_frequency: 'monthly',
        max_occurrences: liability.payment_periods,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await transactionDataService.addTransaction(actualTransaction);
    } else if (currentMonthPayments.length === 1) {
      console.log(`✅ 負債 "${liability.name}" 當月已有1筆還款交易記錄`);
    } else {
      console.log(`⚠️ 負債 "${liability.name}" 當月有 ${currentMonthPayments.length} 筆重複還款交易，需要清理`);

      // 保留最新的一筆，刪除其他的
      const sortedPayments = currentMonthPayments.sort((a, b) =>
        new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
      );

      const toKeep = sortedPayments[0];
      const toDelete = sortedPayments.slice(1);

      console.log(`✅ 保留交易: ${toKeep.id}, 刪除 ${toDelete.length} 筆重複交易`);

      for (const transaction of toDelete) {
        await transactionDataService.deleteTransaction(transaction.id);
        console.log(`🗑️ 已刪除重複交易: ${transaction.id}`);
      }
    }
  }

  /**
   * 處理還款期數減少
   */
  async decreaseRemainingPeriods(liabilityId: string): Promise<void> {
    const liability = liabilityService.getLiability(liabilityId);
    if (!liability || !liability.remaining_periods) {
      return;
    }

    const newRemainingPeriods = liability.remaining_periods - 1;

    // 更新負債的剩餘期數
    liabilityService.updateLiability(liabilityId, {
      remaining_periods: newRemainingPeriods,
    });

    // 如果期數用完，停用循環交易
    if (newRemainingPeriods <= 0) {
      await this.deactivateRecurringTransaction(liabilityId);
      console.log(`✅ 負債 "${liability.name}" 還款期數已完成，已停用循環交易`);
    }
  }

  /**
   * 清理重複的還款交易記錄
   */
  async cleanupDuplicateDebtPayments(): Promise<void> {
    console.log('🧹 開始清理重複的還款交易記錄');

    const allTransactions = transactionDataService.getTransactions();
    const debtPaymentTransactions = allTransactions.filter(t => t.category === '還款');

    console.log('🔍 找到還款交易數量:', debtPaymentTransactions.length);

    // 按負債名稱和金額分組
    const groupedTransactions = new Map<string, typeof debtPaymentTransactions>();

    debtPaymentTransactions.forEach(transaction => {
      const key = `${transaction.description}_${transaction.amount}`;
      if (!groupedTransactions.has(key)) {
        groupedTransactions.set(key, []);
      }
      groupedTransactions.get(key)!.push(transaction);
    });

    // 檢查每組是否有重複
    let deletedCount = 0;
    for (const [key, transactions] of groupedTransactions) {
      if (transactions.length > 1) {
        console.log(`🔍 發現重複的還款交易: ${key}, 數量: ${transactions.length}`);

        // 保留最新的一筆，刪除其他的
        const sortedTransactions = transactions.sort((a, b) =>
          new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
        );

        const toKeep = sortedTransactions[0];
        const toDelete = sortedTransactions.slice(1);

        console.log(`✅ 保留交易: ${toKeep.id}, 刪除 ${toDelete.length} 筆重複交易`);

        for (const transaction of toDelete) {
          await transactionDataService.deleteTransaction(transaction.id);
          deletedCount++;
          console.log(`🗑️ 已刪除重複交易: ${transaction.id}`);
        }
      }
    }

    console.log(`✅ 清理完成，共刪除 ${deletedCount} 筆重複交易`);
  }

  /**
   * 強制檢查並創建所有負債的當月交易記錄（使用改進的方法）
   */
  async forceCreateCurrentMonthTransactions(): Promise<void> {
    console.log('🔥 強制檢查並創建所有負債的當月交易記錄');

    const liabilities = liabilityService.getLiabilities();

    for (const liability of liabilities) {
      if (this.shouldCreateRecurringTransaction(liability)) {
        console.log(`🔍 處理負債 "${liability.name}" 的當月交易記錄`);

        // 使用改進的方法，包含重複檢查和清理
        await this.ensureCurrentMonthTransaction(liability);
      } else {
        console.log(`⚠️ 負債 "${liability.name}" 不滿足循環交易條件，跳過`);
      }
    }

    console.log('✅ 強制創建當月交易記錄完成');
  }

  /**
   * 🔥 方法3：立即同步新負債到所有頁面
   */
  async immediatelySync(liability: LiabilityData): Promise<void> {
    console.log('🔥 方法3 - 立即同步新負債到所有頁面:', liability.name);

    try {
      // 1. 立即創建當月交易記錄
      await this.ensureCurrentMonthTransaction(liability);

      // 2. 發射所有可能的事件
      console.log('🔥 方法3 - 發射所有同步事件');
      eventEmitter.emit(EVENTS.LIABILITY_ADDED, liability);
      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, {
        type: 'immediate_sync',
        liability: liability,
        timestamp: Date.now()
      });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_DASHBOARD, { liability: liability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_TRANSACTIONS, { liability: liability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_CASHFLOW, { liability: liability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_CHARTS, { liability: liability });
      eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
        type: 'immediate_sync',
        liability: liability,
        timestamp: Date.now()
      });
      eventEmitter.emit(EVENTS.DEBT_PAYMENT_ADDED, {
        amount: liability.monthly_payment,
        account: liability.payment_account,
        liabilityName: liability.name,
        timestamp: Date.now()
      });

      // 3. 等待一小段時間確保事件處理完成
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ 方法3 - 立即同步完成');
    } catch (error) {
      console.error('❌ 方法3 - 立即同步失敗:', error);
      throw error;
    }
  }
}

// 創建單例實例
export const liabilityTransactionSyncService = new LiabilityTransactionSyncService();
