/**
 * 測試美股 API 功能
 */

import { usStockService } from '../services/usStockService';

export const testUSStockAPI = async () => {
  console.log('🧪 開始測試美股 API...');

  try {
    // 測試 1: API 連接測試
    console.log('1️⃣ 測試 Alpha Vantage API 連接...');
    const isConnected = await usStockService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Alpha Vantage API 連接失敗');
      return false;
    }
    console.log('✅ Alpha Vantage API 連接成功');

    // 測試 2: 搜尋功能
    console.log('2️⃣ 測試美股搜尋功能...');
    const searchResults = await usStockService.searchStocks('AAPL');
    
    if (searchResults.length > 0) {
      console.log('✅ 搜尋功能正常，找到結果:', {
        count: searchResults.length,
        first: {
          symbol: searchResults[0].symbol,
          name: searchResults[0].name,
          type: searchResults[0].type,
        }
      });
    } else {
      console.warn('⚠️ 搜尋沒有返回結果');
    }

    // 測試 3: 獲取股票報價
    console.log('3️⃣ 測試獲取 AAPL 股票報價...');
    const quote = await usStockService.getStockQuote('AAPL');
    
    if (quote) {
      console.log('✅ 成功獲取股票報價:', {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        lastUpdated: quote.lastUpdated,
      });
    } else {
      console.warn('⚠️ 無法獲取股票報價');
    }

    // 測試 4: 測試其他熱門股票
    console.log('4️⃣ 測試其他熱門股票...');
    const popularStocks = ['MSFT', 'GOOGL', 'TSLA'];
    
    for (const symbol of popularStocks) {
      const stockQuote = await usStockService.getStockQuote(symbol);
      if (stockQuote) {
        console.log(`✅ ${symbol}: $${stockQuote.price} (${stockQuote.changePercent}%)`);
      } else {
        console.warn(`⚠️ 無法獲取 ${symbol} 報價`);
      }
      
      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 測試 5: 搜尋不同類型的股票
    console.log('5️⃣ 測試搜尋不同類型的股票...');
    const searchQueries = ['Microsoft', 'Tesla', 'Amazon'];
    
    for (const query of searchQueries) {
      const results = await usStockService.searchStocks(query);
      console.log(`🔍 搜尋 "${query}": 找到 ${results.length} 個結果`);
      
      if (results.length > 0) {
        console.log(`   首個結果: ${results[0].symbol} - ${results[0].name}`);
      }
      
      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('🎉 美股 API 測試完成');
    return true;

  } catch (error) {
    console.error('❌ 美股 API 測試失敗:', error);
    return false;
  }
};

// 測試 Alpha Vantage API 限制
export const testAPILimits = async () => {
  console.log('⚠️ 測試 API 限制...');
  console.log('Alpha Vantage 免費版限制:');
  console.log('- 每分鐘最多 5 次請求');
  console.log('- 每天最多 500 次請求');
  console.log('- 建議在請求間加入延遲');
  
  // 測試快速連續請求
  console.log('🔄 測試快速連續請求...');
  const startTime = Date.now();
  
  try {
    const promises = [
      usStockService.getStockQuote('AAPL'),
      usStockService.getStockQuote('MSFT'),
      usStockService.getStockQuote('GOOGL'),
    ];
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`⏱️ 3 個並發請求耗時: ${endTime - startTime}ms`);
    console.log(`✅ 成功獲取 ${results.filter(r => r !== null).length}/3 個報價`);
    
  } catch (error) {
    console.error('❌ 並發請求測試失敗:', error);
  }
};

// 格式化測試結果
export const formatTestResults = (results: any) => {
  return {
    timestamp: new Date().toISOString(),
    apiStatus: results ? '✅ 正常' : '❌ 異常',
    recommendations: [
      '建議在生產環境中實施請求限制',
      '考慮實施本地快取機制',
      '監控 API 使用量避免超出限制',
      '準備備用 API 或降級方案',
    ]
  };
};
