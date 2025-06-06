/**
 * 測試每日ETF更新功能
 * 驗證ETF更新是否正確整合到每日更新調度器中
 */

import { etfPriceUpdateService } from '../services/etfPriceUpdateService';
import { dailyUpdateScheduler } from './dailyUpdateScheduler';

/**
 * 測試ETF更新服務
 */
async function testETFUpdateService() {
  console.log('🧪 測試ETF更新服務...');
  console.log('=' * 50);

  try {
    // 1. 測試熱門ETF更新
    console.log('\n1️⃣ 測試熱門ETF更新...');
    const popularResult = await etfPriceUpdateService.updatePopularETFPrices();
    
    console.log(`✅ 熱門ETF更新結果:`);
    console.log(`   成功: ${popularResult.updated_count} 個`);
    console.log(`   失敗: ${popularResult.failed_count} 個`);
    console.log(`   用時: ${popularResult.duration} 秒`);
    
    if (popularResult.errors.length > 0) {
      console.log(`   錯誤: ${popularResult.errors.slice(0, 3).join(', ')}`);
    }

    return popularResult.success;

  } catch (error) {
    console.error('❌ ETF更新服務測試失敗:', error);
    return false;
  }
}

/**
 * 測試每日更新調度器中的ETF更新
 */
async function testDailyETFUpdate() {
  console.log('\n🧪 測試每日更新調度器中的ETF更新...');
  console.log('=' * 50);

  try {
    // 檢查更新狀態
    const status = dailyUpdateScheduler.getUpdateStatus();
    console.log('📊 當前更新狀態:');
    console.log(`   正在更新: ${status.isUpdating ? '是' : '否'}`);
    console.log(`   上次更新: ${status.lastUpdateDate || '從未更新'}`);
    console.log(`   定時更新運行: ${status.scheduledUpdateRunning ? '是' : '否'}`);
    console.log(`   下次更新時間: ${status.nextUpdateTime}`);

    // 如果正在更新，等待完成
    if (status.isUpdating) {
      console.log('⏳ 等待當前更新完成...');
      
      // 等待更新完成（最多等待10分鐘）
      let waitTime = 0;
      const maxWaitTime = 600000; // 10分鐘
      
      while (dailyUpdateScheduler.getUpdateStatus().isUpdating && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        waitTime += 5000;
        console.log(`⏳ 已等待 ${waitTime / 1000} 秒...`);
      }
      
      if (waitTime >= maxWaitTime) {
        console.log('⚠️ 等待超時，強制繼續測試');
      }
    }

    // 手動觸發更新測試
    console.log('\n🔄 手動觸發每日更新測試...');
    const updateResult = await dailyUpdateScheduler.manualUpdate();

    console.log('\n📊 更新結果:');
    console.log(`   更新日期: ${updateResult.date}`);
    console.log(`   總更新數量: ${updateResult.totalUpdates}`);
    console.log(`   成功項目: ${updateResult.successfulUpdates}/4`);
    console.log(`   失敗項目: ${updateResult.failedUpdates}/4`);
    console.log(`   總用時: ${updateResult.totalDuration} 秒`);

    // 檢查ETF更新結果
    const etfResult = updateResult.results.find(r => r.type === 'us_etfs');
    if (etfResult) {
      console.log('\n📈 ETF更新詳情:');
      console.log(`   狀態: ${etfResult.success ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`   更新數量: ${etfResult.count} 個ETF`);
      console.log(`   用時: ${etfResult.duration} 秒`);
      
      if (etfResult.errors.length > 0) {
        console.log(`   錯誤: ${etfResult.errors.slice(0, 3).join(', ')}`);
      }
    } else {
      console.log('⚠️ 沒有找到ETF更新結果');
    }

    return updateResult.successfulUpdates >= 3; // 至少3個項目成功

  } catch (error) {
    console.error('❌ 每日更新測試失敗:', error);
    return false;
  }
}

/**
 * 驗證ETF數據更新
 */
async function verifyETFDataUpdate() {
  console.log('\n🔍 驗證ETF數據更新...');
  console.log('=' * 50);

  try {
    const { supabaseConfig } = await import('../config/supabaseConfig');

    // 1. 檢查ETF總數
    const totalResult = await supabaseConfig.request('us_stocks?select=*&is_etf=eq.true', {
      method: 'GET',
      headers: {
        'Prefer': 'count=exact'
      }
    });

    console.log(`📊 ETF總數: ${totalResult?.length || 0}`);

    // 2. 檢查有價格的ETF數量
    const pricedResult = await supabaseConfig.request('us_stocks?select=*&is_etf=eq.true&price=not.is.null', {
      method: 'GET',
      headers: {
        'Prefer': 'count=exact'
      }
    });

    console.log(`✅ 有價格的ETF: ${pricedResult?.length || 0}`);

    // 3. 檢查最近更新的ETF
    const recentResult = await supabaseConfig.request('us_stocks?select=symbol,name,price,change_percent,updated_at&is_etf=eq.true&price=not.is.null&order=updated_at.desc&limit=10');

    if (recentResult && Array.isArray(recentResult) && recentResult.length > 0) {
      console.log('\n🕒 最近更新的ETF (前10個):');
      recentResult.forEach((etf: any, index: number) => {
        const updatedTime = etf.updated_at ? new Date(etf.updated_at).toLocaleString() : 'N/A';
        console.log(`   ${index + 1:2d}. ${etf.symbol}: $${etf.price} (${etf.change_percent:+.2f}%) - ${updatedTime}`);
      });
    }

    // 4. 測試ETF視圖
    const viewResult = await supabaseConfig.request('us_etf_view?limit=5');
    
    if (viewResult && Array.isArray(viewResult) && viewResult.length > 0) {
      console.log('\n📊 ETF視圖測試:');
      console.log(`   us_etf_view 記錄數: ${viewResult.length}`);
      viewResult.forEach((etf: any, index: number) => {
        console.log(`   ${index + 1}. ${etf.symbol}: ${etf.name} - $${etf.price || 'N/A'}`);
      });
    }

    const completionRate = totalResult?.length ? (pricedResult?.length || 0) / totalResult.length * 100 : 0;
    console.log(`\n📈 ETF價格完成度: ${completionRate.toFixed(1)}%`);

    return completionRate > 90; // 90%以上完成度視為成功

  } catch (error) {
    console.error('❌ ETF數據驗證失敗:', error);
    return false;
  }
}

/**
 * 運行所有測試
 */
async function runAllTests() {
  console.log('🚀 開始ETF每日更新功能測試...');
  console.log('=' * 60);

  const results = {
    etfService: false,
    dailyUpdate: false,
    dataVerification: false
  };

  try {
    // 1. 測試ETF更新服務
    results.etfService = await testETFUpdateService();

    // 2. 測試每日更新調度器
    results.dailyUpdate = await testDailyETFUpdate();

    // 3. 驗證ETF數據更新
    results.dataVerification = await verifyETFDataUpdate();

    // 顯示測試結果
    console.log('\n' + '=' * 60);
    console.log('📋 測試結果總結:');
    console.log('=' * 60);
    console.log(`ETF更新服務: ${results.etfService ? '✅ 通過' : '❌ 失敗'}`);
    console.log(`每日更新調度器: ${results.dailyUpdate ? '✅ 通過' : '❌ 失敗'}`);
    console.log(`ETF數據驗證: ${results.dataVerification ? '✅ 通過' : '❌ 失敗'}`);

    const allPassed = Object.values(results).every(result => result);
    console.log(`\n${allPassed ? '🎉' : '❌'} 總體測試結果: ${allPassed ? '全部通過' : '部分失敗'}`);

    if (allPassed) {
      console.log('\n✅ ETF已成功整合到每日更新流程！');
      console.log('🔄 ETF價格將會跟著台股美股每日自動更新');
      console.log('📈 用戶可以查看到最新的ETF價格數據');
    } else {
      console.log('\n⚠️ 部分功能需要檢查和修復');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ 測試運行失敗:', error);
    return false;
  }
}

// 如果直接運行此文件
if (require.main === module) {
  runAllTests()
    .then(result => {
      console.log(`\n測試完成，結果: ${result ? '成功' : '失敗'}`);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('測試運行失敗:', error);
      process.exit(1);
    });
}

export { runAllTests, testETFUpdateService, testDailyETFUpdate, verifyETFDataUpdate };
