import { RecurringTransaction, Transaction, RecurringFrequency } from '../types';
import {
  calculateNextDate,
  generateTransactionFromRecurring,
  shouldExecuteRecurring,
  updateNextExecutionDate,
} from '../utils/recurringTransactions';

/**
 * 循環交易管理服務
 */
export class RecurringTransactionService {
  private recurringTransactions: RecurringTransaction[] = [];
  private generatedTransactions: Transaction[] = [];

  /**
   * 創建新的循環交易
   * @param transactionData 交易數據
   * @returns 創建的循環交易
   */
  createRecurringTransaction(transactionData: {
    amount: number;
    type: 'income' | 'expense';
    description?: string;
    category: string;
    account: string;
    frequency: RecurringFrequency;
    startDate?: Date;
    maxOccurrences?: number;
    originalTargetDay?: number; // 🔥 新增：允許傳遞原始目標日期
  }): RecurringTransaction {
    const startDate = transactionData.startDate || new Date();

    // 🔥 關鍵修復：使用傳遞的原始目標日期，而不是開始日期的日期
    const originalTargetDay = transactionData.originalTargetDay || startDate.getDate();

    console.log('🔥 循環交易服務 - 創建參數:', {
      startDate: startDate.toLocaleDateString('zh-TW'),
      startDateDay: startDate.getDate(),
      originalTargetDay: originalTargetDay,
      description: transactionData.description
    });

    // 第一次執行就是開始日期，下次執行日期是從開始日期計算的下一個週期
    const nextExecutionDate = calculateNextDate(startDate, transactionData.frequency, originalTargetDay);

    const recurringTransaction: RecurringTransaction = {
      id: `recurring_${Date.now()}`,
      user_id: 'current_user', // 在實際應用中應該從認證系統獲取
      account_id: transactionData.account,
      category_id: transactionData.category,
      amount: transactionData.amount,
      type: transactionData.type as any,
      description: transactionData.description,
      frequency: transactionData.frequency,
      start_date: startDate.toISOString(),
      next_execution_date: nextExecutionDate.toISOString(),
      is_active: true,
      max_occurrences: transactionData.maxOccurrences,
      current_occurrences: 0,
      original_target_day: originalTargetDay, // 保存原始目標日期
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.recurringTransactions.push(recurringTransaction);
    return recurringTransaction;
  }

  /**
   * 獲取所有循環交易
   * @returns 循環交易列表
   */
  getAllRecurringTransactions(): RecurringTransaction[] {
    return this.recurringTransactions;
  }

  /**
   * 獲取活躍的循環交易
   * @returns 活躍的循環交易列表
   */
  getActiveRecurringTransactions(): RecurringTransaction[] {
    return this.recurringTransactions.filter(rt => rt.is_active);
  }

  /**
   * 處理到期的循環交易，生成實際交易記錄
   * @param currentDate 當前日期
   * @returns 生成的交易記錄列表
   */
  processRecurringTransactions(currentDate: Date = new Date()): Transaction[] {
    const newTransactions: Transaction[] = [];

    this.recurringTransactions.forEach((recurringTransaction, index) => {
      if (shouldExecuteRecurring(recurringTransaction, currentDate)) {
        // 檢查是否已達到最大重複次數
        if (recurringTransaction.max_occurrences &&
            recurringTransaction.current_occurrences >= recurringTransaction.max_occurrences) {
          // 停用已完成的循環交易
          this.recurringTransactions[index] = {
            ...recurringTransaction,
            is_active: false,
            updated_at: new Date().toISOString(),
          };
          return;
        }

        // 生成新的交易記錄
        const newTransaction = generateTransactionFromRecurring(
          recurringTransaction,
          new Date(recurringTransaction.next_execution_date)
        );

        newTransactions.push(newTransaction);
        this.generatedTransactions.push(newTransaction);

        // 更新循環交易：增加執行次數並更新下次執行日期
        const updatedRecurring = updateNextExecutionDate(recurringTransaction);
        this.recurringTransactions[index] = {
          ...updatedRecurring,
          current_occurrences: recurringTransaction.current_occurrences + 1,
        };
      }
    });

    return newTransactions;
  }

  /**
   * 停用循環交易
   * @param recurringTransactionId 循環交易ID
   */
  deactivateRecurringTransaction(recurringTransactionId: string): void {
    const index = this.recurringTransactions.findIndex(rt => rt.id === recurringTransactionId);
    if (index !== -1) {
      this.recurringTransactions[index] = {
        ...this.recurringTransactions[index],
        is_active: false,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 啟用循環交易
   * @param recurringTransactionId 循環交易ID
   */
  activateRecurringTransaction(recurringTransactionId: string): void {
    const index = this.recurringTransactions.findIndex(rt => rt.id === recurringTransactionId);
    if (index !== -1) {
      this.recurringTransactions[index] = {
        ...this.recurringTransactions[index],
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 刪除循環交易
   * @param recurringTransactionId 循環交易ID
   */
  deleteRecurringTransaction(recurringTransactionId: string): void {
    this.recurringTransactions = this.recurringTransactions.filter(
      rt => rt.id !== recurringTransactionId
    );
  }

  /**
   * 更新循環交易
   * @param recurringTransactionId 循環交易ID
   * @param updates 更新數據
   */
  updateRecurringTransaction(
    recurringTransactionId: string,
    updates: Partial<RecurringTransaction>
  ): void {
    const index = this.recurringTransactions.findIndex(rt => rt.id === recurringTransactionId);
    if (index !== -1) {
      this.recurringTransactions[index] = {
        ...this.recurringTransactions[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 獲取由循環交易生成的所有交易記錄
   * @returns 生成的交易記錄列表
   */
  getGeneratedTransactions(): Transaction[] {
    return this.generatedTransactions;
  }

  /**
   * 清除生成的交易記錄（用於測試或重置）
   */
  clearGeneratedTransactions(): void {
    this.generatedTransactions = [];
  }

  /**
   * 獲取即將到期的循環交易（未來7天內）
   * @param currentDate 當前日期
   * @returns 即將到期的循環交易列表
   */
  getUpcomingRecurringTransactions(currentDate: Date = new Date()): RecurringTransaction[] {
    const sevenDaysLater = new Date(currentDate);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return this.recurringTransactions.filter(rt => {
      if (!rt.is_active) return false;

      const nextExecutionDate = new Date(rt.next_execution_date);
      return nextExecutionDate >= currentDate && nextExecutionDate <= sevenDaysLater;
    });
  }

  /**
   * 生成未來的循環交易記錄（用於月曆顯示）
   * @param months 生成未來幾個月的記錄
   * @returns 未來的交易記錄列表
   */
  generateFutureRecurringTransactions(months: number = 12): Transaction[] {
    const futureTransactions: Transaction[] = [];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    this.recurringTransactions.forEach(recurringTransaction => {
      if (!recurringTransaction.is_active) return;

      // 從開始日期開始生成，而不是從下次執行日期
      let currentDate = new Date(recurringTransaction.start_date);
      let occurrenceCount = 0; // 從0開始計算

      // 使用保存的原始目標日期
      const originalTargetDay = recurringTransaction.original_target_day;

      while (currentDate <= endDate) {
        // 檢查是否超過最大重複次數
        if (recurringTransaction.max_occurrences &&
            occurrenceCount >= recurringTransaction.max_occurrences) {
          break;
        }

        // 檢查是否超過結束日期
        if (recurringTransaction.end_date) {
          const recurringEndDate = new Date(recurringTransaction.end_date);
          if (currentDate > recurringEndDate) {
            break;
          }
        }

        const transaction = generateTransactionFromRecurring(recurringTransaction, currentDate);
        futureTransactions.push(transaction);

        currentDate = calculateNextDate(currentDate, recurringTransaction.frequency, originalTargetDay);
        occurrenceCount++;
      }
    });
    return futureTransactions;
  }

  /**
   * 獲取所有循環交易模板
   * @returns 循環交易模板列表
   */
  getRecurringTransactions(): RecurringTransaction[] {
    return this.recurringTransactions;
  }



  /**
   * 刪除循環交易模板（重複函數已移除）
   */
}

// 創建單例實例
export const recurringTransactionService = new RecurringTransactionService();
