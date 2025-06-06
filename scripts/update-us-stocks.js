/**
 * GitHub Actions - 美股每日更新腳本
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

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

/**
 * 從CSV檔案讀取美股清單
 */
async function readUSStockList() {
  try {
    const csvPath = path.join(__dirname, '../database/美股.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: false,
      skip_empty_lines: true
    });

    return records.map(([symbol, name]) => ({
      symbol: symbol.trim(),
      name: name.trim()
    }));
  } catch (error) {
    console.error('❌ 讀取美股清單失敗:', error);
    throw error;
  }
}

// 從 Yahoo Finance 獲取美股價格
async function fetchUSStockPrice(symbol) {
  try {
    console.log(`🔄 獲取美股 ${symbol} 資料...`);

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
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

    // 驗證必要的資料
    if (!quote.regularMarketPrice) {
      throw new Error('Missing price data');
    }

    return {
      symbol: symbol,
      name: quote.longName || quote.symbol || symbol,
      price: parseFloat(quote.regularMarketPrice),
      open_price: parseFloat(quote.regularMarketOpen || 0),
      high_price: parseFloat(quote.regularMarketDayHigh || 0),
      low_price: parseFloat(quote.regularMarketDayLow || 0),
      volume: parseInt(quote.regularMarketVolume || 0),
      change_amount: parseFloat(quote.regularMarketChange || 0),
      change_percent: parseFloat(quote.regularMarketChangePercent || 0),
      previous_close: parseFloat(quote.previousClose || 0),
      price_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ 獲取 ${symbol} 價格時發生錯誤:`, error.message);
    return null;
  }
}

/**
 * 更新美股資料
 */
async function updateUSStocks() {
  try {
    // 獲取所有美股代碼
    const { data: stocks, error } = await supabase
      .from('us_stocks')
      .select('symbol')
      .order('symbol');

    if (error) throw error;

    console.log(`開始更新 ${stocks.length} 支美股...`);
    let successCount = 0;
    let failCount = 0;

    // 每批處理 100 支股票
    const batchSize = 100;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const updates = [];

      for (const stock of batch) {
        const priceData = await fetchUSStockPrice(stock.symbol);
        if (priceData) {
          updates.push(priceData);
          successCount++;
        } else {
          failCount++;
        }
      }

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('us_stocks')
          .upsert(updates, { onConflict: 'symbol' });

        if (updateError) {
          console.error('更新資料庫時發生錯誤:', updateError);
        }
      }

      // 等待 1 秒以避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 記錄更新結果
    const { error: logError } = await supabase
      .from('update_logs')
      .insert({
        type: 'us_stocks',
        total: stocks.length,
        success: successCount,
        failed: failCount,
        status: 'completed'
      });

    if (logError) {
      console.error('記錄更新日誌時發生錯誤:', logError);
    }

    console.log(`更新完成！成功：${successCount}，失敗：${failCount}`);
  } catch (error) {
    console.error('更新美股時發生錯誤:', error);
    process.exit(1);
  }
}

/**
 * 主函數
 */
async function main() {
  try {
    console.log('🇺🇸 GitHub Actions - 美股更新開始');
    console.log('⏰ 執行時間:', new Date().toLocaleString('zh-TW'));
    
    await updateUSStocks();
    
    console.log('🎉 美股更新完成！');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 執行失敗:', error);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main();
}

module.exports = { updateUSStocks };
