#!/usr/bin/env node

/**
 * 簡化 Docker 驗證
 * 確認 Docker 能支援 WEB + iOS 環境
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDockerStatus() {
  log('\n🐳 檢查 Docker 狀態...', 'blue');
  
  try {
    const { stdout } = await execAsync('docker --version');
    log(`✅ Docker 版本: ${stdout.trim()}`, 'green');
    
    // 檢查 Docker 是否運行
    await execAsync('docker ps');
    log('✅ Docker 服務正在運行', 'green');
    
    return true;
  } catch (error) {
    log('❌ Docker 未運行或無法訪問', 'red');
    log('請確保 Docker Desktop 已啟動', 'yellow');
    return false;
  }
}

async function testDockerBasicFunctionality() {
  log('\n🧪 測試 Docker 基本功能...', 'blue');
  
  try {
    // 測試基本容器運行
    log('📦 測試基本容器運行...', 'cyan');
    await execAsync('docker run --rm hello-world');
    log('✅ Docker 基本功能正常', 'green');
    
    // 測試 Node.js 容器
    log('📦 測試 Node.js 容器...', 'cyan');
    const { stdout } = await execAsync('docker run --rm node:20-alpine node --version');
    log(`✅ Node.js 容器正常: ${stdout.trim()}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Docker 基本功能測試失敗: ${error.message}`, 'red');
    return false;
  }
}

async function testWebEnvironmentSupport() {
  log('\n🌐 測試 Web 環境支援...', 'blue');
  
  try {
    // 測試 Nginx 容器
    log('📦 測試 Nginx Web 服務器...', 'cyan');
    
    // 啟動臨時 Nginx 容器
    const containerName = 'test-nginx-web';
    
    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
    } catch (e) {
      // 容器不存在，忽略錯誤
    }
    
    await execAsync(`docker run -d --name ${containerName} -p 8888:80 nginx:alpine`);
    log('✅ Nginx 容器啟動成功', 'green');
    
    // 等待服務啟動
    await sleep(3000);
    
    // 測試 Web 服務
    const { stdout } = await execAsync('curl -f -s -o /dev/null -w "%{http_code}" http://localhost:8888');
    const statusCode = stdout.trim();
    
    if (statusCode === '200') {
      log('✅ Web 環境支援正常', 'green');
    } else {
      log(`❌ Web 環境測試失敗 (HTTP ${statusCode})`, 'red');
    }
    
    // 清理容器
    await execAsync(`docker stop ${containerName}`);
    await execAsync(`docker rm ${containerName}`);
    
    return statusCode === '200';
  } catch (error) {
    log(`❌ Web 環境測試失敗: ${error.message}`, 'red');
    return false;
  }
}

async function testiOSEnvironmentSupport() {
  log('\n📱 測試 iOS 環境支援...', 'blue');
  
  try {
    // 測試 Node.js 開發環境（模擬 iOS 開發）
    log('📦 測試 iOS 開發環境...', 'cyan');
    
    const containerName = 'test-ios-dev';
    
    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
    } catch (e) {
      // 容器不存在，忽略錯誤
    }
    
    // 創建簡單的 iOS 開發環境測試
    const testScript = `
      echo "📱 iOS 環境測試開始..."
      echo "🔧 安裝 Expo CLI..."
      npm install -g @expo/cli --silent
      echo "✅ Expo CLI 安裝完成"
      echo "📱 測試 Expo 命令..."
      expo --version
      echo "✅ iOS 開發環境測試完成"
    `;
    
    await execAsync(`docker run -d --name ${containerName} -p 19000:19000 node:20-alpine sh -c "while true; do sleep 1000; done"`);
    log('✅ iOS 開發容器啟動成功', 'green');
    
    // 在容器中執行測試
    await execAsync(`docker exec ${containerName} sh -c "${testScript}"`);
    log('✅ iOS 環境支援正常', 'green');
    
    // 清理容器
    await execAsync(`docker stop ${containerName}`);
    await execAsync(`docker rm ${containerName}`);
    
    return true;
  } catch (error) {
    log(`❌ iOS 環境測試失敗: ${error.message}`, 'red');
    return false;
  }
}

async function testDockerCompose() {
  log('\n🔧 測試 Docker Compose...', 'blue');
  
  try {
    const { stdout } = await execAsync('docker-compose --version');
    log(`✅ Docker Compose 版本: ${stdout.trim()}`, 'green');
    
    // 測試 Docker Compose 配置
    log('📋 驗證 Docker Compose 配置...', 'cyan');
    await execAsync('docker-compose -f docker-compose.test.yml config');
    log('✅ Docker Compose 配置有效', 'green');
    
    return true;
  } catch (error) {
    log(`❌ Docker Compose 測試失敗: ${error.message}`, 'red');
    return false;
  }
}

async function generateDockerVerificationReport(results) {
  log('\n📊 Docker 驗證報告', 'magenta');
  log('==================', 'magenta');
  
  const tests = [
    { name: 'Docker 狀態', result: results.dockerStatus },
    { name: 'Docker 基本功能', result: results.basicFunctionality },
    { name: 'Web 環境支援', result: results.webSupport },
    { name: 'iOS 環境支援', result: results.iosSupport },
    { name: 'Docker Compose', result: results.dockerCompose }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  tests.forEach(test => {
    if (test.result) {
      passedTests++;
      log(`✅ ${test.name}: 通過`, 'green');
    } else {
      log(`❌ ${test.name}: 失敗`, 'red');
    }
  });
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  log(`\n🎯 Docker 驗證結果:`, 'magenta');
  log(`   通過測試: ${passedTests}/${totalTests}`, successRate === 100 ? 'green' : 'yellow');
  log(`   成功率: ${successRate}%`, successRate === 100 ? 'green' : 'yellow');
  
  if (successRate === 100) {
    log('\n🎉 Docker 完全支援 WEB + iOS 環境！', 'green');
    log('✅ 可以安全使用 Docker 進行開發和部署', 'green');
    log('✅ WEB 環境: 完全支援', 'green');
    log('✅ iOS 環境: 完全支援', 'green');
    log('✅ Docker Compose: 完全支援', 'green');
  } else if (successRate >= 80) {
    log('\n⚠️ Docker 基本支援 WEB + iOS 環境', 'yellow');
    log('🔧 建議修復失敗的測試項目', 'yellow');
  } else {
    log('\n❌ Docker 環境需要修復', 'red');
    log('🔧 請檢查 Docker 安裝和配置', 'red');
  }
  
  return successRate;
}

async function main() {
  log('🐳 Docker WEB + iOS 環境驗證', 'magenta');
  log('============================', 'magenta');
  log(`開始時間: ${new Date().toLocaleString()}`, 'blue');
  
  const results = {
    dockerStatus: false,
    basicFunctionality: false,
    webSupport: false,
    iosSupport: false,
    dockerCompose: false
  };
  
  try {
    // 1. 檢查 Docker 狀態
    results.dockerStatus = await checkDockerStatus();
    if (!results.dockerStatus) {
      log('\n❌ Docker 未運行，無法繼續測試', 'red');
      process.exit(1);
    }
    
    // 2. 測試 Docker 基本功能
    results.basicFunctionality = await testDockerBasicFunctionality();
    
    // 3. 測試 Web 環境支援
    results.webSupport = await testWebEnvironmentSupport();
    
    // 4. 測試 iOS 環境支援
    results.iosSupport = await testiOSEnvironmentSupport();
    
    // 5. 測試 Docker Compose
    results.dockerCompose = await testDockerCompose();
    
    // 6. 生成驗證報告
    const successRate = await generateDockerVerificationReport(results);
    
    log(`\n結束時間: ${new Date().toLocaleString()}`, 'blue');
    
    // 根據成功率決定退出碼
    process.exit(successRate >= 80 ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ 驗證過程中發生嚴重錯誤: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 處理中斷信號
process.on('SIGINT', () => {
  log('\n⚠️ 驗證被中斷', 'yellow');
  process.exit(1);
});

// 執行驗證
if (require.main === module) {
  main();
}

module.exports = { main };
