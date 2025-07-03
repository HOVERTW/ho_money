#!/usr/bin/env node

/**
 * iOS 閃退修復腳本
 * 檢測並修復可能導致 iOS 應用閃退的問題
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 iOS 閃退修復腳本');
console.log('==================');

// 檢查項目結構
function checkProjectStructure() {
  console.log('\n📁 檢查項目結構...');
  
  const requiredFiles = [
    'App.tsx',
    'package.json',
    'app.config.js',
    '.env',
    'src/services/appInitializationService.ts',
    'src/utils/iOSEnvironmentCheck.ts'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.log('❌ 缺少必要文件:', missingFiles);
    return false;
  }
  
  console.log('✅ 項目結構完整');
  return true;
}

// 檢查環境變量
function checkEnvironmentVariables() {
  console.log('\n🌍 檢查環境變量...');
  
  if (!fs.existsSync('.env')) {
    console.log('❌ 缺少 .env 文件');
    return false;
  }
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.log('❌ 缺少環境變量:', missingVars);
    return false;
  }
  
  console.log('✅ 環境變量配置正確');
  return true;
}

// 檢查 package.json 依賴
function checkDependencies() {
  console.log('\n📦 檢查依賴...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const criticalDeps = [
    'expo',
    'react',
    'react-native',
    '@supabase/supabase-js',
    'react-native-gesture-handler',
    'react-native-safe-area-context'
  ];
  
  const missingDeps = [];
  
  for (const dep of criticalDeps) {
    if (!dependencies[dep]) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log('❌ 缺少關鍵依賴:', missingDeps);
    return false;
  }
  
  console.log('✅ 關鍵依賴完整');
  return true;
}

// 檢查 TypeScript 配置
function checkTypeScriptConfig() {
  console.log('\n📝 檢查 TypeScript 配置...');
  
  if (!fs.existsSync('tsconfig.json')) {
    console.log('❌ 缺少 tsconfig.json');
    return false;
  }
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    // 檢查關鍵配置
    if (!tsConfig.compilerOptions) {
      console.log('❌ tsconfig.json 缺少 compilerOptions');
      return false;
    }
    
    console.log('✅ TypeScript 配置正確');
    return true;
  } catch (error) {
    console.log('❌ tsconfig.json 格式錯誤:', error.message);
    return false;
  }
}

// 生成修復建議
function generateFixSuggestions(issues) {
  console.log('\n🔧 修復建議:');
  console.log('============');
  
  if (issues.length === 0) {
    console.log('✅ 沒有發現問題，應用應該可以正常運行');
    return;
  }
  
  console.log('發現以下問題需要修復:');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  
  console.log('\n建議的修復步驟:');
  console.log('1. 運行 npm install 確保所有依賴已安裝');
  console.log('2. 運行 npx expo install --check 檢查依賴兼容性');
  console.log('3. 清除緩存: npx expo start --clear');
  console.log('4. 重新構建: eas build --platform ios --profile preview --clear-cache');
}

// 主函數
function main() {
  console.log('開始檢查可能導致 iOS 閃退的問題...\n');
  
  const issues = [];
  
  // 執行各項檢查
  if (!checkProjectStructure()) {
    issues.push('項目結構不完整');
  }
  
  if (!checkEnvironmentVariables()) {
    issues.push('環境變量配置錯誤');
  }
  
  if (!checkDependencies()) {
    issues.push('缺少關鍵依賴');
  }
  
  if (!checkTypeScriptConfig()) {
    issues.push('TypeScript 配置錯誤');
  }
  
  // 生成修復建議
  generateFixSuggestions(issues);
  
  console.log('\n📱 iOS 特定建議:');
  console.log('===============');
  console.log('1. 確保在真實 iOS 設備上測試，而不是模擬器');
  console.log('2. 檢查設備是否已信任開發者證書');
  console.log('3. 確保設備有足夠的存儲空間');
  console.log('4. 檢查 iOS 版本是否支持（最低 iOS 12.0）');
  console.log('5. 嘗試重啟設備後再安裝應用');
  
  console.log('\n🎯 下一步:');
  console.log('========');
  console.log('1. 修復上述問題');
  console.log('2. 重新構建應用');
  console.log('3. 在 iOS 設備上測試');
  
  return issues.length === 0;
}

// 執行腳本
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };
