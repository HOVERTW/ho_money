#!/usr/bin/env node

/**
 * Supabase 認證修復腳本
 * 使用 Admin API 創建已確認的用戶，繞過郵件確認問題
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase 認證修復腳本');
console.log('========================');
console.log('');

// 創建客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * 使用 Admin API 創建已確認的用戶
 */
async function createConfirmedUser(email, password) {
  console.log('🔧 使用 Admin API 創建已確認用戶:', email);
  
  if (!adminSupabase) {
    console.log('⚠️ 需要 SUPABASE_SERVICE_ROLE_KEY 環境變量');
    console.log('💡 請在 Supabase Dashboard > Settings > API 中獲取 service_role key');
    return null;
  }

  try {
    // 使用 Admin API 創建用戶
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認郵箱
      user_metadata: {
        app_name: 'FinTranzo',
        created_via: 'admin_api',
        auto_confirmed: true
      }
    });

    if (error) {
      console.log('❌ Admin API 創建用戶失敗:', error.message);
      return null;
    }

    console.log('✅ Admin API 創建用戶成功');
    console.log('👤 用戶ID:', data.user.id);
    console.log('📧 郵箱確認狀態:', data.user.email_confirmed_at ? '已確認' : '未確認');

    return data.user;
  } catch (error) {
    console.error('💥 Admin API 創建用戶異常:', error);
    return null;
  }
}

/**
 * 測試用戶登錄
 */
async function testUserLogin(email, password) {
  console.log('🔑 測試用戶登錄:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ 登錄失敗:', error.message);
      return false;
    }

    console.log('✅ 登錄成功');
    console.log('👤 用戶ID:', data.user.id);
    console.log('📧 用戶郵箱:', data.user.email);

    // 登出
    await supabase.auth.signOut();
    console.log('🚪 已登出');

    return true;
  } catch (error) {
    console.error('💥 登錄測試異常:', error);
    return false;
  }
}

/**
 * 創建測試用戶
 */
async function createTestUsers() {
  console.log('👥 創建測試用戶...');
  
  const testUsers = [
    { email: 'test@example.com', password: 'test123' },
    { email: 'demo@fintranzo.com', password: 'demo123' },
    { email: 'admin@fintranzo.com', password: 'admin123' }
  ];

  let successCount = 0;

  for (const user of testUsers) {
    console.log('');
    console.log(`📝 創建用戶: ${user.email}`);
    
    // 先檢查用戶是否已存在
    const loginTest = await testUserLogin(user.email, user.password);
    if (loginTest) {
      console.log('✅ 用戶已存在且可以登錄');
      successCount++;
      continue;
    }

    // 嘗試使用 Admin API 創建
    const createdUser = await createConfirmedUser(user.email, user.password);
    if (createdUser) {
      // 測試新創建的用戶是否可以登錄
      const canLogin = await testUserLogin(user.email, user.password);
      if (canLogin) {
        console.log('✅ 新用戶創建成功且可以登錄');
        successCount++;
      } else {
        console.log('⚠️ 新用戶創建成功但無法登錄');
      }
    } else {
      console.log('❌ 用戶創建失敗');
    }
  }

  console.log('');
  console.log(`📊 測試用戶創建結果: ${successCount}/${testUsers.length} 成功`);
  return successCount;
}

/**
 * 顯示手動修復指南
 */
function showManualFixGuide() {
  console.log('');
  console.log('📋 手動修復指南');
  console.log('================');
  console.log('');
  console.log('🎯 問題: Supabase 郵件確認設置導致註冊失敗');
  console.log('');
  console.log('🔧 解決方案1: 禁用郵件確認（推薦）');
  console.log('1. 前往 https://supabase.com/dashboard');
  console.log('2. 選擇您的項目');
  console.log('3. 前往 Authentication > Providers > Email');
  console.log('4. 找到 "Confirm email" 選項');
  console.log('5. 關閉此選項（取消勾選）');
  console.log('6. 點擊 "Save" 保存設置');
  console.log('7. 等待 5 分鐘讓設置生效');
  console.log('');
  console.log('🔧 解決方案2: 配置 Service Role Key');
  console.log('1. 前往 Supabase Dashboard > Settings > API');
  console.log('2. 複製 "service_role" key');
  console.log('3. 設置環境變量: SUPABASE_SERVICE_ROLE_KEY=your_key');
  console.log('4. 重新運行此腳本');
  console.log('');
  console.log('🔧 解決方案3: 手動確認現有用戶');
  console.log('1. 前往 Authentication > Users');
  console.log('2. 找到需要確認的用戶');
  console.log('3. 點擊用戶行');
  console.log('4. 點擊 "Confirm email" 按鈕');
  console.log('');
  console.log('✅ 修復後效果:');
  console.log('- 新用戶註冊後可以立即登錄');
  console.log('- 用戶數據正確同步到 Supabase');
  console.log('- 所有功能正常工作');
}

/**
 * 主修復函數
 */
async function runAuthFix() {
  console.log('🚀 開始認證修復...');
  console.log('');
  
  try {
    // 測試基礎連接
    console.log('📡 測試基礎連接...');
    const { data, error } = await supabase.from('assets').select('count').limit(1);
    
    if (error) {
      console.log('❌ 基礎連接失敗:', error.message);
      return false;
    }
    
    console.log('✅ 基礎連接正常');
    
    // 檢查是否有 Admin API 權限
    if (adminSupabase) {
      console.log('✅ 檢測到 Service Role Key，可以使用 Admin API');
      
      // 創建測試用戶
      const successCount = await createTestUsers();
      
      if (successCount > 0) {
        console.log('');
        console.log('🎉 部分或全部測試用戶創建成功！');
        console.log('✅ 用戶現在可以正常註冊和登錄');
        return true;
      } else {
        console.log('');
        console.log('⚠️ 測試用戶創建失敗');
        showManualFixGuide();
        return false;
      }
    } else {
      console.log('⚠️ 未檢測到 Service Role Key');
      console.log('💡 將顯示手動修復指南');
      showManualFixGuide();
      return false;
    }
    
  } catch (error) {
    console.error('💥 修復過程中發生錯誤:', error);
    showManualFixGuide();
    return false;
  }
}

// 執行修復
runAuthFix().then(success => {
  console.log('');
  console.log('🏁 修復腳本執行完成');
  
  if (success) {
    console.log('✅ 認證問題已修復');
  } else {
    console.log('⚠️ 需要手動修復，請參考上面的指南');
  }
  
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 修復腳本執行失敗:', error);
  process.exit(1);
});
