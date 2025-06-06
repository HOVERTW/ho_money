/**
 * 測試 Fugle API 連接和功能
 */

const fetch = require('node-fetch');

// Fugle API 配置
const FUGLE_CONFIG = {
  apiKey: 'ODYxNzdjOTAtN2Q0My00OWFlLTg1ZWYtNWVmOTY3MmY4MGI3IGUyZWQxOWNiLTVjZDItNDZkNC1iOWUyLTExZTc2ZGNhZjlhMw==',
  baseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock'
};

/**
 * 測試 Fugle API 單一股票
 */
async function testFugleSingleStock(stockCode) {
  try {
    console.log(`\n🔍 測試 Fugle API 獲取 ${stockCode}...`);
    
    const url = `${FUGLE_CONFIG.baseUrl}/intraday/quote/${stockCode}`;
    console.log(`📡 請求 URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`📊 HTTP 狀態: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP 錯誤: ${response.status}`);
      console.error(`❌ 錯誤內容: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ 成功獲取資料`);
    console.log(`📋 原始回應:`, JSON.stringify(data, null, 2));
    
    // 解析資料
    const price = data.closePrice || data.lastPrice;
    if (price) {
      const result = {
        code: stockCode,
        name: data.name || stockCode,
        market_type: data.market === 'TSE' ? 'TSE' : (data.market === 'OTC' ? 'OTC' : 'TSE'),
        closing_price: parseFloat(price),
        change_amount: parseFloat(data.change || 0),
        change_percent: parseFloat(data.changePercent || 0),
        volume: parseInt(data.total?.tradeVolume || 0),
        price_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
      
      console.log(`🎯 解析結果:`, result);
      return result;
    } else {
      console.error(`❌ 無法找到價格資料`);
      return null;
    }
    
  } catch (error) {
    console.error(`💥 請求失敗:`, error.message);
    console.error(`💥 錯誤詳情:`, error);
    return null;
  }
}

/**
 * 測試多支熱門股票
 */
async function testMultipleStocks() {
  console.log('🚀 開始測試 Fugle API');
  console.log('===================');
  
  // 測試股票列表（包含不同類型）
  const testStocks = [
    '2330',  // 台積電 (TSE)
    '0050',  // 元大台灣50 (ETF)
    '2454',  // 聯發科 (TSE)
    '0056',  // 元大高股息 (ETF)
    '2317',  // 鴻海 (TSE)
    '00878', // 國泰永續高股息 (ETF)
    '6505',  // 台塑化 (OTC)
    '3008'   // 大立光 (TSE)
  ];
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (const stockCode of testStocks) {
    const result = await testFugleSingleStock(stockCode);
    
    if (result) {
      successCount++;
      results.push(result);
      console.log(`✅ ${stockCode}: $${result.closing_price} (${result.name})`);
    } else {
      failCount++;
      console.log(`❌ ${stockCode}: 獲取失敗`);
    }
    
    // 等待 1.1 秒避免速率限制
    console.log(`⏳ 等待 1.1 秒...`);
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  
  // 測試結果統計
  console.log('\n📊 測試結果統計');
  console.log('================');
  console.log(`✅ 成功: ${successCount} 支`);
  console.log(`❌ 失敗: ${failCount} 支`);
  console.log(`📈 成功率: ${((successCount / testStocks.length) * 100).toFixed(1)}%`);
  
  if (results.length > 0) {
    console.log('\n🎯 成功獲取的股票:');
    results.forEach(stock => {
      console.log(`  ${stock.code}: ${stock.name} - $${stock.closing_price}`);
    });
  }
  
  return {
    total: testStocks.length,
    success: successCount,
    fail: failCount,
    successRate: (successCount / testStocks.length) * 100,
    results: results
  };
}

/**
 * 測試 API 金鑰有效性
 */
async function testAPIKey() {
  console.log('\n🔑 測試 API 金鑰有效性...');
  
  try {
    // 使用簡單的 ticker 端點測試
    const response = await fetch(`${FUGLE_CONFIG.baseUrl}/intraday/tickers`, {
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json'
      }
    });
    
    console.log(`📊 API 金鑰測試狀態: ${response.status}`);
    
    if (response.status === 401) {
      console.error('❌ API 金鑰無效或已過期');
      return false;
    } else if (response.status === 403) {
      console.error('❌ API 金鑰權限不足');
      return false;
    } else if (response.ok) {
      console.log('✅ API 金鑰有效');
      return true;
    } else {
      console.log(`⚠️ 未知狀態: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('💥 API 金鑰測試失敗:', error.message);
    return false;
  }
}

/**
 * 主測試函數
 */
async function main() {
  try {
    console.log('🧪 Fugle API 完整測試');
    console.log('====================');
    console.log(`📡 API 端點: ${FUGLE_CONFIG.baseUrl}`);
    console.log(`🔑 API 金鑰: ${FUGLE_CONFIG.apiKey.substring(0, 20)}...`);
    
    // 步驟 1: 測試 API 金鑰
    const keyValid = await testAPIKey();
    if (!keyValid) {
      console.error('\n💥 API 金鑰測試失敗，停止測試');
      process.exit(1);
    }
    
    // 步驟 2: 測試多支股票
    const testResult = await testMultipleStocks();
    
    // 步驟 3: 總結和建議
    console.log('\n🎯 測試總結');
    console.log('===========');
    
    if (testResult.successRate >= 80) {
      console.log('🎉 Fugle API 工作正常，可以整合到主系統');
      console.log('✅ 建議：移除 Yahoo Finance API，只使用 TSE + Fugle');
    } else if (testResult.successRate >= 50) {
      console.log('⚠️ Fugle API 部分工作，需要進一步調查');
      console.log('🔍 建議：檢查失敗的股票代碼和錯誤訊息');
    } else {
      console.log('❌ Fugle API 大部分失敗，需要檢查配置');
      console.log('🔧 建議：檢查 API 金鑰、端點 URL 和請求格式');
    }
    
    console.log(`\n📊 最終統計: ${testResult.success}/${testResult.total} 成功 (${testResult.successRate.toFixed(1)}%)`);
    
  } catch (error) {
    console.error('\n💥 測試過程發生錯誤:', error.message);
    console.error('💥 錯誤詳情:', error);
    process.exit(1);
  }
}

// 執行測試
if (require.main === module) {
  main();
}

module.exports = { testFugleSingleStock, testMultipleStocks, testAPIKey };
