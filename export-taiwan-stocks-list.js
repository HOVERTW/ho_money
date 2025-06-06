/**
 * 導出 Supabase taiwan_stocks 資料表的股票列表
 * 用於確認現有股票代碼，避免生成不必要的代碼
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 導出台股列表並分析
 */
async function exportTaiwanStocksList() {
  try {
    console.log('🔍 正在導出 Supabase taiwan_stocks 資料表...');
    console.log(`📡 連接到: ${supabaseUrl}`);
    
    // 查詢所有股票代碼和基本資訊
    const { data: stocks, error } = await supabase
      .from('taiwan_stocks')
      .select('code, name, market_type, closing_price, price_date')
      .order('code');

    if (error) {
      throw new Error(`Supabase 查詢錯誤: ${error.message}`);
    }

    if (!stocks || stocks.length === 0) {
      console.log('⚠️ 資料表中沒有找到任何股票資料');
      return;
    }

    console.log(`\n📊 成功導出 ${stocks.length} 支股票`);
    
    // 分析股票代碼分布
    analyzeStockCodes(stocks);
    
    // 導出到檔案
    await exportToFiles(stocks);
    
    // 生成更新腳本建議
    generateUpdateScript(stocks);

  } catch (error) {
    console.error('❌ 導出失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 分析股票代碼分布
 */
function analyzeStockCodes(stocks) {
  console.log('\n📈 股票代碼分析:');
  console.log('==================');
  
  const etfCodes = [];
  const stockCodes = [];
  const otherCodes = [];
  
  stocks.forEach(stock => {
    const code = stock.code;
    if (code.startsWith('00')) {
      etfCodes.push(code);
    } else if (code.match(/^\d{4}$/)) {
      stockCodes.push(code);
    } else {
      otherCodes.push(code);
    }
  });
  
  console.log(`📊 ETF (00xx): ${etfCodes.length} 支`);
  console.log(`📊 個股 (xxxx): ${stockCodes.length} 支`);
  console.log(`📊 其他格式: ${otherCodes.length} 支`);
  
  // ETF 代碼範圍
  if (etfCodes.length > 0) {
    const etfNumbers = etfCodes.map(code => parseInt(code)).sort((a, b) => a - b);
    console.log(`   ETF 範圍: ${etfNumbers[0].toString().padStart(4, '0')} - ${etfNumbers[etfNumbers.length-1].toString().padStart(4, '0')}`);
    console.log(`   ETF 範例: ${etfCodes.slice(0, 5).join(', ')}${etfCodes.length > 5 ? '...' : ''}`);
  }
  
  // 個股代碼範圍
  if (stockCodes.length > 0) {
    const stockNumbers = stockCodes.map(code => parseInt(code)).sort((a, b) => a - b);
    console.log(`   個股範圍: ${stockNumbers[0]} - ${stockNumbers[stockNumbers.length-1]}`);
    console.log(`   個股範例: ${stockCodes.slice(0, 5).join(', ')}${stockCodes.length > 5 ? '...' : ''}`);
  }
  
  // 其他格式
  if (otherCodes.length > 0) {
    console.log(`   其他格式: ${otherCodes.slice(0, 5).join(', ')}${otherCodes.length > 5 ? '...' : ''}`);
  }
}

/**
 * 導出到檔案
 */
async function exportToFiles(stocks) {
  const fs = require('fs').promises;
  
  try {
    // 1. 導出完整列表 (JSON)
    const jsonData = {
      export_date: new Date().toISOString(),
      total_count: stocks.length,
      stocks: stocks
    };
    
    await fs.writeFile('taiwan_stocks_export.json', JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('\n✅ 已導出到: taiwan_stocks_export.json');
    
    // 2. 導出代碼列表 (純文字)
    const codesList = stocks.map(stock => stock.code).join('\n');
    await fs.writeFile('taiwan_stocks_codes.txt', codesList, 'utf8');
    console.log('✅ 已導出到: taiwan_stocks_codes.txt');
    
    // 3. 導出 SQL 格式
    const sqlInserts = stocks.map(stock => 
      `('${stock.code}', '${stock.name?.replace(/'/g, "''")}', '${stock.market_type}', ${stock.closing_price || 0}, '${stock.price_date || new Date().toISOString().split('T')[0]}')`
    ).join(',\n');
    
    const sqlContent = `-- Taiwan Stocks Export (${new Date().toISOString()})
-- Total: ${stocks.length} stocks

INSERT INTO taiwan_stocks (code, name, market_type, closing_price, price_date) VALUES
${sqlInserts};
`;
    
    await fs.writeFile('taiwan_stocks_export.sql', sqlContent, 'utf8');
    console.log('✅ 已導出到: taiwan_stocks_export.sql');
    
    // 4. 導出 JavaScript 陣列格式
    const jsArray = `// Taiwan Stocks List (${new Date().toISOString()})
// Total: ${stocks.length} stocks

const TAIWAN_STOCKS_CODES = [
${stocks.map(stock => `  '${stock.code}'`).join(',\n')}
];

module.exports = TAIWAN_STOCKS_CODES;
`;
    
    await fs.writeFile('taiwan_stocks_codes.js', jsArray, 'utf8');
    console.log('✅ 已導出到: taiwan_stocks_codes.js');
    
  } catch (error) {
    console.error('❌ 檔案導出失敗:', error.message);
  }
}

/**
 * 生成更新腳本建議
 */
function generateUpdateScript(stocks) {
  console.log('\n🔧 更新腳本建議:');
  console.log('==================');
  
  const codes = stocks.map(stock => stock.code);
  
  console.log('方案 1: 直接使用現有列表');
  console.log(`const TAIWAN_STOCKS_CODES = require('./taiwan_stocks_codes.js');`);
  console.log(`// 總計: ${codes.length} 支股票`);
  
  console.log('\n方案 2: 修改現有生成邏輯');
  console.log('建議在 scripts/update-taiwan-stocks.js 中:');
  console.log(`
// 替換現有的 generateTaiwanStockCodes() 函數
async function getTaiwanStockCodes() {
  const { data: stocks, error } = await supabase
    .from('taiwan_stocks')
    .select('code')
    .order('code');
    
  if (error) throw error;
  return stocks;
}
`);
  
  // 分批建議
  const batchSize = Math.ceil(codes.length / 5);
  console.log(`\n📊 分批處理建議 (5 批次):`);
  console.log(`每批次約: ${batchSize} 支股票`);
  console.log(`總執行時間預估: ${Math.ceil(codes.length * 0.2 / 60)} 分鐘`);
}

/**
 * 主要執行函數
 */
async function main() {
  console.log('🚀 台股列表導出工具');
  console.log('====================');
  
  // 檢查環境變數
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 請設定 SUPABASE_URL 和 SUPABASE_ANON_KEY 環境變數');
    process.exit(1);
  }
  
  await exportTaiwanStocksList();
  
  console.log('\n🎉 導出完成！');
  console.log('\n📋 生成的檔案:');
  console.log('- taiwan_stocks_export.json (完整資料)');
  console.log('- taiwan_stocks_codes.txt (代碼列表)');
  console.log('- taiwan_stocks_export.sql (SQL 格式)');
  console.log('- taiwan_stocks_codes.js (JavaScript 陣列)');
}

// 執行
if (require.main === module) {
  main();
}

module.exports = { exportTaiwanStocksList };
