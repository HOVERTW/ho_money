#!/usr/bin/env node

/**
 * iOS 生產構建準備腳本
 * 檢查並準備 iOS 生產環境構建的所有必要條件
 */

const fs = require('fs');
const path = require('path');

console.log('🍎 iOS 生產構建準備');
console.log('==================');

// 檢查 EAS 配置
function checkEASConfiguration() {
  console.log('\n⚙️ 檢查 EAS 配置...');
  
  if (!fs.existsSync('eas.json')) {
    console.log('❌ 缺少 eas.json 配置文件');
    return false;
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
    
    // 檢查必要的構建配置
    if (!easConfig.build || !easConfig.build.production) {
      console.log('❌ 缺少生產構建配置');
      return false;
    }
    
    const productionConfig = easConfig.build.production;
    
    // 檢查關鍵配置項
    const requiredConfigs = ['autoIncrement', 'env'];
    const missingConfigs = [];
    
    for (const config of requiredConfigs) {
      if (!productionConfig[config]) {
        missingConfigs.push(config);
      }
    }
    
    if (missingConfigs.length > 0) {
      console.log('❌ 生產配置缺少:', missingConfigs);
      return false;
    }
    
    console.log('✅ EAS 配置正確');
    return true;
  } catch (error) {
    console.log('❌ EAS 配置文件格式錯誤:', error.message);
    return false;
  }
}

// 檢查 iOS 特定配置
function checkIOSConfiguration() {
  console.log('\n📱 檢查 iOS 配置...');
  
  if (!fs.existsSync('app.json')) {
    console.log('❌ 缺少 app.json 配置文件');
    return false;
  }
  
  try {
    const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const iosConfig = appConfig.expo?.ios;
    
    if (!iosConfig) {
      console.log('❌ 缺少 iOS 配置');
      return false;
    }
    
    // 檢查必要的 iOS 配置
    const requiredIOSConfigs = [
      'bundleIdentifier',
      'buildNumber',
      'infoPlist'
    ];
    
    const missingConfigs = [];
    for (const config of requiredIOSConfigs) {
      if (!iosConfig[config]) {
        missingConfigs.push(config);
      }
    }
    
    if (missingConfigs.length > 0) {
      console.log('❌ iOS 配置缺少:', missingConfigs);
      return false;
    }
    
    // 檢查 Bundle Identifier
    if (!iosConfig.bundleIdentifier.includes('com.hovertw.fintranzo')) {
      console.log('❌ Bundle Identifier 格式不正確');
      return false;
    }
    
    // 檢查安全配置
    const infoPlist = iosConfig.infoPlist;
    if (!infoPlist.ITSAppUsesNonExemptEncryption === false) {
      console.log('⚠️ 建議設置 ITSAppUsesNonExemptEncryption 為 false');
    }
    
    console.log('✅ iOS 配置正確');
    console.log(`  Bundle ID: ${iosConfig.bundleIdentifier}`);
    console.log(`  Build Number: ${iosConfig.buildNumber}`);
    return true;
  } catch (error) {
    console.log('❌ app.json 配置文件格式錯誤:', error.message);
    return false;
  }
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
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_REDIRECT_URL'
  ];
  
  const missingVars = [];
  const invalidVars = [];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    } else {
      // 檢查變量值是否有效
      const match = envContent.match(new RegExp(`${varName}=(.+)`));
      if (match && match[1]) {
        const value = match[1].trim();
        if (value === '' || value === 'your_value_here') {
          invalidVars.push(varName);
        }
      }
    }
  }
  
  if (missingVars.length > 0) {
    console.log('❌ 缺少環境變量:', missingVars);
    return false;
  }
  
  if (invalidVars.length > 0) {
    console.log('❌ 環境變量值無效:', invalidVars);
    return false;
  }
  
  console.log('✅ 環境變量配置正確');
  return true;
}

// 檢查依賴完整性
function checkDependencies() {
  console.log('\n📦 檢查依賴完整性...');
  
  if (!fs.existsSync('package.json')) {
    console.log('❌ 缺少 package.json');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // 檢查關鍵依賴
    const criticalDeps = [
      'expo',
      'react',
      'react-native',
      '@supabase/supabase-js',
      'react-native-gesture-handler',
      'react-native-safe-area-context',
      'react-native-screens',
      '@react-navigation/native',
      '@react-navigation/bottom-tabs'
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
    
    console.log('✅ 依賴完整性檢查通過');
    return true;
  } catch (error) {
    console.log('❌ package.json 格式錯誤:', error.message);
    return false;
  }
}

// 檢查 iOS 修復功能
function checkIOSFixFeatures() {
  console.log('\n🔧 檢查 iOS 修復功能...');
  
  const requiredFiles = [
    'src/utils/iOSEnvironmentCheck.ts',
    'scripts/ios-crash-fix.js',
    'scripts/test-ios-stability.js'
  ];
  
  const missingFiles = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.log('❌ 缺少 iOS 修復文件:', missingFiles);
    return false;
  }
  
  // 檢查 App.tsx 中的 iOS 錯誤處理
  const appContent = fs.readFileSync('App.tsx', 'utf8');
  if (!appContent.includes('IOSEnvironmentCheck') || !appContent.includes('isRecoverableError')) {
    console.log('❌ App.tsx 缺少 iOS 錯誤處理功能');
    return false;
  }
  
  console.log('✅ iOS 修復功能完整');
  return true;
}

// 生成構建建議
function generateBuildRecommendations(results) {
  console.log('\n📋 iOS 生產構建準備報告');
  console.log('==========================');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(result => result).length;
  const successRate = (passedChecks / totalChecks) * 100;
  
  console.log(`\n📊 準備狀況總覽:`);
  console.log(`  總檢查項目: ${totalChecks}`);
  console.log(`  通過項目: ${passedChecks}`);
  console.log(`  準備度: ${successRate.toFixed(1)}%`);
  
  console.log(`\n📝 詳細結果:`);
  for (const [checkName, result] of Object.entries(results)) {
    const status = result ? '✅ 通過' : '❌ 失敗';
    console.log(`  ${checkName}: ${status}`);
  }
  
  console.log(`\n🎯 構建建議:`);
  if (successRate >= 90) {
    console.log('🟢 優秀 - 可以立即進行 iOS 生產構建');
    console.log('');
    console.log('🚀 建議的構建命令:');
    console.log('  eas build --platform ios --profile production');
    console.log('');
    console.log('📱 構建後步驟:');
    console.log('  1. 在真實 iOS 設備上測試');
    console.log('  2. 檢查所有核心功能');
    console.log('  3. 驗證 Google OAuth 登錄');
    console.log('  4. 測試資產和交易同步');
    console.log('  5. 確認錯誤恢復機制');
  } else if (successRate >= 80) {
    console.log('🟡 良好 - 建議修復失敗項目後進行構建');
  } else {
    console.log('🔴 需要改進 - 必須修復所有失敗項目才能進行生產構建');
  }
  
  return successRate >= 90;
}

// 主函數
function main() {
  console.log('開始 iOS 生產構建準備檢查...\n');
  
  const results = {
    'EAS 配置': checkEASConfiguration(),
    'iOS 配置': checkIOSConfiguration(),
    '環境變量': checkEnvironmentVariables(),
    '依賴完整性': checkDependencies(),
    'iOS 修復功能': checkIOSFixFeatures()
  };
  
  const isReady = generateBuildRecommendations(results);
  
  console.log('\n🎉 iOS 生產構建準備檢查完成！');
  
  return isReady;
}

// 執行腳本
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };
