#!/usr/bin/env node

/**
 * Docker 環境認證測試
 * 專門測試註冊和登錄功能
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🐳 Docker 環境認證測試');
console.log('======================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 測試基礎連接
 */
async function testConnection() {
  console.log('📡 測試1: 基礎連接');
  console.log('------------------');
  
  try {
    // 測試基礎連接
    const { data, error } = await supabase.from('assets').select('count').limit(1);
    
    if (error) {
      console.log('❌ 連接失敗:', error.message);
      return false;
    } else {
      console.log('✅ Supabase 連接成功');
      return true;
    }
  } catch (error) {
    console.log('❌ 連接異常:', error.message);
    return false;
  }
}

/**
 * 測試現有用戶登錄
 */
async function testExistingUserLogin() {
  console.log('');
  console.log('👤 測試2: 現有用戶登錄');
  console.log('----------------------');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (error) {
      console.log('❌ 登錄失敗:', error.message);
      return false;
    } else {
      console.log('✅ 登錄成功');
      console.log('👤 用戶ID:', data.user.id);
      console.log('📧 用戶郵箱:', data.user.email);
      console.log('✅ Session 存在:', !!data.session);
      
      // 登出
      await supabase.auth.signOut();
      console.log('🚪 已登出');
      
      return true;
    }
  } catch (error) {
    console.log('❌ 登錄異常:', error.message);
    return false;
  }
}

/**
 * 測試新用戶註冊
 */
async function testNewUserRegistration() {
  console.log('');
  console.log('📝 測試3: 新用戶註冊');
  console.log('--------------------');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  try {
    console.log('📧 測試郵箱:', testEmail);
    console.log('🔐 測試密碼:', testPassword);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (error) {
      console.log('❌ 註冊失敗:', error.message);
      return false;
    } else {
      console.log('✅ 註冊成功');
      console.log('👤 用戶ID:', data.user?.id);
      console.log('📧 用戶郵箱:', data.user?.email);
      console.log('✅ Session 存在:', !!data.session);
      console.log('📧 郵箱確認狀態:', data.user?.email_confirmed_at ? '已確認' : '未確認');
      
      // 如果有 session，登出
      if (data.session) {
        await supabase.auth.signOut();
        console.log('🚪 已登出');
      }
      
      return {
        success: true,
        needsConfirmation: !data.user?.email_confirmed_at,
        email: testEmail,
        password: testPassword
      };
    }
  } catch (error) {
    console.log('❌ 註冊異常:', error.message);
    return false;
  }
}

/**
 * 測試註冊後登錄
 */
async function testRegistrationLogin(email, password) {
  console.log('');
  console.log('🔄 測試4: 註冊後登錄');
  console.log('--------------------');
  
  try {
    console.log('📧 嘗試登錄:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ 登錄失敗:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 可能原因: 用戶需要郵箱確認');
        return { success: false, needsConfirmation: true };
      }
      
      return { success: false, needsConfirmation: false };
    } else {
      console.log('✅ 登錄成功');
      console.log('👤 用戶ID:', data.user.id);
      console.log('📧 用戶郵箱:', data.user.email);
      
      // 登出
      await supabase.auth.signOut();
      console.log('🚪 已登出');
      
      return { success: true, needsConfirmation: false };
    }
  } catch (error) {
    console.log('❌ 登錄異常:', error.message);
    return { success: false, needsConfirmation: false };
  }
}

/**
 * 顯示修復建議
 */
function showFixSuggestions() {
  console.log('');
  console.log('🔧 修復建議');
  console.log('============');
  console.log('');
  console.log('如果註冊成功但登錄失敗，請執行以下步驟:');
  console.log('');
  console.log('方法1: 使用 Supabase Dashboard');
  console.log('1. 前往 https://supabase.com/dashboard');
  console.log('2. 選擇您的項目');
  console.log('3. 前往 Authentication > Users');
  console.log('4. 找到新註冊的用戶');
  console.log('5. 點擊 "Confirm email" 按鈕');
  console.log('');
  console.log('方法2: 禁用郵件確認');
  console.log('1. 前往 Authentication > Settings');
  console.log('2. 關閉 "Enable email confirmations"');
  console.log('3. 保存設置');
  console.log('');
  console.log('方法3: 使用 SQL 命令');
  console.log('1. 前往 SQL Editor');
  console.log('2. 執行: UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;');
}

/**
 * 主測試函數
 */
async function runAuthTests() {
  console.log('🚀 開始認證測試...');
  console.log('');
  
  const results = {
    connection: false,
    existingLogin: false,
    registration: false,
    registrationLogin: false
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
    results.existingLogin = await testExistingUserLogin();
    
    // 測試3: 新用戶註冊
    const registrationResult = await testNewUserRegistration();
    results.registration = !!registrationResult;
    
    // 測試4: 註冊後登錄
    if (registrationResult && registrationResult.success) {
      const loginResult = await testRegistrationLogin(
        registrationResult.email, 
        registrationResult.password
      );
      results.registrationLogin = loginResult.success;
      
      if (!loginResult.success && loginResult.needsConfirmation) {
        console.log('');
        console.log('⚠️ 註冊成功但需要郵箱確認才能登錄');
        showFixSuggestions();
      }
    }
    
  } catch (error) {
    console.log('💥 測試過程中發生錯誤:', error.message);
  }
  
  // 顯示測試結果
  console.log('');
  console.log('📊 測試結果總結');
  console.log('================');
  console.log('');
  console.log('📡 基礎連接:', results.connection ? '✅ 通過' : '❌ 失敗');
  console.log('👤 現有用戶登錄:', results.existingLogin ? '✅ 通過' : '❌ 失敗');
  console.log('📝 新用戶註冊:', results.registration ? '✅ 通過' : '❌ 失敗');
  console.log('🔄 註冊後登錄:', results.registrationLogin ? '✅ 通過' : '❌ 失敗');
  console.log('');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`📈 總體結果: ${passedTests}/${totalTests} 測試通過`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有測試通過！認證系統工作正常');
    process.exit(0);
  } else {
    console.log('⚠️ 部分測試失敗，需要修復');
    
    if (!results.registrationLogin && results.registration) {
      console.log('');
      console.log('💡 主要問題: 註冊成功但無法登錄');
      console.log('   這通常是因為需要郵箱確認');
      console.log('   請參考上面的修復建議');
    }
    
    process.exit(1);
  }
}

// 執行測試
runAuthTests().catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});
