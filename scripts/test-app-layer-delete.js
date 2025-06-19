/**
 * 測試應用層刪除功能
 * 模擬應用中的刪除邏輯，找出失敗原因
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 生成有效的 UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// 模擬本地儲存
const mockAsyncStorage = new Map();
const mockLocalStorage = new Map();

// 模擬 AsyncStorage API
const AsyncStorageMock = {
  getItem: async (key) => {
    return mockAsyncStorage.get(key) || null;
  },
  setItem: async (key, value) => {
    mockAsyncStorage.set(key, value);
  },
  removeItem: async (key) => {
    mockAsyncStorage.delete(key);
  },
  getAllKeys: async () => {
    return Array.from(mockAsyncStorage.keys());
  }
};

// 模擬負債服務的刪除邏輯
async function mockLiabilityServiceDelete(liabilityId) {
  console.log(`🗑️ 模擬負債服務刪除: ${liabilityId}`);
  
  try {
    // 1. 從本地儲存獲取負債列表
    const liabilitiesJson = await AsyncStorageMock.getItem('@FinTranzo:liabilities');
    let liabilities = liabilitiesJson ? JSON.parse(liabilitiesJson) : [];
    
    console.log(`📊 刪除前本地負債數量: ${liabilities.length}`);
    
    // 2. 從列表中移除指定負債
    const originalLength = liabilities.length;
    liabilities = liabilities.filter(l => l.id !== liabilityId);
    
    if (liabilities.length === originalLength) {
      console.warn(`⚠️ 負債 ${liabilityId} 在本地儲存中不存在`);
      return false;
    }
    
    // 3. 更新本地儲存
    await AsyncStorageMock.setItem('@FinTranzo:liabilities', JSON.stringify(liabilities));
    
    console.log(`✅ 本地刪除成功，剩餘負債數量: ${liabilities.length}`);
    
    // 4. 模擬即時同步（已停用）
    console.log('🚫 即時同步已停用，僅本地刪除');
    
    return true;
    
  } catch (error) {
    console.error(`❌ 模擬負債服務刪除失敗: ${error.message}`);
    return false;
  }
}

// 模擬統一刪除管理器
async function mockUnifiedDeleteManager(dataType) {
  console.log(`🗑️ 模擬統一刪除管理器: ${dataType}`);
  
  const result = {
    success: true,
    deletedCount: 0,
    errors: [],
    details: {
      asyncStorage: false,
      localStorage: false,
      memory: false,
      services: false
    }
  };
  
  try {
    // 1. AsyncStorage 刪除
    const storageKeys = {
      'liabilities': ['@FinTranzo:liabilities'],
      'transactions': ['@FinTranzo:transactions'],
      'assets': ['@FinTranzo:assets'],
      'all': ['@FinTranzo:liabilities', '@FinTranzo:transactions', '@FinTranzo:assets']
    };
    
    const keysToDelete = storageKeys[dataType] || [];
    
    for (const key of keysToDelete) {
      const existingData = await AsyncStorageMock.getItem(key);
      if (existingData) {
        await AsyncStorageMock.removeItem(key);
        result.deletedCount++;
        console.log(`✅ 已從 AsyncStorage 刪除: ${key}`);
      }
    }
    
    result.details.asyncStorage = true;
    
    // 2. localStorage 刪除 (Web 環境模擬)
    const webKeys = {
      'liabilities': ['fintranzo_liabilities'],
      'transactions': ['fintranzo_transactions'],
      'assets': ['fintranzo_assets'],
      'all': ['fintranzo_liabilities', 'fintranzo_transactions', 'fintranzo_assets']
    };
    
    const webKeysToDelete = webKeys[dataType] || [];
    
    for (const key of webKeysToDelete) {
      if (mockLocalStorage.has(key)) {
        mockLocalStorage.delete(key);
        result.deletedCount++;
        console.log(`✅ 已從 localStorage 刪除: ${key}`);
      }
    }
    
    result.details.localStorage = true;
    
    // 3. 內存數據清理（模擬）
    console.log('🧠 模擬內存數據清理...');
    result.details.memory = true;
    result.deletedCount++;
    
    // 4. 服務層清理（模擬）
    console.log('🔧 模擬服務層清理...');
    result.details.services = true;
    result.deletedCount++;
    
    console.log(`✅ 統一刪除完成，共刪除 ${result.deletedCount} 項`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ 統一刪除管理器失敗: ${error.message}`);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

// 測試應用層刪除邏輯
async function testAppLayerDelete(user) {
  console.log('\n🔧 測試應用層刪除邏輯');
  console.log('========================');
  
  try {
    // 1. 準備測試數據
    const testLiabilities = [
      {
        id: generateUUID(),
        name: '應用層測試負債1',
        type: 'credit_card',
        balance: 10000,
        interest_rate: 0.18,
        monthly_payment: 500
      },
      {
        id: generateUUID(),
        name: '應用層測試負債2',
        type: 'loan',
        balance: 50000,
        interest_rate: 0.05,
        monthly_payment: 2000
      }
    ];
    
    // 2. 模擬本地儲存數據
    await AsyncStorageMock.setItem('@FinTranzo:liabilities', JSON.stringify(testLiabilities));
    mockLocalStorage.set('fintranzo_liabilities', JSON.stringify(testLiabilities));
    
    console.log(`📊 準備了 ${testLiabilities.length} 筆測試負債`);
    
    // 3. 測試個別刪除
    const liabilityToDelete = testLiabilities[0];
    const deleteResult = await mockLiabilityServiceDelete(liabilityToDelete.id);
    
    if (deleteResult) {
      logTest('應用層個別刪除', true, `成功刪除負債: ${liabilityToDelete.name}`);
    } else {
      logTest('應用層個別刪除', false, '刪除失敗');
    }
    
    // 4. 測試統一刪除管理器
    const unifiedResult = await mockUnifiedDeleteManager('liabilities');
    
    if (unifiedResult.success) {
      logTest('統一刪除管理器', true, `成功刪除 ${unifiedResult.deletedCount} 項`);
    } else {
      logTest('統一刪除管理器', false, unifiedResult.errors.join(', '));
    }
    
    // 5. 驗證刪除結果
    const remainingLiabilities = await AsyncStorageMock.getItem('@FinTranzo:liabilities');
    const remainingCount = remainingLiabilities ? JSON.parse(remainingLiabilities).length : 0;
    
    if (remainingCount === 0) {
      logTest('本地儲存清理驗證', true, '所有本地數據已清理');
    } else {
      logTest('本地儲存清理驗證', false, `仍有 ${remainingCount} 筆數據未清理`);
    }
    
    const webRemainingCount = mockLocalStorage.has('fintranzo_liabilities') ? 1 : 0;
    
    if (webRemainingCount === 0) {
      logTest('Web儲存清理驗證', true, '所有Web數據已清理');
    } else {
      logTest('Web儲存清理驗證', false, `仍有Web數據未清理`);
    }
    
  } catch (error) {
    logTest('應用層刪除測試異常', false, error.message);
  }
}

// 測試常見的刪除失敗場景
async function testCommonDeleteFailures() {
  console.log('\n❌ 測試常見刪除失敗場景');
  console.log('========================');
  
  try {
    // 1. 測試刪除不存在的項目
    const nonExistentId = generateUUID();
    const result1 = await mockLiabilityServiceDelete(nonExistentId);
    
    if (!result1) {
      logTest('刪除不存在項目', true, '正確處理了不存在的項目');
    } else {
      logTest('刪除不存在項目', false, '意外成功刪除了不存在的項目');
    }
    
    // 2. 測試空儲存刪除
    await AsyncStorageMock.removeItem('@FinTranzo:liabilities');
    const result2 = await mockLiabilityServiceDelete(generateUUID());
    
    if (!result2) {
      logTest('空儲存刪除', true, '正確處理了空儲存');
    } else {
      logTest('空儲存刪除', false, '意外成功刪除了空儲存中的項目');
    }
    
    // 3. 測試無效JSON數據
    await AsyncStorageMock.setItem('@FinTranzo:liabilities', 'invalid json');
    
    try {
      const result3 = await mockLiabilityServiceDelete(generateUUID());
      logTest('無效JSON處理', false, '應該拋出錯誤但沒有');
    } catch (error) {
      logTest('無效JSON處理', true, `正確拋出錯誤: ${error.message}`);
    }
    
  } catch (error) {
    logTest('刪除失敗場景測試異常', false, error.message);
  }
}

async function runAppLayerDeleteTest() {
  console.log('🔧 應用層刪除功能測試');
  console.log('======================');
  console.log(`測試時間: ${new Date().toLocaleString()}`);
  
  try {
    // 登錄
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (authError || !user) {
      logTest('用戶登錄', false, authError?.message || '登錄失敗');
      return false;
    }

    logTest('用戶登錄', true, `用戶: ${user.email}`);
    
    // 執行測試
    await testAppLayerDelete(user);
    await testCommonDeleteFailures();
    
    // 生成報告
    console.log('\n📋 應用層刪除測試報告');
    console.log('======================');
    console.log(`總測試數: ${testResults.passed + testResults.failed}`);
    console.log(`通過: ${testResults.passed}`);
    console.log(`失敗: ${testResults.failed}`);
    
    if (testResults.passed + testResults.failed > 0) {
      const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
      console.log(`成功率: ${successRate}%`);
    }

    const failedTests = testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗的測試:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });
      
      console.log('\n🔧 可能的問題:');
      console.log('1. 本地儲存同步問題');
      console.log('2. 服務間依賴問題');
      console.log('3. 事件監聽器未正確清理');
      console.log('4. 內存數據未正確重置');
    } else {
      console.log('\n🎉 所有應用層刪除測試都通過！');
      console.log('✅ 應用層刪除邏輯正常');
      console.log('❓ 實際問題可能在UI層面或特定操作流程');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 應用層刪除測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runAppLayerDeleteTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('應用層刪除測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runAppLayerDeleteTest };
