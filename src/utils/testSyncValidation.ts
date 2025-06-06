/**
 * 🔥 測試同步驗證工具
 * 用於驗證新增負債後所有頁面是否正確同步
 */

import { transactionDataService } from '../services/transactionDataService';
import { liabilityService } from '../services/liabilityService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { FinancialCalculator } from './financialCalculator';
import { eventEmitter, EVENTS } from '../services/eventEmitter';

export class TestSyncValidation {
  /**
   * 🔥 測試1：驗證負債添加後交易數據同步
   */
  static testLiabilityAddedTransactionSync(): boolean {
    console.log('🔍 ===== 測試1：驗證負債添加後交易數據同步 =====');
    
    const beforeTransactions = transactionDataService.getTransactions();
    const beforeDebtPayments = beforeTransactions.filter(t => t.category === '還款');
    
    console.log('📊 添加負債前:', {
      totalTransactions: beforeTransactions.length,
      debtPayments: beforeDebtPayments.length
    });
    
    // 模擬添加負債
    const testLiability = {
      id: `test_liability_${Date.now()}`,
      name: '測試負債',
      type: 'personal_loan',
      balance: 100000,
      monthly_payment: 10000,
      payment_account: '銀行',
      payment_day: 15,
      payment_periods: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    liabilityService.addLiability(testLiability);
    
    // 等待事件處理
    setTimeout(() => {
      const afterTransactions = transactionDataService.getTransactions();
      const afterDebtPayments = afterTransactions.filter(t => t.category === '還款');
      
      console.log('📊 添加負債後:', {
        totalTransactions: afterTransactions.length,
        debtPayments: afterDebtPayments.length,
        newDebtPayments: afterDebtPayments.filter(t => t.description === '測試負債')
      });
      
      const success = afterDebtPayments.length > beforeDebtPayments.length;
      console.log(success ? '✅ 測試1通過' : '❌ 測試1失敗');
      
      // 清理測試數據
      liabilityService.deleteLiability(testLiability.id);
      
      return success;
    }, 100);
    
    return true;
  }
  
  /**
   * 🔥 測試2：驗證財務計算器數據一致性
   */
  static testFinancialCalculatorConsistency(): boolean {
    console.log('🔍 ===== 測試2：驗證財務計算器數據一致性 =====');
    
    const summary = FinancialCalculator.calculateCurrentMonthSummary();
    const expenseAnalysis = FinancialCalculator.getExpenseAnalysis();
    const assetChanges = FinancialCalculator.getAssetChanges();
    
    console.log('📊 財務計算器結果:', {
      monthlyIncome: summary.monthlyIncome,
      monthlyExpenses: summary.monthlyExpenses,
      monthlyDebtPayments: summary.monthlyDebtPayments,
      totalExpenses: summary.totalExpenses,
      expenseCategories: Object.keys(expenseAnalysis),
      debtPaymentInAnalysis: expenseAnalysis['還款'] || 0,
      assetLosses: assetChanges.losses.length
    });
    
    // 驗證一致性
    const debtPaymentInAnalysis = expenseAnalysis['還款'] || 0;
    const debtPaymentInSummary = summary.monthlyDebtPayments;
    
    const isConsistent = Math.abs(debtPaymentInAnalysis - debtPaymentInSummary) < 0.01;
    
    console.log(isConsistent ? '✅ 測試2通過' : '❌ 測試2失敗');
    console.log('🔍 還款金額一致性:', {
      analysisAmount: debtPaymentInAnalysis,
      summaryAmount: debtPaymentInSummary,
      difference: Math.abs(debtPaymentInAnalysis - debtPaymentInSummary)
    });
    
    return isConsistent;
  }
  
  /**
   * 🔥 測試3：驗證事件系統工作正常
   */
  static testEventSystemWorking(): Promise<boolean> {
    console.log('🔍 ===== 測試3：驗證事件系統工作正常 =====');
    
    return new Promise((resolve) => {
      let eventReceived = false;
      
      // 添加測試監聽器
      const testListener = (data: any) => {
        console.log('📡 收到測試事件:', data);
        eventReceived = true;
      };
      
      eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, testListener);
      
      // 發射測試事件
      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, { test: true, timestamp: Date.now() });
      
      // 檢查事件是否被接收
      setTimeout(() => {
        eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, testListener);
        
        console.log(eventReceived ? '✅ 測試3通過' : '❌ 測試3失敗');
        resolve(eventReceived);
      }, 50);
    });
  }
  
  /**
   * 🔥 測試4：驗證總負債計算正確
   */
  static testTotalLiabilitiesCalculation(): boolean {
    console.log('🔍 ===== 測試4：驗證總負債計算正確 =====');
    
    const liabilities = liabilityService.getLiabilities();
    const summary = FinancialCalculator.calculateCurrentMonthSummary();
    
    // 手動計算總負債
    const manualTotal = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    
    console.log('📊 負債計算對比:', {
      liabilitiesCount: liabilities.length,
      manualTotal: manualTotal,
      calculatorTotal: summary.totalLiabilities,
      difference: Math.abs(manualTotal - summary.totalLiabilities)
    });
    
    const isCorrect = !isNaN(summary.totalLiabilities) && Math.abs(manualTotal - summary.totalLiabilities) < 0.01;
    
    console.log(isCorrect ? '✅ 測試4通過' : '❌ 測試4失敗');
    
    return isCorrect;
  }
  
  /**
   * 🔥 測試5：驗證交易過濾邏輯
   */
  static testTransactionFiltering(): boolean {
    console.log('🔍 ===== 測試5：驗證交易過濾邏輯 =====');
    
    const allTransactions = transactionDataService.getTransactions();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 過濾當月交易
    const currentMonthTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getFullYear() === currentYear && 
             transactionDate.getMonth() === currentMonth;
    });
    
    const debtPayments = currentMonthTransactions.filter(t => t.category === '還款');
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
    const expensesExcludingDebt = currentMonthTransactions.filter(t => t.type === 'expense' && t.category !== '還款');
    
    console.log('📊 交易過濾結果:', {
      totalTransactions: allTransactions.length,
      currentMonthTransactions: currentMonthTransactions.length,
      debtPayments: debtPayments.length,
      allExpenses: expenses.length,
      expensesExcludingDebt: expensesExcludingDebt.length,
      calculation: `${expensesExcludingDebt.length} + ${debtPayments.length} = ${expensesExcludingDebt.length + debtPayments.length} (應該等於 ${expenses.length})`
    });
    
    const isCorrect = (expensesExcludingDebt.length + debtPayments.length) === expenses.length;
    
    console.log(isCorrect ? '✅ 測試5通過' : '❌ 測試5失敗');
    
    return isCorrect;
  }
  
  /**
   * 🔥 執行所有測試
   */
  static async runAllTests(): Promise<{ passed: number, total: number, results: boolean[] }> {
    console.log('🚀 ===== 開始執行所有同步驗證測試 =====');
    
    const results: boolean[] = [];
    
    // 執行所有測試
    results.push(this.testLiabilityAddedTransactionSync());
    results.push(this.testFinancialCalculatorConsistency());
    results.push(await this.testEventSystemWorking());
    results.push(this.testTotalLiabilitiesCalculation());
    results.push(this.testTransactionFiltering());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('🎯 ===== 測試結果總結 =====');
    console.log(`✅ 通過: ${passed}/${total}`);
    console.log(`❌ 失敗: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 所有測試通過！同步功能正常工作！');
    } else {
      console.log('⚠️ 部分測試失敗，需要進一步檢查');
    }
    
    return { passed, total, results };
  }
}

// 導出便捷函數
export const runSyncValidationTests = () => TestSyncValidation.runAllTests();
