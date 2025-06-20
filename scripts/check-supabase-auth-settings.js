#!/usr/bin/env node

/**
 * Supabase 認證設置檢查腳本
 * 檢查和診斷 Supabase 認證配置
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔍 Supabase 認證設置檢查');
console.log('========================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 檢查基礎連接
 */
async function checkConnection() {
  console.log('📡 檢查基礎連接...');
  
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
 * 檢查認證配置
 */
async function checkAuthConfig() {
  console.log('');
  console.log('🔐 檢查認證配置...');
  
  try {
    // 嘗試獲取當前會話
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️ 獲取會話時出錯:', error.message);
    } else {
      console.log('✅ 認證服務可用');
      console.log('📊 當前會話狀態:', session ? '已登錄' : '未登錄');
    }
    
    return true;
  } catch (error) {
    console.log('❌ 認證配置檢查失敗:', error.message);
    return false;
  }
}

/**
 * 測試註冊功能
 */
async function testRegistration() {
  console.log('');
  console.log('📝 測試註冊功能...');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  try {
    console.log('📧 測試郵箱:', testEmail);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (error) {
      console.log('❌ 註冊測試失敗:', error.message);
      
      // 分析錯誤類型
      if (error.message.includes('confirmation email')) {
        console.log('💡 診斷: 郵件確認功能有問題');
        console.log('🔧 建議: 在 Supabase Dashboard 中禁用郵件確認');
        return { success: false, issue: 'email_confirmation' };
      } else if (error.message.includes('SMTP')) {
        console.log('💡 診斷: SMTP 配置有問題');
        console.log('🔧 建議: 配置 SMTP 設置或禁用郵件確認');
        return { success: false, issue: 'smtp_config' };
      } else {
        console.log('💡 診斷: 其他註冊問題');
        return { success: false, issue: 'other' };
      }
    } else {
      console.log('✅ 註冊測試成功');
      console.log('👤 用戶ID:', data.user?.id);
      console.log('📧 郵箱確認狀態:', data.user?.email_confirmed_at ? '已確認' : '未確認');
      console.log('✅ Session 存在:', !!data.session);
      
      return { 
        success: true, 
        needsConfirmation: !data.user?.email_confirmed_at,
        hasSession: !!data.session,
        email: testEmail,
        password: testPassword
      };
    }
  } catch (error) {
    console.log('❌ 註冊測試異常:', error.message);
    return { success: false, issue: 'exception' };
  }
}

/**
 * 測試登錄功能
 */
async function testLogin(email, password) {
  console.log('');
  console.log('🔑 測試登錄功能...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ 登錄測試失敗:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 診斷: 可能需要郵箱確認');
        return { success: false, issue: 'needs_confirmation' };
      } else {
        console.log('💡 診斷: 其他登錄問題');
        return { success: false, issue: 'other' };
      }
    } else {
      console.log('✅ 登錄測試成功');
      console.log('👤 用戶ID:', data.user.id);
      
      // 登出
      await supabase.auth.signOut();
      console.log('🚪 已登出');
      
      return { success: true };
    }
  } catch (error) {
    console.log('❌ 登錄測試異常:', error.message);
    return { success: false, issue: 'exception' };
  }
}

/**
 * 顯示修復建議
 */
function showFixRecommendations(issues) {
  console.log('');
  console.log('🔧 修復建議');
  console.log('============');
  console.log('');
  
  if (issues.includes('email_confirmation') || issues.includes('smtp_config')) {
    console.log('🎯 主要問題: 郵件確認系統');
    console.log('');
    console.log('💡 推薦解決方案: 禁用郵件確認');
    console.log('1. 前往 https://supabase.com/dashboard');
    console.log('2. 選擇您的項目');
    console.log('3. 前往 Authentication > Settings');
    console.log('4. 找到 "Enable email confirmations"');
    console.log('5. 關閉此選項');
    console.log('6. 點擊 "Save" 保存');
    console.log('');
    console.log('✅ 效果: 用戶註冊後可以直接登錄');
  }
  
  if (issues.includes('needs_confirmation')) {
    console.log('🎯 問題: 現有用戶需要確認');
    console.log('');
    console.log('💡 解決方案: 手動確認用戶');
    console.log('1. 前往 Authentication > Users');
    console.log('2. 找到需要確認的用戶');
    console.log('3. 點擊 "Confirm email"');
    console.log('');
    console.log('或使用 SQL:');
    console.log('UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;');
  }
  
  console.log('');
  console.log('🧪 驗證修復:');
  console.log('node scripts/check-supabase-auth-settings.js');
}

/**
 * 主檢查函數
 */
async function runAuthCheck() {
  console.log('🚀 開始認證設置檢查...');
  console.log('');
  
  const issues = [];
  
  try {
    // 檢查基礎連接
    const connectionOk = await checkConnection();
    if (!connectionOk) {
      console.log('');
      console.log('❌ 基礎連接失敗，停止檢查');
      return;
    }
    
    // 檢查認證配置
    const authConfigOk = await checkAuthConfig();
    if (!authConfigOk) {
      issues.push('auth_config');
    }
    
    // 測試註冊功能
    const registrationResult = await testRegistration();
    if (!registrationResult.success) {
      issues.push(registrationResult.issue);
    }
    
    // 如果註冊成功，測試登錄
    if (registrationResult.success) {
      const loginResult = await testLogin(registrationResult.email, registrationResult.password);
      if (!loginResult.success) {
        issues.push(loginResult.issue);
      }
    }
    
  } catch (error) {
    console.log('💥 檢查過程中發生錯誤:', error.message);
    issues.push('exception');
  }
  
  // 顯示結果
  console.log('');
  console.log('📊 檢查結果');
  console.log('============');
  console.log('');
  
  if (issues.length === 0) {
    console.log('🎉 所有檢查通過！認證系統配置正確');
    console.log('✅ 用戶可以正常註冊和登錄');
  } else {
    console.log('⚠️ 發現以下問題:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    
    showFixRecommendations(issues);
  }
  
  console.log('');
  console.log('🏁 檢查完成');
  
  return issues.length === 0;
}

// 執行檢查
runAuthCheck().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 檢查執行失敗:', error);
  process.exit(1);
});
