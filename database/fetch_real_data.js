// 立即獲取真實台股資料的腳本
// 這個腳本會從台灣證交所獲取實際的股票資料並更新到 Supabase

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// 從環境變數獲取 Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 檢查必要的環境變數
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 請設置 EXPO_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數');
  console.error('💡 請參考 .env.example 檔案設置環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 台灣證交所 API 端點
const TWSE_API_URL = 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_AVG_ALL';

/**
 * 從台灣證交所獲取股票資料
 */
async function fetchRealStockData() {
  try {
    console.log('🚀 開始獲取真實台股資料...');
    
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
    console.log(`📅 目標日期: ${dateStr}`);
    
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
      // 嘗試前一個交易日
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
      
      throw new Error('無法獲取台股資料');
    }
    
    console.log(`✅ 成功獲取 ${data.data?.length || 0} 筆原始資料`);
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
        const code = row[0]?.toString().trim();
        const name = row[1]?.toString().trim();
        const closingPriceStr = row[2]?.toString().replace(/,/g, '');
        
        if (code && name && closingPriceStr) {
          const closingPrice = parseFloat(closingPriceStr);
          
          if (!isNaN(closingPrice) && closingPrice > 0) {
            // 只保留4位數字的股票代號
            if (/^\d{4}$/.test(code)) {
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
    console.log(`💾 準備更新 ${stockData.length} 筆股票資料到資料庫...`);
    
    // 分批更新，每次100筆
    const batchSize = 100;
    let totalUpdated = 0;
    
    for (let i = 0; i < stockData.length; i += batchSize) {
      const batch = stockData.slice(i, i + batchSize);
      
      console.log(`📦 更新第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 筆資料...`);
      
      const { data, error } = await supabase.rpc('update_daily_stock_prices', {
        stock_data: batch
      });
      
      if (error) {
        console.error('❌ 批次更新失敗:', error);
        throw error;
      }
      
      totalUpdated += data || batch.length;
      console.log(`✅ 第 ${Math.floor(i / batchSize) + 1} 批更新完成`);
    }
    
    console.log(`🎉 資料庫更新完成，共更新 ${totalUpdated} 筆股票資料`);
    return totalUpdated;
    
  } catch (error) {
    console.error('❌ 更新資料庫失敗:', error);
    throw error;
  }
}

/**
 * 主要執行函數
 */
async function main() {
  try {
    console.log('🚀 開始獲取並更新真實台股資料...');
    console.log('⏰ 開始時間:', new Date().toLocaleString('zh-TW'));
    
    // 1. 獲取股票資料
    const { data: rawData, date: dateStr } = await fetchRealStockData();
    
    // 2. 處理資料格式
    const processedData = processStockData(rawData, dateStr);
    
    if (processedData.length === 0) {
      throw new Error('沒有有效的股票資料');
    }
    
    // 3. 更新資料庫
    const updatedCount = await updateDatabase(processedData);
    
    console.log('🎉 真實台股資料更新完成！');
    console.log(`📊 更新統計: ${updatedCount} 筆股票資料`);
    console.log(`📅 資料日期: ${formatDate(dateStr)}`);
    console.log('⏰ 完成時間:', new Date().toLocaleString('zh-TW'));
    
    // 顯示一些範例資料
    console.log('\n📋 範例股票資料:');
    processedData.slice(0, 10).forEach(stock => {
      console.log(`  ${stock.code} ${stock.name}: NT$${stock.closingprice}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  }
}

// 執行主函數
main();
