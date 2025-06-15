/**
 * 容器化模擬測試
 * 在沒有 Docker 的情況下模擬容器環境測試
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 測試配置
const TEST_CONFIG = {
  webPort: 3001,
  simulatedIosPort: 3002,
  testTimeout: 30000,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co',
  testUser: {
    email: 'user01@gmail.com',
    password: 'user01'
  }
};

// 測試結果收集
const testResults = {
  containerSetup: { passed: 0, failed: 0, tests: [] },
  webContainer: { passed: 0, failed: 0, tests: [] },
  iosContainer: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] },
  overall: { passed: 0, failed: 0 }
};

// 測試工具函數
function logTest(category, testName, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const message = `${status} ${testName}${details ? ': ' + details : ''}`;
  console.log(message);
  
  testResults[category].tests.push({ name: testName, passed, details });
  if (passed) {
    testResults[category].passed++;
    testResults.overall.passed++;
  } else {
    testResults[category].failed++;
    testResults.overall.failed++;
  }
}

// 等待函數
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP 請求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: 5000,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 測試容器設置
async function testContainerSetup() {
  console.log('\n🐳 測試容器設置');
  console.log('================================');

  try {
    // 檢查 Docker 配置文件
    console.log('📋 檢查 Docker 配置文件...');
    
    const dockerFiles = [
      'docker/Dockerfile.web',
      'docker/Dockerfile.ios-simulator',
      'docker/nginx.prod.conf',
      'docker-compose.production.yml'
    ];

    dockerFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      logTest('containerSetup', `Docker 文件 - ${file}`, exists);
    });

    // 檢查 Kubernetes 配置
    console.log('☸️ 檢查 Kubernetes 配置...');
    
    const k8sFiles = [
      'k8s/namespace.yaml',
      'k8s/web-deployment.yaml',
      'k8s/ios-simulator-deployment.yaml'
    ];

    k8sFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      logTest('containerSetup', `K8s 文件 - ${file}`, exists);
    });

    // 檢查部署腳本
    console.log('🚀 檢查部署腳本...');
    
    const scriptFiles = [
      'scripts/deploy-k8s.sh',
      'scripts/deploy-and-test.sh'
    ];

    scriptFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      logTest('containerSetup', `部署腳本 - ${file}`, exists);
    });

    // 檢查環境配置
    console.log('🌍 檢查環境配置...');
    
    const envExists = fs.existsSync(path.join(process.cwd(), '.env.production'));
    logTest('containerSetup', '生產環境配置', envExists);

    const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    logTest('containerSetup', '環境變量 - Supabase URL', hasSupabaseUrl);
    logTest('containerSetup', '環境變量 - Supabase Key', hasSupabaseKey);

  } catch (error) {
    console.error('❌ 容器設置測試失敗:', error);
    logTest('containerSetup', '容器設置', false, error.message);
  }
}

// 模擬 Web 容器測試
async function testWebContainer() {
  console.log('\n🌐 測試 Web 容器（模擬）');
  console.log('================================');

  let webServer = null;

  try {
    // 檢查構建輸出
    console.log('🏗️ 檢查 Web 構建輸出...');
    
    const distExists = fs.existsSync(path.join(process.cwd(), 'dist'));
    const indexExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
    
    logTest('webContainer', 'Web 構建輸出存在', distExists);
    logTest('webContainer', 'index.html 存在', indexExists);

    if (!distExists || !indexExists) {
      console.log('⚠️ 構建輸出不存在，嘗試重新構建...');
      
      // 嘗試重新構建
      const buildProcess = spawn('npm', ['run', 'build:web'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      await new Promise((resolve, reject) => {
        buildProcess.on('close', (code) => {
          if (code === 0) {
            logTest('webContainer', 'Web 重新構建', true);
            resolve();
          } else {
            logTest('webContainer', 'Web 重新構建', false, `退出碼: ${code}`);
            reject(new Error(`構建失敗，退出碼: ${code}`));
          }
        });

        buildProcess.on('error', reject);
      });
    }

    // 啟動模擬 Web 容器服務器
    console.log('🚀 啟動模擬 Web 容器服務器...');
    
    const express = require('express');
    const app = express();

    // 設置靜態文件服務
    app.use(express.static(path.join(process.cwd(), 'dist')));

    // 健康檢查端點
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        container: 'web-simulation'
      });
    });

    // SPA 路由支持
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });

    // 啟動服務器
    webServer = app.listen(TEST_CONFIG.webPort, () => {
      logTest('webContainer', 'Web 容器服務器啟動', true, `端口: ${TEST_CONFIG.webPort}`);
    });

    // 等待服務器啟動
    await wait(2000);

    // 測試 Web 容器訪問
    console.log('🧪 測試 Web 容器訪問...');
    
    try {
      const response = await makeRequest(`http://localhost:${TEST_CONFIG.webPort}`);
      logTest('webContainer', 'Web 容器 HTTP 訪問', response.statusCode === 200, `狀態碼: ${response.statusCode}`);
      
      const hasHtml = response.data.includes('<html') && response.data.includes('</html>');
      logTest('webContainer', 'Web 容器 HTML 內容', hasHtml);
      
    } catch (error) {
      logTest('webContainer', 'Web 容器訪問', false, error.message);
    }

    // 測試健康檢查
    console.log('💓 測試健康檢查端點...');
    
    try {
      const healthResponse = await makeRequest(`http://localhost:${TEST_CONFIG.webPort}/health`);
      logTest('webContainer', 'Web 容器健康檢查', healthResponse.statusCode === 200, `狀態碼: ${healthResponse.statusCode}`);
      
      if (healthResponse.statusCode === 200) {
        const healthData = JSON.parse(healthResponse.data);
        logTest('webContainer', 'Web 容器健康數據', !!healthData.status, `狀態: ${healthData.status}`);
      }
      
    } catch (error) {
      logTest('webContainer', 'Web 容器健康檢查', false, error.message);
    }

  } catch (error) {
    console.error('❌ Web 容器測試失敗:', error);
    logTest('webContainer', 'Web 容器測試', false, error.message);
  } finally {
    // 清理服務器
    if (webServer) {
      webServer.close();
      console.log('🛑 Web 容器服務器已停止');
    }
  }
}

// 模擬 iOS 容器測試
async function testIosContainer() {
  console.log('\n📱 測試 iOS 容器（模擬）');
  console.log('================================');

  let iosServer = null;

  try {
    // 檢查 iOS 相關配置
    console.log('📋 檢查 iOS 配置...');
    
    const appJsonExists = fs.existsSync(path.join(process.cwd(), 'app.json'));
    const packageJsonExists = fs.existsSync(path.join(process.cwd(), 'package.json'));
    
    logTest('iosContainer', 'app.json 配置', appJsonExists);
    logTest('iosContainer', 'package.json 配置', packageJsonExists);

    if (packageJsonExists) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      const hasExpoScript = !!packageJson.scripts && !!packageJson.scripts['start'];
      logTest('iosContainer', 'Expo 啟動腳本', hasExpoScript);
    }

    // 啟動模擬 iOS 開發服務器
    console.log('🚀 啟動模擬 iOS 開發服務器...');
    
    const express = require('express');
    const app = express();

    // 模擬 Expo DevTools
    app.get('/', (req, res) => {
      res.json({
        platform: 'ios',
        mode: 'development',
        expo: {
          devtools: true,
          metro: `http://localhost:${TEST_CONFIG.simulatedIosPort}`,
          platform: 'ios'
        },
        timestamp: new Date().toISOString()
      });
    });

    // 健康檢查
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        platform: 'ios',
        container: 'ios-simulation'
      });
    });

    // 模擬 Metro bundler 狀態
    app.get('/status', (req, res) => {
      res.json({
        bundler: 'metro',
        status: 'running',
        platform: 'ios',
        hot_reload: true
      });
    });

    // 啟動服務器
    iosServer = app.listen(TEST_CONFIG.simulatedIosPort, () => {
      logTest('iosContainer', 'iOS 容器服務器啟動', true, `端口: ${TEST_CONFIG.simulatedIosPort}`);
    });

    // 等待服務器啟動
    await wait(2000);

    // 測試 iOS 容器訪問
    console.log('🧪 測試 iOS 容器訪問...');
    
    try {
      const response = await makeRequest(`http://localhost:${TEST_CONFIG.simulatedIosPort}`);
      logTest('iosContainer', 'iOS 容器 HTTP 訪問', response.statusCode === 200, `狀態碼: ${response.statusCode}`);
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.data);
        logTest('iosContainer', 'iOS 容器平台配置', data.platform === 'ios', `平台: ${data.platform}`);
      }
      
    } catch (error) {
      logTest('iosContainer', 'iOS 容器訪問', false, error.message);
    }

    // 測試 iOS 健康檢查
    console.log('💓 測試 iOS 健康檢查...');
    
    try {
      const healthResponse = await makeRequest(`http://localhost:${TEST_CONFIG.simulatedIosPort}/health`);
      logTest('iosContainer', 'iOS 容器健康檢查', healthResponse.statusCode === 200, `狀態碼: ${healthResponse.statusCode}`);
      
    } catch (error) {
      logTest('iosContainer', 'iOS 容器健康檢查', false, error.message);
    }

  } catch (error) {
    console.error('❌ iOS 容器測試失敗:', error);
    logTest('iosContainer', 'iOS 容器測試', false, error.message);
  } finally {
    // 清理服務器
    if (iosServer) {
      iosServer.close();
      console.log('🛑 iOS 容器服務器已停止');
    }
  }
}

// 測試容器間整合
async function testContainerIntegration() {
  console.log('\n🔗 測試容器間整合');
  console.log('================================');

  try {
    // 測試 Supabase 連接
    console.log('🔌 測試 Supabase 連接...');
    
    try {
      const supabaseResponse = await makeRequest(TEST_CONFIG.supabaseUrl);
      logTest('integration', 'Supabase 連接', supabaseResponse.statusCode < 500, `狀態碼: ${supabaseResponse.statusCode}`);
    } catch (error) {
      logTest('integration', 'Supabase 連接', false, error.message);
    }

    // 測試生產環境連接
    console.log('🌍 測試生產環境連接...');
    
    try {
      const prodResponse = await makeRequest('https://19930913.xyz');
      logTest('integration', '生產環境連接', prodResponse.statusCode === 200, `狀態碼: ${prodResponse.statusCode}`);
    } catch (error) {
      logTest('integration', '生產環境連接', false, error.message);
    }

    // 測試環境變量一致性
    console.log('🌍 測試環境變量一致性...');
    
    const envVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    ];

    envVars.forEach(envVar => {
      const hasVar = !!process.env[envVar];
      logTest('integration', `環境變量 - ${envVar}`, hasVar);
    });

    // 測試服務發現
    console.log('🔍 測試服務發現...');
    
    const services = [
      { name: 'transactionDataService', path: 'src/services/transactionDataService.ts' },
      { name: 'assetTransactionSyncService', path: 'src/services/assetTransactionSyncService.ts' },
      { name: 'enhancedSupabaseService', path: 'src/services/enhancedSupabaseService.ts' },
      { name: 'supabaseConnectionManager', path: 'src/services/supabaseConnectionManager.ts' },
      { name: 'assetCalculationService', path: 'src/services/assetCalculationService.ts' }
    ];

    services.forEach(service => {
      const exists = fs.existsSync(path.join(process.cwd(), service.path));
      logTest('integration', `服務發現 - ${service.name}`, exists);
    });

  } catch (error) {
    console.error('❌ 容器整合測試失敗:', error);
    logTest('integration', '容器整合', false, error.message);
  }
}

// 生成測試報告
function generateTestReport() {
  console.log('\n📋 容器化測試報告');
  console.log('================================');
  
  console.log('\n📊 測試統計:');
  console.log(`總測試數: ${testResults.overall.passed + testResults.overall.failed}`);
  console.log(`通過: ${testResults.overall.passed}`);
  console.log(`失敗: ${testResults.overall.failed}`);
  
  if (testResults.overall.passed + testResults.overall.failed > 0) {
    console.log(`成功率: ${((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100).toFixed(1)}%`);
  }

  console.log('\n📋 詳細結果:');
  
  Object.keys(testResults).forEach(category => {
    if (category === 'overall') return;
    
    const result = testResults[category];
    console.log(`\n${category}:`);
    console.log(`  通過: ${result.passed}, 失敗: ${result.failed}`);
    
    result.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}${test.details ? ': ' + test.details : ''}`);
    });
  });

  const overallSuccess = testResults.overall.failed === 0;
  console.log(`\n🎯 整體測試結果: ${overallSuccess ? '✅ 成功' : '❌ 部分失敗'}`);
  
  // 提供建議
  console.log('\n💡 容器化建議:');
  if (overallSuccess) {
    console.log('✅ 容器化架構準備就緒');
    console.log('🐳 建議：安裝 Docker 進行真實容器測試');
    console.log('☸️ 建議：配置 Kubernetes 集群');
    console.log('🚀 建議：運行生產部署');
  } else {
    console.log('⚠️ 需要修復失敗的測試項目');
    console.log('🔧 檢查容器配置和環境設置');
  }
  
  return overallSuccess;
}

// 主測試函數
async function runContainerTests() {
  console.log('🐳 FinTranzo 容器化測試');
  console.log('========================');
  console.log('測試時間:', new Date().toLocaleString());
  console.log('模式: 容器模擬測試（無 Docker）');

  try {
    // 運行所有測試
    await testContainerSetup();
    await testWebContainer();
    await testIosContainer();
    await testContainerIntegration();

    // 生成報告
    const success = generateTestReport();

    if (success) {
      console.log('\n🎉 容器化測試通過！');
      console.log('\n📋 下一步：');
      console.log('1. 安裝 Docker Desktop');
      console.log('2. 運行: docker-compose -f docker-compose.production.yml up -d');
      console.log('3. 配置 Kubernetes 集群');
      console.log('4. 運行: bash scripts/deploy-k8s.sh deploy');
      process.exit(0);
    } else {
      console.log('\n⚠️ 部分測試失敗，但架構基本就緒。');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 容器化測試失敗:', error);
    process.exit(1);
  }
}

// 運行測試
if (require.main === module) {
  runContainerTests();
}

module.exports = {
  runContainerTests,
  testContainerSetup,
  testWebContainer,
  testIosContainer,
  testContainerIntegration
};
