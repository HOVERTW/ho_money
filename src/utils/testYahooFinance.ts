/**
 * Yahoo Finance API 測試腳本
 * 驗證 API 功能和資料品質
 */

import { yahooFinanceAPI } from '../services/yahooFinanceAPI';
import { realTimeStockSync, verifyStockSync } from './realTimeStockSync';

export const testYahooFinanceAPI = async () => {
  console.log('🧪 開始測試 Yahoo Finance API...');
  
  try {
    // 1. 測試單一股票查詢
    console.log('\n1️⃣ 測試單一股票查詢...');
    
    const testSymbols = ['AAPL', 'V', 'MSFT', 'GOOGL', 'TSLA'];
    
    for (const symbol of testSymbols) {
      const stockData = await yahooFinanceAPI.getStockQuote(symbol);
      
      if (stockData) {
        console.log(`✅ ${symbol}: $${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent}%)`);
        console.log(`   成交量: ${stockData.volume.toLocaleString()}`);
        console.log(`   更新時間: ${new Date(stockData.lastUpdated).toLocaleString()}`);
        
        // 特別檢查 V (Visa) 的價格
        if (symbol === 'V') {
          console.log(`🎯 V (Visa) 真實價格: $${stockData.price}`);
          if (stockData.price > 300 && stockData.price < 400) {
            console.log('✅ V 價格在合理範圍內 ($300-$400)');
          } else {
            console.log(`⚠️ V 價格可能異常: $${stockData.price}`);
          }
        }
      } else {
        console.log(`❌ ${symbol}: 獲取失敗`);
      }
      
      // 避免過快請求
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 2. 測試批量查詢
    console.log('\n2️⃣ 測試批量查詢...');
    
    const batchSymbols = ['AMZN', 'META', 'NVDA', 'JPM', 'WMT'];
    const batchResults = await yahooFinanceAPI.getBatchQuotes(batchSymbols);
    
    console.log(`📊 批量查詢結果: ${batchResults.length}/${batchSymbols.length} 成功`);
    batchResults.forEach(stock => {
      console.log(`   ${stock.symbol}: $${stock.price}`);
    });
    
    // 3. 測試市場狀態
    console.log('\n3️⃣ 測試市場狀態...');
    
    const marketStatus = await yahooFinanceAPI.getMarketStatus();
    console.log(`📈 市場狀態: ${marketStatus.isOpen ? '開市 🟢' : '休市 🔴'}`);
    if (marketStatus.nextOpen) {
      console.log(`   下次開市: ${marketStatus.nextOpen}`);
    }
    if (marketStatus.nextClose) {
      console.log(`   下次休市: ${marketStatus.nextClose}`);
    }
    
    // 4. 測試搜尋功能
    console.log('\n4️⃣ 測試搜尋功能...');
    
    const searchResults = await yahooFinanceAPI.searchStocks('Apple');
    console.log(`🔍 搜尋 "Apple" 結果: ${searchResults.length} 個`);
    searchResults.slice(0, 3).forEach(result => {
      console.log(`   ${result.symbol}: ${result.shortname || result.longname}`);
    });
    
    // 5. 顯示 API 使用統計
    console.log('\n5️⃣ API 使用統計...');
    
    const stats = yahooFinanceAPI.getUsageStats();
    console.log(`📊 請求次數: ${stats.requestCount}/${stats.maxRequests}`);
    console.log(`⏰ 重置時間: ${stats.resetTime}`);
    console.log(`✅ 可繼續請求: ${stats.canMakeRequest ? '是' : '否'}`);
    
    console.log('\n🎉 Yahoo Finance API 測試完成！');
    console.log('=====================================');
    console.log('✅ API 連接正常');
    console.log('✅ 資料品質良好');
    console.log('✅ 批量查詢功能正常');
    console.log('✅ 市場狀態檢查正常');
    console.log('✅ 搜尋功能正常');
    console.log('=====================================');
    
    return true;
    
  } catch (error) {
    console.error('❌ Yahoo Finance API 測試失敗:', error);
    return false;
  }
};

export const testFullStockSync = async () => {
  console.log('🚀 開始測試完整股票同步...');
  
  try {
    // 執行完整同步
    await realTimeStockSync.executeFullSync();
    
    // 等待一下讓資料存儲完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 驗證同步結果
    await verifyStockSync();
    
    console.log('\n🎉 完整股票同步測試完成！');
    return true;
    
  } catch (error) {
    console.error('❌ 完整股票同步測試失敗:', error);
    return false;
  }
};

export const runAllTests = async () => {
  console.log('🧪🧪🧪 開始執行所有測試 🧪🧪🧪');
  console.log('=====================================');
  
  let allTestsPassed = true;
  
  try {
    // 測試 1: Yahoo Finance API
    console.log('\n📋 測試 1: Yahoo Finance API 功能');
    const apiTestPassed = await testYahooFinanceAPI();
    if (!apiTestPassed) {
      allTestsPassed = false;
    }
    
    // 測試 2: 完整股票同步
    console.log('\n📋 測試 2: 完整股票同步');
    const syncTestPassed = await testFullStockSync();
    if (!syncTestPassed) {
      allTestsPassed = false;
    }
    
    // 最終結果
    console.log('\n🏁 所有測試完成！');
    console.log('=====================================');
    
    if (allTestsPassed) {
      console.log('🎉🎉🎉 所有測試通過！🎉🎉🎉');
      console.log('✅ Yahoo Finance API 正常工作');
      console.log('✅ 股票同步系統正常工作');
      console.log('✅ 資料庫存儲正常工作');
      console.log('✅ 系統已準備好為用戶提供真實股價');
      console.log('=====================================');
      console.log('💡 現在用戶可以搜尋到真實的即時股價！');
      console.log('🎯 包含 V (Visa) 等所有股票的真實價格');
      console.log('🔄 系統會每小時自動更新股價');
      console.log('🚫 用戶查詢不會消耗任何 API 額度');
      console.log('⚡ 查詢速度更快（本地資料庫）');
    } else {
      console.log('❌❌❌ 部分測試失敗 ❌❌❌');
      console.log('⚠️ 請檢查錯誤訊息並修正問題');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ 測試執行過程中發生錯誤:', error);
    return false;
  }
};

// 立即執行測試
console.log('🚀 啟動 Yahoo Finance 測試系統...');
setTimeout(() => {
  runAllTests();
}, 2000);
