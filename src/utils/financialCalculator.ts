/**
 * 🔥 方法9：完全獨立的財務計算工具
 * 不依賴任何服務，直接從原始數據計算
 */

import { transactionDataService } from '../services/transactionDataService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { liabilityService } from '../services/liabilityService';
import { stockPriceImpactService } from '../services/stockPriceImpactService';
import { StockImpactRanking, TimeRange } from '../services/taiwanStockService';

export interface FinancialSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  savingsRate: number;
}

export class FinancialCalculator {
  /**
   * 🔥 方法9：完全獨立計算當月財務摘要
   */
  static calculateCurrentMonthSummary(): FinancialSummary {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 獲取所有原始數據
    const allTransactions = transactionDataService.getTransactions();
    const allAssets = assetTransactionSyncService.getAssets();
    const allLiabilities = liabilityService.getLiabilities();

    // 2. 過濾當月交易
    const currentMonthTransactions = allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      return transactionDate.getFullYear() === currentYear &&
             transactionDate.getMonth() === currentMonth;
    });

    console.log('🔍 方法9 - 當月交易:', {
      count: currentMonthTransactions.length,
      transactions: currentMonthTransactions.map(t => ({
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        date: t.date
      }))
    });

    // 🔥 修復2：一次性計算所有金額，避免多次遍歷提升性能
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let monthlyDebtPayments = 0;
    let regularExpenses = 0;

    // 一次遍歷計算所有數值，避免多次過濾
    currentMonthTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        monthlyIncome += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthlyExpenses += transaction.amount;
        if (transaction.category === '還款') {
          monthlyDebtPayments += transaction.amount;
        } else {
          regularExpenses += transaction.amount;
        }
      }
    });

    console.log('🔥 修復2 - 快速計算結果:', {
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments,
      regularExpenses
    });

    // 7. 計算資產負債
    const totalAssets = allAssets.reduce((sum, asset) => sum + asset.current_value, 0);
    const totalLiabilities = allLiabilities.reduce((sum, liability) => sum + liability.balance, 0); // 🔥 修復：使用正確的字段名
    const netWorth = totalAssets - totalLiabilities;

    // 8. 計算其他指標
    const totalExpenses = monthlyExpenses; // 已經包含還款
    const netIncome = monthlyIncome - totalExpenses;
    const savingsRate = monthlyIncome > 0 ? (netIncome / monthlyIncome) * 100 : 0;

    const result: FinancialSummary = {
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayments,
      totalExpenses,
      netIncome,
      totalAssets,
      totalLiabilities,
      netWorth,
      savingsRate
    };

    console.log('🔥 方法9 - 計算結果:', {
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
      monthlyDebtPayments: monthlyDebtPayments,
      regularExpenses: regularExpenses,
      totalExpenses: totalExpenses,
      calculation: `一般支出${regularExpenses} + 還款${monthlyDebtPayments} = 總支出${totalExpenses}`,
      netIncome: netIncome,
      savingsRate: savingsRate.toFixed(2) + '%'
    });

    return result;
  }

  /**
   * 🔥 修復1：獲取支出分析（按類別）- 確保實時更新
   */
  static getExpenseAnalysis(): Record<string, number> {
    console.log('🔥 修復1 - 獲取支出分析（實時更新）');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const allTransactions = transactionDataService.getTransactions();
    console.log('🔥 修復1 - 所有交易數量:', allTransactions.length);

    const currentMonthTransactions = allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      return transactionDate.getFullYear() === currentYear &&
             transactionDate.getMonth() === currentMonth;
    });

    console.log('🔥 修復1 - 當月交易數量:', currentMonthTransactions.length);

    const expenseAnalysis = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const category = transaction.category || '未分類';
        acc[category] = (acc[category] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    // 🔥 修復1：特別檢查還款類別
    const debtPayments = currentMonthTransactions.filter(t => t.category === '還款');
    console.log('🔥 修復1 - 還款交易詳情:', {
      count: debtPayments.length,
      totalAmount: debtPayments.reduce((sum, t) => sum + t.amount, 0),
      details: debtPayments.map(t => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        date: t.date
      }))
    });

    console.log('🔥 修復1 - 支出分析結果:', expenseAnalysis);

    return expenseAnalysis;
  }

  /**
   * 🔥 方法9：獲取最大收入/支出分析（僅計算記帳頁交易資料）
   */
  static getTopIncomeExpenseAnalysis(): { topIncomes: any[], topExpenses: any[] } {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const allTransactions = transactionDataService.getTransactions();
    const currentMonthTransactions = allTransactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      return transactionDate.getFullYear() === currentYear &&
             transactionDate.getMonth() === currentMonth;
    });

    const topIncomes: any[] = [];
    const topExpenses: any[] = [];

    // 🔥 修復：不按類別分組，直接取前5筆最大交易（允許重複類別）
    currentMonthTransactions.forEach(transaction => {
      if (transaction.type === 'income' && transaction.amount > 0) {
        topIncomes.push({
          id: `income_${transaction.id || Date.now()}_${Math.random()}`,
          name: transaction.description || transaction.category || '未命名收入',
          amount: transaction.amount,
          type: transaction.category || '其他',
        });
      } else if (transaction.type === 'expense' && transaction.amount > 0) {
        topExpenses.push({
          id: `expense_${transaction.id || Date.now()}_${Math.random()}`,
          name: transaction.description || transaction.category || '未命名支出',
          amount: transaction.amount,
          type: transaction.category || '其他',
        });
      }
    });

    // 排序：按金額降序
    topIncomes.sort((a, b) => b.amount - a.amount);
    topExpenses.sort((a, b) => b.amount - a.amount);

    console.log('🔥 方法9 - 最大收入/支出分析:', {
      topIncomes: topIncomes.slice(0, 5),
      topExpenses: topExpenses.slice(0, 5)
    });

    return {
      topIncomes: topIncomes.slice(0, 5),
      topExpenses: topExpenses.slice(0, 5)
    };
  }

  /**
   * 🔥 新增：獲取台股價格影響排行榜
   */
  static async getStockPriceImpactRanking(timeRange: TimeRange = 'total'): Promise<StockImpactRanking> {
    try {
      console.log(`📊 獲取台股價格影響排行榜 (${timeRange})`);
      return await stockPriceImpactService.getStockImpactRanking(timeRange);
    } catch (error) {
      console.error('❌ 獲取台股價格影響排行榜失敗:', error);
      return {
        timeRange,
        topGains: [],
        topLosses: [],
        totalGains: 0,
        totalLosses: 0,
        netImpact: 0,
      };
    }
  }

  /**
   * 🔥 新增：獲取台股投資組合摘要
   */
  static async getStockPortfolioSummary() {
    try {
      console.log('📊 獲取台股投資組合摘要');
      return await stockPriceImpactService.getPortfolioSummary();
    } catch (error) {
      console.error('❌ 獲取台股投資組合摘要失敗:', error);
      return {
        totalInvestment: 0,
        currentValue: 0,
        totalGainLoss: 0,
        totalReturnRate: 0,
        stockCount: 0,
      };
    }
  }

  /**
   * 🔥 新增：更新所有台股價格
   */
  static async updateAllStockPrices(): Promise<void> {
    try {
      console.log('🔄 更新所有台股價格');
      await stockPriceImpactService.updateAllStockPrices();
    } catch (error) {
      console.error('❌ 更新台股價格失敗:', error);
    }
  }

  /**
   * 🔥 新增：獲取整合的資產變化（包含台股價格影響）
   */
  static async getIntegratedAssetChanges(timeRange: TimeRange = 'month'): Promise<{
    transactionGains: any[];
    transactionLosses: any[];
    stockGains: any[];
    stockLosses: any[];
    totalGains: number;
    totalLosses: number;
  }> {
    try {
      console.log(`📊 獲取整合資產變化 (${timeRange})`);

      // 獲取交易記帳的收入支出分析
      const transactionChanges = this.getTopIncomeExpenseAnalysis();

      // 獲取台股價格影響
      const stockImpact = await this.getStockPriceImpactRanking(timeRange);

      // 轉換台股影響為統一格式
      const stockGains = stockImpact.topGains.map(stock => ({
        id: `stock_gain_${stock.stock_code}`,
        name: `${stock.stock_name} (${stock.stock_code})`,
        gain: stock.unrealized_gain_loss,
        gainPercent: stock.return_rate,
        type: '台股價格',
        details: {
          quantity: stock.quantity,
          purchasePrice: stock.purchase_price,
          currentPrice: stock.current_price,
        }
      }));

      const stockLosses = stockImpact.topLosses.map(stock => ({
        id: `stock_loss_${stock.stock_code}`,
        name: `${stock.stock_name} (${stock.stock_code})`,
        loss: Math.abs(stock.unrealized_gain_loss),
        lossPercent: Math.abs(stock.return_rate),
        type: '台股價格',
        details: {
          quantity: stock.quantity,
          purchasePrice: stock.purchase_price,
          currentPrice: stock.current_price,
        }
      }));

      // 計算總計
      const transactionIncomeTotal = transactionChanges.topIncomes.reduce((sum, item) => sum + item.amount, 0);
      const transactionExpenseTotal = transactionChanges.topExpenses.reduce((sum, item) => sum + item.amount, 0);
      const stockGainTotal = stockGains.reduce((sum, item) => sum + item.gain, 0);
      const stockLossTotal = stockLosses.reduce((sum, item) => sum + item.loss, 0);

      const totalGains = transactionIncomeTotal + stockGainTotal;
      const totalLosses = transactionExpenseTotal + stockLossTotal;

      console.log(`✅ 整合收入支出分析完成 - 交易收入: ${transactionIncomeTotal}, 股票收益: ${stockGainTotal}, 交易支出: ${transactionExpenseTotal}, 股票損失: ${stockLossTotal}`);

      return {
        transactionGains: transactionChanges.topIncomes,
        transactionLosses: transactionChanges.topExpenses,
        stockGains,
        stockLosses,
        totalGains,
        totalLosses,
      };
    } catch (error) {
      console.error('❌ 獲取整合收入支出分析失敗:', error);
      const transactionChanges = this.getTopIncomeExpenseAnalysis();
      return {
        transactionGains: transactionChanges.topIncomes,
        transactionLosses: transactionChanges.topExpenses,
        stockGains: [],
        stockLosses: [],
        totalGains: transactionChanges.topIncomes.reduce((sum, item) => sum + item.amount, 0),
        totalLosses: transactionChanges.topExpenses.reduce((sum, item) => sum + item.amount, 0),
      };
    }
  }
}
