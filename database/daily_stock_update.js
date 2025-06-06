// 每日台股資料自動更新服務
// 可以部署到 Vercel、Netlify Functions 或其他 serverless 平台

import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 使用 service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 台灣證交所 API 端點
const TWSE_API_URL = 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_AVG_ALL';

/**
 * 從台灣證交所獲取股票資料
 */
async function fetchTaiwanStockData() {
  try {
    console.log('📡 正在從台灣證交所獲取股票資料...');

    // 獲取最近的交易日期
    const today = new Date();
    let targetDate = new Date(today);

    // 如果是週末，回推到最近的交易日
    if (targetDate.getDay() === 0) { // 週日
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (targetDate.getDay() === 6) { // 週六
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
    console.log(`🗓️ 目標日期: ${dateStr}`);

    const response = await fetch(`${TWSE_API_URL}?response=json&date=${dateStr}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.twse.com.tw/',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 API 回應狀態:', data.stat);

    if (data.stat !== 'OK') {
      // 如果當日沒有資料，嘗試前一個交易日
      targetDate.setDate(targetDate.getDate() - 1);
      const prevDateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
      console.log(`🔄 嘗試前一交易日: ${prevDateStr}`);

      const prevResponse = await fetch(`${TWSE_API_URL}?response=json&date=${prevDateStr}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          'Referer': 'https://www.twse.com.tw/',
        }
      });

      if (prevResponse.ok) {
        const prevData = await prevResponse.json();
        if (prevData.stat === 'OK') {
          console.log('✅ 使用前一交易日資料');
          return { data: prevData.data || [], date: prevDateStr };
        }
      }

      throw new Error('台灣證交所 API 回應異常，無法獲取股票資料');
    }

    console.log(`✅ 成功獲取 ${data.data?.length || 0} 筆股票資料`);
    return { data: data.data || [], date: dateStr };
  } catch (error) {
    console.error('❌ 獲取台股資料失敗:', error);
    throw error;
  }
}

/**
 * 處理股票資料格式
 */
function processStockData(rawData, dateStr) {
  const processedData = [];

  console.log(`🔄 開始處理 ${rawData.length} 筆原始資料...`);

  rawData.forEach((row, index) => {
    try {
      if (row && Array.isArray(row) && row.length >= 3) {
        // 台灣證交所資料格式：[股票代號, 股票名稱, 收盤價, ...]
        const code = row[0]?.toString().trim();
        const name = row[1]?.toString().trim();
        const closingPriceStr = row[2]?.toString().replace(/,/g, ''); // 移除千分位逗號

        // 驗證資料有效性
        if (code && name && closingPriceStr) {
          const closingPrice = parseFloat(closingPriceStr);

          if (!isNaN(closingPrice) && closingPrice > 0) {
            // 過濾掉非股票代號（如指數等）
            if (/^\d{4}$/.test(code)) { // 台股代號為4位數字
              processedData.push({
                code: code,
                name: name,
                closingprice: closingPrice,
                date: formatDate(dateStr)
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ 處理第 ${index + 1} 筆資料時發生錯誤:`, error.message);
    }
  });

  console.log(`✅ 成功處理 ${processedData.length} 筆有效股票資料`);
  return processedData;
}

/**
 * 格式化日期字串
 */
function formatDate(dateStr) {
  // 將 YYYYMMDD 格式轉換為 YYYY-MM-DD
  if (dateStr && dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * 更新 Supabase 資料庫
 */
async function updateDatabase(stockData) {
  try {
    console.log(`準備更新 ${stockData.length} 筆股票資料...`);

    // 使用批量更新函數
    const { data, error } = await supabase.rpc('update_daily_stock_prices', {
      stock_data: stockData
    });

    if (error) {
      throw error;
    }

    console.log(`成功更新 ${data} 筆股票資料`);
    return data;
  } catch (error) {
    console.error('更新資料庫失敗:', error);
    throw error;
  }
}

/**
 * 清理舊資料
 */
async function cleanupOldData() {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_stock_data');

    if (error) {
      throw error;
    }

    console.log(`清理了 ${data} 筆舊資料`);
    return data;
  } catch (error) {
    console.error('清理舊資料失敗:', error);
    // 清理失敗不影響主要流程
  }
}

/**
 * 主要更新函數
 */
async function updateDailyStockPrices() {
  try {
    console.log('🚀 開始每日台股資料更新...');

    // 1. 獲取最新股票資料
    console.log('📡 正在獲取台股資料...');
    const { data: rawData, date: dateStr } = await fetchTaiwanStockData();

    // 2. 處理資料格式
    console.log('🔄 正在處理資料格式...');
    const processedData = processStockData(rawData, dateStr);

    if (processedData.length === 0) {
      throw new Error('沒有有效的股票資料');
    }

    // 3. 更新資料庫
    console.log('💾 正在更新資料庫...');
    const updatedCount = await updateDatabase(processedData);

    // 4. 清理舊資料
    console.log('🧹 正在清理舊資料...');
    await cleanupOldData();

    console.log('✅ 每日台股資料更新完成！');
    console.log(`📊 更新統計: ${updatedCount} 筆股票資料`);
    console.log(`📅 資料日期: ${formatDate(dateStr)}`);

    return {
      success: true,
      message: `成功更新 ${updatedCount} 筆股票資料`,
      dataDate: formatDate(dateStr),
      stockCount: updatedCount,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 每日台股資料更新失敗:', error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Vercel Serverless Function 導出
export default async function handler(req, res) {
  // 只允許 POST 請求或 GET 請求（用於手動觸發）
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 簡單的 API Key 驗證（可選）
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (process.env.UPDATE_API_KEY && apiKey !== process.env.UPDATE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await updateDailyStockPrices();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Node.js 直接執行（用於本地測試）
if (require.main === module) {
  updateDailyStockPrices()
    .then(result => {
      console.log('結果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('執行失敗:', error);
      process.exit(1);
    });
}
