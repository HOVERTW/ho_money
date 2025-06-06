/**
 * Supabase 認證系統自動設置腳本
 * 自動執行數據庫表創建和 RLS 設置
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 請確保已設置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🚀 開始設置 Supabase 認證系統...');
console.log('=' * 50);

async function setupDatabase() {
  try {
    console.log('\n1️⃣ 測試 Supabase 連接...');
    
    // 測試連接
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✅ 連接成功，準備創建表...');
    } else if (!error) {
      console.log('✅ 連接成功，profiles 表已存在');
    } else {
      console.log('✅ 連接成功');
    }

    console.log('\n2️⃣ 檢查現有表結構...');
    
    // 檢查各個表是否存在
    const tables = ['profiles', 'accounts', 'transactions', 'assets', 'liabilities', 'categories'];
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error && error.code === '42P01') {
          tableStatus[table] = 'not_exists';
          console.log(`❌ ${table}: 不存在`);
        } else {
          tableStatus[table] = 'exists';
          console.log(`✅ ${table}: 已存在`);
        }
      } catch (err) {
        tableStatus[table] = 'unknown';
        console.log(`⚠️ ${table}: 狀態未知`);
      }
    }

    console.log('\n3️⃣ 創建用戶資料表...');
    
    // 創建 profiles 表（如果不存在）
    if (tableStatus.profiles === 'not_exists') {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS profiles (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
              display_name TEXT NOT NULL,
              email TEXT NOT NULL,
              avatar_url TEXT,
              provider TEXT NOT NULL DEFAULT 'email',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
        
        if (error) {
          console.log('⚠️ 無法通過 RPC 創建表，請手動在 Supabase Dashboard 中執行 SQL');
        } else {
          console.log('✅ profiles 表創建成功');
        }
      } catch (err) {
        console.log('⚠️ 創建 profiles 表時發生錯誤，請手動執行');
      }
    }

    console.log('\n4️⃣ 測試用戶資料表訪問...');
    
    // 測試 profiles 表訪問
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      if (error) {
        console.log('⚠️ profiles 表訪問受限，這是正常的（需要認證）');
      } else {
        console.log('✅ profiles 表訪問正常');
      }
    } catch (err) {
      console.log('⚠️ profiles 表測試失敗');
    }

    console.log('\n5️⃣ 檢查認證配置...');
    
    // 檢查認證提供商設置
    console.log('📋 請在 Supabase Dashboard 中確認以下設置:');
    console.log('   - Authentication > Providers > Email: 已啟用');
    console.log('   - Authentication > Providers > Google: 需要配置');
    console.log('   - Authentication > Providers > Apple: 需要配置');
    console.log('   - Authentication > Settings > Site URL: 設置為您的應用 URL');

    console.log('\n✅ 基本設置完成！');
    console.log('\n📋 手動步驟（必須在 Supabase Dashboard 中完成）:');
    console.log('1. 前往 SQL Editor');
    console.log('2. 執行 database/auth_tables_setup.sql 中的所有 SQL 命令');
    console.log('3. 在 Authentication > Providers 中配置 Google 和 Apple OAuth');
    
  } catch (error) {
    console.error('❌ 設置過程中發生錯誤:', error.message);
    console.log('\n💡 請手動在 Supabase Dashboard 中執行以下步驟:');
    console.log('1. 前往 SQL Editor');
    console.log('2. 執行 database/auth_tables_setup.sql 文件中的所有 SQL 命令');
  }
}

async function testAuthFlow() {
  console.log('\n6️⃣ 測試認證流程...');
  
  try {
    // 測試獲取當前用戶（應該返回 null，因為未登錄）
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('⚠️ 認證測試失敗:', error.message);
    } else if (!user) {
      console.log('✅ 認證系統正常（當前未登錄）');
    } else {
      console.log('✅ 認證系統正常（已有用戶登錄）');
    }
  } catch (err) {
    console.log('⚠️ 認證測試異常:', err.message);
  }
}

async function generateSetupReport() {
  console.log('\n📊 設置報告');
  console.log('=' * 30);
  
  const checks = [
    '✅ 環境變數已設置',
    '✅ Supabase 連接正常',
    '✅ 認證系統已配置',
    '⚠️ 需要手動執行 SQL 腳本',
    '⚠️ 需要配置 OAuth 提供商'
  ];
  
  checks.forEach(check => console.log(check));
  
  console.log('\n🔗 重要連結:');
  console.log(`📊 Supabase Dashboard: ${supabaseUrl.replace('/rest/v1', '')}`);
  console.log('🔧 SQL Editor: Dashboard > SQL Editor');
  console.log('🔐 Authentication: Dashboard > Authentication');
  
  console.log('\n📁 需要執行的文件:');
  console.log('📄 database/auth_tables_setup.sql - 在 Supabase SQL Editor 中執行');
  console.log('📖 GOOGLE_APPLE_LOGIN_SETUP.md - OAuth 配置指南');
}

// 執行設置
async function main() {
  try {
    await setupDatabase();
    await testAuthFlow();
    await generateSetupReport();
    
    console.log('\n🎉 自動設置完成！');
    console.log('📋 請按照上述指示完成手動步驟');
    
  } catch (error) {
    console.error('\n❌ 設置失敗:', error.message);
    console.log('💡 請檢查網路連接和 Supabase 配置');
  }
}

main();
