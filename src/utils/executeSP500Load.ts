/**
 * 執行 S&P 500 資料載入
 * 分階段載入：基本資料 → 價格資料
 */

import { loadSP500BasicData, updateSP500Prices, getSP500Stats } from './loadSP500Data';
import { usStockQueryService } from '../services/usStockQueryService';
import { updatePopularStockPrices, verifyAAPLPrice, refreshStockData } from './updateRealStockPrices';

export const executeSP500DataLoad = async () => {
  console.log('🚀 開始執行 S&P 500 資料載入...');
  
  try {
    // 階段 1: 載入基本資料
    console.log('\n📝 階段 1: 載入基本股票資料...');
    await loadSP500BasicData();
    
    // 檢查載入狀態
    const stats1 = await getSP500Stats();
    console.log('📊 基本資料載入完成:', stats1);
    
    // 階段 2: 更新價格資料 (分批處理，避免 API 限制)
    console.log('\n💰 階段 2: 更新股票價格...');
    console.log('⚠️ 注意：由於 API 限制，價格更新將分批進行');
    console.log('⏱️ 預計需要 2-3 小時完成所有 500 支股票');
    
    // 小批量測試 (前 10 支股票)
    console.log('🧪 先更新前 10 支股票作為測試...');
    await updateSP500Prices(2); // 每批 2 支，避免 API 限制
    
    // 檢查更新狀態
    const stats2 = await getSP500Stats();
    console.log('📊 價格更新進度:', stats2);
    
    console.log('\n🎉 S&P 500 資料載入完成！');
    console.log('📈 現在可以在應用中搜尋美股了');
    
    return true;
    
  } catch (error) {
    console.error('❌ S&P 500 資料載入失敗:', error);
    return false;
  }
};

export const testSP500Search = async () => {
  console.log('🧪 測試 S&P 500 搜尋功能...');
  
  try {
    // 測試搜尋熱門股票
    const testQueries = ['AAPL', 'MSFT', 'GOOGL', 'Apple', 'Microsoft'];
    
    for (const query of testQueries) {
      console.log(`🔍 搜尋: ${query}`);
      const results = await usStockQueryService.searchStocks(query, true, 3);
      
      if (results.length > 0) {
        console.log(`✅ 找到 ${results.length} 個結果:`);
        results.forEach(stock => {
          console.log(`   ${stock.symbol} - ${stock.name} (${stock.sector})`);
        });
      } else {
        console.log('❌ 沒有找到結果');
      }
      console.log('');
    }
    
    // 測試統計資訊
    const stats = await usStockQueryService.getStockStats();
    console.log('📊 資料庫統計:', stats);
    
    return true;
    
  } catch (error) {
    console.error('❌ 搜尋測試失敗:', error);
    return false;
  }
};

export const quickLoadSample = async () => {
  console.log('⚡ 快速載入範例資料...');

  try {
    // 清除舊的測試資料
    console.log('🗑️ 清除舊的測試資料...');
    await refreshStockData();

    // 載入前 50 支股票的基本資料
    console.log('📝 載入前 50 支股票基本資料...');
    await loadSP500BasicData();

    // 更新熱門股票的真實價格
    console.log('💰 更新熱門股票真實價格...');
    await updatePopularStockPrices();

    // 特別驗證 AAPL 價格
    console.log('🍎 驗證 AAPL 價格...');
    await verifyAAPLPrice();

    // 測試搜尋
    console.log('🧪 測試搜尋功能...');
    await testSP500Search();

    console.log('🎉 範例資料載入完成！');
    return true;

  } catch (error) {
    console.error('❌ 範例資料載入失敗:', error);
    return false;
  }
};

export const getLoadProgress = async () => {
  try {
    const stats = await getSP500Stats();
    const progress = {
      ...stats,
      progressPercentage: stats.totalStocks > 0 ? 
        Math.round((stats.stocksWithPrices / stats.totalStocks) * 100) : 0,
      status: stats.stocksWithPrices === 0 ? 'Not Started' :
              stats.stocksWithPrices < stats.totalStocks ? 'In Progress' : 'Completed'
    };
    
    console.log('📊 載入進度:', progress);
    return progress;
    
  } catch (error) {
    console.error('❌ 獲取進度失敗:', error);
    return null;
  }
};

// 開發模式下的快速測試
export const devQuickTest = async () => {
  if (!__DEV__) {
    console.warn('⚠️ 此函數僅在開發模式下可用');
    return;
  }
  
  console.log('🧪 開發模式快速測試...');
  
  // 測試資料庫連接
  const connected = await usStockQueryService.testConnection();
  console.log('資料庫連接:', connected ? '✅' : '❌');
  
  if (!connected) {
    console.error('❌ 資料庫連接失敗，請檢查 Supabase 設定');
    return false;
  }
  
  // 檢查現有資料
  const stats = await getSP500Stats();
  console.log('現有資料:', stats);
  
  if (stats.totalStocks === 0) {
    console.log('📝 沒有資料，開始載入範例...');
    await quickLoadSample();
  } else {
    console.log('✅ 已有資料，測試搜尋功能...');
    await testSP500Search();
  }
  
  return true;
};

// 生產模式下的完整載入
export const prodFullLoad = async () => {
  if (__DEV__) {
    console.warn('⚠️ 此函數建議在生產模式下使用');
  }
  
  console.log('🚀 生產模式完整載入...');
  console.log('⚠️ 這將需要數小時完成，請確保網路連接穩定');
  
  const confirmed = true; // 在實際使用時可以添加確認機制
  
  if (!confirmed) {
    console.log('❌ 載入已取消');
    return false;
  }
  
  return await executeSP500DataLoad();
};

// 導出主要功能
export default {
  executeSP500DataLoad,
  testSP500Search,
  quickLoadSample,
  getLoadProgress,
  devQuickTest,
  prodFullLoad,
};
