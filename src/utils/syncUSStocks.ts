/**
 * 美股資料同步腳本
 * 用於手動或定時同步 S&P 500 股票資料到 Supabase
 */

import { usStockSyncService } from '../services/usStockSyncService';
import { usStockQueryService } from '../services/usStockQueryService';

export const syncUSStocksData = async () => {
  console.log('🚀 開始美股資料同步...');
  
  try {
    // 1. 測試 Supabase 連接
    console.log('1️⃣ 測試 Supabase 連接...');
    const isConnected = await usStockQueryService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Supabase 連接失敗，無法進行同步');
      return false;
    }
    
    // 2. 獲取同步前統計
    console.log('2️⃣ 獲取同步前統計...');
    const beforeStats = await usStockSyncService.getSyncStats();
    console.log('同步前統計:', beforeStats);
    
    // 3. 開始批量同步 (每批 5 檔，避免 API 限制)
    console.log('3️⃣ 開始批量同步 S&P 500 股票...');
    await usStockSyncService.syncSP500Stocks(5);
    
    // 4. 獲取同步後統計
    console.log('4️⃣ 獲取同步後統計...');
    const afterStats = await usStockSyncService.getSyncStats();
    console.log('同步後統計:', afterStats);
    
    // 5. 測試查詢功能
    console.log('5️⃣ 測試查詢功能...');
    const testResults = await usStockQueryService.searchStocks('AAPL', true, 5);
    console.log('測試搜尋結果:', testResults);
    
    console.log('🎉 美股資料同步完成！');
    return true;
    
  } catch (error) {
    console.error('❌ 美股資料同步失敗:', error);
    return false;
  }
};

export const testUSStockServices = async () => {
  console.log('🧪 測試美股服務...');
  
  try {
    // 測試查詢服務
    console.log('1️⃣ 測試查詢服務...');
    const queryConnected = await usStockQueryService.testConnection();
    console.log('查詢服務連接:', queryConnected ? '✅' : '❌');
    
    // 測試搜尋功能
    console.log('2️⃣ 測試搜尋功能...');
    const searchResults = await usStockQueryService.searchStocks('Apple', true, 3);
    console.log('搜尋結果:', searchResults);
    
    // 測試獲取熱門股票
    console.log('3️⃣ 測試熱門股票...');
    const popularStocks = await usStockQueryService.getPopularStocks(5);
    console.log('熱門股票:', popularStocks);
    
    // 測試獲取統計
    console.log('4️⃣ 測試統計資訊...');
    const stats = await usStockQueryService.getStockStats();
    console.log('統計資訊:', stats);
    
    // 測試快取統計
    console.log('5️⃣ 快取統計...');
    const cacheStats = usStockQueryService.getCacheStats();
    console.log('快取統計:', cacheStats);
    
    console.log('🎉 美股服務測試完成！');
    return true;
    
  } catch (error) {
    console.error('❌ 美股服務測試失敗:', error);
    return false;
  }
};

export const updateSpecificStocks = async (symbols: string[]) => {
  console.log('🔄 更新指定股票:', symbols);
  
  try {
    let successCount = 0;
    let failCount = 0;
    
    for (const symbol of symbols) {
      console.log(`🔄 更新 ${symbol}...`);
      const success = await usStockSyncService.updateStockPrice(symbol);
      
      if (success) {
        successCount++;
        console.log(`✅ ${symbol} 更新成功`);
      } else {
        failCount++;
        console.log(`❌ ${symbol} 更新失敗`);
      }
      
      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
    
    console.log(`🎉 股票更新完成！成功: ${successCount}, 失敗: ${failCount}`);
    return { successCount, failCount };
    
  } catch (error) {
    console.error('❌ 股票更新失敗:', error);
    return { successCount: 0, failCount: symbols.length };
  }
};

export const getSP500List = () => {
  return usStockSyncService.getSP500List();
};

export const clearAllCaches = () => {
  usStockQueryService.clearCache();
  console.log('🔄 所有快取已清除');
};

// 開發模式下的測試函數
export const runDevelopmentTests = async () => {
  if (!__DEV__) {
    console.warn('⚠️ 此函數僅在開發模式下可用');
    return;
  }
  
  console.log('🧪 開始開發模式測試...');
  
  // 測試服務
  await testUSStockServices();
  
  // 測試更新少數股票
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
  await updateSpecificStocks(testSymbols);
  
  console.log('🎉 開發模式測試完成！');
};

// 生產模式下的完整同步
export const runProductionSync = async () => {
  if (__DEV__) {
    console.warn('⚠️ 此函數僅在生產模式下使用');
    return;
  }
  
  console.log('🚀 開始生產模式完整同步...');
  
  const success = await syncUSStocksData();
  
  if (success) {
    console.log('🎉 生產模式同步成功！');
  } else {
    console.error('❌ 生產模式同步失敗！');
  }
  
  return success;
};

// 監控和統計函數
export const getSystemStatus = async () => {
  try {
    const queryConnected = await usStockQueryService.testConnection();
    const stats = await usStockQueryService.getStockStats();
    const cacheStats = usStockQueryService.getCacheStats();
    const sp500List = getSP500List();
    
    return {
      database_connected: queryConnected,
      stock_stats: stats,
      cache_stats: cacheStats,
      sp500_count: sp500List.length,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ 獲取系統狀態失敗:', error);
    return {
      database_connected: false,
      error: error.message,
      last_check: new Date().toISOString(),
    };
  }
};

// 導出所有功能
export default {
  syncUSStocksData,
  testUSStockServices,
  updateSpecificStocks,
  getSP500List,
  clearAllCaches,
  runDevelopmentTests,
  runProductionSync,
  getSystemStatus,
};
