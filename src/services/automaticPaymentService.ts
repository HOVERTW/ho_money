/**
 * 自動還款處理服務
 * 負責處理負債的自動還款功能
 */

import { liabilityService, LiabilityData } from './liabilityService';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { transactionDataService } from './transactionDataService';

export interface PaymentResult {
  success: boolean;
  liabilityId: string;
  liabilityName: string;
  amount: number;
  fromAccount: string;
  date: string;
  newBalance: number;
  error?: string;
}

class AutomaticPaymentService {
  private isProcessing = false;
  private lastProcessDate: string | null = null;

  /**
   * 檢查並處理所有到期的自動還款
   */
  async processScheduledPayments(): Promise<{ processedPayments: PaymentResult[], errors: string[] }> {
    if (this.isProcessing) {
      return { processedPayments: [], errors: ['還款處理正在進行中'] };
    }

    this.isProcessing = true;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // 避免同一天重複處理
      if (this.lastProcessDate === todayStr) {
        return { processedPayments: [], errors: [] };
      }

      const liabilities = liabilityService.getLiabilities();
      const processedPayments: PaymentResult[] = [];
      const errors: string[] = [];

      for (const liability of liabilities) {
        // 檢查是否設置了自動還款
        if (!this.shouldProcessPayment(liability, today)) {
          continue;
        }

        try {
          const result = await this.executePayment(liability);
          if (result.success) {
            processedPayments.push(result);
          } else {
            errors.push(`${liability.name}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`${liability.name}: 還款處理失敗`);
        }
      }

      this.lastProcessDate = todayStr;
      return { processedPayments, errors };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 檢查是否應該處理還款
   */
  private shouldProcessPayment(liability: LiabilityData, today: Date): boolean {
    // 檢查必要字段
    if (!liability.monthly_payment || !liability.payment_account || !liability.payment_day) {
      return false;
    }

    // 檢查負債餘額
    if (liability.balance <= 0) {
      return false;
    }

    // 檢查是否到了還款日期 - 使用與循環交易相同的月末調整邏輯
    const currentDay = today.getDate();
    const originalPaymentDay = liability.payment_day;

    // 獲取當月的最後一天
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // 根據循環交易的月末調整邏輯計算實際還款日期
    let actualPaymentDay: number;
    if (originalPaymentDay > daysInMonth) {
      // 如果原始還款日期超過該月的最大天數，使用該月的最後一天
      actualPaymentDay = daysInMonth;
      console.log(`📅 月末還款日期調整: 原定${originalPaymentDay}號，${today.getFullYear()}年${today.getMonth() + 1}月只有${daysInMonth}天，調整為${daysInMonth}號`);
    } else {
      actualPaymentDay = originalPaymentDay;
    }

    if (currentDay !== actualPaymentDay) {
      return false;
    }

    // 檢查是否已經在本月處理過
    if (liability.last_payment_date) {
      const lastPayment = new Date(liability.last_payment_date);
      const isSameMonth = lastPayment.getFullYear() === today.getFullYear() &&
                         lastPayment.getMonth() === today.getMonth();
      if (isSameMonth) {
        return false;
      }
    }

    return true;
  }

  /**
   * 執行單筆還款
   */
  private async executePayment(liability: LiabilityData): Promise<PaymentResult> {
    const paymentAmount = liability.monthly_payment!;
    const fromAccount = liability.payment_account!;
    const today = new Date().toISOString();

    try {
      // 查找還款帳戶
      const assets = assetTransactionSyncService.getAssets();
      const paymentAsset = assets.find(asset => asset.name === fromAccount);

      if (!paymentAsset) {
        return {
          success: false,
          liabilityId: liability.id,
          liabilityName: liability.name,
          amount: paymentAmount,
          fromAccount,
          date: today,
          newBalance: liability.balance,
          error: '找不到指定的還款帳戶'
        };
      }

      // 檢查帳戶餘額
      if (paymentAsset.current_value < paymentAmount) {
        return {
          success: false,
          liabilityId: liability.id,
          liabilityName: liability.name,
          amount: paymentAmount,
          fromAccount,
          date: today,
          newBalance: liability.balance,
          error: `帳戶餘額不足。可用餘額: ${paymentAsset.current_value.toLocaleString()}`
        };
      }

      // 執行扣款
      assetTransactionSyncService.updateAsset(paymentAsset.id, {
        current_value: paymentAsset.current_value - paymentAmount,
        cost_basis: paymentAsset.current_value - paymentAmount, // 對於現金類資產
      });

      // 更新負債餘額
      const newBalance = Math.max(0, liability.balance - paymentAmount);
      const nextPaymentDate = this.calculateNextPaymentDate(liability.payment_day!, today);

      liabilityService.updateLiability(liability.id, {
        balance: newBalance,
        last_payment_date: today,
        next_payment_date: nextPaymentDate,
      });

      // 創建交易記錄
      const transaction = {
        id: `auto_payment_${Date.now()}`,
        amount: paymentAmount,
        type: 'expense' as const,
        description: `自動還款 - ${liability.name}`,
        category: '還款', // 🔥 修復：統一使用'還款'類別
        account: fromAccount,
        date: today.split('T')[0], // YYYY-MM-DD
        is_recurring: false,
      };

      await transactionDataService.addTransaction(transaction);

      return {
        success: true,
        liabilityId: liability.id,
        liabilityName: liability.name,
        amount: paymentAmount,
        fromAccount,
        date: today,
        newBalance,
      };

    } catch (error) {
      return {
        success: false,
        liabilityId: liability.id,
        liabilityName: liability.name,
        amount: paymentAmount,
        fromAccount,
        date: today,
        newBalance: liability.balance,
        error: '還款處理失敗'
      };
    }
  }

  /**
   * 計算下次還款日期 - 使用與循環交易相同的月末調整邏輯
   */
  private calculateNextPaymentDate(paymentDay: number, lastPaymentDate: string): string {
    const lastPayment = new Date(lastPaymentDate);
    const year = lastPayment.getFullYear();
    const month = lastPayment.getMonth();
    const hours = lastPayment.getHours();
    const minutes = lastPayment.getMinutes();
    const seconds = lastPayment.getSeconds();
    const milliseconds = lastPayment.getMilliseconds();

    // 計算下個月
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    // 獲取下個月的最後一天
    const lastDayOfNextMonth = new Date(nextYear, adjustedMonth + 1, 0).getDate();

    // 根據循環交易的月末調整邏輯
    let adjustedDay: number;
    if (paymentDay > lastDayOfNextMonth) {
      // 如果原始還款日期超過該月的最大天數，使用該月的最後一天
      adjustedDay = lastDayOfNextMonth;
      console.log(`📅 下次還款日期調整: 原定${paymentDay}號，${nextYear}年${adjustedMonth + 1}月只有${lastDayOfNextMonth}天，調整為${lastDayOfNextMonth}號`);
    } else {
      adjustedDay = paymentDay;
    }

    return new Date(nextYear, adjustedMonth, adjustedDay, hours, minutes, seconds, milliseconds).toISOString();
  }

  /**
   * 手動觸發還款處理（用於測試）
   */
  async manualProcessPayments(): Promise<{ processedPayments: PaymentResult[], errors: string[] }> {
    this.lastProcessDate = null; // 重置處理日期
    return this.processScheduledPayments();
  }

  /**
   * 獲取下次還款預覽
   */
  getUpcomingPayments(): Array<{
    liability: LiabilityData;
    nextPaymentDate: Date;
    amount: number;
  }> {
    const liabilities = liabilityService.getLiabilities();
    const upcomingPayments: Array<{
      liability: LiabilityData;
      nextPaymentDate: Date;
      amount: number;
    }> = [];

    liabilities.forEach(liability => {
      if (liability.monthly_payment && liability.payment_account && liability.payment_day && liability.balance > 0) {
        const nextPaymentDate = liability.next_payment_date ?
          new Date(liability.next_payment_date) :
          new Date();

        upcomingPayments.push({
          liability,
          nextPaymentDate,
          amount: liability.monthly_payment,
        });
      }
    });

    return upcomingPayments.sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime());
  }

  /**
   * 初始化服務（設置定時器等）
   */
  initialize(): void {
    // 每天檢查一次自動還款
    setInterval(() => {
      this.processScheduledPayments().then(result => {
        if (result.processedPayments.length > 0) {
          console.log('自動還款處理完成:', result.processedPayments);
        }
        if (result.errors.length > 0) {
          console.error('自動還款錯誤:', result.errors);
        }
      });
    }, 24 * 60 * 60 * 1000); // 24小時

    // 應用啟動時立即檢查一次
    setTimeout(() => {
      this.processScheduledPayments();
    }, 5000); // 5秒後執行
  }
}

// 創建單例實例
export const automaticPaymentService = new AutomaticPaymentService();
