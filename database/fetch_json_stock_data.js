// 從台灣證交所 JSON API 獲取最新股票資料並存入 Supabase
// 使用官方 OpenAPI 端點，確保獲取最新交易日資料

// 載入環境變數
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// 添加 fetch polyfill for Node.js
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
}

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請設置 SUPABASE_URL 和 SUPABASE_ANON_KEY 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 台灣證交所官方 OpenAPI 端點
const TWSE_JSON_API_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL';

/**
 * 從台灣證交所 JSON API 獲取最新股票資料
 */
async function fetchLatestStockDataJSON() {
  try {
    console.log('🚀 開始從台灣證交所 OpenAPI 獲取最新股票資料...');
    console.log('📡 API 端點:', TWSE_JSON_API_URL);

    const response = await fetch(TWSE_JSON_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const jsonData = await response.json();
    console.log(`✅ 成功獲取 JSON 資料，共 ${jsonData.length || 0} 筆記錄`);

    // 檢查回應標頭中的最後修改時間
    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      console.log(`📅 資料最後更新時間: ${lastModified}`);
    }

    return jsonData;

  } catch (error) {
    console.error('❌ 獲取股票資料失敗:', error);
    throw error;
  }
}

/**
 * 處理 JSON 股票資料
 */
function processJSONStockData(jsonData) {
  try {
    console.log('🔄 開始處理 JSON 股票資料...');

    if (!Array.isArray(jsonData)) {
      throw new Error('API 回應格式不正確，預期為陣列');
    }

    const processedData = [];
    let latestDate = null;

    jsonData.forEach((stock, index) => {
      try {
        // 驗證必要欄位
        if (!stock.Code || !stock.Name || !stock.ClosingPrice || !stock.Date) {
          console.warn(`⚠️ 第 ${index + 1} 筆資料缺少必要欄位，跳過`);
          return;
        }

        // 過濾股票代號（4位數字）
        if (!/^\d{4}$/.test(stock.Code)) {
          return;
        }

        // 解析價格
        const closingPrice = parseFloat(stock.ClosingPrice.replace(/,/g, ''));
        const monthlyAvgPrice = stock.MonthlyAveragePrice ?
          parseFloat(stock.MonthlyAveragePrice.replace(/,/g, '')) : null;

        if (isNaN(closingPrice) || closingPrice <= 0) {
          console.warn(`⚠️ 股票 ${stock.Code} 價格無效: ${stock.ClosingPrice}`);
          return;
        }

        // 記錄最新日期
        if (!latestDate) {
          latestDate = stock.Date;
        }

        processedData.push({
          code: stock.Code.trim(),
          name: stock.Name.trim(),
          market_type: stock.Code.startsWith('00') ? 'ETF' : (stock.Code.startsWith('6') ? 'OTC' : 'TSE'),
          closing_price: closingPrice,
          monthly_average_price: monthlyAvgPrice,
          price_date: stock.Date,
          updated_at: new Date().toISOString()
        });

      } catch (error) {
        console.warn(`⚠️ 處理第 ${index + 1} 筆資料時發生錯誤:`, error.message);
      }
    });

    console.log(`✅ 成功處理 ${processedData.length} 筆有效股票資料`);
    console.log(`📅 最新交易日期: ${latestDate}`);

    return { data: processedData, latestDate };

  } catch (error) {
    console.error('❌ 處理 JSON 資料失敗:', error);
    throw error;
  }
}

/**
 * 批量更新 Supabase 資料庫
 */
async function batchUpdateDatabase(stockData) {
  try {
    console.log(`💾 準備批量更新 ${stockData.length} 筆股票資料到資料庫...`);

    // 分批更新，每次50筆
    const batchSize = 50;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (let i = 0; i < stockData.length; i += batchSize) {
      const batch = stockData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(stockData.length / batchSize);

      console.log(`📦 更新第 ${batchNumber}/${totalBatches} 批，共 ${batch.length} 筆資料...`);

      try {
        const { data, error } = await supabase.rpc('update_daily_stock_prices', {
          stock_data: batch
        });

        if (error) {
          console.error(`❌ 第 ${batchNumber} 批更新失敗:`, error);
          totalErrors += batch.length;
        } else {
          const updatedCount = data || batch.length;
          totalUpdated += updatedCount;
          console.log(`✅ 第 ${batchNumber} 批更新完成: ${updatedCount} 筆`);
        }

        // 短暫延遲避免資料庫負載過重
        if (i + batchSize < stockData.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (batchError) {
        console.error(`❌ 第 ${batchNumber} 批更新失敗:`, batchError);
        totalErrors += batch.length;
      }
    }

    console.log(`🎉 批量更新完成！`);
    console.log(`📊 成功: ${totalUpdated} 筆，失敗: ${totalErrors} 筆`);

    return { updated: totalUpdated, errors: totalErrors };

  } catch (error) {
    console.error('❌ 批量更新資料庫失敗:', error);
    throw error;
  }
}

/**
 * 驗證資料庫更新結果
 */
async function verifyDatabaseUpdate() {
  try {
    console.log('🔍 驗證資料庫更新結果...');

    // 查詢股票總數
    const { data: countData, error: countError } = await supabase
      .from('taiwan_stocks')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 查詢股票總數失敗:', countError);
      return;
    }

    // 查詢最新更新資料
    const { data: latestData, error: latestError } = await supabase
      .from('taiwan_stocks')
      .select('code, name, closing_price, price_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (latestError) {
      console.error('❌ 查詢最新資料失敗:', latestError);
      return;
    }

    console.log(`📊 資料庫中股票總數: ${countData?.length || 0}`);

    if (latestData && latestData.length > 0) {
      console.log(`📅 最新資料日期: ${latestData[0].price_date}`);
      console.log(`⏰ 最後更新時間: ${latestData[0].updated_at}`);

      console.log('\n📋 最新更新的股票範例:');
      latestData.forEach(stock => {
        console.log(`  ${stock.code} ${stock.name}: NT$${stock.closing_price}`);
      });
    }

  } catch (error) {
    console.error('❌ 驗證資料庫失敗:', error);
  }
}

/**
 * 主要執行函數
 */
async function main() {
  const startTime = new Date();

  try {
    console.log('🚀 開始獲取並更新最新台股資料...');
    console.log('⏰ 開始時間:', startTime.toLocaleString('zh-TW'));
    console.log('🌐 使用台灣證交所官方 JSON API');

    // 1. 獲取 JSON 資料
    const jsonData = await fetchLatestStockDataJSON();

    // 2. 處理 JSON 資料
    const { data: processedData, latestDate } = processJSONStockData(jsonData);

    if (processedData.length === 0) {
      throw new Error('沒有有效的股票資料');
    }

    // 3. 批量更新資料庫
    const { updated, errors } = await batchUpdateDatabase(processedData);

    // 4. 驗證更新結果
    await verifyDatabaseUpdate();

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎉 台股資料更新完成！');
    console.log(`📊 更新統計: 成功 ${updated} 筆，失敗 ${errors} 筆`);
    console.log(`📅 資料日期: ${latestDate}`);
    console.log(`⏱️ 執行時間: ${duration} 秒`);
    console.log('⏰ 完成時間:', endTime.toLocaleString('zh-TW'));

    // 顯示成功率
    const successRate = ((updated / (updated + errors)) * 100).toFixed(1);
    console.log(`📈 成功率: ${successRate}%`);

    process.exit(0);

  } catch (error) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    console.error('\n❌ 執行失敗:', error.message);
    console.error(`⏱️ 執行時間: ${duration} 秒`);
    console.error('⏰ 失敗時間:', endTime.toLocaleString('zh-TW'));

    process.exit(1);
  }
}

// 執行主函數
main();
