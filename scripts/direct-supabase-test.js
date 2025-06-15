/**
 * 直接 Supabase 連接測試
 * 使用現有的服務架構測試連接
 */

console.log('🔌 FinTranzo Supabase 直接連接測試');
console.log('==================================');
console.log('測試時間:', new Date().toLocaleString());

// 設置環境變量（模擬 React Native 環境）
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

// 測試用戶
const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

console.log('\n🌍 環境變量檢查:');
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Supabase Key 存在:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('測試用戶:', TEST_USER.email);

// 直接使用 Supabase SDK 測試
async function testDirectSupabaseConnection() {
  try {
    console.log('\n📦 載入 Supabase SDK...');
    
    const { createClient } = require('@supabase/supabase-js');
    console.log('✅ Supabase SDK 載入成功');

    console.log('\n🔌 創建 Supabase 客戶端...');
    
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'X-Client-Info': 'fintranzo-direct-test'
          }
        }
      }
    );

    console.log('✅ Supabase 客戶端創建成功');

    // 測試基本連接
    console.log('\n🧪 測試基本連接...');
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('⚠️ 會話檢查警告:', sessionError.message);
      } else {
        console.log('✅ Supabase 基本連接成功');
        console.log('當前會話:', sessionData.session ? '有活動會話' : '無活動會話');
      }
    } catch (error) {
      console.log('❌ 基本連接測試失敗:', error.message);
      return false;
    }

    // 測試數據庫連接
    console.log('\n🗄️ 測試數據庫連接...');
    
    try {
      // 測試 profiles 表
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profilesError) {
        console.log('⚠️ profiles 表查詢失敗:', profilesError.message);
      } else {
        console.log('✅ profiles 表連接成功，記錄數:', profilesData?.length || 0);
      }

      // 測試 transactions 表
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .limit(1);

      if (transactionsError) {
        console.log('⚠️ transactions 表查詢失敗:', transactionsError.message);
      } else {
        console.log('✅ transactions 表連接成功，記錄數:', transactionsData?.length || 0);
      }

      // 測試 assets 表
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id')
        .limit(1);

      if (assetsError) {
        console.log('⚠️ assets 表查詢失敗:', assetsError.message);
      } else {
        console.log('✅ assets 表連接成功，記錄數:', assetsData?.length || 0);
      }

    } catch (error) {
      console.log('❌ 數據庫連接測試失敗:', error.message);
    }

    // 測試用戶認證
    console.log('\n🔑 測試用戶認證...');
    console.log(`📧 嘗試登錄: ${TEST_USER.email}`);
    
    try {
      // 嘗試登錄
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password
      });

      if (loginError) {
        console.log('⚠️ 登錄失敗:', loginError.message);
        
        // 如果是憑證無效，嘗試註冊
        if (loginError.message.includes('Invalid login credentials')) {
          console.log('📝 嘗試註冊新用戶...');
          
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: TEST_USER.email,
            password: TEST_USER.password
          });

          if (signupError) {
            console.log('❌ 註冊失敗:', signupError.message);
            return false;
          } else {
            console.log('✅ 用戶註冊成功');
            console.log('👤 用戶 ID:', signupData.user?.id);
            console.log('📧 用戶郵箱:', signupData.user?.email);
            console.log('✉️ 郵箱確認狀態:', signupData.user?.email_confirmed_at ? '已確認' : '待確認');
            
            if (!signupData.user?.email_confirmed_at) {
              console.log('\n💡 重要提示：');
              console.log('用戶已創建但需要郵箱確認。請在 Supabase Dashboard 中：');
              console.log('1. 前往 Authentication > Users');
              console.log('2. 找到用戶:', TEST_USER.email);
              console.log('3. 點擊 "Confirm email"');
              console.log('4. 然後重新運行此測試');
            }
            
            return true;
          }
        }
      } else {
        console.log('✅ 用戶登錄成功');
        console.log('👤 用戶 ID:', loginData.user?.id);
        console.log('📧 用戶郵箱:', loginData.user?.email);
        console.log('✉️ 郵箱確認狀態:', loginData.user?.email_confirmed_at ? '已確認' : '待確認');
        
        // 測試用戶特定數據查詢
        console.log('\n🔒 測試用戶特定數據查詢...');
        
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
            
            if (userTransactions && userTransactions.length > 0) {
              console.log('📊 最新交易示例:', {
                id: userTransactions[0].id,
                type: userTransactions[0].type,
                amount: userTransactions[0].amount,
                description: userTransactions[0].description
              });
            }
          }

          // 測試用戶資產查詢
          const { data: userAssets, error: userAssetsError } = await supabase
            .from('assets')
            .select('*')
            .eq('user_id', loginData.user.id)
            .limit(5);

          if (userAssetsError) {
            console.log('⚠️ 用戶資產查詢失敗:', userAssetsError.message);
          } else {
            console.log('✅ 用戶資產查詢成功，記錄數:', userAssets?.length || 0);
          }

        } catch (error) {
          console.log('❌ 用戶數據查詢異常:', error.message);
        }

        // 測試數據插入（創建測試交易）
        console.log('\n➕ 測試數據插入...');
        
        const testTransaction = {
          id: `test_${Date.now()}`,
          user_id: loginData.user.id,
          type: 'expense',
          amount: 100,
          description: 'Supabase 連接測試交易',
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
            console.log('⚠️ 測試交易插入失敗:', insertError.message);
          } else {
            console.log('✅ 測試交易插入成功');
            console.log('📝 插入的交易:', insertData[0]);

            // 清理測試數據
            const { error: deleteError } = await supabase
              .from('transactions')
              .delete()
              .eq('id', testTransaction.id);

            if (deleteError) {
              console.log('⚠️ 測試數據清理失敗:', deleteError.message);
            } else {
              console.log('✅ 測試數據清理成功');
            }
          }
        } catch (error) {
          console.log('❌ 數據插入測試異常:', error.message);
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

// 檢查五大核心功能準備狀態
function checkCoreFunctionReadiness() {
  console.log('\n🎯 檢查五大核心功能準備狀態');
  console.log('================================');

  const fs = require('fs');
  const path = require('path');

  const coreServices = [
    { name: '1. 新增交易功能', file: 'src/services/transactionDataService.ts' },
    { name: '2. 資產新增同步功能', file: 'src/services/assetTransactionSyncService.ts' },
    { name: '3. 刪除同步功能', file: 'src/services/deleteDataService.ts' },
    { name: '4. 垃圾桶刪除不影響類別', file: 'src/services/categoryDataService.ts' },
    { name: '5. 雲端同步功能', file: 'src/services/enhancedSupabaseService.ts' },
    { name: '6. 資產計算邏輯修復', file: 'src/services/assetCalculationService.ts' }
  ];

  let readyCount = 0;

  coreServices.forEach(service => {
    const exists = fs.existsSync(path.join(process.cwd(), service.file));
    const status = exists ? '✅' : '⚠️';
    console.log(`${status} ${service.name}`);
    if (exists) readyCount++;
  });

  console.log(`\n📊 服務準備度: ${readyCount}/${coreServices.length} (${((readyCount / coreServices.length) * 100).toFixed(1)}%)`);

  return readyCount >= 4; // 至少 4 個服務準備就緒
}

// 主函數
async function main() {
  try {
    const connectionSuccess = await testDirectSupabaseConnection();
    const servicesReady = checkCoreFunctionReadiness();

    console.log('\n📋 Supabase 連接測試總結');
    console.log('============================');
    console.log('Supabase 連接:', connectionSuccess ? '✅ 成功' : '❌ 失敗');
    console.log('核心服務準備:', servicesReady ? '✅ 就緒' : '⚠️ 部分就緒');

    if (connectionSuccess) {
      console.log('\n🎉 Supabase 連接測試成功！');
      
      if (servicesReady) {
        console.log('\n📱 現在可以測試五大核心功能：');
        console.log('1. ✅ 新增交易功能');
        console.log('2. ✅ 資產新增同步功能');
        console.log('3. ✅ 刪除同步功能');
        console.log('4. ✅ 垃圾桶刪除不影響類別');
        console.log('5. ✅ 雲端同步功能');
      } else {
        console.log('\n⚠️ 部分核心服務未準備就緒，但基本功能可用');
      }
      
      console.log('\n🌐 測試步驟：');
      console.log('1. 確保本地服務器運行: http://localhost:3000');
      console.log('2. 登錄測試帳戶: user01@gmail.com / user01');
      console.log('3. 逐一測試五大核心功能');
      console.log('4. 檢查數據是否正確同步到 Supabase');
      
      return true;
    } else {
      console.log('\n❌ Supabase 連接失敗，需要檢查：');
      console.log('- 網絡連接');
      console.log('- Supabase 配置');
      console.log('- 用戶認證設置');
      
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

module.exports = { main, testDirectSupabaseConnection, checkCoreFunctionReadiness };
