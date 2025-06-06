/**
 * 🔥 方法5：強制刷新管理器
 * 確保新增負債後所有頁面立即同步
 */

import { eventEmitter, EVENTS } from '../services/eventEmitter';
import { transactionDataService } from '../services/transactionDataService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { liabilityService } from '../services/liabilityService';
import { liabilityTransactionSyncService } from '../services/liabilityTransactionSyncService';

export class ForceRefreshManager {
  /**
   * 🔥 方法5：強制刷新所有頁面數據
   */
  static async forceRefreshAllPages(reason: string = 'manual'): Promise<void> {
    console.log('🔥 方法5 - 強制刷新所有頁面數據，原因:', reason);

    try {
      // 1. 強制刷新所有服務數據
      console.log('🔥 方法5 - 步驟1：強制刷新服務數據');

      // 2. 發射所有可能的刷新事件
      console.log('🔥 方法5 - 步驟2：發射所有刷新事件');
      const timestamp = Date.now();

      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, {
        type: 'force_refresh_manager',
        reason: reason,
        timestamp: timestamp
      });

      eventEmitter.emit(EVENTS.FORCE_REFRESH_DASHBOARD, {
        reason: reason,
        timestamp: timestamp
      });

      eventEmitter.emit(EVENTS.FORCE_REFRESH_TRANSACTIONS, {
        reason: reason,
        timestamp: timestamp
      });

      eventEmitter.emit(EVENTS.FORCE_REFRESH_CASHFLOW, {
        reason: reason,
        timestamp: timestamp
      });

      eventEmitter.emit(EVENTS.FORCE_REFRESH_CHARTS, {
        reason: reason,
        timestamp: timestamp
      });

      eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
        type: 'force_refresh_manager',
        reason: reason,
        timestamp: timestamp
      });

      // 3. 等待事件處理
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('✅ 方法5 - 強制刷新完成');
    } catch (error) {
      console.error('❌ 方法5 - 強制刷新失敗:', error);
      throw error;
    }
  }

  /**
   * 🔥 方法5：負債添加後的完整同步流程
   */
  static async syncAfterLiabilityAdded(liability: any): Promise<void> {
    console.log('🔥 方法5 - 負債添加後的完整同步流程:', liability.name);

    try {
      // 1. 立即創建當月交易記錄
      console.log('🔥 方法5 - 步驟1：立即創建當月交易記錄');
      // 直接調用 immediatelySync 方法，它會處理所有必要的同步
      await liabilityTransactionSyncService.immediatelySync(liability);

      // 2. 發射負債相關事件
      console.log('🔥 方法5 - 步驟2：發射負債相關事件');
      eventEmitter.emit(EVENTS.LIABILITY_ADDED, liability);

      // 3. 強制刷新所有頁面
      console.log('🔥 方法5 - 步驟3：強制刷新所有頁面');
      await this.forceRefreshAllPages('liability_added');

      // 4. 額外等待確保同步完成
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ 方法5 - 負債添加同步流程完成');
    } catch (error) {
      console.error('❌ 方法5 - 負債添加同步流程失敗:', error);
      throw error;
    }
  }

  /**
   * 🔥 方法5：驗證同步是否成功
   */
  static validateSync(liability: any): boolean {
    console.log('🔥 方法5 - 驗證同步是否成功:', liability.name);

    try {
      // 檢查負債是否存在
      const liabilities = liabilityService.getLiabilities();
      const liabilityExists = liabilities.some(l => l.id === liability.id);

      // 檢查交易記錄是否存在
      const transactions = transactionDataService.getTransactions();
      const debtPaymentExists = transactions.some(t =>
        t.category === '還款' &&
        t.description === liability.name &&
        t.amount === liability.monthly_payment
      );

      console.log('🔥 方法5 - 同步驗證結果:', {
        liabilityExists: liabilityExists,
        debtPaymentExists: debtPaymentExists,
        totalLiabilities: liabilities.length,
        totalTransactions: transactions.length,
        debtPaymentCount: transactions.filter(t => t.category === '還款').length
      });

      return liabilityExists && debtPaymentExists;
    } catch (error) {
      console.error('❌ 方法5 - 同步驗證失敗:', error);
      return false;
    }
  }

  /**
   * 🔥 方法5：重試同步機制
   */
  static async retrySyncWithBackoff(liability: any, maxRetries: number = 3): Promise<boolean> {
    console.log('🔥 方法5 - 重試同步機制:', liability.name, '最大重試次數:', maxRetries);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔥 方法5 - 同步嘗試 ${attempt}/${maxRetries}`);

      try {
        await this.syncAfterLiabilityAdded(liability);

        // 驗證同步是否成功
        const isSuccess = this.validateSync(liability);

        if (isSuccess) {
          console.log(`✅ 方法5 - 同步成功，嘗試次數: ${attempt}`);
          return true;
        } else {
          console.log(`⚠️ 方法5 - 同步驗證失敗，嘗試次數: ${attempt}`);

          if (attempt < maxRetries) {
            // 指數退避等待
            const waitTime = Math.pow(2, attempt) * 100;
            console.log(`🔥 方法5 - 等待 ${waitTime}ms 後重試`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (error) {
        console.error(`❌ 方法5 - 同步嘗試 ${attempt} 失敗:`, error);

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error('❌ 方法5 - 所有同步嘗試都失敗了');
    return false;
  }

  /**
   * 🔥 方法5：獲取當前數據狀態
   */
  static getCurrentDataState(): any {
    const transactions = transactionDataService.getTransactions();
    const assets = assetTransactionSyncService.getAssets();
    const liabilities = liabilityService.getLiabilities();

    return {
      transactions: {
        total: transactions.length,
        debtPayments: transactions.filter(t => t.category === '還款').length,
        currentMonth: transactions.filter(t => {
          const date = new Date(t.date);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() &&
                 date.getMonth() === now.getMonth();
        }).length
      },
      assets: {
        total: assets.length,
        totalValue: assets.reduce((sum, a) => sum + a.current_value, 0)
      },
      liabilities: {
        total: liabilities.length,
        totalBalance: liabilities.reduce((sum, l) => sum + l.balance, 0)
      },
      timestamp: Date.now()
    };
  }
}

// 導出便捷函數
export const forceRefreshAllPages = (reason?: string) => ForceRefreshManager.forceRefreshAllPages(reason);
export const syncAfterLiabilityAdded = (liability: any) => ForceRefreshManager.syncAfterLiabilityAdded(liability);
export const retrySyncWithBackoff = (liability: any, maxRetries?: number) => ForceRefreshManager.retrySyncWithBackoff(liability, maxRetries);
export const getCurrentDataState = () => ForceRefreshManager.getCurrentDataState();
