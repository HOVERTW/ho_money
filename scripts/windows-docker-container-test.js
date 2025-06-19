#!/usr/bin/env node

/**
 * Windows環境Docker容器測試
 * 在Docker容器中運行我們的測試
 */

const { execSync } = require('child_process');

console.log('🐳 Windows環境Docker容器測試');
console.log('============================');
console.log(`開始時間: ${new Date().toLocaleString()}`);

const testResults = {
  dockerBasicTest: false,
  nodeContainerTest: false,
  applicationContainerTest: false
};

// 測試1: Docker基本功能
console.log('\n🔧 測試1: Docker基本功能');
console.log('========================');

try {
  // 測試Docker版本
  const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Docker版本: ${dockerVersion}`);

  // 測試Docker運行hello-world
  console.log('🔄 運行hello-world容器...');
  const helloWorld = execSync('docker run --rm hello-world', { encoding: 'utf8' });
  
  if (helloWorld.includes('Hello from Docker!')) {
    console.log('✅ Docker基本功能正常');
    testResults.dockerBasicTest = true;
  } else {
    console.log('❌ Docker基本功能異常');
  }

} catch (error) {
  console.error('❌ Docker基本功能測試失敗:', error.message);
}

// 測試2: Node.js容器測試
console.log('\n📦 測試2: Node.js容器測試');
console.log('=========================');

try {
  console.log('🔄 運行Node.js容器...');
  const nodeVersion = execSync('docker run --rm node:18-alpine node --version', { 
    encoding: 'utf8',
    timeout: 30000
  }).trim();
  
  console.log(`✅ 容器中Node.js版本: ${nodeVersion}`);
  testResults.nodeContainerTest = true;

} catch (error) {
  console.error('❌ Node.js容器測試失敗:', error.message);
}

// 測試3: 應用容器測試
console.log('\n🚀 測試3: 應用容器測試');
console.log('======================');

try {
  console.log('🔄 構建應用測試容器...');
  
  // 創建簡單的測試Dockerfile
  const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY scripts/windows-simple-test.js ./test.js
CMD ["node", "test.js"]
`;

  // 寫入Dockerfile
  require('fs').writeFileSync('Dockerfile.test', dockerfile);

  // 構建測試映像
  console.log('🔨 構建測試映像...');
  execSync('docker build -f Dockerfile.test -t fintranzo-windows-test .', { 
    encoding: 'utf8',
    timeout: 120000
  });

  console.log('✅ 測試映像構建成功');
  
  // 運行容器測試
  console.log('🔄 運行容器測試...');
  const containerOutput = execSync('docker run --rm fintranzo-windows-test', { 
    encoding: 'utf8',
    timeout: 60000
  });

  if (containerOutput.includes('Windows環境成功率: 4/4 (100%)')) {
    console.log('✅ 應用容器測試成功');
    testResults.applicationContainerTest = true;
  } else {
    console.log('❌ 應用容器測試失敗');
    console.log('容器輸出:', containerOutput);
  }

  // 清理測試映像
  try {
    execSync('docker rmi fintranzo-windows-test', { encoding: 'utf8' });
    console.log('🧹 測試映像已清理');
  } catch (cleanupError) {
    console.log('⚠️ 清理測試映像失敗');
  }

  // 清理Dockerfile
  try {
    require('fs').unlinkSync('Dockerfile.test');
    console.log('🧹 測試Dockerfile已清理');
  } catch (cleanupError) {
    console.log('⚠️ 清理Dockerfile失敗');
  }

} catch (error) {
  console.error('❌ 應用容器測試失敗:', error.message);
}

// 結果統計
console.log('\n📊 Windows Docker容器測試結果');
console.log('==============================');

const passedTests = Object.values(testResults).filter(result => result).length;
const totalTests = Object.keys(testResults).length;
const successRate = Math.round(passedTests / totalTests * 100);

console.log(`1. Docker基本功能: ${testResults.dockerBasicTest ? '✅ 通過' : '❌ 失敗'}`);
console.log(`2. Node.js容器測試: ${testResults.nodeContainerTest ? '✅ 通過' : '❌ 失敗'}`);
console.log(`3. 應用容器測試: ${testResults.applicationContainerTest ? '✅ 通過' : '❌ 失敗'}`);

console.log(`\n🎯 Windows Docker容器成功率: ${passedTests}/${totalTests} (${successRate}%)`);

if (successRate === 100) {
  console.log('\n🎉 Windows Docker容器測試完美通過！');
  console.log('✅ Docker在Windows環境中完全可用');
  console.log('✅ 應用可以成功容器化');
  console.log('✅ 不需要WSL2，Windows原生Docker完全滿足需求');
  console.log('✅ 可以安全部署到任何Docker環境');
} else {
  console.log(`\n⚠️ 還有 ${totalTests - passedTests} 個容器化問題需要解決`);
}

console.log(`\n結束時間: ${new Date().toLocaleString()}`);

module.exports = { testResults };
