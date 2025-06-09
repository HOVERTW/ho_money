// 測試儀表板刪除功能

console.log('🧪 開始測試儀表板刪除功能...');

// 模擬 AsyncStorage
const mockAsyncStorage = {
  data: new Map(),
  
  async setItem(key, value) {
    this.data.set(key, value);
    console.log(`📝 存儲: ${key} = ${value.substring(0, 50)}...`);
  },
  
  async getItem(key) {
    const value = this.data.get(key);
    console.log(`📖 讀取: ${key} = ${value ? value.substring(0, 50) + '...' : 'null'}`);
    return value || null;
  },
  
  async removeItem(key) {
    const existed = this.data.has(key);
    this.data.delete(key);
    console.log(`🗑️ 刪除: ${key} ${existed ? '✅' : '❌ (不存在)'}`);
  },
  
  async multiRemove(keys) {
    console.log(`🗑️ 批量刪除: ${keys.length} 個鍵`);
    keys.forEach(key => {
      const existed = this.data.has(key);
      this.data.delete(key);
      console.log(`  - ${key} ${existed ? '✅' : '❌ (不存在)'}`);
    });
  },
  
  async getAllKeys() {
    const keys = Array.from(this.data.keys());
    console.log(`🔍 所有鍵: ${keys.length} 個`);
    return keys;
  },
  
  clear() {
    this.data.clear();
    console.log('🧹 清空所有數據');
  },
  
  size() {
    return this.data.size;
  }
};

// 模擬存儲鍵
const STORAGE_KEYS = {
  TRANSACTIONS: 'fintranzo_transactions',
  ASSETS: 'fintranzo_assets',
  LIABILITIES: 'fintranzo_liabilities',
  CATEGORIES: 'fintranzo_categories',
  USER_PREFERENCES: 'fintranzo_user_preferences',
  RECURRING_TRANSACTIONS: 'fintranzo_recurring_transactions'
};

// 模擬服務類
class MockTransactionDataService {
  constructor() {
    this.transactions = [];
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('🔄 初始化交易數據服務...');
    this.isInitialized = true;
    this.transactions = []; // 從存儲加載數據
  }
  
  async clearAllData() {
    console.log('🧹 清除交易數據服務的所有數據...');
    this.transactions = [];
    await mockAsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    this.isInitialized = false;
  }
  
  addTransaction(transaction) {
    this.transactions.push(transaction);
  }
  
  getTransactions() {
    return this.transactions;
  }
}

class MockAssetTransactionSyncService {
  constructor() {
    this.assets = [];
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('🔄 初始化資產交易同步服務...');
    this.isInitialized = true;
    this.assets = []; // 從存儲加載數據
  }
  
  async clearAllData() {
    console.log('🧹 清除資產交易同步服務的所有數據...');
    this.assets = [];
    await mockAsyncStorage.removeItem(STORAGE_KEYS.ASSETS);
    this.isInitialized = false;
  }
  
  addAsset(asset) {
    this.assets.push(asset);
  }
  
  getAssets() {
    return this.assets;
  }
}

class MockLiabilityService {
  constructor() {
    this.liabilities = [];
    this.isInitialized = false;
  }
  
  async initialize() {
    console.log('🔄 初始化負債服務...');
    this.isInitialized = true;
    this.liabilities = []; // 從存儲加載數據
  }
  
  async clearAllData() {
    console.log('🧹 清除負債服務的所有數據...');
    this.liabilities = [];
    await mockAsyncStorage.removeItem(STORAGE_KEYS.LIABILITIES);
    this.isInitialized = false;
  }
  
  addLiability(liability) {
    this.liabilities.push(liability);
  }
  
  getLiabilities() {
    return this.liabilities;
  }
}

class MockRecurringTransactionService {
  constructor() {
    this.recurringTransactions = [];
    this.generatedTransactions = [];
  }
  
  async initialize() {
    console.log('🔄 初始化循環交易服務...');
    // 循環交易服務目前不需要從存儲加載數據
  }
  
  async clearAllData() {
    console.log('🧹 清除循環交易服務的所有數據...');
    this.recurringTransactions = [];
    this.generatedTransactions = [];
  }
  
  createRecurringTransaction(data) {
    this.recurringTransactions.push(data);
  }
  
  getRecurringTransactions() {
    return this.recurringTransactions;
  }
}

// 模擬 clearAllStorage 函數
async function clearAllStorage() {
  try {
    console.log('🧹 開始清除所有本地存儲數據...');
    
    const keysToRemove = Object.values(STORAGE_KEYS);
    console.log('📋 將清除的存儲鍵:', keysToRemove);

    const additionalKeys = [
      'recurring_transactions',
      'future_transactions',
      'user_preferences',
      'app_settings',
      'sync_status',
      'last_sync_time'
    ];

    const allKeysToRemove = [...keysToRemove, ...additionalKeys];
    console.log('📋 完整的清除列表:', allKeysToRemove);

    await mockAsyncStorage.multiRemove(allKeysToRemove);

    const existingKeys = await mockAsyncStorage.getAllKeys();
    const appRelatedKeys = existingKeys.filter(key => 
      key.startsWith('fintranzo_') || 
      key.startsWith('transaction_') ||
      key.startsWith('asset_') ||
      key.startsWith('liability_') ||
      key.startsWith('recurring_') ||
      key.includes('financial')
    );

    if (appRelatedKeys.length > 0) {
      console.log('🧹 清除額外發現的應用相關鍵:', appRelatedKeys);
      await mockAsyncStorage.multiRemove(appRelatedKeys);
    }
    
    console.log('✅ 所有本地存儲數據已清除');
    console.log(`📊 清除了 ${allKeysToRemove.length + appRelatedKeys.length} 個存儲項目`);
    
    return true;
  } catch (error) {
    console.error('❌ 清除本地存儲失敗:', error);
    return false;
  }
}

// 執行測試
async function runDashboardDeleteTest() {
  // 創建服務實例
  const transactionService = new MockTransactionDataService();
  const assetService = new MockAssetTransactionSyncService();
  const liabilityService = new MockLiabilityService();
  const recurringService = new MockRecurringTransactionService();
  
  console.log('\n=== 測試 1: 初始化服務並添加測試數據 ===');
  
  // 初始化服務
  await transactionService.initialize();
  await assetService.initialize();
  await liabilityService.initialize();
  await recurringService.initialize();
  
  // 添加測試數據
  await mockAsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([
    { id: '1', amount: 100, description: '測試交易1' },
    { id: '2', amount: 200, description: '測試交易2' }
  ]));
  
  await mockAsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([
    { id: '1', name: '現金', current_value: 10000 },
    { id: '2', name: '銀行存款', current_value: 50000 }
  ]));
  
  await mockAsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify([
    { id: '1', name: '信用卡', balance: 5000 }
  ]));
  
  // 添加一些額外的鍵
  await mockAsyncStorage.setItem('recurring_transactions', JSON.stringify([]));
  await mockAsyncStorage.setItem('user_preferences', JSON.stringify({}));
  
  transactionService.addTransaction({ id: '1', amount: 100 });
  transactionService.addTransaction({ id: '2', amount: 200 });
  assetService.addAsset({ id: '1', name: '現金' });
  liabilityService.addLiability({ id: '1', name: '信用卡' });
  recurringService.createRecurringTransaction({ id: '1', frequency: 'monthly' });
  
  console.log('\n📊 初始狀態:');
  console.log(`- 交易記錄: ${transactionService.getTransactions().length} 筆`);
  console.log(`- 資產: ${assetService.getAssets().length} 個`);
  console.log(`- 負債: ${liabilityService.getLiabilities().length} 個`);
  console.log(`- 循環交易: ${recurringService.getRecurringTransactions().length} 個`);
  console.log(`- 存儲項目: ${mockAsyncStorage.size()} 個`);
  
  console.log('\n=== 測試 2: 執行完整的刪除流程 ===');
  
  // 模擬 DashboardScreen 的 performClearData 函數
  const performClearData = async () => {
    try {
      console.log('🧹 用戶確認，開始清除所有資料...');

      // 1. 清除本地存儲
      const success = await clearAllStorage();

      if (success) {
        console.log('✅ 本地存儲清除成功');

        // 2. 清除所有服務的內存數據
        console.log('🔄 清除服務內存數據...');
        
        await transactionService.clearAllData();
        await assetService.clearAllData();
        await liabilityService.clearAllData();
        await recurringService.clearAllData();

        // 3. 重新初始化所有服務
        console.log('🔄 重新初始化所有服務...');
        await transactionService.initialize();
        await assetService.initialize();
        await liabilityService.initialize();
        await recurringService.initialize();

        console.log('✅ 清除完成！所有資料已清除完成！應用程式已重新初始化。');
      } else {
        console.error('❌ 清除資料失敗');
      }
    } catch (error) {
      console.error('❌ 清除資料時發生錯誤:', error);
    }
  };
  
  // 執行刪除
  await performClearData();
  
  console.log('\n📊 清除後狀態:');
  console.log(`- 交易記錄: ${transactionService.getTransactions().length} 筆`);
  console.log(`- 資產: ${assetService.getAssets().length} 個`);
  console.log(`- 負債: ${liabilityService.getLiabilities().length} 個`);
  console.log(`- 循環交易: ${recurringService.getRecurringTransactions().length} 個`);
  console.log(`- 存儲項目: ${mockAsyncStorage.size()} 個`);
  
  // 驗證結果
  const allDataCleared = 
    transactionService.getTransactions().length === 0 &&
    assetService.getAssets().length === 0 &&
    liabilityService.getLiabilities().length === 0 &&
    recurringService.getRecurringTransactions().length === 0 &&
    mockAsyncStorage.size() === 0;
  
  console.log('\n🎯 測試結果:');
  console.log(`- 交易記錄清除: ${transactionService.getTransactions().length === 0 ? '✅' : '❌'}`);
  console.log(`- 資產清除: ${assetService.getAssets().length === 0 ? '✅' : '❌'}`);
  console.log(`- 負債清除: ${liabilityService.getLiabilities().length === 0 ? '✅' : '❌'}`);
  console.log(`- 循環交易清除: ${recurringService.getRecurringTransactions().length === 0 ? '✅' : '❌'}`);
  console.log(`- 存儲清除: ${mockAsyncStorage.size() === 0 ? '✅' : '❌'}`);
  
  console.log(`\n🎉 整體測試結果: ${allDataCleared ? '✅ 全部通過' : '❌ 有測試失敗'}`);
  
  if (allDataCleared) {
    console.log('\n🎉 儀表板刪除功能正常工作！');
    console.log('💡 實際使用建議:');
    console.log('1. 在儀表板點擊刪除按鈕');
    console.log('2. 確認刪除對話框');
    console.log('3. 檢查記帳區是否清空');
    console.log('4. 檢查資產負債表是否清空');
    console.log('5. 檢查所有數據是否完全清除');
  } else {
    console.log('\n⚠️ 測試失敗，需要進一步調試');
  }
  
  return allDataCleared;
}

// 執行測試
runDashboardDeleteTest();
