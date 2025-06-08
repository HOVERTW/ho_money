/**
 * 當月財務計算服務
 * 負責計算當月的淨資產、收支等，只考慮當月實際發生的交易
 */

import { transactionDataService } from './transactionDataService';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { liabilityService } from './liabilityService';
import { automaticPaymentService } from './automaticPaymentService';

export interface CurrentMonthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number; // 負債還款金額
  netIncome: number;
  assetGrowth: number;
  assetLoss: number;
}

class CurrentMonthCalculationService {
  /**
   * 獲取當月財務摘要
   */
  getCurrentMonthSummary(): CurrentMonthSummary {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 獲取當月交易
    const currentMonthTransactions = this.getCurrentMonthTransactions(currentYear, currentMonth);

    // 獲取當月負債還款
    const currentMonthDebtPayments = this.getCurrentMonthDebtPayments(currentYear, currentMonth);

    // 計算當月收支（修復：避免重複計算還款）
    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // 🔥 修復：排除還款類別，避免重複計算
    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.category !== '還款')
      .reduce((sum, t) => sum + t.amount, 0);

    console.log('🔍 CurrentMonthCalculationService 收支計算:', {
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
      currentMonthDebtPayments: currentMonthDebtPayments,
      totalExpenses: monthlyExpenses + currentMonthDebtPayments
    });

    // 計算淨收入（包含負債還款）
    const netIncome = monthlyIncome - monthlyExpenses - currentMonthDebtPayments;

    // 獲取資產負債
    const assets = assetTransactionSyncService.getAssets();
    const liabilities = liabilityService.getLiabilities();

    const totalAssets = assets.reduce((sum, asset) => sum + asset.current_value, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    // 計算資產變化（基於當月交易對資產的影響）
    const assetChanges = this.calculateAssetChanges(currentMonthTransactions, currentMonthDebtPayments);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments: currentMonthDebtPayments,
      netIncome,
      assetGrowth: assetChanges.growth,
      assetLoss: assetChanges.loss,
    };
  }

  /**
   * 獲取當月交易（只包含實際發生的交易）
   */
  private getCurrentMonthTransactions(year: number, month: number) {
    const allTransactions = transactionDataService.getTransactions();

    return allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();

      // 只包含當月的交易
      return transactionYear === year && transactionMonth === month;
    });
  }

  /**
   * 獲取當月負債還款金額
   */
  private getCurrentMonthDebtPayments(year: number, month: number): number {
    // 獲取所有負債還款交易
    const allTransactions = transactionDataService.getTransactions();

    const debtPaymentTransactions = allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();

      // 檢查是否為當月的負債還款交易
      return transactionYear === year &&
             transactionMonth === month &&
             transaction.category === '還款';
    });

    return debtPaymentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  /**
   * 計算資產變化（基於當月交易）
   */
  private calculateAssetChanges(transactions: any[], debtPayments: number): { growth: number, loss: number } {
    let growth = 0;
    let loss = 0;

    // 計算收入對資產的正面影響
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    growth += income;

    // 計算支出對資產的負面影響
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    loss += expenses;

    // 計算負債還款對資產的負面影響
    loss += debtPayments;

    return { growth, loss };
  }

  /**
   * 獲取指定月份的財務摘要
   */
  getMonthSummary(year: number, month: number): CurrentMonthSummary {
    // 獲取指定月份交易
    const monthTransactions = this.getCurrentMonthTransactions(year, month);

    // 獲取指定月份負債還款
    const monthDebtPayments = this.getCurrentMonthDebtPayments(year, month);

    // 計算月份收支（修復：避免重複計算還款）
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // 🔥 修復：排除還款類別，避免重複計算
    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'expense' && t.category !== '還款')
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = monthlyIncome - monthlyExpenses - monthDebtPayments;

    // 獲取當前資產負債（注意：這裡返回的是當前狀態，不是歷史狀態）
    const assets = assetTransactionSyncService.getAssets();
    const liabilities = liabilityService.getLiabilities();

    const totalAssets = assets.reduce((sum, asset) => sum + asset.current_value, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    // 計算資產變化
    const assetChanges = this.calculateAssetChanges(monthTransactions, monthDebtPayments);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments: monthDebtPayments,
      netIncome,
      assetGrowth: assetChanges.growth,
      assetLoss: assetChanges.loss,
    };
  }

  /**
   * 獲取近一年的資產變化
   */
  getYearlyAssetGrowth(): number {
    const currentDate = new Date();
    // 修復：真正的近一年應該是從去年同月1號到今年同月最後一天
    // 例如：2025/5/30 -> 2024/6/1 到 2025/5/31
    const oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth() + 1, 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    const allTransactions = transactionDataService.getTransactions();

    // 獲取近一年的交易
    const yearlyTransactions = allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      return transactionDate >= oneYearAgo && transactionDate <= endDate;
    });

    // 計算近一年的淨收入
    const yearlyIncome = yearlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const yearlyExpenses = yearlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // 計算近一年的負債還款
    const yearlyDebtPayments = yearlyTransactions
      .filter(t => t.category === '還款')
      .reduce((sum, t) => sum + t.amount, 0);

    return yearlyIncome - yearlyExpenses - yearlyDebtPayments;
  }

  /**
   * 獲取包含負債還款的總支出
   */
  getTotalExpensesWithDebtPayments(year: number, month: number): number {
    const monthTransactions = this.getCurrentMonthTransactions(year, month);
    const monthDebtPayments = this.getCurrentMonthDebtPayments(year, month);

    const regularExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return regularExpenses + monthDebtPayments;
  }

  /**
   * 獲取支出分析數據（包含負債還款）
   */
  getExpenseAnalysisWithDebtPayments(year: number, month: number): { [category: string]: number } {
    const monthTransactions = this.getCurrentMonthTransactions(year, month);

    // 按類別統計支出（包含還款）
    const expensesByCategory: { [category: string]: number } = {};

    // 🔥 修復：統計所有支出，包含還款類別
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || '其他';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + transaction.amount;
      });

    console.log('🔍 CurrentMonthCalculationService 支出分析:', {
      year: year,
      month: month,
      expensesByCategory: expensesByCategory,
      totalExpenseTransactions: monthTransactions.filter(t => t.type === 'expense').length
    });

    return expensesByCategory;
  }

  /**
   * 檢查交易是否應該影響當月計算
   * 循環交易只有在實際執行月份才會影響計算
   */
  private shouldIncludeTransaction(transaction: any, targetYear: number, targetMonth: number): boolean {
    // 確保交易有有效的日期
    if (!transaction || !transaction.date) return false;

    const transactionDate = new Date(transaction.date);
    // 檢查日期是否有效
    if (isNaN(transactionDate.getTime())) return false;

    const transactionYear = transactionDate.getFullYear();
    const transactionMonth = transactionDate.getMonth();

    // 只包含目標月份的交易
    return transactionYear === targetYear && transactionMonth === targetMonth;
  }
}

// 創建單例實例
export const currentMonthCalculationService = new CurrentMonthCalculationService();
