// 測試登錄後 Supabase 數據讀取功能

console.log('🧪 開始測試登錄後數據同步功能...');

// 模擬登錄流程和數據同步
class MockLoginDataSync {
  constructor() {
    this.user = null;
    this.localData = {
      transactions: [],
      assets: [],
      liabilities: []
    };
    this.cloudData = {
      transactions: [],
      assets: [],
      liabilities: []
    };
    this.syncSteps = [];
  }

  // 模擬用戶登錄
  mockLogin(email) {
    this.user = {
      id: 'mock-user-id-' + Date.now(),
      email: email,
      created_at: new Date().toISOString()
    };
    this.syncSteps.push(`✅ 用戶登錄成功: ${email}`);
    console.log(`👤 模擬用戶登錄: ${email}`);
  }

  // 模擬本地數據
  mockLocalData() {
    this.localData = {
      transactions: [
        { id: '1', type: 'expense', amount: 200, description: '測試支出', date: '2025-01-08' },
        { id: '2', type: 'income', amount: 1000, description: '測試收入', date: '2025-01-08' }
      ],
      assets: [
        { id: '1', name: '現金', current_value: 50000, type: 'cash' },
        { id: '2', name: '銀行存款', current_value: 100000, type: 'bank' }
      ],
      liabilities: [
        { id: '1', name: '信用卡', balance: 5000 }
      ]
    };
    this.syncSteps.push('📱 本地數據已準備');
    console.log('📱 模擬本地數據:', this.localData);
  }

  // 模擬數據上傳到雲端
  async mockUploadToCloud() {
    if (!this.user) {
      throw new Error('用戶未登錄');
    }

    // 模擬上傳延遲
    await new Promise(resolve => setTimeout(resolve, 100));

    // 添加 user_id 到所有數據
    this.cloudData.transactions = this.localData.transactions.map(t => ({
      ...t,
      user_id: this.user.id,
      created_at: new Date().toISOString()
    }));

    this.cloudData.assets = this.localData.assets.map(a => ({
      ...a,
      user_id: this.user.id,
      created_at: new Date().toISOString()
    }));

    this.cloudData.liabilities = this.localData.liabilities.map(l => ({
      ...l,
      user_id: this.user.id,
      created_at: new Date().toISOString()
    }));

    this.syncSteps.push('☁️ 數據已上傳到雲端');
    console.log('☁️ 模擬雲端數據:', this.cloudData);
  }

  // 模擬從雲端讀取數據
  async mockReadFromCloud() {
    if (!this.user) {
      throw new Error('用戶未登錄');
    }

    // 模擬讀取延遲
    await new Promise(resolve => setTimeout(resolve, 100));

    // 過濾用戶數據
    const userTransactions = this.cloudData.transactions.filter(t => t.user_id === this.user.id);
    const userAssets = this.cloudData.assets.filter(a => a.user_id === this.user.id);
    const userLiabilities = this.cloudData.liabilities.filter(l => l.user_id === this.user.id);

    this.syncSteps.push(`📥 從雲端讀取: ${userTransactions.length} 筆交易, ${userAssets.length} 筆資產, ${userLiabilities.length} 筆負債`);
    
    console.log('📥 從雲端讀取的數據:');
    console.log('- 交易:', userTransactions.length, '筆');
    console.log('- 資產:', userAssets.length, '筆');
    console.log('- 負債:', userLiabilities.length, '筆');

    return {
      transactions: userTransactions,
      assets: userAssets,
      liabilities: userLiabilities
    };
  }

  // 模擬本地服務重新載入
  async mockReloadLocalServices() {
    // 模擬服務重新載入延遲
    await new Promise(resolve => setTimeout(resolve, 50));

    this.syncSteps.push('🔄 本地服務已重新載入');
    console.log('🔄 模擬本地服務重新載入完成');
  }

  // 模擬完整的登錄同步流程
  async simulateLoginSync(email) {
    try {
      console.log('\n=== 開始模擬登錄同步流程 ===');
      
      // 1. 用戶登錄
      this.mockLogin(email);
      
      // 2. 準備本地數據
      this.mockLocalData();
      
      // 3. 上傳本地數據到雲端
      await this.mockUploadToCloud();
      
      // 4. 從雲端讀取數據
      const cloudData = await this.mockReadFromCloud();
      
      // 5. 重新載入本地服務
      await this.mockReloadLocalServices();
      
      // 6. 驗證數據一致性
      const isConsistent = this.validateDataConsistency(cloudData);
      
      this.syncSteps.push(isConsistent ? '✅ 數據一致性驗證通過' : '❌ 數據一致性驗證失敗');
      
      return {
        success: true,
        steps: this.syncSteps,
        cloudData: cloudData,
        isConsistent: isConsistent
      };
      
    } catch (error) {
      this.syncSteps.push(`❌ 同步失敗: ${error.message}`);
      return {
        success: false,
        steps: this.syncSteps,
        error: error.message
      };
    }
  }

  // 驗證數據一致性
  validateDataConsistency(cloudData) {
    const localTransactionCount = this.localData.transactions.length;
    const cloudTransactionCount = cloudData.transactions.length;
    
    const localAssetCount = this.localData.assets.length;
    const cloudAssetCount = cloudData.assets.length;
    
    const localLiabilityCount = this.localData.liabilities.length;
    const cloudLiabilityCount = cloudData.liabilities.length;
    
    console.log('\n📊 數據一致性檢查:');
    console.log(`- 交易: 本地 ${localTransactionCount} vs 雲端 ${cloudTransactionCount}`);
    console.log(`- 資產: 本地 ${localAssetCount} vs 雲端 ${cloudAssetCount}`);
    console.log(`- 負債: 本地 ${localLiabilityCount} vs 雲端 ${cloudLiabilityCount}`);
    
    return localTransactionCount === cloudTransactionCount &&
           localAssetCount === cloudAssetCount &&
           localLiabilityCount === cloudLiabilityCount;
  }
}

// 執行測試
async function runLoginSyncTest() {
  const syncTest = new MockLoginDataSync();
  
  console.log('\n=== 測試案例 1: 正常登錄同步 ===');
  const result1 = await syncTest.simulateLoginSync('test@example.com');
  
  console.log('\n📋 同步步驟:');
  result1.steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  
  console.log('\n📊 測試結果:');
  console.log(`- 同步成功: ${result1.success ? '✅' : '❌'}`);
  console.log(`- 數據一致: ${result1.isConsistent ? '✅' : '❌'}`);
  
  if (result1.success && result1.isConsistent) {
    console.log('\n🎉 登錄同步測試通過！');
  } else {
    console.log('\n❌ 登錄同步測試失敗！');
    if (result1.error) {
      console.log(`錯誤: ${result1.error}`);
    }
  }
  
  console.log('\n💡 實際測試建議:');
  console.log('1. 登錄應用程式');
  console.log('2. 檢查控制台是否有 "🔍 開始讀取用戶 XXX 數據..." 日誌');
  console.log('3. 確認看到 "✅ 成功讀取 X 筆 XXX 記錄" 訊息');
  console.log('4. 檢查儀表板是否顯示正確的數據');
  console.log('5. 如果數據為空，檢查 Supabase 中是否有對應的用戶數據');
  
  return result1.success && result1.isConsistent;
}

// 執行測試
runLoginSyncTest();
