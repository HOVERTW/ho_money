/**
 * 執行一次性股票同步
 * 管理員執行一次，將股價存入 Supabase
 * 用戶之後直接從 Supabase 讀取
 */

import { executeOneTimeSync, getSyncStats } from './oneTimeStockSync';
import { usStockQueryService } from '../services/usStockQueryService';

export const runOneTimeSyncProcess = async () => {
  console.log('🎯 開始一次性股票同步流程...');
  console.log('💡 目標：將股價存入 Supabase，用戶直接讀取，節省 API 額度');
  
  try {
    // 1. 檢查當前狀態
    console.log('\n1️⃣ 檢查當前資料庫狀態...');
    const beforeStats = await getSyncStats();
    
    if (beforeStats) {
      console.log('📊 同步前狀態:', beforeStats);
      
      if (beforeStats.stocksWithPrices > 0) {
        console.log('⚠️ 資料庫中已有股價資料');
        console.log('💡 如果要重新同步，請先清空舊資料');
        
        const shouldContinue = true; // 在實際使用時可以添加確認機制
        if (!shouldContinue) {
          console.log('❌ 同步已取消');
          return false;
        }
      }
    }
    
    // 2. 執行一次性同步
    console.log('\n2️⃣ 執行一次性 API 同步...');
    console.log('⏱️ 預計需要 10-15 分鐘 (50 支股票，每分鐘 5 次請求)');
    console.log('💰 這將消耗約 50 次 API 請求');
    
    await executeOneTimeSync();
    
    // 3. 檢查同步結果
    console.log('\n3️⃣ 檢查同步結果...');
    const afterStats = await getSyncStats();
    
    if (afterStats) {
      console.log('📊 同步後狀態:', afterStats);
      
      if (afterStats.stocksWithPrices > 0) {
        console.log('✅ 同步成功！');
      } else {
        console.log('❌ 同步失敗，沒有股價資料');
        return false;
      }
    }
    
    // 4. 測試用戶查詢功能
    console.log('\n4️⃣ 測試用戶查詢功能...');
    await testUserQueries();
    
    console.log('\n🎉 一次性同步流程完成！');
    console.log('💡 現在用戶可以直接從 Supabase 搜尋股票');
    console.log('🚫 不會再消耗 Alpha Vantage API 額度');
    
    return true;
    
  } catch (error) {
    console.error('❌ 一次性同步流程失敗:', error);
    return false;
  }
};

export const testUserQueries = async () => {
  console.log('🧪 測試用戶查詢功能...');
  
  const testQueries = [
    'AAPL',
    'Apple',
    '蘋果',
    'MSFT',
    'Microsoft',
    '微軟',
    'GOOGL',
    'Google',
    '谷歌'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`🔍 測試搜尋: "${query}"`);
      const results = await usStockQueryService.searchStocks(query, true, 3);
      
      if (results.length > 0) {
        console.log(`✅ 找到 ${results.length} 個結果:`);
        results.forEach(stock => {
          console.log(`   ${stock.symbol} - ${stock.name} - $${stock.price}`);
        });
      } else {
        console.log('❌ 沒有找到結果');
      }
      
    } catch (error) {
      console.error(`❌ 搜尋 "${query}" 失敗:`, error);
    }
  }
  
  console.log('🎉 用戶查詢測試完成！');
};

export const checkSyncStatus = async () => {
  console.log('📊 檢查同步狀態...');
  
  try {
    const stats = await getSyncStats();
    
    if (stats) {
      console.log('📈 同步統計:');
      console.log(`   總股票數: ${stats.totalStocks}`);
      console.log(`   有價格的股票: ${stats.stocksWithPrices}`);
      console.log(`   完成率: ${stats.completionRate}%`);
      console.log(`   最後更新: ${stats.lastUpdate || '未知'}`);
      
      if (stats.completionRate >= 80) {
        console.log('✅ 同步狀態良好');
      } else if (stats.completionRate > 0) {
        console.log('⚠️ 同步未完成，建議重新執行');
      } else {
        console.log('❌ 尚未同步，請執行一次性同步');
      }
      
      return stats;
    } else {
      console.log('❌ 無法獲取同步狀態');
      return null;
    }
    
  } catch (error) {
    console.error('❌ 檢查同步狀態失敗:', error);
    return null;
  }
};

export const quickSyncCheck = async () => {
  console.log('⚡ 快速同步檢查...');
  
  try {
    // 檢查 AAPL 是否有最新價格
    const aaplData = await usStockQueryService.getStockBySymbol('AAPL');
    
    if (aaplData && aaplData.price) {
      console.log(`✅ AAPL 價格: $${aaplData.price}`);
      console.log(`🕐 更新時間: ${aaplData.updated_at}`);
      
      // 檢查價格是否合理 (AAPL 應該在 $150-$250 之間)
      if (aaplData.price >= 150 && aaplData.price <= 250) {
        console.log('✅ 價格合理，同步狀態良好');
        return true;
      } else {
        console.log('⚠️ 價格異常，可能需要重新同步');
        return false;
      }
    } else {
      console.log('❌ 沒有 AAPL 價格資料，需要執行同步');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 快速檢查失敗:', error);
    return false;
  }
};

// 開發模式下的自動檢查
export const devAutoCheck = async () => {
  if (!__DEV__) {
    console.warn('⚠️ 此函數僅在開發模式下可用');
    return;
  }
  
  console.log('🧪 開發模式自動檢查...');
  
  const isGood = await quickSyncCheck();
  
  if (!isGood) {
    console.log('📝 資料不完整，建議執行一次性同步');
    console.log('💡 執行: await runOneTimeSyncProcess()');
  } else {
    console.log('✅ 資料狀態良好，用戶可以正常搜尋');
  }
  
  return isGood;
};

// 生產模式下的完整同步
export const prodFullSync = async () => {
  console.log('🚀 生產模式完整同步...');
  console.log('⚠️ 這將消耗大量 API 額度，請確認後執行');
  
  const confirmed = true; // 在實際使用時可以添加確認機制
  
  if (!confirmed) {
    console.log('❌ 同步已取消');
    return false;
  }
  
  return await runOneTimeSyncProcess();
};

export default {
  runOneTimeSyncProcess,
  testUserQueries,
  checkSyncStatus,
  quickSyncCheck,
  devAutoCheck,
  prodFullSync,
};
