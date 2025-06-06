/**
 * FinTranzo 認證系統測試腳本
 * 測試 Google & Apple 登錄功能設置
 */

// 載入環境變數
require('dotenv').config();

console.log('🧪 FinTranzo 認證系統測試');
console.log('=' * 50);

// 1. 檢查環境變數
function checkEnvironmentVariables() {
  console.log('\n1️⃣ 檢查環境變數...');
  
  const requiredEnvVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let allPresent = true;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: 已設置`);
    } else {
      console.log(`❌ ${envVar}: 未設置`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// 2. 檢查必要文件
function checkRequiredFiles() {
  console.log('\n2️⃣ 檢查必要文件...');
  
  const fs = require('fs');
  const requiredFiles = [
    'src/services/supabase.ts',
    'src/services/userDataSyncService.ts',
    'src/store/authStore.ts',
    'src/screens/auth/LoginScreen.tsx',
    'database/auth_tables_setup.sql',
    'GOOGLE_APPLE_LOGIN_SETUP.md'
  ];
  
  let allExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} 不存在`);
      allExist = false;
    }
  });
  
  return allExist;
}

// 3. 檢查 package.json 依賴
function checkDependencies() {
  console.log('\n3️⃣ 檢查依賴套件...');
  
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    '@supabase/supabase-js',
    'expo-auth-session',
    'expo-crypto',
    'expo-web-browser'
  ];
  
  let allInstalled = true;
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: 未安裝`);
      allInstalled = false;
    }
  });
  
  return allInstalled;
}

// 4. 檢查 app.json 配置
function checkAppConfig() {
  console.log('\n4️⃣ 檢查 app.json 配置...');
  
  const fs = require('fs');
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  let configValid = true;
  
  // 檢查 scheme
  if (appJson.expo.scheme) {
    console.log(`✅ scheme: ${appJson.expo.scheme}`);
  } else {
    console.log('❌ scheme: 未設置');
    configValid = false;
  }
  
  // 檢查 plugins
  if (appJson.expo.plugins && appJson.expo.plugins.some(p => 
    Array.isArray(p) && p[0] === 'expo-auth-session'
  )) {
    console.log('✅ expo-auth-session plugin: 已配置');
  } else {
    console.log('❌ expo-auth-session plugin: 未配置');
    configValid = false;
  }
  
  return configValid;
}

// 5. 檢查 TypeScript 配置
function checkTypeScriptConfig() {
  console.log('\n5️⃣ 檢查 TypeScript 配置...');
  
  const fs = require('fs');
  
  if (fs.existsSync('tsconfig.json')) {
    console.log('✅ tsconfig.json: 存在');
    return true;
  } else {
    console.log('❌ tsconfig.json: 不存在');
    return false;
  }
}

// 6. 檢查認證服務導出
function checkAuthServiceExports() {
  console.log('\n6️⃣ 檢查認證服務導出...');
  
  const fs = require('fs');
  const supabaseContent = fs.readFileSync('src/services/supabase.ts', 'utf8');
  
  const requiredExports = [
    'export const supabase',
    'export const authService',
    'export const dbService',
    'signInWithGoogle',
    'signInWithApple'
  ];
  
  let allExported = true;
  
  requiredExports.forEach(exportItem => {
    if (supabaseContent.includes(exportItem)) {
      console.log(`✅ ${exportItem}: 已導出`);
    } else {
      console.log(`❌ ${exportItem}: 未找到`);
      allExported = false;
    }
  });
  
  return allExported;
}

// 7. 生成設置報告
function generateSetupReport() {
  console.log('\n📊 設置報告');
  console.log('=' * 30);
  
  const checks = [
    { name: '環境變數', result: checkEnvironmentVariables() },
    { name: '必要文件', result: checkRequiredFiles() },
    { name: '依賴套件', result: checkDependencies() },
    { name: 'App 配置', result: checkAppConfig() },
    { name: 'TypeScript', result: checkTypeScriptConfig() },
    { name: '認證服務', result: checkAuthServiceExports() }
  ];
  
  const passedChecks = checks.filter(check => check.result).length;
  const totalChecks = checks.length;
  
  console.log(`\n✅ 通過檢查: ${passedChecks}/${totalChecks}`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 所有檢查都通過！');
    console.log('📋 接下來的步驟:');
    console.log('1. 在 Supabase Dashboard 中執行 database/auth_tables_setup.sql');
    console.log('2. 配置 Google OAuth (參考 GOOGLE_APPLE_LOGIN_SETUP.md)');
    console.log('3. 配置 Apple OAuth (僅 iOS，參考設置指南)');
    console.log('4. 測試登錄功能');
  } else {
    console.log('\n⚠️ 有些檢查未通過，請修復後再繼續');
    
    const failedChecks = checks.filter(check => !check.result);
    console.log('\n❌ 失敗的檢查:');
    failedChecks.forEach(check => {
      console.log(`   - ${check.name}`);
    });
  }
}

// 執行所有檢查
try {
  generateSetupReport();
} catch (error) {
  console.error('\n❌ 測試過程中發生錯誤:', error.message);
  console.log('\n💡 請檢查文件路徑和權限');
}

console.log('\n🔗 更多信息請參考: GOOGLE_APPLE_LOGIN_SETUP.md');
console.log('📧 如有問題，請檢查 Supabase 和 OAuth 提供商的配置');
