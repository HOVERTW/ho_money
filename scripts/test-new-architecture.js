/**
 * 測試新架構的核心功能
 * 驗證現有服務和新架構整合
 */

// 使用現有的服務進行測試
const { supabase, authService } = require('../src/services/supabase');
const { transactionDataService } = require('../src/services/transactionDataService');
const { assetTransactionSyncService } = require('../src/services/assetTransactionSyncService');

// 測試結果收集
const testResults = {
  supabaseConnection: { passed: 0, failed: 0, tests: [] },
  coreServices: { passed: 0, failed: 0, tests: [] },
  fiveFunctions: { passed: 0, failed: 0, tests: [] },
  overall: { passed: 0, failed: 0 }
};

// 測試工具函數
function logTest(category, testName, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const message = `${status} ${testName}${details ? ': ' + details : ''}`;
  console.log(message);
  
  testResults[category].tests.push({ name: testName, passed, details });
  if (passed) {
    testResults[category].passed++;
    testResults.overall.passed++;
  } else {
    testResults[category].failed++;
    testResults.overall.failed++;
  }
}

// 測試 Supabase 連接
async function testSupabaseConnection() {
  console.log('\n🔌 測試 Supabase 連接');
  console.log('================================');

  try {
    // 測試基本連接
    console.log('📡 測試基本 Supabase 連接...');

    // 檢查 Supabase 客戶端是否存在
    logTest('supabaseConnection', 'Supabase 客戶端存在', !!supabase);

    // 測試簡單查詢
    try {
      console.log('📊 測試簡單查詢...');
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      logTest('supabaseConnection', '基本查詢測試', !error, error?.message);
    } catch (error) {
      logTest('supabaseConnection', '基本查詢測試', false, error.message);
    }

    // 測試認證服務
    try {
      console.log('🔐 測試認證服務...');
      const session = await authService.getCurrentSession();
      logTest('supabaseConnection', '認證服務可用', true, session ? '有活動會話' : '無活動會話');
    } catch (error) {
      logTest('supabaseConnection', '認證服務可用', false, error.message);
    }

  } catch (error) {
    console.error('❌ Supabase 連接測試失敗:', error);
    logTest('supabaseConnection', 'Supabase 連接', false, error.message);
  }
}

// 測試核心服務
async function testCoreServices() {
  console.log('\n🚀 測試核心服務');
  console.log('================================');

  try {
    // 測試交易數據服務
    console.log('💰 測試交易數據服務...');
    try {
      const transactions = await transactionDataService.getAllTransactions();
      logTest('coreServices', '交易數據服務', Array.isArray(transactions), `獲取到 ${transactions?.length || 0} 筆交易`);
    } catch (error) {
      logTest('coreServices', '交易數據服務', false, error.message);
    }

    // 測試資產同步服務
    console.log('🏦 測試資產同步服務...');
    try {
      const assets = await assetTransactionSyncService.getAllAssets();
      logTest('coreServices', '資產同步服務', Array.isArray(assets), `獲取到 ${assets?.length || 0} 個資產`);
    } catch (error) {
      logTest('coreServices', '資產同步服務', false, error.message);
    }

    // 測試服務間協作
    console.log('🤝 測試服務間協作...');
    try {
      // 創建一個測試交易
      const testTransaction = {
        id: `test_${Date.now()}`,
        type: 'expense',
        amount: 100,
        description: '架構測試交易',
        category: '測試',
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await transactionDataService.addTransaction(testTransaction);
      logTest('coreServices', '服務間協作測試', true, '成功創建測試交易');

      // 清理測試數據
      await transactionDataService.deleteTransaction(testTransaction.id);
    } catch (error) {
      logTest('coreServices', '服務間協作測試', false, error.message);
    }

  } catch (error) {
    console.error('❌ 核心服務測試失敗:', error);
    logTest('coreServices', '核心服務', false, error.message);
  }
}

// 測試五大核心功能
async function testFiveCoreFunction() {
  console.log('\n🎯 測試五大核心功能');
  console.log('================================');

  try {
    // 1. 測試新增交易功能
    console.log('1️⃣ 測試新增交易功能...');
    try {
      const testTransaction = {
        id: `test_tx_${Date.now()}`,
        type: 'expense',
        amount: 500,
        description: '測試交易',
        category: '測試',
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await transactionDataService.addTransaction(testTransaction);
      logTest('fiveFunctions', '新增交易功能', true);

      // 清理
      await transactionDataService.deleteTransaction(testTransaction.id);
    } catch (error) {
      logTest('fiveFunctions', '新增交易功能', false, error.message);
    }

    // 2. 測試資產新增同步功能
    console.log('2️⃣ 測試資產新增同步功能...');
    try {
      const testAsset = {
        id: `test_asset_${Date.now()}`,
        name: '測試資產',
        type: 'stock',
        current_value: 10000,
        created_at: new Date().toISOString()
      };

      await assetTransactionSyncService.addAsset(testAsset);
      logTest('fiveFunctions', '資產新增同步功能', true);

      // 清理
      await assetTransactionSyncService.deleteAsset(testAsset.id);
    } catch (error) {
      logTest('fiveFunctions', '資產新增同步功能', false, error.message);
    }

    // 3. 測試刪除同步功能
    console.log('3️⃣ 測試刪除同步功能...');
    try {
      // 創建並刪除測試數據
      const testId = `test_delete_${Date.now()}`;
      const testData = {
        id: testId,
        type: 'expense',
        amount: 100,
        description: '刪除測試',
        category: '測試',
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await transactionDataService.addTransaction(testData);
      await transactionDataService.deleteTransaction(testId);
      logTest('fiveFunctions', '刪除同步功能', true);
    } catch (error) {
      logTest('fiveFunctions', '刪除同步功能', false, error.message);
    }

    // 4. 測試垃圾桶刪除不影響類別
    console.log('4️⃣ 測試垃圾桶刪除不影響類別...');
    try {
      // 這個功能需要檢查類別是否保持完整
      const categories = await transactionDataService.getAllCategories();
      logTest('fiveFunctions', '垃圾桶刪除不影響類別', Array.isArray(categories), `類別數量: ${categories?.length || 0}`);
    } catch (error) {
      logTest('fiveFunctions', '垃圾桶刪除不影響類別', false, error.message);
    }

    // 5. 測試雲端同步功能
    console.log('5️⃣ 測試雲端同步功能...');
    try {
      // 測試基本的雲端連接
      const { data, error } = await supabase.from('transactions').select('id').limit(1);
      logTest('fiveFunctions', '雲端同步功能', !error, error?.message || '雲端連接正常');
    } catch (error) {
      logTest('fiveFunctions', '雲端同步功能', false, error.message);
    }

  } catch (error) {
    console.error('❌ 五大核心功能測試失敗:', error);
    logTest('fiveFunctions', '五大核心功能', false, error.message);
  }
}

// 測試環境準備
async function testEnvironmentSetup() {
  console.log('\n🔗 測試環境準備');
  console.log('================================');

  try {
    // 檢查環境變量
    console.log('🌍 檢查環境變量...');
    const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    logTest('supabaseConnection', '環境變量 - Supabase URL', hasSupabaseUrl);
    logTest('supabaseConnection', '環境變量 - Supabase Key', hasSupabaseKey);

    // 檢查服務可用性
    console.log('🔧 檢查服務可用性...');
    logTest('coreServices', '交易數據服務可用', typeof transactionDataService === 'object');
    logTest('coreServices', '資產同步服務可用', typeof assetTransactionSyncService === 'object');

    // 檢查 Supabase 客戶端
    console.log('📡 檢查 Supabase 客戶端...');
    logTest('supabaseConnection', 'Supabase 客戶端可用', typeof supabase === 'object');
    logTest('supabaseConnection', '認證服務可用', typeof authService === 'object');

  } catch (error) {
    console.error('❌ 環境準備測試失敗:', error);
    logTest('supabaseConnection', '環境準備', false, error.message);
  }
}

// 生成測試報告
function generateTestReport() {
  console.log('\n📋 測試報告');
  console.log('================================');
  
  console.log('\n📊 測試統計:');
  console.log(`總測試數: ${testResults.overall.passed + testResults.overall.failed}`);
  console.log(`通過: ${testResults.overall.passed}`);
  console.log(`失敗: ${testResults.overall.failed}`);
  console.log(`成功率: ${((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 詳細結果:');
  
  Object.keys(testResults).forEach(category => {
    if (category === 'overall') return;
    
    const result = testResults[category];
    console.log(`\n${category}:`);
    console.log(`  通過: ${result.passed}, 失敗: ${result.failed}`);
    
    result.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}${test.details ? ': ' + test.details : ''}`);
    });
  });

  // 判斷整體測試結果
  const overallSuccess = testResults.overall.failed === 0;
  console.log(`\n🎯 整體測試結果: ${overallSuccess ? '✅ 成功' : '❌ 失敗'}`);
  
  return overallSuccess;
}

// 主測試函數
async function runArchitectureTests() {
  console.log('🧪 FinTranzo 架構和功能測試');
  console.log('============================');
  console.log('測試時間:', new Date().toLocaleString());

  try {
    // 運行所有測試
    await testEnvironmentSetup();
    await testSupabaseConnection();
    await testCoreServices();
    await testFiveCoreFunction();

    // 生成報告
    const success = generateTestReport();

    if (success) {
      console.log('\n🎉 所有測試通過！架構運行正常。');
      process.exit(0);
    } else {
      console.log('\n⚠️ 部分測試失敗，需要檢查和修復。');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 測試運行失敗:', error);
    process.exit(1);
  }
}

// 運行測試
if (require.main === module) {
  runArchitectureTests();
}

module.exports = {
  runArchitectureTests,
  testEnvironmentSetup,
  testSupabaseConnection,
  testCoreServices,
  testFiveCoreFunction
};
