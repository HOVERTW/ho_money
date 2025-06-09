// 測試資產計算邏輯，驗證是否有重複扣款問題

console.log('🧪 開始測試資產計算邏輯...');

// 模擬測試數據
const testAssets = [
  {
    id: '1',
    name: '現金',
    current_value: 50000,
    type: 'cash'
  },
  {
    id: '2', 
    name: '銀行存款',
    current_value: 100000,
    type: 'bank'
  }
];

const testTransactions = [
  {
    id: '1',
    type: 'expense',
    amount: 200,
    account: '現金',
    description: '月支出測試',
    date: '2025-01-08'
  },
  {
    id: '2',
    type: 'expense', 
    amount: 300,
    account: '銀行存款',
    description: '另一筆支出',
    date: '2025-01-08'
  },
  {
    id: '3',
    type: 'income',
    amount: 1000,
    account: '現金',
    description: '收入測試',
    date: '2025-01-08'
  }
];

const testLiabilities = [
  {
    id: '1',
    name: '信用卡',
    balance: 5000
  }
];

// 實現與 DashboardScreen 相同的計算邏輯
function calculateCorrectNetWorth(safeTransactions, safeAssets, safeLiabilities) {
  let adjustedTotalAssets = 0;

  console.log('🔍 開始計算資產淨值...');
  console.log(`📊 資產數量: ${safeAssets.length}, 交易數量: ${safeTransactions.length}, 負債數量: ${safeLiabilities.length}`);

  safeAssets.forEach(asset => {
    let assetValue = asset?.current_value || 0;

    // 計算該資產相關的所有交易影響
    const assetTransactions = safeTransactions.filter(t =>
      t.account === asset.name || t.from_account === asset.name || t.to_account === asset.name
    );

    let transactionImpact = 0;
    let incomeTotal = 0;
    let expenseTotal = 0;
    let transferInTotal = 0;
    let transferOutTotal = 0;

    assetTransactions.forEach(t => {
      if (t.account === asset.name) {
        // 直接使用該資產的交易
        if (t.type === 'income') {
          const amount = t.amount || 0;
          transactionImpact += amount;
          incomeTotal += amount;
        } else if (t.type === 'expense') {
          const amount = t.amount || 0;
          transactionImpact -= amount;
          expenseTotal += amount;
        }
      } else if (t.type === 'transfer') {
        // 轉帳交易
        if (t.from_account === asset.name) {
          const amount = t.amount || 0;
          transactionImpact -= amount;
          transferOutTotal += amount;
        } else if (t.to_account === asset.name) {
          const amount = t.amount || 0;
          transactionImpact += amount;
          transferInTotal += amount;
        }
      }
    });

    const finalAssetValue = assetValue + transactionImpact;
    adjustedTotalAssets += finalAssetValue;

    console.log(`💰 資產 "${asset.name}": 初始值 ${assetValue}, 收入 +${incomeTotal}, 支出 -${expenseTotal}, 轉入 +${transferInTotal}, 轉出 -${transferOutTotal}, 交易影響 ${transactionImpact}, 最終值 ${finalAssetValue}`);
  });

  const totalLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
  const netWorth = adjustedTotalAssets - totalLiabilities;

  console.log(`📊 計算結果: 總資產 ${adjustedTotalAssets}, 總負債 ${totalLiabilities}, 淨值 ${netWorth}`);
  
  return netWorth;
}

// 執行測試
console.log('\n=== 測試案例 1: 基本計算 ===');
const result1 = calculateCorrectNetWorth(testTransactions, testAssets, testLiabilities);

console.log('\n=== 預期結果驗證 ===');
console.log('現金: 50000 + 1000 - 200 = 50800');
console.log('銀行存款: 100000 - 300 = 99700'); 
console.log('總資產: 50800 + 99700 = 150500');
console.log('總負債: 5000');
console.log('淨值: 150500 - 5000 = 145500');
console.log(`實際計算結果: ${result1}`);
console.log(`計算是否正確: ${result1 === 145500 ? '✅ 正確' : '❌ 錯誤'}`);

// 測試重複交易的情況
console.log('\n=== 測試案例 2: 重複交易檢測 ===');
const duplicateTransactions = [
  ...testTransactions,
  {
    id: '4',
    type: 'expense',
    amount: 200,
    account: '現金', 
    description: '重複的月支出',
    date: '2025-01-08'
  }
];

const result2 = calculateCorrectNetWorth(duplicateTransactions, testAssets, testLiabilities);
console.log('添加重複交易後的結果:');
console.log('現金: 50000 + 1000 - 200 - 200 = 50600');
console.log('總資產: 50600 + 99700 = 150300');
console.log('淨值: 150300 - 5000 = 145300');
console.log(`實際計算結果: ${result2}`);
console.log(`重複扣款檢測: ${result2 === 145300 ? '✅ 正確處理重複交易' : '❌ 可能有重複扣款問題'}`);

console.log('\n🎉 測試完成！');
console.log('如果所有測試都顯示 ✅，說明資產計算邏輯正確，沒有重複扣款問題。');
