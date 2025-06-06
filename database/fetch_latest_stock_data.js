// 從台灣證交所 CSV API 獲取最新股票資料
// 使用官方 OpenAPI 端點，確保獲取最新交易日資料

import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 請設置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 台灣證交所官方 OpenAPI 端點
const TWSE_CSV_API_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL';

/**
 * 從台灣證交所 CSV API 獲取最新股票資料
 */
async function fetchLatestStockData() {
  try {
    console.log('🚀 開始從台灣證交所 OpenAPI 獲取最新股票資料...');
    console.log('📡 API 端點:', TWSE_CSV_API_URL);
    
    const response = await fetch(TWSE_CSV_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`✅ 成功獲取 CSV 資料，大小: ${csvText.length} 字符`);
    
    // 檢查回應標頭中的最後修改時間
    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      console.log(`📅 資料最後更新時間: ${lastModified}`);
    }
    
    return csvText;
    
  } catch (error) {
    console.error('❌ 獲取股票資料失敗:', error);
    throw error;
  }
}

/**
 * 解析 CSV 資料
 */
function parseCSVData(csvText) {
  try {
    console.log('🔄 開始解析 CSV 資料...');
    
    const lines = csvText.trim().split('\n');
    console.log(`📊 CSV 總行數: ${lines.length}`);
    
    if (lines.length < 2) {
      throw new Error('CSV 資料格式不正確，行數不足');
    }
    
    // 解析標頭
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 CSV 標頭:', headers);
    
    // 驗證必要欄位
    const requiredFields = ['Date', 'Code', 'Name', 'ClosingPrice'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
      throw new Error(`CSV 缺少必要欄位: ${missingFields.join(', ')}`);
    }
    
    const processedData = [];
    let latestDate = null;
    
    // 解析資料行
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length !== headers.length) {
          console.warn(`⚠️ 第 ${i + 1} 行欄位數量不匹配，跳過`);
          continue;
        }
        
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        
        // 驗證必要資料
        if (!rowData.Code || !rowData.Name || !rowData.ClosingPrice || !rowData.Date) {
          continue;
        }
        
        // 過濾股票代號（4位數字）
        if (!/^\d{4}$/.test(rowData.Code)) {
          continue;
        }
        
        // 解析價格
        const closingPrice = parseFloat(rowData.ClosingPrice.replace(/,/g, ''));
        const monthlyAvgPrice = rowData.MonthlyAveragePrice ? 
          parseFloat(rowData.MonthlyAveragePrice.replace(/,/g, '')) : null;
        
        if (isNaN(closingPrice) || closingPrice <= 0) {
          continue;
        }
        
        // 解析日期
        const dateStr = rowData.Date;
        if (!latestDate) {
          latestDate = dateStr;
        }
        
        processedData.push({
          code: rowData.Code,
          name: rowData.Name,
          closing_price: closingPrice,
          monthly_average_price: monthlyAvgPrice,
          date: dateStr
        });
        
      } catch (error) {
        console.warn(`⚠️ 處理第 ${i + 1} 行時發生錯誤:`, error.message);
      }
    }
    
    console.log(`✅ 成功解析 ${processedData.length} 筆有效股票資料`);
    console.log(`📅 最新交易日期: ${latestDate}`);
    
    return { data: processedData, latestDate };
    
  } catch (error) {
    console.error('❌ 解析 CSV 資料失敗:', error);
    throw error;
  }
}

/**
 * 更新 Supabase 資料庫
 */
async function updateDatabase(stockData) {
  try {
    console.log(`💾 準備更新 ${stockData.length} 筆股票資料到資料庫...`);
    
    // 分批更新，每次50筆（避免 JSON 過大）
    const batchSize = 50;
    let totalUpdated = 0;
    
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
          throw error;
        }
        
        totalUpdated += data || batch.length;
        console.log(`✅ 第 ${batchNumber} 批更新完成`);
        
        // 短暫延遲避免資料庫負載過重
        if (i + batchSize < stockData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (batchError) {
        console.error(`❌ 第 ${batchNumber} 批更新失敗:`, batchError);
        // 繼續處理下一批，不中斷整個流程
      }
    }
    
    console.log(`🎉 資料庫更新完成，共更新 ${totalUpdated} 筆股票資料`);
    return totalUpdated;
    
  } catch (error) {
    console.error('❌ 更新資料庫失敗:', error);
    throw error;
  }
}

/**
 * 驗證資料庫更新結果
 */
async function verifyDatabaseUpdate() {
  try {
    console.log('🔍 驗證資料庫更新結果...');
    
    const { data: countData, error: countError } = await supabase
      .from('taiwan_stocks')
      .select('count(*)', { count: 'exact' });
    
    if (countError) {
      console.error('❌ 查詢股票總數失敗:', countError);
      return;
    }
    
    const { data: latestData, error: latestError } = await supabase
      .from('taiwan_stocks')
      .select('price_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (latestError) {
      console.error('❌ 查詢最新更新時間失敗:', latestError);
      return;
    }
    
    console.log(`📊 資料庫中股票總數: ${countData[0]?.count || 0}`);
    if (latestData && latestData.length > 0) {
      console.log(`📅 最新資料日期: ${latestData[0].price_date}`);
      console.log(`⏰ 最後更新時間: ${latestData[0].updated_at}`);
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
    console.log('🌐 使用台灣證交所官方 OpenAPI');
    
    // 1. 獲取 CSV 資料
    const csvText = await fetchLatestStockData();
    
    // 2. 解析 CSV 資料
    const { data: processedData, latestDate } = parseCSVData(csvText);
    
    if (processedData.length === 0) {
      throw new Error('沒有有效的股票資料');
    }
    
    // 3. 更新資料庫
    const updatedCount = await updateDatabase(processedData);
    
    // 4. 驗證更新結果
    await verifyDatabaseUpdate();
    
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 台股資料更新完成！');
    console.log(`📊 更新統計: ${updatedCount} 筆股票資料`);
    console.log(`📅 資料日期: ${latestDate}`);
    console.log(`⏱️ 執行時間: ${duration} 秒`);
    console.log('⏰ 完成時間:', endTime.toLocaleString('zh-TW'));
    
    // 顯示一些範例資料
    console.log('\n📋 範例股票資料:');
    processedData.slice(0, 10).forEach(stock => {
      const avgPrice = stock.monthly_average_price ? ` (月均: NT$${stock.monthly_average_price})` : '';
      console.log(`  ${stock.code} ${stock.name}: NT$${stock.closing_price}${avgPrice}`);
    });
    
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
