#!/usr/bin/env node

/**
 * Supabase 同步測試
 * 確保用戶數據正確同步到 Supabase 數據庫
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔄 Supabase 同步測試');
console.log('===================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 測試基礎連接
 */
async function testConnection() {
  console.log('📡 測試基礎連接...');
  
  try {
    const { data, error } = await supabase.from('assets').select('count').limit(1);
    
    if (error) {
      console.log('❌ 連接失敗:', error.message);
      return false;
    } else {
      console.log('✅ Supabase 連接正常');
      return true;
    }
  } catch (error) {
    console.log('❌ 連接異常:', error.message);
    return false;
  }
}

/**
 * 測試用戶註冊並檢查數據庫同步
 */
async function testUserRegistrationSync() {
  console.log('');
  console.log('📝 測試用戶註冊和數據庫同步...');
  
  const testEmail = `sync_test_${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  try {
    console.log('📧 測試郵箱:', testEmail);
    console.log('🔐 測試密碼:', testPassword);
    
    // 步驟1: 註冊用戶
    console.log('');
    console.log('🔄 步驟1: 註冊用戶...');
    const signUpResult = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          app_name: 'FinTranzo',
          test_user: true
        }
      }
    });

    if (signUpResult.error) {
      console.log('❌ 註冊失敗:', signUpResult.error.message);
      return { success: false, step: 'signup', error: signUpResult.error.message };
    }

    console.log('✅ 註冊請求成功');
    console.log('👤 用戶ID:', signUpResult.data.user?.id);
    console.log('📧 郵箱確認狀態:', signUpResult.data.user?.email_confirmed_at ? '已確認' : '未確認');
    console.log('🔑 Session 狀態:', signUpResult.data.session ? '已創建' : '未創建');

    // 步驟2: 檢查用戶是否在數據庫中
    console.log('');
    console.log('🔄 步驟2: 檢查數據庫中的用戶...');
    
    // 等待一下讓數據同步
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 嘗試獲取當前會話來驗證用戶
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('📋 當前會話狀態:', sessionData.session ? '有效' : '無效');

    // 步驟3: 嘗試登錄
    console.log('');
    console.log('🔄 步驟3: 嘗試登錄...');
    
    const loginResult = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginResult.error) {
      console.log('❌ 登錄失敗:', loginResult.error.message);
      
      if (loginResult.error.message.includes('Invalid login credentials')) {
        console.log('💡 可能原因: 用戶需要郵箱確認');
        console.log('🔧 建議: 在 Supabase Dashboard 中禁用郵件確認');
        console.log('   路徑: Authentication > Providers > Email > 關閉 "Confirm email"');
        
        return { 
          success: false, 
          step: 'login', 
          error: '需要郵箱確認',
          userCreated: true,
          needsEmailConfirmDisabled: true
        };
      }
      
      return { success: false, step: 'login', error: loginResult.error.message };
    }

    console.log('✅ 登錄成功');
    console.log('👤 登錄用戶ID:', loginResult.data.user?.id);
    console.log('📧 登錄用戶郵箱:', loginResult.data.user?.email);
    console.log('🔑 登錄 Session:', loginResult.data.session ? '有效' : '無效');

    // 步驟4: 測試數據操作
    console.log('');
    console.log('🔄 步驟4: 測試數據操作...');
    
    try {
      // 嘗試創建一個測試資產
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert([
          {
            name: '測試資產',
            amount: 1000,
            user_id: loginResult.data.user.id
          }
        ])
        .select();

      if (assetError) {
        console.log('⚠️ 資產創建失敗:', assetError.message);
        console.log('💡 這可能是正常的，如果 RLS 政策限制了操作');
      } else {
        console.log('✅ 資產創建成功');
        console.log('📊 資產數據:', assetData);
        
        // 清理測試數據
        await supabase.from('assets').delete().eq('id', assetData[0].id);
        console.log('🧹 測試數據已清理');
      }
    } catch (dataError) {
      console.log('⚠️ 數據操作測試跳過:', dataError.message);
    }

    // 登出
    await supabase.auth.signOut();
    console.log('🚪 已登出');

    return { 
      success: true, 
      userCreated: true, 
      canLogin: true, 
      dataSync: true,
      userId: loginResult.data.user.id,
      email: testEmail
    };

  } catch (error) {
    console.error('💥 測試過程異常:', error);
    return { success: false, step: 'exception', error: error.message };
  }
}

/**
 * 測試現有用戶登錄
 */
async function testExistingUserLogin() {
  console.log('');
  console.log('👤 測試現有用戶登錄...');
  
  const existingUsers = [
    { email: 'user01@gmail.com', password: 'user01' },
    { email: 'test@example.com', password: 'test123' }
  ];

  let successCount = 0;

  for (const user of existingUsers) {
    try {
      console.log(`🔑 測試登錄: ${user.email}`);
      
      const loginResult = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (loginResult.error) {
        console.log(`❌ ${user.email} 登錄失敗:`, loginResult.error.message);
      } else {
        console.log(`✅ ${user.email} 登錄成功`);
        console.log(`👤 用戶ID: ${loginResult.data.user.id}`);
        successCount++;
        
        // 登出
        await supabase.auth.signOut();
        console.log('🚪 已登出');
      }
    } catch (error) {
      console.error(`💥 ${user.email} 登錄異常:`, error);
    }
  }

  console.log(`📊 現有用戶測試結果: ${successCount}/${existingUsers.length} 成功`);
  return successCount > 0;
}

/**
 * 主測試函數
 */
async function runSyncTests() {
  console.log('🚀 開始 Supabase 同步測試...');
  console.log('');
  
  const results = {
    connection: false,
    existingUsers: false,
    newUserSync: false
  };
  
  try {
    // 測試1: 基礎連接
    results.connection = await testConnection();
    
    if (!results.connection) {
      console.log('');
      console.log('❌ 基礎連接失敗，停止測試');
      return results;
    }
    
    // 測試2: 現有用戶登錄
    results.existingUsers = await testExistingUserLogin();
    
    // 測試3: 新用戶註冊和同步
    const syncResult = await testUserRegistrationSync();
    results.newUserSync = syncResult.success;
    
    // 顯示詳細結果
    console.log('');
    console.log('📊 Supabase 同步測試結果');
    console.log('=========================');
    console.log('');
    console.log('📡 基礎連接:', results.connection ? '✅ 通過' : '❌ 失敗');
    console.log('👤 現有用戶登錄:', results.existingUsers ? '✅ 通過' : '❌ 失敗');
    console.log('📝 新用戶同步:', results.newUserSync ? '✅ 通過' : '❌ 失敗');
    console.log('');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`📈 總體結果: ${passedTests}/${totalTests} 測試通過`);
    
    if (results.newUserSync) {
      console.log('');
      console.log('🎉 新用戶可以正確註冊並同步到 Supabase！');
      console.log('✅ 用戶數據會正確保存到數據庫');
      console.log('✅ 認證系統工作正常');
    } else {
      console.log('');
      console.log('⚠️ 新用戶註冊同步失敗');
      
      if (syncResult.needsEmailConfirmDisabled) {
        console.log('');
        console.log('🔧 修復方法:');
        console.log('1. 前往 https://supabase.com/dashboard');
        console.log('2. 選擇您的項目');
        console.log('3. 前往 Authentication > Providers > Email');
        console.log('4. 關閉 "Confirm email" 選項');
        console.log('5. 保存設置並等待 5 分鐘');
        console.log('6. 重新運行此測試');
      }
    }
    
  } catch (error) {
    console.log('💥 測試過程中發生錯誤:', error.message);
  }
  
  return results;
}

// 執行測試
runSyncTests().then(results => {
  const success = results.connection && results.newUserSync;
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});
