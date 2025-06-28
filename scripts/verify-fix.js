#!/usr/bin/env node

/**
 * 修復驗證腳本
 * 檢查 Supabase 郵件確認是否已禁用，並測試用戶登錄
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔍 修復驗證腳本');
console.log('================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 測試已知用戶登錄
 */
async function testKnownUserLogin() {
  console.log('👤 測試已知用戶登錄...');
  
  const knownUsers = [
    { email: 'dh0031898@gmail.com', password: 'dh003189', note: '最新註冊用戶' },
    { email: 'user01@gmail.com', password: 'user01', note: '測試用戶' }
  ];

  let successCount = 0;
  let results = [];

  for (const user of knownUsers) {
    try {
      console.log(`🔑 測試登錄: ${user.email} (${user.note})`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (error) {
        console.log(`❌ ${user.email} 登錄失敗:`, error.message);
        results.push({
          email: user.email,
          success: false,
          error: error.message,
          note: user.note
        });
      } else {
        console.log(`✅ ${user.email} 登錄成功`);
        console.log(`👤 用戶ID: ${data.user.id}`);
        console.log(`📧 郵箱確認狀態: ${data.user.email_confirmed_at ? '已確認' : '未確認'}`);
        
        successCount++;
        results.push({
          email: user.email,
          success: true,
          userId: data.user.id,
          confirmed: !!data.user.email_confirmed_at,
          note: user.note
        });
        
        // 登出
        await supabase.auth.signOut();
        console.log('🚪 已登出');
      }
    } catch (error) {
      console.error(`💥 ${user.email} 登錄異常:`, error);
      results.push({
        email: user.email,
        success: false,
        error: error.message,
        note: user.note
      });
    }
    
    console.log('');
  }

  return { successCount, totalCount: knownUsers.length, results };
}

/**
 * 測試新用戶註冊
 */
async function testNewUserRegistration() {
  console.log('📝 測試新用戶註冊...');
  
  const testEmail = `fix_test_${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  try {
    console.log('📧 測試郵箱:', testEmail);
    
    // 註冊新用戶
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpError) {
      console.log('❌ 註冊失敗:', signUpError.message);
      return { success: false, step: 'signup', error: signUpError.message };
    }

    console.log('✅ 註冊成功');
    console.log('👤 用戶ID:', signUpData.user?.id);
    console.log('📧 郵箱確認狀態:', signUpData.user?.email_confirmed_at ? '已確認' : '未確認');
    console.log('🔑 Session 狀態:', signUpData.session ? '已創建' : '未創建');

    // 如果有 session，說明郵件確認已禁用
    if (signUpData.session) {
      console.log('🎉 郵件確認已禁用！註冊後立即可用');
      
      // 登出
      await supabase.auth.signOut();
      console.log('🚪 已登出');
      
      return { 
        success: true, 
        emailConfirmationDisabled: true,
        userId: signUpData.user.id,
        email: testEmail
      };
    }

    // 沒有 session，嘗試登錄
    console.log('🔄 沒有 session，嘗試登錄...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.log('❌ 登錄失敗:', signInError.message);
      
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('💡 診斷: 郵件確認仍然啟用，需要手動禁用');
        return { 
          success: false, 
          step: 'login', 
          error: '郵件確認仍然啟用',
          needsManualFix: true,
          userId: signUpData.user.id,
          email: testEmail
        };
      }
      
      return { success: false, step: 'login', error: signInError.message };
    }

    console.log('✅ 登錄成功');
    console.log('👤 登錄用戶ID:', signInData.user.id);
    
    // 登出
    await supabase.auth.signOut();
    console.log('🚪 已登出');

    return { 
      success: true, 
      emailConfirmationDisabled: false,
      userId: signInData.user.id,
      email: testEmail
    };

  } catch (error) {
    console.error('💥 測試異常:', error);
    return { success: false, step: 'exception', error: error.message };
  }
}

/**
 * 顯示修復狀態
 */
function showFixStatus(loginResults, registrationResult) {
  console.log('📊 修復狀態報告');
  console.log('================');
  console.log('');
  
  // 登錄測試結果
  console.log('👤 已知用戶登錄測試:');
  console.log(`📈 成功率: ${loginResults.successCount}/${loginResults.totalCount}`);
  
  loginResults.results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.email} (${result.note})`);
    if (result.success) {
      console.log(`   用戶ID: ${result.userId}`);
      console.log(`   郵箱確認: ${result.confirmed ? '已確認' : '未確認'}`);
    } else {
      console.log(`   錯誤: ${result.error}`);
    }
  });
  
  console.log('');
  
  // 註冊測試結果
  console.log('📝 新用戶註冊測試:');
  if (registrationResult.success) {
    console.log('✅ 註冊測試成功');
    console.log(`📧 測試郵箱: ${registrationResult.email}`);
    console.log(`👤 用戶ID: ${registrationResult.userId}`);
    
    if (registrationResult.emailConfirmationDisabled) {
      console.log('🎉 郵件確認已禁用 - 註冊後立即可用');
    } else {
      console.log('⚠️ 郵件確認仍然啟用 - 但用戶可以登錄');
    }
  } else {
    console.log('❌ 註冊測試失敗');
    console.log(`錯誤階段: ${registrationResult.step}`);
    console.log(`錯誤信息: ${registrationResult.error}`);
    
    if (registrationResult.needsManualFix) {
      console.log('');
      console.log('🔧 需要手動修復:');
      console.log('1. 前往 https://supabase.com/dashboard');
      console.log('2. Authentication → Providers → Email');
      console.log('3. 關閉 "Confirm email" 選項');
      console.log('4. 保存設置並等待 5 分鐘');
    }
  }
  
  console.log('');
  
  // 總體狀態
  const overallSuccess = loginResults.successCount > 0 && registrationResult.success;
  
  if (overallSuccess) {
    console.log('🎉 修復狀態: 成功');
    console.log('✅ 用戶可以正常登錄和註冊');
    console.log('✅ 認證系統工作正常');
    
    if (registrationResult.emailConfirmationDisabled) {
      console.log('✅ 郵件確認已禁用 - 最佳狀態');
    }
  } else {
    console.log('⚠️ 修復狀態: 需要進一步處理');
    
    if (loginResults.successCount === 0) {
      console.log('❌ 現有用戶無法登錄');
    }
    
    if (!registrationResult.success) {
      console.log('❌ 新用戶註冊有問題');
    }
  }
  
  return overallSuccess;
}

/**
 * 主驗證函數
 */
async function runFixVerification() {
  console.log('🚀 開始修復驗證...');
  console.log('');
  
  try {
    // 測試已知用戶登錄
    const loginResults = await testKnownUserLogin();
    
    // 測試新用戶註冊
    const registrationResult = await testNewUserRegistration();
    
    // 顯示修復狀態
    const success = showFixStatus(loginResults, registrationResult);
    
    console.log('');
    console.log('🏁 驗證完成');
    
    return success;
    
  } catch (error) {
    console.error('💥 驗證過程中發生錯誤:', error);
    return false;
  }
}

// 執行驗證
runFixVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 驗證執行失敗:', error);
  process.exit(1);
});
