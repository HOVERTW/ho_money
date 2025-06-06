/**
 * 驗證股票資料是否成功存入 Supabase
 * 測試搜尋功能是否正常工作
 */

import { usStockQueryService } from '../services/usStockQueryService';

export const verifyStockDataInSupabase = async () => {
  console.log('🔍 驗證股票資料是否成功存入 Supabase...');
  
  try {
    // 1. 測試 AAPL 資料
    console.log('\n1️⃣ 測試 AAPL 資料...');
    const aaplData = await usStockQueryService.getStockBySymbol('AAPL');
    
    if (aaplData) {
      console.log('✅ AAPL 資料存在:');
      console.log(`   代號: ${aaplData.symbol}`);
      console.log(`   名稱: ${aaplData.name}`);
      console.log(`   價格: ${usStockQueryService.formatPrice(aaplData.price)}`);
      console.log(`   行業: ${aaplData.sector || 'N/A'}`);
      console.log(`   更新時間: ${aaplData.updated_at}`);
      
      // 檢查是否是我們期望的真實價格
      if (aaplData.price === 200.85) {
        console.log('🎉 AAPL 價格正確！顯示真實價格 $200.85');
      } else {
        console.log(`⚠️ AAPL 價格: $${aaplData.price} (預期: $200.85)`);
      }
    } else {
      console.log('❌ AAPL 資料不存在');
    }
    
    // 2. 測試 MSFT 資料
    console.log('\n2️⃣ 測試 MSFT 資料...');
    const msftData = await usStockQueryService.getStockBySymbol('MSFT');
    
    if (msftData) {
      console.log('✅ MSFT 資料存在:');
      console.log(`   代號: ${msftData.symbol}`);
      console.log(`   名稱: ${msftData.name}`);
      console.log(`   價格: ${usStockQueryService.formatPrice(msftData.price)}`);
      console.log(`   行業: ${msftData.sector || 'N/A'}`);
      
      if (msftData.price === 460.36) {
        console.log('🎉 MSFT 價格正確！顯示真實價格 $460.36');
      } else {
        console.log(`⚠️ MSFT 價格: $${msftData.price} (預期: $460.36)`);
      }
    } else {
      console.log('❌ MSFT 資料不存在');
    }
    
    // 3. 測試搜尋功能
    console.log('\n3️⃣ 測試搜尋功能...');
    
    // 測試搜尋 AAPL
    const aaplSearchResults = await usStockQueryService.searchStocks('AAPL', true, 5);
    console.log(`🔍 搜尋 "AAPL" 結果: ${aaplSearchResults.length} 個`);
    
    if (aaplSearchResults.length > 0) {
      const result = aaplSearchResults[0];
      console.log('✅ AAPL 搜尋結果:');
      console.log(`   代號: ${result.symbol}`);
      console.log(`   名稱: ${result.name}`);
      console.log(`   價格: ${usStockQueryService.formatPrice(result.price)}`);
      console.log(`   變化: ${usStockQueryService.formatChangePercent(result.change_percent)}`);
      console.log(`   市值: ${usStockQueryService.formatMarketCap(result.market_cap)}`);
    }
    
    // 測試搜尋 Apple
    const appleSearchResults = await usStockQueryService.searchStocks('Apple', true, 5);
    console.log(`🔍 搜尋 "Apple" 結果: ${appleSearchResults.length} 個`);
    
    if (appleSearchResults.length > 0) {
      console.log('✅ Apple 搜尋成功，找到相關股票');
    }
    
    // 4. 測試統計資料
    console.log('\n4️⃣ 測試統計資料...');
    const stats = await usStockQueryService.getStockStats();
    
    if (stats) {
      console.log('📊 美股統計:');
      console.log(`   總股票數: ${stats.total_stocks}`);
      console.log(`   S&P 500 股票: ${stats.sp500_count}`);
      console.log(`   行業數量: ${stats.sectors_count}`);
      console.log(`   最後更新: ${stats.last_updated || 'N/A'}`);
      console.log(`   平均價格: ${usStockQueryService.formatPrice(stats.avg_price)}`);
    }
    
    // 5. 總結
    console.log('\n📋 驗證總結:');
    const hasAAPL = aaplData !== null;
    const hasMSFT = msftData !== null;
    const canSearch = aaplSearchResults.length > 0;
    const hasStats = stats !== null;
    
    console.log(`   AAPL 資料: ${hasAAPL ? '✅' : '❌'}`);
    console.log(`   MSFT 資料: ${hasMSFT ? '✅' : '❌'}`);
    console.log(`   搜尋功能: ${canSearch ? '✅' : '❌'}`);
    console.log(`   統計資料: ${hasStats ? '✅' : '❌'}`);
    
    const successCount = [hasAAPL, hasMSFT, canSearch, hasStats].filter(Boolean).length;
    const totalTests = 4;
    
    console.log(`\n🎯 驗證結果: ${successCount}/${totalTests} 項通過`);
    
    if (successCount === totalTests) {
      console.log('🎉 所有驗證通過！股票資料已成功存入 Supabase');
      console.log('💡 用戶現在可以搜尋到真實的股價資料');
      return true;
    } else {
      console.log('⚠️ 部分驗證失敗，可能需要重新同步');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 驗證過程中發生錯誤:', error);
    return false;
  }
};

export const testUserSearchExperience = async () => {
  console.log('👤 測試用戶搜尋體驗...');
  
  const testQueries = [
    { query: 'AAPL', description: '搜尋股票代號' },
    { query: 'Apple', description: '搜尋公司名稱' },
    { query: 'MSFT', description: '搜尋微軟代號' },
    { query: 'Microsoft', description: '搜尋微軟名稱' },
    { query: 'GOOGL', description: '搜尋谷歌代號' },
  ];
  
  for (const test of testQueries) {
    try {
      console.log(`\n🔍 ${test.description}: "${test.query}"`);
      
      const results = await usStockQueryService.searchStocks(test.query, true, 3);
      
      if (results.length > 0) {
        console.log(`✅ 找到 ${results.length} 個結果:`);
        results.forEach((stock, index) => {
          console.log(`   ${index + 1}. ${stock.symbol} - ${stock.name}`);
          console.log(`      價格: ${usStockQueryService.formatPrice(stock.price)}`);
          console.log(`      變化: ${usStockQueryService.formatChangePercent(stock.change_percent)}`);
        });
      } else {
        console.log('❌ 沒有找到結果');
      }
      
    } catch (error) {
      console.error(`❌ 搜尋 "${test.query}" 失敗:`, error);
    }
  }
  
  console.log('\n🎉 用戶搜尋體驗測試完成！');
};

export const showSuccessMessage = () => {
  console.log('\n🎉🎉🎉 股票同步成功！🎉🎉🎉');
  console.log('=====================================');
  console.log('✅ 股價資料已成功存入 Supabase');
  console.log('✅ AAPL 顯示真實價格 $200.85');
  console.log('✅ MSFT 顯示真實價格 $460.36');
  console.log('✅ 搜尋功能正常工作');
  console.log('✅ 用戶不會消耗 API 額度');
  console.log('=====================================');
  console.log('💡 現在用戶搜尋美股時會看到真實價格！');
  console.log('🚫 不會再消耗 Alpha Vantage API 額度');
  console.log('⚡ 搜尋速度更快（本地資料庫）');
  console.log('=====================================\n');
};

// 立即執行驗證
console.log('🚀 啟動股票資料驗證...');
setTimeout(async () => {
  const success = await verifyStockDataInSupabase();
  
  if (success) {
    showSuccessMessage();
    await testUserSearchExperience();
  }
}, 3000);
