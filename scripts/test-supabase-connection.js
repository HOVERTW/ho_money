/**
 * Supabase 連接測試
 * 使用環境變量測試 Supabase 連接和登錄功能
 */

// 載入環境變量
require('dotenv').config({ path: '.env.production' });

const { createClient } = require('@supabase/supabase-js');

// 測試配置
const TEST_CONFIG = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'user01@gmail.com',
    password: process.env.TEST_USER_PASSWORD || 'user01'
  }
};

// 測試結果收集
const testResults = {
  connection: { passed: 0, failed: 0, tests: [] },
  authentication: { passed: 0, failed: 0, tests: [] },
  database: { passed: 0, failed: 0, tests: [] },
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

// 等待函數
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 測試環境變量
async function testEnvironmentVariables() {
  console.log('\n🌍 測試環境變量');
  console.log('================================');

  try {
    // 檢查 Supabase URL
    const hasUrl = !!TEST_CONFIG.supabaseUrl;
    logTest('connection', 'Supabase URL 環境變量', hasUrl, TEST_CONFIG.supabaseUrl ? '已設置' : '未設置');

    // 檢查 Supabase Key
    const hasKey = !!TEST_CONFIG.supabaseKey;
    logTest('connection', 'Supabase Key 環境變量', hasKey, TEST_CONFIG.supabaseKey ? '已設置' : '未設置');

    // 檢查測試用戶
    const hasTestUser = !!TEST_CONFIG.testUser.email && !!TEST_CONFIG.testUser.password;
    logTest('connection', '測試用戶配置', hasTestUser, `${TEST_CONFIG.testUser.email}`);

    // 驗證 URL 格式
    if (hasUrl) {
      const isValidUrl = TEST_CONFIG.supabaseUrl.startsWith('https://') && TEST_CONFIG.supabaseUrl.includes('supabase.co');
      logTest('connection', 'Supabase URL 格式', isValidUrl, TEST_CONFIG.supabaseUrl);
    }

    // 驗證 Key 格式
    if (hasKey) {
      const isValidKey = TEST_CONFIG.supabaseKey.startsWith('eyJ') && TEST_CONFIG.supabaseKey.includes('.');
      logTest('connection', 'Supabase Key 格式', isValidKey, '格式正確');
    }

    return hasUrl && hasKey && hasTestUser;

  } catch (error) {
    console.error('❌ 環境變量測試失敗:', error);
    logTest('connection', '環境變量測試', false, error.message);
    return false;
  }
}

// 測試 Supabase 客戶端創建
async function testSupabaseClient() {
  console.log('\n🔌 測試 Supabase 客戶端');
  console.log('================================');

  try {
    // 創建 Supabase 客戶端
    console.log('📡 創建 Supabase 客戶端...');
    
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'fintranzo-test'
        }
      }
    });

    logTest('connection', 'Supabase 客戶端創建', !!supabase, '客戶端實例已創建');

    // 測試基本連接
    console.log('🧪 測試基本連接...');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      logTest('connection', 'Supabase 基本連接', !error, error ? error.message : '連接成功');
    } catch (error) {
      logTest('connection', 'Supabase 基本連接', false, error.message);
    }

    return supabase;

  } catch (error) {
    console.error('❌ Supabase 客戶端測試失敗:', error);
    logTest('connection', 'Supabase 客戶端', false, error.message);
    return null;
  }
}

// 測試用戶認證
async function testAuthentication(supabase) {
  console.log('\n🔐 測試用戶認證');
  console.log('================================');

  if (!supabase) {
    logTest('authentication', '認證測試', false, 'Supabase 客戶端不可用');
    return null;
  }

  try {
    // 檢查當前會話
    console.log('👤 檢查當前會話...');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logTest('authentication', '會話檢查', false, sessionError.message);
    } else {
      const hasSession = !!sessionData.session;
      logTest('authentication', '會話檢查', true, hasSession ? '有活動會話' : '無活動會話');
    }

    // 嘗試登錄測試用戶
    console.log('🔑 嘗試登錄測試用戶...');
    console.log(`📧 用戶: ${TEST_CONFIG.testUser.email}`);
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });

    if (loginError) {
      logTest('authentication', '用戶登錄', false, loginError.message);
      
      // 如果登錄失敗，嘗試註冊
      console.log('📝 嘗試註冊測試用戶...');
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      });

      if (signupError) {
        logTest('authentication', '用戶註冊', false, signupError.message);
      } else {
        logTest('authentication', '用戶註冊', true, '註冊成功');
        return signupData.user;
      }
    } else {
      logTest('authentication', '用戶登錄', true, `用戶 ID: ${loginData.user?.id}`);
      return loginData.user;
    }

    // 檢查用戶信息
    if (loginData?.user) {
      console.log('👤 檢查用戶信息...');
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        logTest('authentication', '用戶信息獲取', false, userError.message);
      } else {
        logTest('authentication', '用戶信息獲取', true, `用戶: ${userData.user?.email}`);
        return userData.user;
      }
    }

    return null;

  } catch (error) {
    console.error('❌ 認證測試失敗:', error);
    logTest('authentication', '認證測試', false, error.message);
    return null;
  }
}

// 測試數據庫操作
async function testDatabaseOperations(supabase, user) {
  console.log('\n🗄️ 測試數據庫操作');
  console.log('================================');

  if (!supabase) {
    logTest('database', '數據庫測試', false, 'Supabase 客戶端不可用');
    return;
  }

  try {
    // 測試 profiles 表查詢
    console.log('👤 測試 profiles 表查詢...');
    
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profilesError) {
        logTest('database', 'profiles 表查詢', false, profilesError.message);
      } else {
        logTest('database', 'profiles 表查詢', true, `獲取到 ${profilesData?.length || 0} 筆記錄`);
      }
    } catch (error) {
      logTest('database', 'profiles 表查詢', false, error.message);
    }

    // 測試 transactions 表查詢
    console.log('💰 測試 transactions 表查詢...');
    
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);

      if (transactionsError) {
        logTest('database', 'transactions 表查詢', false, transactionsError.message);
      } else {
        logTest('database', 'transactions 表查詢', true, `獲取到 ${transactionsData?.length || 0} 筆記錄`);
      }
    } catch (error) {
      logTest('database', 'transactions 表查詢', false, error.message);
    }

    // 測試 assets 表查詢
    console.log('🏦 測試 assets 表查詢...');
    
    try {
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .limit(1);

      if (assetsError) {
        logTest('database', 'assets 表查詢', false, assetsError.message);
      } else {
        logTest('database', 'assets 表查詢', true, `獲取到 ${assetsData?.length || 0} 筆記錄`);
      }
    } catch (error) {
      logTest('database', 'assets 表查詢', false, error.message);
    }

    // 如果用戶已登錄，測試用戶特定數據
    if (user) {
      console.log('🔒 測試用戶特定數據查詢...');
      
      try {
        const { data: userTransactions, error: userTransactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);

        if (userTransactionsError) {
          logTest('database', '用戶交易數據查詢', false, userTransactionsError.message);
        } else {
          logTest('database', '用戶交易數據查詢', true, `用戶有 ${userTransactions?.length || 0} 筆交易`);
        }
      } catch (error) {
        logTest('database', '用戶交易數據查詢', false, error.message);
      }
    }

    // 測試插入操作（創建測試記錄）
    if (user) {
      console.log('➕ 測試插入操作...');
      
      const testTransaction = {
        id: `test_${Date.now()}`,
        user_id: user.id,
        type: 'expense',
        amount: 100,
        description: 'Supabase 連接測試',
        category: '測試',
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const { data: insertData, error: insertError } = await supabase
          .from('transactions')
          .insert(testTransaction)
          .select();

        if (insertError) {
          logTest('database', '數據插入測試', false, insertError.message);
        } else {
          logTest('database', '數據插入測試', true, '測試記錄創建成功');

          // 清理測試數據
          await supabase
            .from('transactions')
            .delete()
            .eq('id', testTransaction.id);
          
          logTest('database', '測試數據清理', true, '測試記錄已刪除');
        }
      } catch (error) {
        logTest('database', '數據插入測試', false, error.message);
      }
    }

  } catch (error) {
    console.error('❌ 數據庫操作測試失敗:', error);
    logTest('database', '數據庫操作', false, error.message);
  }
}

// 生成測試報告
function generateTestReport() {
  console.log('\n📋 Supabase 連接測試報告');
  console.log('================================');
  
  console.log('\n📊 測試統計:');
  console.log(`總測試數: ${testResults.overall.passed + testResults.overall.failed}`);
  console.log(`通過: ${testResults.overall.passed}`);
  console.log(`失敗: ${testResults.overall.failed}`);
  
  if (testResults.overall.passed + testResults.overall.failed > 0) {
    console.log(`成功率: ${((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100).toFixed(1)}%`);
  }

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

  const overallSuccess = testResults.overall.failed === 0;
  console.log(`\n🎯 整體測試結果: ${overallSuccess ? '✅ 成功' : '❌ 部分失敗'}`);
  
  return overallSuccess;
}

// 主測試函數
async function runSupabaseTests() {
  console.log('🔌 FinTranzo Supabase 連接測試');
  console.log('===============================');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('測試用戶:', TEST_CONFIG.testUser.email);

  try {
    // 運行所有測試
    const envValid = await testEnvironmentVariables();
    
    if (!envValid) {
      console.log('\n❌ 環境變量配置不完整，無法繼續測試');
      return false;
    }

    const supabase = await testSupabaseClient();
    const user = await testAuthentication(supabase);
    await testDatabaseOperations(supabase, user);

    // 生成報告
    const success = generateTestReport();

    if (success) {
      console.log('\n🎉 Supabase 連接測試通過！');
      console.log('\n📱 可以開始測試五大核心功能：');
      console.log('1. 新增交易功能');
      console.log('2. 資產新增同步功能');
      console.log('3. 刪除同步功能');
      console.log('4. 垃圾桶刪除不影響類別');
      console.log('5. 雲端同步功能');
      console.log('\n🌐 訪問: http://localhost:3000');
      console.log(`🔑 登錄: ${TEST_CONFIG.testUser.email} / ${TEST_CONFIG.testUser.password}`);
    } else {
      console.log('\n⚠️ 部分測試失敗，需要檢查 Supabase 配置');
    }

    return success;

  } catch (error) {
    console.error('\n💥 Supabase 測試失敗:', error);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runSupabaseTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  runSupabaseTests,
  testEnvironmentVariables,
  testSupabaseClient,
  testAuthentication,
  testDatabaseOperations
};
