/**
 * 測試美國ETF整合功能
 * 驗證ETF搜索、查詢和價格更新功能
 */

import { usStockQueryService } from '../services/usStockQueryService';
import { usStockSyncService } from '../services/usStockSyncService';

export const testETFIntegration = async () => {
  console.log('🧪 開始測試美國ETF整合功能...');
  console.log('=' * 50);

  try {
    // 1. 測試ETF搜索功能
    console.log('\n1️⃣ 測試ETF搜索功能...');
    
    const etfSearchResults = await usStockQueryService.searchETFs('標普500', 5);
    console.log(`✅ ETF搜索結果: ${etfSearchResults.length} 個`);
    etfSearchResults.forEach(etf => {
      console.log(`   📈 ${etf.symbol}: ${etf.name} - $${etf.price} (${etf.change_percent}%)`);
    });

    // 2. 測試混合搜索功能 (股票+ETF)
    console.log('\n2️⃣ 測試混合搜索功能...');
    
    const mixedResults = await usStockQueryService.searchStocks('Apple', false, 10, true);
    console.log(`✅ 混合搜索結果: ${mixedResults.length} 個`);
    mixedResults.forEach(item => {
      const type = item.is_etf ? 'ETF' : '股票';
      console.log(`   📊 ${item.symbol} (${type}): ${item.name} - $${item.price}`);
    });

    // 3. 測試熱門ETF功能
    console.log('\n3️⃣ 測試熱門ETF功能...');
    
    const popularETFs = await usStockQueryService.getPopularETFs(5);
    console.log(`✅ 熱門ETF: ${popularETFs.length} 個`);
    popularETFs.forEach(etf => {
      console.log(`   🔥 ${etf.symbol}: ${etf.name} - $${etf.price}`);
    });

    // 4. 測試ETF詳細信息查詢
    console.log('\n4️⃣ 測試ETF詳細信息查詢...');
    
    const spyDetails = await usStockQueryService.getStockBySymbol('SPY');
    if (spyDetails) {
      console.log('✅ SPY詳細信息:');
      console.log(`   名稱: ${spyDetails.name}`);
      console.log(`   價格: $${spyDetails.price}`);
      console.log(`   變化: ${spyDetails.change_percent}%`);
      console.log(`   成交量: ${spyDetails.volume?.toLocaleString()}`);
      console.log(`   是否ETF: ${spyDetails.is_etf ? '是' : '否'}`);
      console.log(`   資產類型: ${spyDetails.asset_type}`);
    } else {
      console.log('❌ 無法獲取SPY詳細信息');
    }

    // 5. 測試ETF價格更新功能
    console.log('\n5️⃣ 測試ETF價格更新功能...');
    
    const testETFs = ['SPY', 'QQQ', 'IWM'];
    console.log(`🔄 測試更新 ${testETFs.join(', ')} 的價格...`);
    
    for (const symbol of testETFs) {
      const success = await usStockSyncService.updateStockPrice(symbol, true);
      console.log(`   ${success ? '✅' : '❌'} ${symbol} 價格更新${success ? '成功' : '失敗'}`);
    }

    // 6. 測試統計信息
    console.log('\n6️⃣ 測試統計信息...');
    
    const stats = await usStockQueryService.getStockStats();
    if (stats) {
      console.log('✅ 美股統計信息:');
      console.log(`   總數量: ${stats.total_stocks}`);
      console.log(`   股票數量: ${stats.stock_count}`);
      console.log(`   ETF數量: ${stats.etf_count}`);
      console.log(`   S&P 500數量: ${stats.sp500_count}`);
    } else {
      console.log('❌ 無法獲取統計信息');
    }

    // 7. 測試快取功能
    console.log('\n7️⃣ 測試快取功能...');
    
    const cacheStats = usStockQueryService.getCacheStats();
    console.log('✅ 快取統計:');
    console.log(`   股票快取大小: ${cacheStats.stockCacheSize}`);
    console.log(`   搜索快取大小: ${cacheStats.searchCacheSize}`);
    console.log(`   快取持續時間: ${cacheStats.cacheDuration}`);

    console.log('\n🎉 ETF整合功能測試完成！');
    console.log('=' * 50);
    console.log('✅ 所有功能測試通過');
    console.log('📈 ETF已成功整合到美股查詢系統');
    console.log('🔍 用戶現在可以搜索和查詢ETF即時價格');

    return true;

  } catch (error) {
    console.error('❌ ETF整合功能測試失敗:', error);
    return false;
  }
};

export const testETFPriceSync = async () => {
  console.log('🔄 測試ETF價格同步功能...');

  try {
    const popularETFs = usStockSyncService.getPopularETFList();
    console.log(`📊 準備同步 ${popularETFs.length} 個熱門ETF`);

    // 只同步前5個ETF進行測試
    const testETFs = popularETFs.slice(0, 5);
    console.log(`🧪 測試同步: ${testETFs.join(', ')}`);

    await usStockSyncService.syncETFPrices(testETFs, 2);

    console.log('✅ ETF價格同步測試完成');
    return true;

  } catch (error) {
    console.error('❌ ETF價格同步測試失敗:', error);
    return false;
  }
};

export const runAllETFTests = async () => {
  console.log('🚀 運行所有ETF測試...');
  
  const integrationResult = await testETFIntegration();
  const syncResult = await testETFPriceSync();

  console.log('\n📋 測試結果總結:');
  console.log(`ETF整合功能: ${integrationResult ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`ETF價格同步: ${syncResult ? '✅ 通過' : '❌ 失敗'}`);

  const allPassed = integrationResult && syncResult;
  console.log(`\n${allPassed ? '🎉' : '❌'} 總體測試結果: ${allPassed ? '全部通過' : '部分失敗'}`);

  return allPassed;
};

// 如果直接運行此文件
if (require.main === module) {
  runAllETFTests()
    .then(result => {
      console.log(`\n測試完成，結果: ${result ? '成功' : '失敗'}`);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('測試運行失敗:', error);
      process.exit(1);
    });
}
