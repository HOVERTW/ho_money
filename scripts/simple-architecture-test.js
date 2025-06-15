/**
 * 簡單的架構測試
 * 測試當前五大核心功能的狀態
 */

console.log('🧪 FinTranzo 架構和功能測試');
console.log('============================');
console.log('測試時間:', new Date().toLocaleString());

// 測試結果收集
const testResults = {
  environment: { passed: 0, failed: 0, tests: [] },
  webAccess: { passed: 0, failed: 0, tests: [] },
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

// 測試環境設置
async function testEnvironment() {
  console.log('\n🌍 測試環境設置');
  console.log('================================');

  try {
    // 檢查 Node.js 環境
    logTest('environment', 'Node.js 環境', typeof process !== 'undefined', `版本: ${process.version}`);

    // 檢查環境變量
    const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    logTest('environment', 'Supabase URL 環境變量', hasSupabaseUrl);
    logTest('environment', 'Supabase Key 環境變量', hasSupabaseKey);

    // 檢查項目結構
    const fs = require('fs');
    const path = require('path');
    
    const srcExists = fs.existsSync(path.join(process.cwd(), 'src'));
    const servicesExists = fs.existsSync(path.join(process.cwd(), 'src', 'services'));
    const packageExists = fs.existsSync(path.join(process.cwd(), 'package.json'));
    
    logTest('environment', '項目結構 - src 目錄', srcExists);
    logTest('environment', '項目結構 - services 目錄', servicesExists);
    logTest('environment', '項目結構 - package.json', packageExists);

    // 檢查關鍵文件
    const keyFiles = [
      'src/services/supabase.ts',
      'src/services/transactionDataService.ts',
      'src/services/assetTransactionSyncService.ts',
      'src/services/enhancedSupabaseService.ts',
      'src/services/supabaseConnectionManager.ts',
      'src/services/assetCalculationService.ts'
    ];

    keyFiles.forEach(file => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      logTest('environment', `關鍵文件 - ${file}`, exists);
    });

  } catch (error) {
    console.error('❌ 環境測試失敗:', error);
    logTest('environment', '環境測試', false, error.message);
  }
}

// 測試 Web 訪問
async function testWebAccess() {
  console.log('\n🌐 測試 Web 訪問');
  console.log('================================');

  try {
    // 檢查是否有構建輸出
    const fs = require('fs');
    const path = require('path');
    
    const distExists = fs.existsSync(path.join(process.cwd(), 'dist'));
    const indexExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
    
    logTest('webAccess', 'Web 構建輸出存在', distExists);
    logTest('webAccess', 'index.html 存在', indexExists);

    // 檢查 GitHub Pages 配置
    const cnameExists = fs.existsSync(path.join(process.cwd(), 'dist', 'CNAME'));
    logTest('webAccess', 'CNAME 文件存在', cnameExists);

    if (cnameExists) {
      const cname = fs.readFileSync(path.join(process.cwd(), 'dist', 'CNAME'), 'utf8').trim();
      logTest('webAccess', 'CNAME 配置正確', cname === '19930913.xyz', `域名: ${cname}`);
    }

    // 檢查 Docker 配置
    const dockerComposeExists = fs.existsSync(path.join(process.cwd(), 'docker-compose.production.yml'));
    const dockerfileWebExists = fs.existsSync(path.join(process.cwd(), 'docker', 'Dockerfile.web'));
    const dockerfileIosExists = fs.existsSync(path.join(process.cwd(), 'docker', 'Dockerfile.ios-simulator'));
    
    logTest('webAccess', 'Docker Compose 配置', dockerComposeExists);
    logTest('webAccess', 'Web Dockerfile', dockerfileWebExists);
    logTest('webAccess', 'iOS Dockerfile', dockerfileIosExists);

    // 檢查 Kubernetes 配置
    const k8sNamespaceExists = fs.existsSync(path.join(process.cwd(), 'k8s', 'namespace.yaml'));
    const k8sWebExists = fs.existsSync(path.join(process.cwd(), 'k8s', 'web-deployment.yaml'));
    const k8sIosExists = fs.existsSync(path.join(process.cwd(), 'k8s', 'ios-simulator-deployment.yaml'));
    
    logTest('webAccess', 'Kubernetes 命名空間配置', k8sNamespaceExists);
    logTest('webAccess', 'Kubernetes Web 部署', k8sWebExists);
    logTest('webAccess', 'Kubernetes iOS 部署', k8sIosExists);

    // 檢查部署腳本
    const deployK8sExists = fs.existsSync(path.join(process.cwd(), 'scripts', 'deploy-k8s.sh'));
    const deployTestExists = fs.existsSync(path.join(process.cwd(), 'scripts', 'deploy-and-test.sh'));
    
    logTest('webAccess', 'Kubernetes 部署腳本', deployK8sExists);
    logTest('webAccess', '完整部署測試腳本', deployTestExists);

  } catch (error) {
    console.error('❌ Web 訪問測試失敗:', error);
    logTest('webAccess', 'Web 訪問測試', false, error.message);
  }
}

// 測試網絡連接
async function testNetworkConnection() {
  console.log('\n🔗 測試網絡連接');
  console.log('================================');

  try {
    // 測試 Supabase 連接
    const https = require('https');
    const url = require('url');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
    
    const testConnection = (testUrl, name) => {
      return new Promise((resolve) => {
        const parsedUrl = url.parse(testUrl);
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.path || '/',
          method: 'GET',
          timeout: 5000
        };

        const req = https.request(options, (res) => {
          logTest('webAccess', `${name} 連接`, res.statusCode < 400, `狀態碼: ${res.statusCode}`);
          resolve();
        });

        req.on('error', (error) => {
          logTest('webAccess', `${name} 連接`, false, error.message);
          resolve();
        });

        req.on('timeout', () => {
          logTest('webAccess', `${name} 連接`, false, '連接超時');
          req.destroy();
          resolve();
        });

        req.end();
      });
    };

    // 測試 Supabase 連接
    await testConnection(supabaseUrl, 'Supabase');
    
    // 測試目標網站連接
    await testConnection('https://19930913.xyz', '目標網站');

  } catch (error) {
    console.error('❌ 網絡連接測試失敗:', error);
    logTest('webAccess', '網絡連接測試', false, error.message);
  }
}

// 生成測試報告
function generateTestReport() {
  console.log('\n📋 測試報告');
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

  // 判斷整體測試結果
  const overallSuccess = testResults.overall.failed === 0;
  console.log(`\n🎯 整體測試結果: ${overallSuccess ? '✅ 成功' : '❌ 失敗'}`);
  
  // 提供建議
  console.log('\n💡 建議:');
  if (overallSuccess) {
    console.log('✅ 架構設置完整，可以進行下一步測試');
    console.log('🚀 建議運行: npm run build:web 測試構建');
    console.log('🐳 建議運行: docker-compose -f docker-compose.production.yml up -d 測試 Docker');
  } else {
    console.log('⚠️ 需要修復失敗的測試項目');
    console.log('🔧 檢查環境變量和文件結構');
  }
  
  return overallSuccess;
}

// 主測試函數
async function runSimpleTests() {
  try {
    // 運行所有測試
    await testEnvironment();
    await testWebAccess();
    await testNetworkConnection();

    // 生成報告
    const success = generateTestReport();

    if (success) {
      console.log('\n🎉 架構測試通過！');
      process.exit(0);
    } else {
      console.log('\n⚠️ 部分測試失敗，需要檢查。');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 測試運行失敗:', error);
    process.exit(1);
  }
}

// 運行測試
if (require.main === module) {
  runSimpleTests();
}

module.exports = {
  runSimpleTests,
  testEnvironment,
  testWebAccess,
  testNetworkConnection
};
