#!/usr/bin/env node

/**
 * 用戶確認腳本
 * 快速確認 Supabase 中的用戶郵箱
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 用戶確認腳本');
console.log('================');

// 檢查環境變量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變量');
  console.log('請確保 .env 文件中包含:');
  console.log('- EXPO_PUBLIC_SUPABASE_URL');
  console.log('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY (可選，用於自動確認)');
  process.exit(1);
}

// 創建客戶端
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * 列出所有未確認的用戶
 */
async function listUnconfirmedUsers() {
  console.log('📋 查找未確認的用戶...');
  
  try {
    if (!adminSupabase) {
      console.log('⚠️ 需要 SUPABASE_SERVICE_ROLE_KEY 來查看用戶列表');
      return [];
    }

    const { data: users, error } = await adminSupabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ 獲取用戶列表失敗:', error.message);
      return [];
    }

    const unconfirmedUsers = users.users.filter(user => !user.email_confirmed_at);
    
    console.log(`📊 找到 ${unconfirmedUsers.length} 個未確認用戶:`);
    unconfirmedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (創建於: ${new Date(user.created_at).toLocaleString()})`);
    });
    
    return unconfirmedUsers;
  } catch (error) {
    console.error('💥 列出用戶錯誤:', error);
    return [];
  }
}

/**
 * 確認指定用戶
 */
async function confirmUser(email) {
  console.log(`🔧 確認用戶: ${email}`);
  
  try {
    if (!adminSupabase) {
      console.log('⚠️ 需要 SUPABASE_SERVICE_ROLE_KEY 來自動確認用戶');
      showManualConfirmationGuide(email);
      return false;
    }

    // 首先找到用戶
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ 獲取用戶列表失敗:', listError.message);
      return false;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      return false;
    }

    if (user.email_confirmed_at) {
      console.log(`✅ 用戶 ${email} 已經確認過了`);
      return true;
    }

    // 確認用戶
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (error) {
      console.error('❌ 確認用戶失敗:', error.message);
      showManualConfirmationGuide(email);
      return false;
    }

    console.log(`✅ 用戶 ${email} 已成功確認！`);
    console.log('🎉 用戶現在可以正常登錄了');
    
    return true;
  } catch (error) {
    console.error('💥 確認用戶錯誤:', error);
    showManualConfirmationGuide(email);
    return false;
  }
}

/**
 * 顯示手動確認指南
 */
function showManualConfirmationGuide(email) {
  console.log('');
  console.log('📋 手動確認指南:');
  console.log('================');
  console.log('');
  console.log('🔧 方法1: 使用 Supabase Dashboard');
  console.log('1. 前往 https://supabase.com/dashboard');
  console.log('2. 選擇您的項目');
  console.log('3. 前往 Authentication > Users');
  console.log(`4. 找到用戶: ${email}`);
  console.log('5. 點擊用戶行');
  console.log('6. 點擊 "Confirm email" 按鈕');
  console.log('');
  console.log('🔧 方法2: 使用 SQL 編輯器');
  console.log('1. 前往 Supabase Dashboard > SQL Editor');
  console.log('2. 執行以下 SQL 命令:');
  console.log(`   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`);
  console.log('');
  console.log('✅ 確認後用戶就可以正常登錄了！');
}

/**
 * 測試用戶登錄
 */
async function testUserLogin(email, password = 'test123') {
  console.log(`🧪 測試用戶登錄: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`❌ 登錄失敗: ${error.message}`);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 這可能表示用戶需要確認郵箱或密碼錯誤');
      }
      
      return false;
    } else {
      console.log(`✅ 登錄成功！用戶 ${email} 可以正常使用`);
      
      // 登出
      await supabase.auth.signOut();
      
      return true;
    }
  } catch (error) {
    console.error('💥 測試登錄錯誤:', error);
    return false;
  }
}

/**
 * 主函數
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  console.log('🚀 開始執行用戶確認腳本...');
  console.log('');

  switch (command) {
    case 'list':
      await listUnconfirmedUsers();
      break;
      
    case 'confirm':
      if (!email) {
        console.error('❌ 請提供要確認的用戶郵箱');
        console.log('用法: node scripts/confirm-user.js confirm user@example.com');
        process.exit(1);
      }
      await confirmUser(email);
      break;
      
    case 'test':
      if (!email) {
        console.error('❌ 請提供要測試的用戶郵箱');
        console.log('用法: node scripts/confirm-user.js test user@example.com [password]');
        process.exit(1);
      }
      const password = args[2] || 'test123';
      await testUserLogin(email, password);
      break;
      
    case 'guide':
      if (!email) {
        console.error('❌ 請提供用戶郵箱');
        console.log('用法: node scripts/confirm-user.js guide user@example.com');
        process.exit(1);
      }
      showManualConfirmationGuide(email);
      break;
      
    default:
      console.log('📖 用戶確認腳本使用指南:');
      console.log('');
      console.log('可用命令:');
      console.log('  list                     - 列出所有未確認的用戶');
      console.log('  confirm <email>          - 確認指定用戶');
      console.log('  test <email> [password]  - 測試用戶登錄');
      console.log('  guide <email>            - 顯示手動確認指南');
      console.log('');
      console.log('範例:');
      console.log('  node scripts/confirm-user.js list');
      console.log('  node scripts/confirm-user.js confirm dh0031898@gmail.com');
      console.log('  node scripts/confirm-user.js test dh0031898@gmail.com password123');
      console.log('  node scripts/confirm-user.js guide dh0031898@gmail.com');
      break;
  }
  
  console.log('');
  console.log('🏁 腳本執行完成');
}

// 執行主函數
main().catch(error => {
  console.error('💥 腳本執行錯誤:', error);
  process.exit(1);
});
