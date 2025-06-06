import { RecurringFrequency } from '../types';
import { recurringTransactionService } from '../services/recurringTransactionService';
import {
  calculateNextDate,
  shouldExecuteRecurring,
  getFrequencyDisplayName,
} from './recurringTransactions';

/**
 * 測試循環交易功能
 */
export function testRecurringTransactions() {
  console.log('🔄 開始測試循環交易功能...\n');

  // 測試1: 創建每月循環交易
  console.log('📅 測試1: 創建每月循環交易');
  const monthlyTransaction = recurringTransactionService.createRecurringTransaction({
    amount: 600,
    type: 'expense',
    description: '房租',
    category: '家居',
    account: '現金',
    frequency: RecurringFrequency.MONTHLY,
    startDate: new Date('2024-05-29'), // 5月29日
  });
  
  console.log('✅ 創建成功:', {
    id: monthlyTransaction.id,
    amount: monthlyTransaction.amount,
    description: monthlyTransaction.description,
    frequency: getFrequencyDisplayName(monthlyTransaction.frequency),
    nextExecution: new Date(monthlyTransaction.next_execution_date).toLocaleDateString('zh-TW'),
  });

  // 測試2: 創建每週循環交易
  console.log('\n📅 測試2: 創建每週循環交易');
  const weeklyTransaction = recurringTransactionService.createRecurringTransaction({
    amount: 300,
    type: 'expense',
    description: '健身房',
    category: '娛樂',
    account: '信用卡',
    frequency: RecurringFrequency.WEEKLY,
  });
  
  console.log('✅ 創建成功:', {
    id: weeklyTransaction.id,
    amount: weeklyTransaction.amount,
    description: weeklyTransaction.description,
    frequency: getFrequencyDisplayName(weeklyTransaction.frequency),
    nextExecution: new Date(weeklyTransaction.next_execution_date).toLocaleDateString('zh-TW'),
  });

  // 測試3: 測試日期計算
  console.log('\n📅 測試3: 測試日期計算功能');
  const testDate = new Date('2024-05-29');
  
  const nextDaily = calculateNextDate(testDate, RecurringFrequency.DAILY);
  const nextWeekly = calculateNextDate(testDate, RecurringFrequency.WEEKLY);
  const nextMonthly = calculateNextDate(testDate, RecurringFrequency.MONTHLY);
  const nextYearly = calculateNextDate(testDate, RecurringFrequency.YEARLY);
  
  console.log('✅ 日期計算結果:');
  console.log(`   每日: ${testDate.toLocaleDateString('zh-TW')} → ${nextDaily.toLocaleDateString('zh-TW')}`);
  console.log(`   每週: ${testDate.toLocaleDateString('zh-TW')} → ${nextWeekly.toLocaleDateString('zh-TW')}`);
  console.log(`   每月: ${testDate.toLocaleDateString('zh-TW')} → ${nextMonthly.toLocaleDateString('zh-TW')}`);
  console.log(`   每年: ${testDate.toLocaleDateString('zh-TW')} → ${nextYearly.toLocaleDateString('zh-TW')}`);

  // 測試4: 測試執行檢查
  console.log('\n📅 測試4: 測試執行檢查');
  
  // 模擬到了執行日期
  const executionDate = new Date(monthlyTransaction.next_execution_date);
  const shouldExecute = shouldExecuteRecurring(monthlyTransaction, executionDate);
  console.log(`✅ 是否應該執行 (${executionDate.toLocaleDateString('zh-TW')}): ${shouldExecute}`);
  
  // 模擬還沒到執行日期
  const futureDate = new Date(executionDate);
  futureDate.setDate(futureDate.getDate() - 1);
  const shouldNotExecute = shouldExecuteRecurring(monthlyTransaction, futureDate);
  console.log(`✅ 是否應該執行 (${futureDate.toLocaleDateString('zh-TW')}): ${shouldNotExecute}`);

  // 測試5: 測試處理循環交易
  console.log('\n📅 測試5: 測試處理循環交易');
  const generatedTransactions = recurringTransactionService.processRecurringTransactions(executionDate);
  console.log(`✅ 生成了 ${generatedTransactions.length} 筆交易記錄`);
  
  generatedTransactions.forEach((transaction, index) => {
    console.log(`   ${index + 1}. ${transaction.description}: ${transaction.amount} (${transaction.type})`);
  });

  // 測試6: 查看所有循環交易
  console.log('\n📅 測試6: 查看所有循環交易');
  const allRecurring = recurringTransactionService.getAllRecurringTransactions();
  console.log(`✅ 總共有 ${allRecurring.length} 個循環交易:`);
  
  allRecurring.forEach((rt, index) => {
    console.log(`   ${index + 1}. ${rt.description}: ${rt.amount} (${getFrequencyDisplayName(rt.frequency)})`);
    console.log(`      下次執行: ${new Date(rt.next_execution_date).toLocaleDateString('zh-TW')}`);
    console.log(`      狀態: ${rt.is_active ? '啟用' : '停用'}`);
  });

  console.log('\n🎉 循環交易功能測試完成！');
  
  return {
    recurringTransactions: allRecurring,
    generatedTransactions,
  };
}

// 如果直接運行此文件，執行測試
if (require.main === module) {
  testRecurringTransactions();
}
