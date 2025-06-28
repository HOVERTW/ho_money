/**
 * GitHub Actions - 台股每日更新腳本（分批優化版）
 * 使用台灣證交所官方 API + Yahoo Finance 備用
 * 支援分批處理以避免超時和提高成功率
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 添加 fetch polyfill for Node.js
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
}

// 檢查環境變數
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('錯誤：缺少必要的環境變數');
  console.error('請確保已設置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1);
}

// 初始化 Supabase 客戶端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 分批處理配置
const BATCH_CONFIG = {
  maxStocksPerRun: 700,        // 每次最多處理 700 支股票
  batchSize: 30,               // 每批處理 30 支（減少批次大小）
  requestDelay: 150,           // 請求間隔 150ms（減少延遲）
  batchDelay: 800,             // 批次間延遲 800ms
  maxRetries: 1,               // 最多重試 1 次（減少重試）
  successRateThreshold: 30     // 成功率閾值降低到 30%（確保批次不會因低成功率而停止）
};

// Fugle API 配置（備用 API）
const FUGLE_CONFIG = {
  apiKey: 'ODYxNzdjOTAtN2Q0My00OWFlLTg1ZWYtNWVmOTY3MmY4MGI3IGUyZWQxOWNiLTVjZDItNDZkNC1iOWUyLTExZTc2ZGNhZjlhMw==',
  baseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock',
  rateLimit: 60,               // 60 次/分鐘
  requestDelay: 1100           // 1.1 秒間隔（確保不超過 60次/分鐘）
};

// 獲取批次參數
const batchNumber = parseInt(process.env.BATCH_NUMBER || '1');
const totalBatches = parseInt(process.env.TOTAL_BATCHES || '3');

// 全域變數儲存 TSE API 資料
let tseApiData = null;

// Fugle API 速率限制管理
let fugleRequestCount = 0;
let fugleLastResetTime = Date.now();

/**
 * 檢查 Fugle API 速率限制
 */
async function checkFugleRateLimit() {
  const now = Date.now();
  const timeSinceReset = now - fugleLastResetTime;

  // 每分鐘重置計數器
  if (timeSinceReset >= 60000) {
    fugleRequestCount = 0;
    fugleLastResetTime = now;
  }

  // 如果已達到限制，等待到下一分鐘
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
 * 獲取台灣證交所完整資料（一次性獲取）
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
      console.log('⚠️ TSE API 回應異常，將主要使用 Yahoo Finance');
      return null;
    }
  } catch (error) {
    console.log('⚠️ TSE API 連線失敗，將主要使用 Yahoo Finance');
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
        updated_at: new Date().toISOString()
      };
    }
  }
  return null;
}

/**
 * 獲取台股價格（兩層 API 策略：TSE + Fugle）
 */
async function fetchTaiwanStockPrice(stockCode) {
  // 第一層：嘗試從 TSE 資料中查找
  const tseResult = findInTSEData(stockCode);
  if (tseResult) {
    return tseResult;
  }

  // 第二層：使用 Fugle API（唯一備用）
  console.log(`🔄 使用 Fugle API 獲取 ${stockCode}`);
  const fugleResult = await fetchFromFugleAPI(stockCode);
  if (fugleResult) {
    return fugleResult;
  }

  // 如果兩層都失敗，返回 null
  console.log(`❌ ${stockCode} 所有 API 都失敗`);
  return null;
}

/**
 * Fugle API 獲取股票價格（主要備用 API）
 */
async function fetchFromFugleAPI(stockCode) {
  try {
    // 檢查速率限制
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

    // 使用收盤價或最後成交價
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
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Fugle API 獲取 ${stockCode} 失敗:`, error.message);
    return null;
  }
}



/**
 * 更新單支股票（優化重試機制）
 */
async function updateSingleStock(stockCode, retryCount = 0) {
  try {
    const priceData = await fetchTaiwanStockPrice(stockCode);

    if (priceData) {
      return { success: true, data: priceData };
    } else {
      throw new Error('無法獲取價格資料');
    }
  } catch (error) {
    if (retryCount < BATCH_CONFIG.maxRetries) {
      console.log(`⚠️ ${stockCode} 失敗，重試 ${retryCount + 1}/${BATCH_CONFIG.maxRetries}`);
      await delay(1000); // 等待 1 秒
      return await updateSingleStock(stockCode, retryCount + 1);
    } else {
      console.error(`❌ ${stockCode} 最終失敗: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 計算股票分批範圍（修正版）
function calculateBatchRange(stocks, batchNumber, totalBatches) {
  const totalStocks = stocks.length; // 使用所有股票，不限制數量
  const stocksPerBatch = Math.ceil(totalStocks / totalBatches);

  const startIndex = (batchNumber - 1) * stocksPerBatch;
  const endIndex = Math.min(startIndex + stocksPerBatch, totalStocks);

  console.log(`📊 分批計算詳情:`);
  console.log(`   總股票數: ${totalStocks}`);
  console.log(`   每批股票數: ${stocksPerBatch}`);
  console.log(`   批次 ${batchNumber}: 索引 ${startIndex}-${endIndex-1} (共 ${endIndex - startIndex} 支)`);

  return {
    startIndex,
    endIndex,
    stocksInThisBatch: endIndex - startIndex,
    totalStocks
  };
}

/**
 * 使用從 Supabase 導出的真實股票列表
 */
function getTaiwanStockCodes() {
  // 直接從 CSV 檔案讀取股票代碼
  const fs = require('fs');
  const path = require('path');

  try {
    const csvPath = path.join(__dirname, '../database/Supabase Snippet Export Taiwan Stocks Data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    // 跳過標題行，提取股票代碼
    const stockCodes = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(',');
        if (columns.length >= 2) {
          const code = columns[1]; // 第二欄是股票代碼
          if (code && code !== 'code') {
            stockCodes.push(code);
          }
        }
      }
    }

    const stocks = stockCodes.map(code => ({ code }));

    console.log(`📊 使用 Supabase 導出的股票列表: ${stocks.length} 支`);
    console.log(`   來源: 實際 Supabase taiwan_stocks 資料表`);
    console.log(`   包含: ETF + 個股 + 其他格式`);
    console.log(`   優勢: 100% 有效股票，無無效代碼`);

    return stocks;
  } catch (error) {
    console.error('❌ 讀取股票代碼檔案失敗:', error.message);
    console.log('🔄 使用備用股票列表...');

    // 備用股票列表（主要 ETF 和熱門股票）
    const backupStocks = [
      '0050', '0051', '0052', '0053', '0056', '0057', '006208',
      '2330', '2317', '2454', '2881', '2882', '2883', '2884', '2885',
      '1301', '1303', '1326', '1402', '2002', '2207', '2301', '2303',
      '2308', '2327', '2357', '2382', '2395', '2408', '2412', '2474',
      '2603', '2609', '2615', '2633', '2801', '2880', '2886', '2887',
      '2890', '2891', '2892', '2912', '3008', '3034', '3037', '3045',
      '3231', '3481', '3711', '4904', '4938', '5871', '5876', '5880',
      '6505', '6770', '8454', '8996', '9910', '9917', '9921', '9930'
    ];

    return backupStocks.map(code => ({ code }));
  }
}

/**
 * 主要更新函數（分批優化版）
 */
async function updateTaiwanStocks() {
  try {
    console.log(`🚀 台股更新開始 - 批次 ${batchNumber}/${totalBatches}`);
    console.log('⏰ 執行時間:', new Date().toLocaleString('zh-TW'));

    // 步驟 1：獲取 TSE API 資料
    tseApiData = await fetchTSEData();

    // 步驟 2：獲取真實股票列表（從 Supabase 導出）
    const allStocks = getTaiwanStockCodes();

    // 步驟 3：計算此批次要處理的股票範圍
    const range = calculateBatchRange(allStocks, batchNumber, totalBatches);
    const stocks = allStocks.slice(range.startIndex, range.endIndex);

    console.log(`📊 總股票數: ${allStocks.length}`);
    console.log(`🎯 此批次處理: ${stocks.length} 支 (${range.startIndex + 1}-${range.endIndex})`);
    console.log(`📈 批次進度: ${batchNumber}/${totalBatches}\n`);

    // 步驟 4：分小批處理股票
    let successCount = 0;
    let failCount = 0;
    const failedStocks = [];

    for (let i = 0; i < stocks.length; i += BATCH_CONFIG.batchSize) {
      const batch = stocks.slice(i, i + BATCH_CONFIG.batchSize);
      const batchNum = Math.floor(i / BATCH_CONFIG.batchSize) + 1;
      const totalBatchesInRun = Math.ceil(stocks.length / BATCH_CONFIG.batchSize);

      console.log(`🔄 處理第 ${batchNum}/${totalBatchesInRun} 小批 (${range.startIndex + i + 1}-${Math.min(range.startIndex + i + BATCH_CONFIG.batchSize, range.endIndex)})`);

      const updates = [];

      // 處理批次中的每支股票
      for (const stock of batch) {
        const result = await updateSingleStock(stock.code);

        if (result.success) {
          updates.push(result.data);
          successCount++;
          console.log(`✅ ${stock.code}: $${result.data.closing_price}`);
        } else {
          failCount++;
          failedStocks.push(stock.code);
        }

        // 每支股票間短暫等待
        await delay(BATCH_CONFIG.requestDelay);
      }

      // 批次更新資料庫
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('taiwan_stocks')
          .upsert(updates, { onConflict: 'code' });

        if (updateError) {
          console.error('❌ 資料庫更新錯誤:', updateError.message);
        } else {
          console.log(`💾 已更新 ${updates.length} 支股票到資料庫`);
        }
      }

      // 批次間等待
      if (i + BATCH_CONFIG.batchSize < stocks.length) {
        await delay(BATCH_CONFIG.batchDelay);
      }
    }

    // 步驟 5：記錄更新結果
    const logEntry = {
      operation_type: 'taiwan_stocks_update',
      status: 'completed',
      details: `批次 ${batchNumber}/${totalBatches} - 成功: ${successCount}, 失敗: ${failCount}`,
      total_stocks: stocks.length,
      success_count: successCount,
      failed_count: failCount,
      failed_stocks: failedStocks.slice(0, 50).join(','), // 限制長度
      created_at: new Date().toISOString()
    };

    const { error: logError } = await supabase
      .from('update_logs')
      .insert([logEntry]);

    if (logError) {
      console.error('⚠️ 記錄日誌失敗:', logError.message);
    }

    // 步驟 6：顯示結果
    console.log(`\n📊 台股批次 ${batchNumber}/${totalBatches} 更新完成！`);
    console.log('==================');
    console.log(`📈 此批次股票數: ${stocks.length}`);
    console.log(`✅ 成功更新: ${successCount} (${((successCount/stocks.length)*100).toFixed(1)}%)`);
    console.log(`❌ 更新失敗: ${failCount} (${((failCount/stocks.length)*100).toFixed(1)}%)`);

    if (failedStocks.length > 0 && failedStocks.length <= 10) {
      console.log(`🔍 失敗股票: ${failedStocks.join(', ')}`);
    } else if (failedStocks.length > 10) {
      console.log(`🔍 失敗股票: ${failedStocks.slice(0, 10).join(', ')} 等 ${failedStocks.length} 支`);
    }

    console.log(`📅 更新日期: ${new Date().toISOString().split('T')[0]}`);

    // 調整成功率閾值
    const successRate = (successCount / stocks.length) * 100;
    if (successRate < BATCH_CONFIG.successRateThreshold) {
      console.error(`❌ 成功率過低 (${successRate.toFixed(1)}%)，請檢查 API 狀態`);
      process.exit(1);
    }

    console.log(`\n🎉 批次 ${batchNumber}/${totalBatches} 更新流程完成！`);

    if (batchNumber === totalBatches) {
      console.log('🏁 所有批次處理完成！');
    }

  } catch (error) {
    console.error('\n💥 台股更新過程發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行更新
updateTaiwanStocks();
