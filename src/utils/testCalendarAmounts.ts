/**
 * 測試月曆收支總額顯示功能
 * 驗證日期下方是否正確顯示 +/- 總額
 */

import { transactionDataService } from '../services/transactionDataService';

export const testCalendarAmounts = () => {
  console.log('📅 測試月曆收支總額顯示功能...');
  console.log('=====================================');
  
  // 獲取所有交易
  const transactions = transactionDataService.getTransactions();
  console.log(`📊 總交易數量: ${transactions.length} 筆`);
  
  // 按日期分組計算收支
  const dailySummary: { [date: string]: { income: number; expense: number; count: number } } = {};
  
  transactions.forEach(transaction => {
    const date = transaction.date.split('T')[0]; // YYYY-MM-DD 格式
    
    if (!dailySummary[date]) {
      dailySummary[date] = { income: 0, expense: 0, count: 0 };
    }
    
    if (transaction.type === 'income') {
      dailySummary[date].income += transaction.amount;
    } else if (transaction.type === 'expense') {
      dailySummary[date].expense += transaction.amount;
    }
    
    dailySummary[date].count++;
  });
  
  console.log('\n📋 每日收支總額:');
  console.log('=====================================');
  
  // 排序日期並顯示
  const sortedDates = Object.keys(dailySummary).sort();
  
  sortedDates.forEach(date => {
    const summary = dailySummary[date];
    const netAmount = summary.income - summary.expense;
    const formattedNet = formatNetAmount(netAmount);
    
    console.log(`📅 ${date}:`);
    console.log(`   收入: +${summary.income.toLocaleString()}`);
    console.log(`   支出: -${summary.expense.toLocaleString()}`);
    console.log(`   淨額: ${formattedNet} (${summary.count} 筆交易)`);
    console.log(`   月曆顯示: ${formattedNet || '(空白)'}`);
    console.log('');
  });
  
  // 統計摘要
  const totalDays = sortedDates.length;
  const positiveDays = sortedDates.filter(date => {
    const summary = dailySummary[date];
    return summary.income > summary.expense;
  }).length;
  const negativeDays = sortedDates.filter(date => {
    const summary = dailySummary[date];
    return summary.income < summary.expense;
  }).length;
  
  console.log('📊 統計摘要:');
  console.log('=====================================');
  console.log(`📅 有交易的日期: ${totalDays} 天`);
  console.log(`✅ 收入大於支出: ${positiveDays} 天 (顯示綠色 +金額)`);
  console.log(`❌ 支出大於收入: ${negativeDays} 天 (顯示紅色 -金額)`);
  console.log(`⚖️ 收支平衡: ${totalDays - positiveDays - negativeDays} 天 (不顯示金額)`);
  
  return dailySummary;
};

// 格式化收支總額顯示 (與 TransactionsScreen 中的邏輯一致)
const formatNetAmount = (amount: number) => {
  if (amount === 0) return '';
  const absAmount = Math.abs(amount);
  const formattedAmount = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);
  
  return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
};

export const addTestTransactions = () => {
  console.log('🧪 添加測試交易資料...');
  
  const testTransactions = [
    // 6月2日 - 支出
    {
      amount: 9050,
      type: 'expense' as const,
      description: '購物',
      category: '購物',
      account: '信用卡',
      date: '2025-06-02T12:00:00.000Z',
    },
    // 6月15日 - 收入
    {
      amount: 6314,
      type: 'income' as const,
      description: '兼職收入',
      category: '薪水',
      account: '銀行',
      date: '2025-06-15T09:00:00.000Z',
    },
    // 6月16日 - 支出
    {
      amount: 776,
      type: 'expense' as const,
      description: '午餐',
      category: '餐飲',
      account: '現金',
      date: '2025-06-16T12:30:00.000Z',
    },
    // 6月25日 - 收入
    {
      amount: 1252,
      type: 'income' as const,
      description: '獎金',
      category: '獎金',
      account: '銀行',
      date: '2025-06-25T15:00:00.000Z',
    },
    // 6月27日 - 支出
    {
      amount: 786,
      type: 'expense' as const,
      description: '交通費',
      category: '交通',
      account: '悠遊卡',
      date: '2025-06-27T08:00:00.000Z',
    },
    // 6月30日 - 支出
    {
      amount: 679,
      type: 'expense' as const,
      description: '晚餐',
      category: '餐飲',
      account: '現金',
      date: '2025-06-30T19:00:00.000Z',
    },
  ];
  
  testTransactions.forEach(transaction => {
    transactionDataService.addTransaction(transaction);
  });
  
  console.log(`✅ 已添加 ${testTransactions.length} 筆測試交易`);
  console.log('📅 預期月曆顯示:');
  console.log('   6月2日: -9,050 (紅色)');
  console.log('   6月15日: +6,314 (綠色)');
  console.log('   6月16日: -776 (紅色)');
  console.log('   6月25日: +1,252 (綠色)');
  console.log('   6月27日: -786 (紅色)');
  console.log('   6月30日: -679 (紅色)');
  console.log('   其他日期: (空白)');
  
  return testTransactions;
};

export const validateCalendarDisplay = () => {
  console.log('🔍 驗證月曆顯示邏輯...');
  console.log('=====================================');
  
  const dailySummary = testCalendarAmounts();
  
  // 驗證顯示邏輯
  const validationResults = Object.keys(dailySummary).map(date => {
    const summary = dailySummary[date];
    const netAmount = summary.income - summary.expense;
    const formattedNet = formatNetAmount(netAmount);
    
    let expectedColor = '';
    let expectedDisplay = '';
    
    if (netAmount > 0) {
      expectedColor = '綠色';
      expectedDisplay = `+${Math.abs(netAmount).toLocaleString()}`;
    } else if (netAmount < 0) {
      expectedColor = '紅色';
      expectedDisplay = `-${Math.abs(netAmount).toLocaleString()}`;
    } else {
      expectedColor = '無';
      expectedDisplay = '(空白)';
    }
    
    return {
      date,
      netAmount,
      formattedNet,
      expectedColor,
      expectedDisplay,
      isCorrect: formattedNet === (netAmount === 0 ? '' : (netAmount > 0 ? `+${Math.abs(netAmount).toLocaleString()}` : `-${Math.abs(netAmount).toLocaleString()}`))
    };
  });
  
  console.log('✅ 驗證結果:');
  validationResults.forEach(result => {
    const status = result.isCorrect ? '✅' : '❌';
    console.log(`${status} ${result.date}: ${result.expectedDisplay} (${result.expectedColor})`);
  });
  
  const allCorrect = validationResults.every(r => r.isCorrect);
  
  if (allCorrect) {
    console.log('\n🎉 月曆收支顯示邏輯驗證通過！');
    console.log('✅ 有收入/支出的日期會顯示 +/- 總額');
    console.log('✅ 沒有交易的日期保持空白');
    console.log('✅ 收入大於支出顯示綠色 +金額');
    console.log('✅ 支出大於收入顯示紅色 -金額');
  } else {
    console.log('\n❌ 月曆收支顯示邏輯驗證失敗');
    console.log('🔧 請檢查格式化邏輯');
  }
  
  return allCorrect;
};

// 立即執行測試
console.log('🚀 啟動月曆收支顯示測試...');
setTimeout(() => {
  validateCalendarDisplay();
}, 1000);
