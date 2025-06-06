/**
 * 處理 Supabase 導出的 CSV 檔案，生成股票代碼列表
 * 用於 GitHub Actions 更新腳本
 */

const fs = require('fs');
const path = require('path');

/**
 * 解析 CSV 檔案
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const stocks = [];
  
  // 找到 code 欄位的索引
  const codeIndex = headers.findIndex(h => h.trim() === 'code');
  const nameIndex = headers.findIndex(h => h.trim() === 'name');
  const marketTypeIndex = headers.findIndex(h => h.trim() === 'market_type');
  
  if (codeIndex === -1) {
    throw new Error('找不到 code 欄位');
  }
  
  // 處理每一行資料
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = line.split(',');
    if (fields.length > codeIndex) {
      const code = fields[codeIndex].trim();
      const name = nameIndex >= 0 ? fields[nameIndex].trim().replace(/"/g, '') : '';
      const marketType = marketTypeIndex >= 0 ? fields[marketTypeIndex].trim() : '';
      
      if (code && code !== 'code') {
        stocks.push({
          code: code,
          name: name,
          market_type: marketType
        });
      }
    }
  }
  
  return stocks;
}

/**
 * 分析股票代碼
 */
function analyzeStocks(stocks) {
  console.log('📊 股票分析結果:');
  console.log('==================');
  
  const etfs = [];
  const regularStocks = [];
  const others = [];
  
  stocks.forEach(stock => {
    const code = stock.code;
    
    // ETF 判斷（更精確的規則）
    if (code.startsWith('00') || stock.market_type === 'ETF') {
      etfs.push(stock);
    }
    // 一般股票（4位數字，不以00開頭）
    else if (code.match(/^\d{4}$/) && !code.startsWith('00')) {
      regularStocks.push(stock);
    }
    // 其他格式
    else {
      others.push(stock);
    }
  });
  
  console.log(`📈 總股票數: ${stocks.length}`);
  console.log(`📊 ETF: ${etfs.length} 支`);
  console.log(`📊 個股: ${regularStocks.length} 支`);
  console.log(`📊 其他: ${others.length} 支`);
  
  // ETF 代碼範例
  if (etfs.length > 0) {
    const etfCodes = etfs.map(s => s.code).sort();
    console.log(`\nETF 範例: ${etfCodes.slice(0, 10).join(', ')}...`);
    console.log(`ETF 範圍: ${etfCodes[0]} - ${etfCodes[etfCodes.length-1]}`);
  }
  
  // 個股代碼範例
  if (regularStocks.length > 0) {
    const stockCodes = regularStocks.map(s => parseInt(s.code)).sort((a, b) => a - b);
    console.log(`\n個股範例: ${stockCodes.slice(0, 10).join(', ')}...`);
    console.log(`個股範圍: ${stockCodes[0]} - ${stockCodes[stockCodes.length-1]}`);
  }
  
  // 其他格式範例
  if (others.length > 0) {
    console.log(`\n其他格式範例: ${others.slice(0, 10).map(s => s.code).join(', ')}...`);
  }
  
  return { etfs, regularStocks, others };
}

/**
 * 生成檔案
 */
function generateFiles(stocks, analysis) {
  console.log('\n📁 生成檔案...');
  
  // 排序股票（ETF 在前，個股在後）
  const sortedStocks = [
    ...analysis.etfs.sort((a, b) => a.code.localeCompare(b.code)),
    ...analysis.regularStocks.sort((a, b) => parseInt(a.code) - parseInt(b.code)),
    ...analysis.others.sort((a, b) => a.code.localeCompare(b.code))
  ];
  
  // 1. 生成 JavaScript 陣列檔案
  const jsContent = `/**
 * 台股代碼列表 - 從 Supabase 實際導出
 * 導出時間: ${new Date().toISOString()}
 * 總計: ${stocks.length} 支股票
 * ETF: ${analysis.etfs.length} 支
 * 個股: ${analysis.regularStocks.length} 支
 * 其他: ${analysis.others.length} 支
 */

const TAIWAN_STOCKS_CODES = [
${sortedStocks.map(s => `  '${s.code}'`).join(',\n')}
];

module.exports = TAIWAN_STOCKS_CODES;
`;
  
  fs.writeFileSync('taiwan_stocks_codes_from_supabase.js', jsContent, 'utf8');
  console.log('✅ taiwan_stocks_codes_from_supabase.js');
  
  // 2. 生成純代碼列表
  const codesList = sortedStocks.map(s => s.code).join('\n');
  fs.writeFileSync('taiwan_stocks_codes_from_supabase.txt', codesList, 'utf8');
  console.log('✅ taiwan_stocks_codes_from_supabase.txt');
  
  // 3. 生成 JSON 格式
  const jsonData = {
    export_date: new Date().toISOString(),
    source: 'Supabase taiwan_stocks table',
    total_count: stocks.length,
    etf_count: analysis.etfs.length,
    stock_count: analysis.regularStocks.length,
    other_count: analysis.others.length,
    stocks: sortedStocks
  };
  
  fs.writeFileSync('taiwan_stocks_from_supabase.json', JSON.stringify(jsonData, null, 2), 'utf8');
  console.log('✅ taiwan_stocks_from_supabase.json');
  
  // 4. 生成分批處理資訊
  const batchCount = 5;
  const stocksPerBatch = Math.ceil(stocks.length / batchCount);
  
  console.log('\n🔧 分批處理建議:');
  console.log(`總股票數: ${stocks.length}`);
  console.log(`建議批次數: ${batchCount}`);
  console.log(`每批次股票數: ${stocksPerBatch}`);
  console.log(`預估總執行時間: ${Math.ceil(stocks.length * 0.2 / 60)} 分鐘`);
  
  console.log('\n📋 批次分配:');
  for (let i = 0; i < batchCount; i++) {
    const start = i * stocksPerBatch;
    const end = Math.min(start + stocksPerBatch - 1, stocks.length - 1);
    const batchStocks = sortedStocks.slice(start, start + stocksPerBatch);
    const firstCode = batchStocks[0]?.code || '';
    const lastCode = batchStocks[batchStocks.length - 1]?.code || '';
    
    console.log(`批次 ${i + 1}: 索引 ${start}-${end} (${batchStocks.length} 支) ${firstCode}-${lastCode}`);
  }
  
  return sortedStocks;
}

/**
 * 生成更新腳本的修改建議
 */
function generateUpdateScriptSuggestion(stocks) {
  console.log('\n💡 更新腳本修改建議:');
  console.log('====================');
  
  console.log('在 scripts/update-taiwan-stocks.js 中:');
  console.log(`
// 替換現有的 generateTaiwanStockCodes() 函數
const TAIWAN_STOCKS_CODES = require('../taiwan_stocks_codes_from_supabase.js');

function getTaiwanStockCodes() {
  const stocks = TAIWAN_STOCKS_CODES.map(code => ({ code }));
  console.log(\`📊 使用 Supabase 導出的股票列表: \${stocks.length} 支\`);
  return stocks;
}

// 在主函數中使用
async function updateTaiwanStocks() {
  // 步驟 2：獲取股票列表（使用 Supabase 導出的列表）
  const allStocks = getTaiwanStockCodes();
  
  // 其餘邏輯保持不變...
}
`);
  
  console.log('\n📈 預期改善效果:');
  console.log(`修正前: 處理 9162 支代碼 (大部分無效)`);
  console.log(`修正後: 處理 ${stocks.length} 支代碼 (全部有效)`);
  console.log(`效率提升: ${Math.round((9162 - stocks.length) / 9162 * 100)}%`);
  console.log(`執行時間: 40-50 分鐘 → ${Math.ceil(stocks.length * 0.2 / 60)} 分鐘`);
}

/**
 * 主函數
 */
function main() {
  try {
    console.log('🚀 處理 Supabase 導出的台股資料');
    console.log('================================');
    
    // 讀取 CSV 檔案
    const csvPath = path.join(__dirname, 'database', 'Supabase Snippet Export Taiwan Stocks Data.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ 找不到檔案: ${csvPath}`);
      console.log('請確保 CSV 檔案位於 database/ 目錄下');
      process.exit(1);
    }
    
    console.log(`📂 讀取檔案: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // 解析 CSV
    const stocks = parseCSV(csvContent);
    console.log(`✅ 成功解析 ${stocks.length} 支股票`);
    
    // 分析股票
    const analysis = analyzeStocks(stocks);
    
    // 生成檔案
    const sortedStocks = generateFiles(stocks, analysis);
    
    // 生成修改建議
    generateUpdateScriptSuggestion(stocks);
    
    console.log('\n🎉 處理完成！');
    console.log('\n📋 生成的檔案:');
    console.log('- taiwan_stocks_codes_from_supabase.js (JavaScript 陣列)');
    console.log('- taiwan_stocks_codes_from_supabase.txt (純代碼列表)');
    console.log('- taiwan_stocks_from_supabase.json (完整 JSON 資料)');
    
    console.log('\n🔄 下一步:');
    console.log('1. 檢查生成的檔案');
    console.log('2. 修改 scripts/update-taiwan-stocks.js');
    console.log('3. 測試更新腳本');
    
  } catch (error) {
    console.error('❌ 處理失敗:', error.message);
    process.exit(1);
  }
}

// 執行
if (require.main === module) {
  main();
}

module.exports = { parseCSV, analyzeStocks, generateFiles };
