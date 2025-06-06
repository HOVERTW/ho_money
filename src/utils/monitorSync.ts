/**
 * 監控一次性股價同步進度
 * 實時顯示同步狀態和進度
 */

import { getSyncStats } from './oneTimeStockSync';
import { usStockQueryService } from '../services/usStockQueryService';

export const monitorSyncProgress = async () => {
  console.log('📊 開始監控同步進度...');
  
  const startTime = Date.now();
  let lastProgress = 0;
  
  const checkProgress = async () => {
    try {
      const stats = await getSyncStats();
      
      if (stats) {
        const progress = stats.completionRate;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`📈 同步進度: ${progress}% (${stats.stocksWithPrices}/${stats.totalStocks})`);
        console.log(`⏱️ 已用時間: ${elapsed} 秒`);
        console.log(`📊 最後更新: ${stats.lastUpdate || '未知'}`);
        
        if (progress > lastProgress) {
          console.log(`✅ 進度更新: +${(progress - lastProgress).toFixed(1)}%`);
          lastProgress = progress;
        }
        
        // 如果完成度達到 80% 以上，認為同步基本完成
        if (progress >= 80) {
          console.log('🎉 同步基本完成！');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ 檢查進度失敗:', error);
      return false;
    }
  };
  
  // 每 30 秒檢查一次進度
  const interval = setInterval(async () => {
    const completed = await checkProgress();
    if (completed) {
      clearInterval(interval);
      console.log('🎉 監控結束，同步完成！');
    }
  }, 30000);
  
  // 立即檢查一次
  await checkProgress();
  
  return interval;
};

export const quickSyncTest = async () => {
  console.log('🧪 快速同步測試...');
  
  try {
    // 檢查當前狀態
    const beforeStats = await getSyncStats();
    console.log('📊 同步前狀態:', beforeStats);
    
    // 測試 AAPL 是否有資料
    const aaplData = await usStockQueryService.getStockBySymbol('AAPL');
    
    if (aaplData && aaplData.price) {
      console.log(`✅ AAPL 已有資料: $${aaplData.price}`);
      console.log('💡 資料庫中已有股價，無需重新同步');
      return true;
    } else {
      console.log('❌ AAPL 沒有資料，需要執行同步');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 快速測試失敗:', error);
    return false;
  }
};

export const testSyncResult = async () => {
  console.log('🧪 測試同步結果...');
  
  try {
    // 測試搜尋熱門股票
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    
    for (const symbol of testSymbols) {
      const data = await usStockQueryService.getStockBySymbol(symbol);
      
      if (data && data.price) {
        console.log(`✅ ${symbol}: $${data.price} (${data.name})`);
      } else {
        console.log(`❌ ${symbol}: 沒有資料`);
      }
    }
    
    // 測試搜尋功能
    console.log('\n🔍 測試搜尋功能...');
    const searchResults = await usStockQueryService.searchStocks('Apple', true, 3);
    
    if (searchResults.length > 0) {
      console.log(`✅ 搜尋 "Apple" 找到 ${searchResults.length} 個結果:`);
      searchResults.forEach(stock => {
        console.log(`   ${stock.symbol} - ${stock.name} - $${stock.price}`);
      });
    } else {
      console.log('❌ 搜尋 "Apple" 沒有找到結果');
    }
    
    // 獲取統計資訊
    console.log('\n📊 同步統計:');
    const stats = await getSyncStats();
    if (stats) {
      console.log(`   總股票數: ${stats.totalStocks}`);
      console.log(`   有價格的股票: ${stats.stocksWithPrices}`);
      console.log(`   完成率: ${stats.completionRate}%`);
      console.log(`   最後更新: ${stats.lastUpdate || '未知'}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 測試同步結果失敗:', error);
    return false;
  }
};

export const startFullSyncProcess = async () => {
  console.log('🚀 開始完整同步流程...');
  
  try {
    // 1. 快速測試
    console.log('1️⃣ 快速測試...');
    const hasData = await quickSyncTest();
    
    if (hasData) {
      console.log('✅ 已有資料，跳過同步');
      await testSyncResult();
      return true;
    }
    
    // 2. 開始監控
    console.log('2️⃣ 開始監控同步進度...');
    const monitorInterval = await monitorSyncProgress();
    
    // 3. 執行同步 (需要在另一個進程中執行)
    console.log('3️⃣ 請在另一個終端執行同步...');
    console.log('💡 執行: import { runOneTimeSyncProcess } from "./src/utils/runOneTimeSync"; await runOneTimeSyncProcess();');
    
    // 4. 等待完成後測試結果
    setTimeout(async () => {
      console.log('4️⃣ 測試同步結果...');
      await testSyncResult();
    }, 60000); // 1 分鐘後測試
    
    return true;
    
  } catch (error) {
    console.error('❌ 完整同步流程失敗:', error);
    return false;
  }
};

export default {
  monitorSyncProgress,
  quickSyncTest,
  testSyncResult,
  startFullSyncProcess,
};
