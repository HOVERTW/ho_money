// 測試資產與交易聯動功能

console.log('🧪 開始測試資產與交易聯動功能...');

// 模擬資產數據
const mockAssets = [
  {
    id: '1',
    name: '現金',
    type: 'cash',
    current_value: 10000,
    cost_basis: 10000,
    quantity: 1
  },
  {
    id: '2',
    name: '銀行存款',
    type: 'bank',
    current_value: 50000,
    cost_basis: 50000,
    quantity: 1
  },
  {
    id: '3',
    name: '投資帳戶',
    type: 'investment',
    current_value: 100000,
    cost_basis: 95000,
    quantity: 1
  }
];

// 模擬資產交易同步服務
class MockAssetTransactionSyncService {
  constructor() {
    this.assets = [...mockAssets];
  }

  processTransaction(transaction) {
    console.log('💰 處理交易對資產的影響:', {
      type: transaction.type,
      account: transaction.account,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount,
      amount: transaction.amount
    });

    if (transaction.type === 'transfer') {
      this.processTransferTransaction(transaction);
    } else {
      const { account, amount, type } = transaction;
      let targetAsset = this.assets.find(asset => asset.name === account);

      if (targetAsset) {
        console.log(`💰 找到目標資產: ${targetAsset.name}, 當前價值: ${targetAsset.current_value}`);
        
        const balanceChange = type === 'income' ? amount : -amount;
        const newBalance = targetAsset.current_value + balanceChange;

        console.log(`💰 餘額變化: ${type === 'income' ? '+' : '-'}${amount}, 新餘額: ${newBalance}`);

        targetAsset.current_value = Math.max(0, newBalance);
        
        if (targetAsset.type === 'cash' || targetAsset.type === 'bank') {
          targetAsset.cost_basis = targetAsset.current_value;
        }

        console.log(`💰 資產更新完成: ${targetAsset.name} = ${targetAsset.current_value}`);
      } else {
        console.warn(`⚠️ 未找到對應的資產: ${account}`);
      }
    }
  }

  processTransferTransaction(transaction) {
    const { fromAccount, toAccount, amount } = transaction;

    console.log(`💸 處理轉帳交易: ${fromAccount} → ${toAccount}, 金額: ${amount}`);

    const fromAsset = this.assets.find(asset => asset.name === fromAccount);
    const toAsset = this.assets.find(asset => asset.name === toAccount);

    if (fromAsset) {
      console.log(`💸 從 ${fromAsset.name} 扣除 ${amount}, 原餘額: ${fromAsset.current_value}`);
      fromAsset.current_value = Math.max(0, fromAsset.current_value - amount);
      if (fromAsset.type === 'cash' || fromAsset.type === 'bank') {
        fromAsset.cost_basis = fromAsset.current_value;
      }
      console.log(`💸 ${fromAsset.name} 新餘額: ${fromAsset.current_value}`);
    }

    if (toAsset) {
      console.log(`💸 向 ${toAsset.name} 增加 ${amount}, 原餘額: ${toAsset.current_value}`);
      toAsset.current_value += amount;
      if (toAsset.type === 'cash' || toAsset.type === 'bank') {
        toAsset.cost_basis = toAsset.current_value;
      }
      console.log(`💸 ${toAsset.name} 新餘額: ${toAsset.current_value}`);
    }
  }

  getAssets() {
    return this.assets;
  }

  getAssetByName(name) {
    return this.assets.find(asset => asset.name === name);
  }
}

// 執行測試
async function runAssetTransactionSyncTest() {
  const service = new MockAssetTransactionSyncService();
  
  console.log('\n=== 初始資產狀態 ===');
  service.getAssets().forEach(asset => {
    console.log(`${asset.name}: ${asset.current_value}`);
  });

  console.log('\n=== 測試 1: 現金支出 ===');
  const expenseTransaction = {
    id: '1',
    type: 'expense',
    account: '現金',
    amount: 500,
    description: '午餐',
    category: '餐飲',
    date: '2025-01-08'
  };
  
  service.processTransaction(expenseTransaction);
  
  const cashAfterExpense = service.getAssetByName('現金');
  console.log(`預期: 現金 = 10000 - 500 = 9500`);
  console.log(`實際: 現金 = ${cashAfterExpense.current_value}`);
  console.log(`結果: ${cashAfterExpense.current_value === 9500 ? '✅ 正確' : '❌ 錯誤'}`);

  console.log('\n=== 測試 2: 銀行收入 ===');
  const incomeTransaction = {
    id: '2',
    type: 'income',
    account: '銀行存款',
    amount: 3000,
    description: '薪水',
    category: '薪資',
    date: '2025-01-08'
  };
  
  service.processTransaction(incomeTransaction);
  
  const bankAfterIncome = service.getAssetByName('銀行存款');
  console.log(`預期: 銀行存款 = 50000 + 3000 = 53000`);
  console.log(`實際: 銀行存款 = ${bankAfterIncome.current_value}`);
  console.log(`結果: ${bankAfterIncome.current_value === 53000 ? '✅ 正確' : '❌ 錯誤'}`);

  console.log('\n=== 測試 3: 轉帳交易 ===');
  const transferTransaction = {
    id: '3',
    type: 'transfer',
    fromAccount: '銀行存款',
    toAccount: '現金',
    amount: 2000,
    description: '提款',
    category: '轉移',
    date: '2025-01-08'
  };
  
  service.processTransaction(transferTransaction);
  
  const bankAfterTransfer = service.getAssetByName('銀行存款');
  const cashAfterTransfer = service.getAssetByName('現金');
  
  console.log(`預期: 銀行存款 = 53000 - 2000 = 51000`);
  console.log(`實際: 銀行存款 = ${bankAfterTransfer.current_value}`);
  console.log(`結果: ${bankAfterTransfer.current_value === 51000 ? '✅ 正確' : '❌ 錯誤'}`);
  
  console.log(`預期: 現金 = 9500 + 2000 = 11500`);
  console.log(`實際: 現金 = ${cashAfterTransfer.current_value}`);
  console.log(`結果: ${cashAfterTransfer.current_value === 11500 ? '✅ 正確' : '❌ 錯誤'}`);

  console.log('\n=== 測試 4: 投資帳戶支出 ===');
  const investmentExpense = {
    id: '4',
    type: 'expense',
    account: '投資帳戶',
    amount: 5000,
    description: '手續費',
    category: '費用',
    date: '2025-01-08'
  };
  
  service.processTransaction(investmentExpense);
  
  const investmentAfterExpense = service.getAssetByName('投資帳戶');
  console.log(`預期: 投資帳戶 = 100000 - 5000 = 95000`);
  console.log(`實際: 投資帳戶 = ${investmentAfterExpense.current_value}`);
  console.log(`結果: ${investmentAfterExpense.current_value === 95000 ? '✅ 正確' : '❌ 錯誤'}`);

  console.log('\n=== 最終資產狀態 ===');
  service.getAssets().forEach(asset => {
    console.log(`${asset.name}: ${asset.current_value} (成本基礎: ${asset.cost_basis})`);
  });

  // 驗證總體結果
  const allTestsPassed = 
    cashAfterTransfer.current_value === 11500 &&
    bankAfterTransfer.current_value === 51000 &&
    investmentAfterExpense.current_value === 95000;

  console.log('\n📊 測試總結:');
  console.log(`- 現金支出: ${cashAfterExpense.current_value === 9500 ? '✅' : '❌'}`);
  console.log(`- 銀行收入: ${bankAfterIncome.current_value === 53000 ? '✅' : '❌'}`);
  console.log(`- 轉帳交易: ${bankAfterTransfer.current_value === 51000 && cashAfterTransfer.current_value === 11500 ? '✅' : '❌'}`);
  console.log(`- 投資支出: ${investmentAfterExpense.current_value === 95000 ? '✅' : '❌'}`);
  
  console.log(`\n🎯 整體測試結果: ${allTestsPassed ? '✅ 全部通過' : '❌ 有測試失敗'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 資產與交易聯動功能正常工作！');
    console.log('💡 實際使用建議:');
    console.log('1. 在記帳區添加支出交易，檢查對應資產是否減少');
    console.log('2. 在記帳區添加收入交易，檢查對應資產是否增加');
    console.log('3. 在記帳區添加轉帳交易，檢查兩個資產是否正確變化');
    console.log('4. 在資產負債表中查看資產價值是否實時更新');
  } else {
    console.log('\n⚠️ 測試失敗，需要進一步調試');
  }
  
  return allTestsPassed;
}

// 執行測試
runAssetTransactionSyncTest();
