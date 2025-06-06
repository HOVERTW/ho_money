/**
 * 簡化版台股列表導出工具
 * 避免複雜 SQL，直接使用 JavaScript 處理
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 簡化版導出函數
 */
async function simpleExport() {
  try {
    console.log('🔍 正在從 Supabase 獲取台股列表...');
    
    // 獲取所有股票代碼
    const { data: stocks, error } = await supabase
      .from('taiwan_stocks')
      .select('code, name, market_type, closing_price, price_date')
      .order('code');

    if (error) {
      throw new Error(`查詢錯誤: ${error.message}`);
    }

    if (!stocks || stocks.length === 0) {
      console.log('⚠️ 沒有找到任何股票資料');
      return;
    }

    console.log(`✅ 成功獲取 ${stocks.length} 支股票`);
    
    // 分析股票類型
    const etfs = stocks.filter(s => s.code.match(/^00\d{2}$/));
    const regularStocks = stocks.filter(s => s.code.match(/^\d{4}$/) && !s.code.startsWith('00'));
    const others = stocks.filter(s => !s.code.match(/^00\d{2}$/) && !s.code.match(/^\d{4}$/));
    
    console.log('\n📊 股票分類統計:');
    console.log(`ETF (00xx): ${etfs.length} 支`);
    console.log(`個股 (xxxx): ${regularStocks.length} 支`);
    console.log(`其他格式: ${others.length} 支`);
    
    if (etfs.length > 0) {
      const etfCodes = etfs.map(s => parseInt(s.code)).sort((a, b) => a - b);
      console.log(`ETF 範圍: ${etfCodes[0].toString().padStart(4, '0')} - ${etfCodes[etfCodes.length-1].toString().padStart(4, '0')}`);
    }
    
    if (regularStocks.length > 0) {
      const stockCodes = regularStocks.map(s => parseInt(s.code)).sort((a, b) => a - b);
      console.log(`個股範圍: ${stockCodes[0]} - ${stockCodes[stockCodes.length-1]}`);
    }
    
    // 排序股票（ETF 在前，個股在後）
    const sortedStocks = [...stocks].sort((a, b) => {
      const aIsETF = a.code.match(/^00\d{2}$/);
      const bIsETF = b.code.match(/^00\d{2}$/);
      
      if (aIsETF && bIsETF) {
        return parseInt(a.code) - parseInt(b.code);
      }
      if (aIsETF && !bIsETF) {
        return -1;
      }
      if (!aIsETF && bIsETF) {
        return 1;
      }
      return parseInt(a.code) - parseInt(b.code);
    });
    
    // 導出檔案
    await exportFiles(sortedStocks);
    
    // 顯示分批建議
    showBatchingSuggestion(sortedStocks);
    
    console.log('\n🎉 導出完成！');
    
  } catch (error) {
    console.error('❌ 導出失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 導出檔案
 */
async function exportFiles(stocks) {
  const fs = require('fs').promises;
  
  try {
    console.log('\n📁 正在生成檔案...');
    
    // 1. 純代碼列表 (TXT)
    const codesList = stocks.map(s => s.code).join('\n');
    await fs.writeFile('taiwan_stocks_codes.txt', codesList, 'utf8');
    console.log('✅ taiwan_stocks_codes.txt');
    
    // 2. JavaScript 陣列
    const jsArray = `// 台股代碼列表 (${new Date().toISOString()})
// 總計: ${stocks.length} 支股票

const TAIWAN_STOCKS_CODES = [
${stocks.map(s => `  '${s.code}'`).join(',\n')}
];

module.exports = TAIWAN_STOCKS_CODES;
`;
    await fs.writeFile('taiwan_stocks_codes.js', jsArray, 'utf8');
    console.log('✅ taiwan_stocks_codes.js');
    
    // 3. JSON 格式
    const jsonData = {
      export_date: new Date().toISOString(),
      total_count: stocks.length,
      stocks: stocks
    };
    await fs.writeFile('taiwan_stocks_export.json', JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('✅ taiwan_stocks_export.json');
    
    // 4. CSV 格式
    const csvHeader = 'code,name,market_type,closing_price,price_date\n';
    const csvRows = stocks.map(s => 
      `${s.code},"${(s.name || '').replace(/"/g, '""')}",${s.market_type || ''},${s.closing_price || ''},${s.price_date || ''}`
    ).join('\n');
    await fs.writeFile('taiwan_stocks_export.csv', csvHeader + csvRows, 'utf8');
    console.log('✅ taiwan_stocks_export.csv');
    
  } catch (error) {
    console.error('❌ 檔案生成失敗:', error.message);
  }
}

/**
 * 顯示分批處理建議
 */
function showBatchingSuggestion(stocks) {
  console.log('\n🔧 分批處理建議:');
  console.log('==================');
  
  const totalStocks = stocks.length;
  const batchCount = 5;
  const stocksPerBatch = Math.ceil(totalStocks / batchCount);
  const estimatedMinutes = Math.ceil(totalStocks * 0.2 / 60);
  
  console.log(`總股票數: ${totalStocks}`);
  console.log(`建議批次數: ${batchCount}`);
  console.log(`每批次股票數: ${stocksPerBatch}`);
  console.log(`預估總執行時間: ${estimatedMinutes} 分鐘`);
  
  console.log('\n📋 批次分配:');
  for (let i = 0; i < batchCount; i++) {
    const start = i * stocksPerBatch;
    const end = Math.min(start + stocksPerBatch - 1, totalStocks - 1);
    const batchStocks = stocks.slice(start, start + stocksPerBatch);
    const firstCode = batchStocks[0]?.code || '';
    const lastCode = batchStocks[batchStocks.length - 1]?.code || '';
    
    console.log(`批次 ${i + 1}: 索引 ${start}-${end} (${batchStocks.length} 支) ${firstCode}-${lastCode}`);
  }
  
  console.log('\n💡 更新腳本建議:');
  console.log('在 scripts/update-taiwan-stocks.js 中使用:');
  console.log(`
// 替換現有的 generateTaiwanStockCodes() 函數
const TAIWAN_STOCKS_CODES = require('../taiwan_stocks_codes.js');

function getTaiwanStockCodes() {
  const stocks = TAIWAN_STOCKS_CODES.map(code => ({ code }));
  console.log(\`📊 使用現有股票列表: \${stocks.length} 支\`);
  return stocks;
}
`);
}

/**
 * 檢查熱門股票
 */
async function checkPopularStocks() {
  const popularCodes = ['0050', '0056', '00878', '00929', '00939', '00940', '1101', '2330', '2454'];
  
  const { data: found, error } = await supabase
    .from('taiwan_stocks')
    .select('code, name, closing_price')
    .in('code', popularCodes)
    .order('code');
    
  if (!error && found.length > 0) {
    console.log('\n🌟 熱門股票檢查:');
    found.forEach(stock => {
      console.log(`✅ ${stock.code} - ${stock.name} ($${stock.closing_price || 'N/A'})`);
    });
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 簡化版台股列表導出工具');
  console.log('============================');
  
  // 檢查環境變數
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 請設定 SUPABASE_URL 和 SUPABASE_ANON_KEY 環境變數');
    console.log('\n設定方法:');
    console.log('export SUPABASE_URL="https://your-project.supabase.co"');
    console.log('export SUPABASE_ANON_KEY="your-anon-key"');
    process.exit(1);
  }
  
  await simpleExport();
  await checkPopularStocks();
  
  console.log('\n📋 生成的檔案:');
  console.log('- taiwan_stocks_codes.txt (純代碼列表)');
  console.log('- taiwan_stocks_codes.js (JavaScript 陣列)');
  console.log('- taiwan_stocks_export.json (完整 JSON 資料)');
  console.log('- taiwan_stocks_export.csv (CSV 格式)');
}

// 執行
if (require.main === module) {
  main();
}

module.exports = { simpleExport };
