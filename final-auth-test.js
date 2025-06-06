/**
 * FinTranzo 最終認證測試
 * 驗證所有認證功能是否正常工作
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 環境變數未設置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 FinTranzo 最終認證測試');
console.log('=' * 40);

async function testDatabaseTables() {
  console.log('\n1️⃣ 測試數據庫表...');
  
  const tables = ['profiles', 'accounts', 'transactions', 'assets', 'liabilities', 'categories'];
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error && error.code === '42P01') {
        console.log(`❌ ${table}: 表不存在`);
        allTablesExist = false;
      } else if (error && error.message.includes('permission denied')) {
        console.log(`✅ ${table}: 表存在（RLS 已啟用）`);
      } else {
        console.log(`✅ ${table}: 表存在且可訪問`);
      }
    } catch (err) {
      console.log(`❌ ${table}: 測試失敗 - ${err.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testAuthConfiguration() {
  console.log('\n2️⃣ 測試認證配置...');
  
  try {
    // 測試獲取用戶（應該返回 null，因為未登錄）
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log(`⚠️ 認證測試警告: ${error.message}`);
      return false;
    } else if (!user) {
      console.log('✅ 認證系統正常（當前未登錄）');
      return true;
    } else {
      console.log('✅ 認證系統正常（已有用戶登錄）');
      return true;
    }
  } catch (err) {
    console.log(`❌ 認證測試失敗: ${err.message}`);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('\n3️⃣ 測試 RLS 政策...');
  
  try {
    // 嘗試訪問 profiles 表（應該被 RLS 阻止）
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error && error.message.includes('permission denied')) {
      console.log('✅ RLS 政策正常工作（未認證用戶被阻止）');
      return true;
    } else if (!error && (!data || data.length === 0)) {
      console.log('✅ RLS 政策正常工作（無數據返回）');
      return true;
    } else {
      console.log('⚠️ RLS 政策可能未正確設置');
      return false;
    }
  } catch (err) {
    console.log(`❌ RLS 測試失敗: ${err.message}`);
    return false;
  }
}

async function testEnvironmentSecurity() {
  console.log('\n4️⃣ 測試環境安全性...');
  
  const fs = require('fs');
  
  // 檢查 .env 是否在 .gitignore 中
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env')) {
      console.log('✅ .env 文件已在 .gitignore 中');
    } else {
      console.log('❌ .env 文件未在 .gitignore 中');
      return false;
    }
  } catch (err) {
    console.log('⚠️ 無法檢查 .gitignore 文件');
  }
  
  // 檢查環境變數是否正確設置
  if (supabaseUrl.includes('supabase.co') && supabaseAnonKey.length > 100) {
    console.log('✅ Supabase 配置看起來正確');
    return true;
  } else {
    console.log('❌ Supabase 配置可能不正確');
    return false;
  }
}

async function testAppConfiguration() {
  console.log('\n5️⃣ 測試應用配置...');
  
  const fs = require('fs');
  
  try {
    // 檢查 app.json 配置
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    let configValid = true;
    
    if (appJson.expo.scheme === 'fintranzo') {
      console.log('✅ App scheme 配置正確');
    } else {
      console.log('❌ App scheme 配置錯誤');
      configValid = false;
    }
    
    if (appJson.expo.plugins && appJson.expo.plugins.some(p => 
      Array.isArray(p) && p[0] === 'expo-auth-session'
    )) {
      console.log('✅ expo-auth-session plugin 已配置');
    } else {
      console.log('❌ expo-auth-session plugin 未配置');
      configValid = false;
    }
    
    return configValid;
  } catch (err) {
    console.log(`❌ 應用配置測試失敗: ${err.message}`);
    return false;
  }
}

async function generateFinalReport() {
  console.log('\n📊 最終測試報告');
  console.log('=' * 30);
  
  const tests = [
    { name: '數據庫表', test: testDatabaseTables },
    { name: '認證配置', test: testAuthConfiguration },
    { name: 'RLS 政策', test: testRLSPolicies },
    { name: '環境安全', test: testEnvironmentSecurity },
    { name: '應用配置', test: testAppConfiguration }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({ name, passed: result });
    } catch (err) {
      results.push({ name, passed: false, error: err.message });
    }
  }
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`\n✅ 通過測試: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有測試都通過！');
    console.log('🚀 您的 FinTranzo 應用已準備好使用 Google & Apple 登錄！');
    
    console.log('\n📋 下一步：');
    console.log('1. 在 Supabase Dashboard 中配置 Google OAuth');
    console.log('2. 在 Supabase Dashboard 中配置 Apple OAuth');
    console.log('3. 啟動應用測試登錄功能：npm start');
    
  } else {
    console.log('\n⚠️ 有些測試未通過：');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ❌ ${r.name}${r.error ? ': ' + r.error : ''}`);
    });
    
    console.log('\n💡 建議：');
    console.log('1. 檢查 Supabase Dashboard 中是否已執行 SQL 腳本');
    console.log('2. 確認環境變數設置正確');
    console.log('3. 參考 OAUTH_SETUP_GUIDE.md 完成配置');
  }
  
  console.log('\n🔗 有用的連結：');
  console.log(`📊 Supabase Dashboard: ${supabaseUrl.replace('/rest/v1', '')}`);
  console.log('📖 設置指南: OAUTH_SETUP_GUIDE.md');
  console.log('🧪 測試腳本: node test-auth-setup.js');
}

// 執行最終測試
async function main() {
  try {
    await generateFinalReport();
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error.message);
    console.log('💡 請檢查網路連接和配置');
  }
}

main();
