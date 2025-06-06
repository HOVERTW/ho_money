/**
 * GitHub Actions - 台股每日更新腳本
 * 使用台灣證交所官方 API + Yahoo Finance 備用
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

// 全域變數儲存 TSE API 資料
let tseApiData = null;

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
 * 獲取台股價格（智能選擇 API）
 */
async function fetchTaiwanStockPrice(stockCode) {
  // 首先嘗試從 TSE 資料中查找
  const tseResult = findInTSEData(stockCode);
  if (tseResult) {
    return tseResult;
  }

  // 如果 TSE 沒有，使用 Yahoo Finance
  return await fetchFromYahooFinance(stockCode);
}

/**
 * Yahoo Finance 備用 API（改進版）
 */
async function fetchFromYahooFinance(stockCode) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stockCode}.TW`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid response format');
    }

    const result = data.chart.result[0];
    const quote = result.meta;

    if (!quote.regularMarketPrice) {
      throw new Error('Missing price data');
    }

    return {
      code: stockCode,
      name: quote.longName || quote.symbol || stockCode,
      market_type: stockCode.startsWith('00') ? 'ETF' : (stockCode.startsWith('6') ? 'OTC' : 'TSE'),
      closing_price: parseFloat(quote.regularMarketPrice),
      change_amount: parseFloat(quote.regularMarketChange || 0),
      change_percent: parseFloat(quote.regularMarketChangePercent || 0),
      volume: parseInt(quote.regularMarketVolume || 0),
      price_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Yahoo Finance 獲取 ${stockCode} 失敗:`, error.message);
    return null;
  }
}

/**
 * 更新單支股票（帶重試機制）
 */
async function updateSingleStock(stockCode, retryCount = 0) {
  const maxRetries = 2;

  try {
    const priceData = await fetchTaiwanStockPrice(stockCode);

    if (priceData) {
      return { success: true, data: priceData };
    } else {
      throw new Error('無法獲取價格資料');
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`⚠️ ${stockCode} 失敗，重試 ${retryCount + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
      return await updateSingleStock(stockCode, retryCount + 1);
    } else {
      console.error(`❌ ${stockCode} 最終失敗: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * 主要更新函數（改進版）
 */
async function updateTaiwanStocks() {
  try {
    console.log('🚀 台股更新開始');
    console.log('⏰ 執行時間:', new Date().toLocaleString('zh-TW'));

    // 步驟 1：獲取 TSE API 資料
    tseApiData = await fetchTSEData();

    // 步驟 2：獲取所有台股代碼
    const { data: stocks, error } = await supabase
      .from('taiwan_stocks')
      .select('code')
      .order('code');

    if (error) throw error;

    console.log(`📊 需要更新 ${stocks.length} 支台股\n`);

    // 步驟 3：分批更新股票
    let successCount = 0;
    let failCount = 0;
    const failedStocks = [];

    const batchSize = 50; // 減少批次大小以提高成功率

    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      console.log(`🔄 處理第 ${Math.floor(i/batchSize) + 1} 批 (${i + 1}-${Math.min(i + batchSize, stocks.length)})`);

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
        await new Promise(resolve => setTimeout(resolve, 200));
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
      if (i + batchSize < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 步驟 4：記錄更新結果
    const logEntry = {
      operation_type: 'taiwan_stocks_update',
      status: 'completed',
      details: `成功: ${successCount}, 失敗: ${failCount}`,
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

    // 步驟 5：顯示結果
    console.log('\n📊 台股更新完成！');
    console.log('==================');
    console.log(`📈 總股票數: ${stocks.length}`);
    console.log(`✅ 成功更新: ${successCount} (${((successCount/stocks.length)*100).toFixed(1)}%)`);
    console.log(`❌ 更新失敗: ${failCount} (${((failCount/stocks.length)*100).toFixed(1)}%)`);

    if (failedStocks.length > 0 && failedStocks.length <= 10) {
      console.log(`🔍 失敗股票: ${failedStocks.join(', ')}`);
    } else if (failedStocks.length > 10) {
      console.log(`🔍 失敗股票: ${failedStocks.slice(0, 10).join(', ')} 等 ${failedStocks.length} 支`);
    }

    console.log(`📅 更新日期: ${new Date().toISOString().split('T')[0]}`);

    // 如果成功率低於 85%，退出並報錯
    const successRate = (successCount / stocks.length) * 100;
    if (successRate < 85) {
      console.error(`❌ 成功率過低 (${successRate.toFixed(1)}%)，請檢查 API 狀態`);
      process.exit(1);
    }

    console.log('\n🎉 台股更新流程完成！');

  } catch (error) {
    console.error('\n💥 台股更新過程發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行更新
updateTaiwanStocks();
