/**
 * 測試兩層 API 系統（TSE + Fugle）- 不需要 Supabase
 */

// 使用內建的 fetch 或 node-fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
  console.error('❌ 無法載入 fetch:', error.message);
  process.exit(1);
}

// Fugle API 配置
const FUGLE_CONFIG = {
  apiKey: 'ODYxNzdjOTAtN2Q0My00OWFlLTg1ZWYtNWVmOTY3MmY4MGI3IGUyZWQxOWNiLTVjZDItNDZkNC1iOWUyLTExZTc2ZGNhZjlhMw==',
  baseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock',
  rateLimit: 60,
  requestDelay: 1100
};

// 全域變數
let tseApiData = null;
let fugleRequestCount = 0;
let fugleLastResetTime = Date.now();

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 獲取台灣證交所完整資料
 */
async function fetchTSEData() {
  try {
    console.log('🔄 獲取台灣證交所完整資料...');

    const response = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 成功獲取 ${data.length} 支股票的 TSE 資料`);
      return data;
    } else {
      console.log(`⚠️ TSE API 回應異常: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`⚠️ TSE API 連線失敗: ${error.message}`);
    return null;
  }
}

/**
 * 從 TSE 資料中查找股票
 */
function findInTSEData(stockCode) {
  if (!tseApiData) return null;

  const stockData = tseApiData.find(item => item.Code === stockCode);
  if (stockData && stockData.ClosingPrice) {
    const price = parseFloat(stockData.ClosingPrice.replace(/,/g, ''));
    if (!isNaN(price) && price > 0) {
      return {
        code: stockCode,
        name: stockData.Name || stockCode,
        market_type: stockCode.startsWith('00') ? 'ETF' : (stockCode.startsWith('6') ? 'OTC' : 'TSE'),
        closing_price: price,
        change_amount: 0,
        change_percent: 0,
        volume: 0,
        price_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        source: 'TSE'
      };
    }
  }
  return null;
}

/**
 * 檢查 Fugle API 速率限制
 */
async function checkFugleRateLimit() {
  const now = Date.now();
  const timeSinceReset = now - fugleLastResetTime;
  
  if (timeSinceReset >= 60000) {
    fugleRequestCount = 0;
    fugleLastResetTime = now;
  }
  
  if (fugleRequestCount >= FUGLE_CONFIG.rateLimit) {
    const waitTime = 60000 - timeSinceReset;
    console.log(`⏳ Fugle API 達到速率限制，等待 ${Math.ceil(waitTime/1000)} 秒`);
    await delay(waitTime);
    fugleRequestCount = 0;
    fugleLastResetTime = Date.now();
  }
  
  fugleRequestCount++;
}

/**
 * Fugle API 獲取股票價格
 */
async function fetchFromFugleAPI(stockCode) {
  try {
    await checkFugleRateLimit();
    
    const response = await fetch(`${FUGLE_CONFIG.baseUrl}/intraday/quote/${stockCode}`, {
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.closePrice && !data.lastPrice) {
      throw new Error('Missing price data');
    }

    const price = data.closePrice || data.lastPrice;
    
    return {
      code: stockCode,
      name: data.name || stockCode,
      market_type: data.market === 'TSE' ? 'TSE' : (data.market === 'OTC' ? 'OTC' : (stockCode.startsWith('00') ? 'ETF' : 'TSE')),
      closing_price: parseFloat(price),
      change_amount: parseFloat(data.change || 0),
      change_percent: parseFloat(data.changePercent || 0),
      volume: parseInt(data.total?.tradeVolume || 0),
      price_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      source: 'Fugle'
    };
  } catch (error) {
    console.error(`❌ Fugle API 獲取 ${stockCode} 失敗:`, error.message);
    return null;
  }
}

/**
 * 獲取台股價格（兩層 API 策略）
 */
async function fetchTaiwanStockPrice(stockCode) {
  // 第一層：TSE API
  const tseResult = findInTSEData(stockCode);
  if (tseResult) {
    return tseResult;
  }

  // 第二層：Fugle API
  console.log(`🔄 使用 Fugle API 獲取 ${stockCode}`);
  const fugleResult = await fetchFromFugleAPI(stockCode);
  if (fugleResult) {
    return fugleResult;
  }

  console.log(`❌ ${stockCode} 所有 API 都失敗`);
  return null;
}

/**
 * 測試多支股票
 */
async function testMultipleStocks() {
  console.log('\n🧪 測試兩層 API 系統');
  console.log('==================');
  
  // 測試股票列表（包含不同類型）
  const testStocks = [
    '2330',  // 台積電 (應該在 TSE)
    '0050',  // 元大台灣50 (ETF，可能不在 TSE)
    '2454',  // 聯發科 (應該在 TSE)
    '0056',  // 元大高股息 (ETF，可能不在 TSE)
    '2317',  // 鴻海 (應該在 TSE)
    '00878', // 國泰永續高股息 (ETF，可能不在 TSE)
    '6505',  // 台塑化 (OTC，可能不在 TSE)
    '3008',  // 大立光 (應該在 TSE)
    '9999',  // 不存在的股票
    '1234'   // 可能不存在的股票
  ];
  
  let tseCount = 0;
  let fugleCount = 0;
  let failCount = 0;
  const results = [];
  
  for (const stockCode of testStocks) {
    console.log(`\n🔍 測試 ${stockCode}...`);
    
    const result = await fetchTaiwanStockPrice(stockCode);
    
    if (result) {
      results.push(result);
      if (result.source === 'TSE') {
        tseCount++;
        console.log(`✅ ${stockCode}: $${result.closing_price} (${result.name}) [TSE API]`);
      } else if (result.source === 'Fugle') {
        fugleCount++;
        console.log(`✅ ${stockCode}: $${result.closing_price} (${result.name}) [Fugle API]`);
      }
    } else {
      failCount++;
      console.log(`❌ ${stockCode}: 獲取失敗`);
    }
    
    // 短暫等待避免過快請求
    await delay(500);
  }
  
  // 統計結果
  console.log('\n📊 測試結果統計');
  console.log('================');
  console.log(`📈 總測試股票: ${testStocks.length} 支`);
  console.log(`✅ TSE API 成功: ${tseCount} 支 (${((tseCount/testStocks.length)*100).toFixed(1)}%)`);
  console.log(`✅ Fugle API 成功: ${fugleCount} 支 (${((fugleCount/testStocks.length)*100).toFixed(1)}%)`);
  console.log(`❌ 完全失敗: ${failCount} 支 (${((failCount/testStocks.length)*100).toFixed(1)}%)`);
  console.log(`📊 總成功率: ${(((tseCount + fugleCount) / testStocks.length) * 100).toFixed(1)}%`);
  
  if (results.length > 0) {
    console.log('\n🎯 成功獲取的股票:');
    results.forEach(stock => {
      console.log(`  ${stock.code}: ${stock.name} - $${stock.closing_price} [${stock.source}]`);
    });
  }
  
  return {
    total: testStocks.length,
    tse: tseCount,
    fugle: fugleCount,
    fail: failCount,
    successRate: ((tseCount + fugleCount) / testStocks.length) * 100
  };
}

/**
 * 主測試函數
 */
async function main() {
  try {
    console.log('🚀 兩層 API 系統測試');
    console.log('====================');
    console.log('📋 測試配置:');
    console.log(`  第一層: TSE API (台灣證交所)`);
    console.log(`  第二層: Fugle API (付費 API)`);
    console.log(`  移除: Yahoo Finance API (已失效)`);
    
    // 步驟 1: 獲取 TSE 資料
    tseApiData = await fetchTSEData();
    
    if (!tseApiData) {
      console.log('⚠️ TSE API 無法獲取資料，將完全依賴 Fugle API');
    }
    
    // 步驟 2: 測試多支股票
    const result = await testMultipleStocks();
    
    // 步驟 3: 系統評估
    console.log('\n🎯 系統評估');
    console.log('===========');
    
    if (result.successRate >= 80) {
      console.log('🎉 兩層 API 系統工作優秀！');
      console.log('✅ 可以部署到生產環境');
      console.log('✅ TSE API 提供主要覆蓋');
      console.log('✅ Fugle API 提供可靠備用');
    } else if (result.successRate >= 60) {
      console.log('⚠️ 兩層 API 系統基本可用');
      console.log('🔍 建議進一步優化和監控');
    } else {
      console.log('❌ 兩層 API 系統需要改進');
      console.log('🔧 建議檢查 API 配置和網路連接');
    }
    
    // 步驟 4: 建議
    console.log('\n💡 系統建議');
    console.log('===========');
    
    if (result.tse > 0) {
      console.log(`✅ TSE API 工作正常，覆蓋 ${result.tse} 支股票`);
    } else {
      console.log('⚠️ TSE API 無法使用，完全依賴 Fugle API');
    }
    
    if (result.fugle > 0) {
      console.log(`✅ Fugle API 工作正常，覆蓋 ${result.fugle} 支股票`);
    } else {
      console.log('❌ Fugle API 無法使用，需要檢查 API 金鑰');
    }
    
    if (result.fail > 0) {
      console.log(`⚠️ ${result.fail} 支股票無法獲取，可能是無效代碼`);
    }
    
    console.log(`\n📊 最終統計: TSE(${result.tse}) + Fugle(${result.fugle}) = ${result.tse + result.fugle}/${result.total} (${result.successRate.toFixed(1)}%)`);
    
    if (result.successRate >= 70) {
      console.log('\n🚀 系統準備就緒，可以更新主要腳本！');
    }
    
  } catch (error) {
    console.error('\n💥 測試過程發生錯誤:', error.message);
    console.error('💥 錯誤詳情:', error);
    process.exit(1);
  }
}

// 執行測試
main();
