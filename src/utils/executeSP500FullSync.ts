/**
 * 執行 S&P 500 完整同步 - 方法 1
 * 500 檔股票，嚴格遵守 API 使用規則
 * 只獲取收盤價，避免被封鎖
 */

import { executeFullSP500Sync, executeBatchSP500Sync, getSP500SyncStats } from './sp500FullSync';
import { usStockQueryService } from '../services/usStockQueryService';

export const startFullSyncProcess = async () => {
  console.log('🚀 開始 S&P 500 完整同步流程...');
  console.log('📊 目標：500 檔股票');
  console.log('🔑 API Key: QJTK95T7SA1661WM');
  console.log('⚠️ 嚴格遵守 Alpha Vantage 限制：');
  console.log('   - 每分鐘最多 5 次請求');
  console.log('   - 每日最多 500 次請求');
  console.log('   - 只獲取收盤價，避免被封鎖');
  
  try {
    // 1. 檢查當前狀態
    console.log('\n1️⃣ 檢查當前資料庫狀態...');
    const beforeStats = await getSP500SyncStats();
    
    if (beforeStats) {
      console.log('📊 同步前狀態:', beforeStats);
      
      if (beforeStats.stocksWithPrices > 400) {
        console.log('✅ 資料庫中已有大量股價資料');
        console.log('💡 如果要重新同步，請先清空舊資料');
        
        // 測試現有資料
        await testExistingData();
        return true;
      }
    }
    
    // 2. 選擇同步方式
    console.log('\n2️⃣ 選擇同步方式...');
    console.log('🔄 推薦使用分批同步，更安全穩定');
    
    const useBatchSync = true; // 推薦使用分批同步
    
    if (useBatchSync) {
      console.log('📦 使用分批同步 (每批 25 檔股票)');
      console.log('⏱️ 預計需要 100 分鐘 (500 檔 ÷ 5 次/分鐘)');
      console.log('💡 可以隨時中斷，下次繼續');
      
      await executeBatchSP500Sync(25);
    } else {
      console.log('🚀 使用完整同步');
      console.log('⏱️ 預計需要 100 分鐘');
      console.log('⚠️ 不建議中斷，可能影響進度');
      
      await executeFullSP500Sync();
    }
    
    // 3. 檢查同步結果
    console.log('\n3️⃣ 檢查同步結果...');
    const afterStats = await getSP500SyncStats();
    
    if (afterStats) {
      console.log('📊 同步後狀態:', afterStats);
      
      if (afterStats.completionRate >= 80) {
        console.log('✅ 同步成功！');
        await testSyncedData();
      } else {
        console.log('⚠️ 同步未完成，建議重新執行');
      }
    }
    
    console.log('\n🎉 S&P 500 同步流程完成！');
    console.log('💡 現在用戶可以直接從 Supabase 搜尋股票');
    console.log('🚫 不會再消耗 Alpha Vantage API 額度');
    
    return true;
    
  } catch (error) {
    console.error('❌ S&P 500 同步流程失敗:', error);
    return false;
  }
};

export const testExistingData = async () => {
  console.log('🧪 測試現有資料...');
  
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  
  for (const symbol of testSymbols) {
    try {
      const data = await usStockQueryService.getStockBySymbol(symbol);
      
      if (data && data.price) {
        console.log(`✅ ${symbol}: $${data.price} (${data.name})`);
      } else {
        console.log(`❌ ${symbol}: 沒有資料`);
      }
      
    } catch (error) {
      console.error(`❌ 查詢 ${symbol} 失敗:`, error);
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
};

export const testSyncedData = async () => {
  console.log('🧪 測試同步後的資料...');
  
  try {
    // 測試熱門股票
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.B', 'JPM', 'V'];
    
    console.log('📊 熱門股票價格:');
    for (const symbol of testSymbols) {
      const data = await usStockQueryService.getStockBySymbol(symbol);
      
      if (data && data.price) {
        console.log(`✅ ${symbol}: $${data.price}`);
      } else {
        console.log(`❌ ${symbol}: 沒有資料`);
      }
    }
    
    // 測試搜尋功能
    console.log('\n🔍 測試搜尋功能:');
    const searchTests = [
      { query: 'AAPL', expected: 'Apple Inc.' },
      { query: 'Apple', expected: 'Apple Inc.' },
      { query: 'MSFT', expected: 'Microsoft Corporation' },
      { query: 'Microsoft', expected: 'Microsoft Corporation' },
      { query: 'GOOGL', expected: 'Alphabet Inc.' }
    ];
    
    for (const test of searchTests) {
      const results = await usStockQueryService.searchStocks(test.query, true, 3);
      
      if (results.length > 0) {
        console.log(`✅ 搜尋 "${test.query}" 找到: ${results[0].symbol} - ${results[0].name}`);
      } else {
        console.log(`❌ 搜尋 "${test.query}" 沒有找到結果`);
      }
    }
    
    // 獲取統計資訊
    console.log('\n📊 最終統計:');
    const stats = await getSP500SyncStats();
    if (stats) {
      console.log(`   總股票數: ${stats.totalStocks}`);
      console.log(`   有價格的股票: ${stats.stocksWithPrices}`);
      console.log(`   完成率: ${stats.completionRate}%`);
      console.log(`   API 使用量: ${stats.apiUsed}/500`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 測試同步資料失敗:', error);
    return false;
  }
};

export const monitorSyncProgress = async () => {
  console.log('📊 開始監控同步進度...');
  
  const startTime = Date.now();
  let lastProgress = 0;
  
  const checkProgress = async () => {
    try {
      const stats = await getSP500SyncStats();
      
      if (stats) {
        const progress = stats.completionRate;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`📈 同步進度: ${progress}% (${stats.stocksWithPrices}/${stats.totalStocks})`);
        console.log(`⏱️ 已用時間: ${elapsed} 秒`);
        console.log(`📡 API 使用量: ${stats.apiUsed}/500`);
        
        if (progress > lastProgress) {
          console.log(`✅ 進度更新: +${(progress - lastProgress).toFixed(1)}%`);
          lastProgress = progress;
        }
        
        // 如果完成度達到 90% 以上，認為同步基本完成
        if (progress >= 90) {
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
  
  // 每 60 秒檢查一次進度
  const interval = setInterval(async () => {
    const completed = await checkProgress();
    if (completed) {
      clearInterval(interval);
      console.log('🎉 監控結束，同步完成！');
      await testSyncedData();
    }
  }, 60000);
  
  // 立即檢查一次
  await checkProgress();
  
  return interval;
};

export const quickSyncCheck = async () => {
  console.log('⚡ 快速同步檢查...');
  
  try {
    const stats = await getSP500SyncStats();
    
    if (stats) {
      console.log(`📊 當前狀態: ${stats.stocksWithPrices}/${stats.totalStocks} (${stats.completionRate}%)`);
      
      if (stats.completionRate >= 80) {
        console.log('✅ 同步狀態良好');
        return true;
      } else if (stats.completionRate > 0) {
        console.log('⚠️ 同步未完成，建議繼續執行');
        return false;
      } else {
        console.log('❌ 尚未開始同步');
        return false;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ 快速檢查失敗:', error);
    return false;
  }
};

// 開發模式下的自動檢查和執行
export const devAutoSync = async () => {
  if (!__DEV__) {
    console.warn('⚠️ 此函數僅在開發模式下可用');
    return;
  }
  
  console.log('🧪 開發模式自動同步...');
  
  const isGood = await quickSyncCheck();
  
  if (!isGood) {
    console.log('📝 資料不完整，開始執行同步');
    await startFullSyncProcess();
  } else {
    console.log('✅ 資料狀態良好，測試現有功能');
    await testExistingData();
  }
  
  return isGood;
};

export default {
  startFullSyncProcess,
  testExistingData,
  testSyncedData,
  monitorSyncProgress,
  quickSyncCheck,
  devAutoSync,
};

// 立即執行同步 (開發模式)
if (__DEV__) {
  console.log('🚀 自動啟動 S&P 500 同步...');
  setTimeout(() => {
    startFullSyncProcess().catch(error => {
      console.error('❌ 自動同步失敗:', error);
    });
  }, 3000); // 3 秒後開始
}
