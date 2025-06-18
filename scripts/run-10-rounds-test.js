#!/usr/bin/env node

/**
 * 10輪測試腳本 - 確保五大問題修復的穩定性
 */

const { runDockerKubernetesTest } = require('./docker-kubernetes-five-issues-fix-test.js');

async function run10RoundsTest() {
  console.log('🔄 開始10輪測試 - 五大問題修復穩定性驗證');
  console.log('===========================================');
  console.log(`開始時間: ${new Date().toLocaleString()}`);
  console.log('');

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (let round = 1; round <= 10; round++) {
    console.log(`\n🎯 第 ${round} 輪測試開始`);
    console.log('='.repeat(30));
    
    const startTime = Date.now();
    
    try {
      // 運行測試
      await runDockerKubernetesTest();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ 第 ${round} 輪測試通過 (耗時: ${duration}ms)`);
      results.push({
        round,
        status: 'PASSED',
        duration,
        timestamp: new Date().toLocaleString()
      });
      totalPassed++;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`❌ 第 ${round} 輪測試失敗 (耗時: ${duration}ms):`, error.message);
      results.push({
        round,
        status: 'FAILED',
        duration,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
      totalFailed++;
    }
    
    // 輪次間隔
    if (round < 10) {
      console.log(`⏳ 等待 3 秒後開始第 ${round + 1} 輪測試...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 輸出總結報告
  console.log('\n📊 10輪測試總結報告');
  console.log('===================');
  console.log(`結束時間: ${new Date().toLocaleString()}`);
  console.log('');
  console.log(`總體結果: ${totalPassed}/10 通過 (${Math.round(totalPassed/10*100)}%)`);
  console.log(`通過: ${totalPassed} 輪`);
  console.log(`失敗: ${totalFailed} 輪`);
  console.log('');

  // 詳細結果
  console.log('詳細結果:');
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} 第 ${result.round} 輪: ${result.status} (${result.duration}ms) - ${result.timestamp}`);
    if (result.error) {
      console.log(`   錯誤: ${result.error}`);
    }
  });

  // 性能統計
  const passedResults = results.filter(r => r.status === 'PASSED');
  if (passedResults.length > 0) {
    const avgDuration = passedResults.reduce((sum, r) => sum + r.duration, 0) / passedResults.length;
    const minDuration = Math.min(...passedResults.map(r => r.duration));
    const maxDuration = Math.max(...passedResults.map(r => r.duration));
    
    console.log('');
    console.log('性能統計 (通過的測試):');
    console.log(`平均耗時: ${Math.round(avgDuration)}ms`);
    console.log(`最快耗時: ${minDuration}ms`);
    console.log(`最慢耗時: ${maxDuration}ms`);
  }

  // 穩定性評估
  console.log('');
  console.log('穩定性評估:');
  if (totalPassed === 10) {
    console.log('🎉 完美！所有10輪測試都通過');
    console.log('✅ 五大問題修復非常穩定');
    console.log('✅ 可以安全提交到 GitHub');
  } else if (totalPassed >= 8) {
    console.log('👍 良好！大部分測試通過');
    console.log('⚠️ 建議檢查失敗的測試並修復');
  } else if (totalPassed >= 5) {
    console.log('⚠️ 一般！約半數測試通過');
    console.log('❌ 需要進一步修復問題');
  } else {
    console.log('❌ 不穩定！大部分測試失敗');
    console.log('❌ 需要重新檢查修復方案');
  }

  console.log('');
  console.log('Docker + Kubernetes 驗證:');
  if (totalPassed === 10) {
    console.log('🐳 Docker 環境: ✅ 完全兼容');
    console.log('☸️ Kubernetes 環境: ✅ 完全兼容');
    console.log('📱 iOS 部署: ✅ 準備就緒');
    console.log('🌐 Web 部署: ✅ 準備就緒');
  } else {
    console.log('🐳 Docker 環境: ⚠️ 需要進一步測試');
    console.log('☸️ Kubernetes 環境: ⚠️ 需要進一步測試');
    console.log('📱 iOS 部署: ⚠️ 建議等待修復完成');
    console.log('🌐 Web 部署: ⚠️ 建議等待修復完成');
  }

  return {
    totalPassed,
    totalFailed,
    successRate: totalPassed / 10,
    results
  };
}

// 執行測試
if (require.main === module) {
  run10RoundsTest()
    .then(result => {
      if (result.successRate === 1.0) {
        console.log('\n🎯 結論: 五大問題修復成功且穩定！');
        process.exit(0);
      } else {
        console.log('\n⚠️ 結論: 需要進一步修復');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ 10輪測試執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { run10RoundsTest };
