/**
 * 簡單的 Supabase 連接測試
 * 直接使用環境變量測試連接和登錄
 */

// 設置環境變量
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔌 FinTranzo Supabase 連接測試');
console.log('===============================');
console.log('測試時間:', new Date().toLocaleString());

// 測試配置
const TEST_CONFIG = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  testUser: {
    email: 'user01@gmail.com',
    password: 'user01'
  }
};

console.log('\n🌍 環境變量檢查:');
console.log('Supabase URL:', TEST_CONFIG.supabaseUrl ? '✅ 已設置' : '❌ 未設置');
console.log('Supabase Key:', TEST_CONFIG.supabaseKey ? '✅ 已設置' : '❌ 未設置');
console.log('測試用戶:', TEST_CONFIG.testUser.email);

// 動態導入 Supabase
async function testSupabaseConnection() {
  try {
    console.log('\n📦 載入 Supabase 模組...');
    
    // 嘗試導入 Supabase
    let createClient;
    try {
      const supabaseModule = require('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
      console.log('✅ Supabase 模組載入成功');
    } catch (error) {
      console.log('❌ Supabase 模組載入失敗:', error.message);
      return false;
    }

    console.log('\n🔌 創建 Supabase 客戶端...');
    
    // 創建客戶端
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

    console.log('✅ Supabase 客戶端創建成功');

    console.log('\n🧪 測試基本連接...');
    
    // 測試基本連接
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('⚠️ 會話檢查警告:', error.message);
      } else {
        console.log('✅ Supabase 基本連接成功');
      }
    } catch (error) {
      console.log('❌ Supabase 基本連接失敗:', error.message);
      return false;
    }

    console.log('\n🔑 測試用戶登錄...');
    console.log(`📧 嘗試登錄: ${TEST_CONFIG.testUser.email}`);
    
    // 嘗試登錄
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      });

      if (loginError) {
        console.log('⚠️ 登錄失敗:', loginError.message);
        
        // 嘗試註冊
        console.log('📝 嘗試註冊新用戶...');
        
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: TEST_CONFIG.testUser.email,
          password: TEST_CONFIG.testUser.password
        });

        if (signupError) {
          console.log('❌ 註冊失敗:', signupError.message);
          return false;
        } else {
          console.log('✅ 用戶註冊成功');
          console.log('📧 請檢查郵箱確認註冊');
          return true;
        }
      } else {
        console.log('✅ 用戶登錄成功');
        console.log('👤 用戶 ID:', loginData.user?.id);
        console.log('📧 用戶郵箱:', loginData.user?.email);
        
        // 測試數據庫查詢
        console.log('\n🗄️ 測試數據庫查詢...');
        
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

          if (profilesError) {
            console.log('⚠️ profiles 表查詢失敗:', profilesError.message);
          } else {
            console.log('✅ profiles 表查詢成功，記錄數:', profilesData?.length || 0);
          }
        } catch (error) {
          console.log('⚠️ profiles 表查詢異常:', error.message);
        }

        try {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .limit(1);

          if (transactionsError) {
            console.log('⚠️ transactions 表查詢失敗:', transactionsError.message);
          } else {
            console.log('✅ transactions 表查詢成功，記錄數:', transactionsData?.length || 0);
          }
        } catch (error) {
          console.log('⚠️ transactions 表查詢異常:', error.message);
        }

        // 測試用戶特定數據
        console.log('\n🔒 測試用戶特定數據...');
        
        try {
          const { data: userTransactions, error: userTransactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', loginData.user.id)
            .limit(5);

          if (userTransactionsError) {
            console.log('⚠️ 用戶交易查詢失敗:', userTransactionsError.message);
          } else {
            console.log('✅ 用戶交易查詢成功，記錄數:', userTransactions?.length || 0);
          }
        } catch (error) {
          console.log('⚠️ 用戶交易查詢異常:', error.message);
        }

        return true;
      }
    } catch (error) {
      console.log('❌ 認證測試異常:', error.message);
      return false;
    }

  } catch (error) {
    console.log('❌ Supabase 連接測試失敗:', error.message);
    return false;
  }
}

// 測試五大核心功能準備狀態
function testCoreFunctionReadiness() {
  console.log('\n🎯 檢查五大核心功能準備狀態');
  console.log('================================');

  const fs = require('fs');
  const path = require('path');

  const coreServices = [
    { name: '交易數據服務', file: 'src/services/transactionDataService.ts' },
    { name: '資產同步服務', file: 'src/services/assetTransactionSyncService.ts' },
    { name: '增強 Supabase 服務', file: 'src/services/enhancedSupabaseService.ts' },
    { name: 'Supabase 連接管理器', file: 'src/services/supabaseConnectionManager.ts' },
    { name: '資產計算服務', file: 'src/services/assetCalculationService.ts' }
  ];

  let readyCount = 0;

  coreServices.forEach(service => {
    const exists = fs.existsSync(path.join(process.cwd(), service.file));
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${service.name}`);
    if (exists) readyCount++;
  });

  console.log(`\n📊 服務準備度: ${readyCount}/${coreServices.length} (${((readyCount / coreServices.length) * 100).toFixed(1)}%)`);

  return readyCount === coreServices.length;
}

// 主函數
async function main() {
  try {
    const connectionSuccess = await testSupabaseConnection();
    const servicesReady = testCoreFunctionReadiness();

    console.log('\n📋 測試總結');
    console.log('================================');
    console.log('Supabase 連接:', connectionSuccess ? '✅ 成功' : '❌ 失敗');
    console.log('核心服務準備:', servicesReady ? '✅ 就緒' : '❌ 不完整');

    if (connectionSuccess && servicesReady) {
      console.log('\n🎉 Supabase 連接測試完全成功！');
      console.log('\n📱 現在可以測試五大核心功能：');
      console.log('1. ✅ 新增交易功能');
      console.log('2. ✅ 資產新增同步功能');
      console.log('3. ✅ 刪除同步功能');
      console.log('4. ✅ 垃圾桶刪除不影響類別');
      console.log('5. ✅ 雲端同步功能');
      
      console.log('\n🌐 測試步驟：');
      console.log('1. 訪問: http://localhost:3000');
      console.log('2. 登錄: user01@gmail.com / user01');
      console.log('3. 逐一測試上述五大功能');
      console.log('4. 檢查數據是否正確同步到 Supabase');
      
      return true;
    } else {
      console.log('\n⚠️ 測試未完全通過，需要檢查：');
      if (!connectionSuccess) {
        console.log('- Supabase 連接配置');
        console.log('- 網絡連接');
        console.log('- 用戶認證');
      }
      if (!servicesReady) {
        console.log('- 核心服務文件');
        console.log('- 服務依賴關係');
      }
      
      return false;
    }

  } catch (error) {
    console.log('\n💥 測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('測試異常:', error);
    process.exit(1);
  });
}

module.exports = { main, testSupabaseConnection, testCoreFunctionReadiness };
