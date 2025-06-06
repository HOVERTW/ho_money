// 從真實 CSV 檔案創建 250 檔為一批的 SQL 檔案
const fs = require('fs');
const path = require('path');

// 讀取 CSV 檔案
const csvFile = path.join(__dirname, '../STOCK_DAY_AVG_ALL (1).json');
console.log('📁 讀取檔案:', csvFile);
const csvContent = fs.readFileSync(csvFile, 'utf8');

// 解析 CSV 資料
const lines = csvContent.trim().split('\n');
const header = lines[0]; // 跳過標題行: 日期,股票代號,股票名稱,收盤價,月平均價
const dataLines = lines.slice(1);

console.log(`📊 總共找到 ${dataLines.length} 檔股票`);
console.log(`📋 標題行: ${header}`);

// 解析每一行資料
const stocks = [];
dataLines.forEach((line, index) => {
  try {
    // 移除引號並分割 CSV
    const cleanLine = line.replace(/"/g, '');
    const parts = cleanLine.split(',');

    if (parts.length >= 4) {
      const date = parts[0];      // 1140529 (民國年格式)
      const code = parts[1];      // 股票代號
      const name = parts[2];      // 股票名稱
      const price = parts[3];     // 收盤價

      // 只處理有效價格的股票 (排除空值)
      if (price && price !== '' && !isNaN(parseFloat(price))) {
        stocks.push({
          code: code,
          name: name,
          price: parseFloat(price),
          date: '2025-05-29' // 轉換為標準日期格式
        });
      } else {
        console.log(`⚠️ 跳過無效價格: ${code} ${name} - 價格: "${price}"`);
      }
    }
  } catch (error) {
    console.log(`⚠️ 第 ${index + 2} 行解析錯誤: ${line}`);
  }
});

console.log(`✅ 成功解析 ${stocks.length} 檔有效股票`);

// 顯示前 10 檔和後 10 檔作為驗證
console.log('\n📈 前 10 檔股票:');
stocks.slice(0, 10).forEach(stock => {
  console.log(`  ${stock.code} ${stock.name} NT$${stock.price}`);
});

console.log('\n📈 後 10 檔股票:');
stocks.slice(-10).forEach(stock => {
  console.log(`  ${stock.code} ${stock.name} NT$${stock.price}`);
});

// 創建批次
const batchSize = 250;
const totalBatches = Math.ceil(stocks.length / batchSize);

console.log(`🎯 將創建 ${totalBatches} 個批次，每批 ${batchSize} 檔`);

// 生成每個批次的 SQL 檔案
for (let i = 0; i < totalBatches; i++) {
  const batchNumber = i + 1;
  const startIndex = i * batchSize;
  const endIndex = Math.min(startIndex + batchSize, stocks.length);
  const batchStocks = stocks.slice(startIndex, endIndex);

  // 生成 SQL 內容
  const sqlContent = `-- 台股目標追蹤清單 - 第${batchNumber}批 ${batchStocks.length} 檔
-- 資料日期：2025-05-29 (民國114年5月29日)
-- 從台灣證交所真實資料生成

INSERT INTO taiwan_stocks (code, name, closing_price, price_date) VALUES
${batchStocks.map(stock =>
  `('${stock.code}', '${stock.name}', ${stock.price}, '${stock.date}')`
).join(',\n')};

-- 查詢驗證
SELECT COUNT(*) as batch_count FROM taiwan_stocks WHERE price_date = '2025-05-29';
SELECT code, name, closing_price FROM taiwan_stocks WHERE price_date = '2025-05-29' ORDER BY code LIMIT 10;`;

  // 寫入檔案
  const fileName = `taiwan_stocks_real_batch${batchNumber}.sql`;
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, sqlContent);

  console.log(`✅ 第${batchNumber}批已生成: ${fileName} (${batchStocks.length} 檔)`);
  console.log(`   範圍: ${batchStocks[0].code} - ${batchStocks[batchStocks.length - 1].code}`);
}

// 生成總結報告
const summaryContent = `# 台股批次生成報告

## 📊 資料統計
- **總股票數**: ${stocks.length} 檔
- **批次數量**: ${totalBatches} 批
- **每批大小**: ${batchSize} 檔
- **資料日期**: 2025-05-29

## 📁 生成檔案
${Array.from({length: totalBatches}, (_, i) => {
  const batchNumber = i + 1;
  const startIndex = i * batchSize;
  const endIndex = Math.min(startIndex + batchSize, stocks.length);
  const batchStocks = stocks.slice(startIndex, endIndex);
  return `- **第${batchNumber}批**: taiwan_stocks_real_batch${batchNumber}.sql (${batchStocks.length} 檔)`;
}).join('\n')}

## 🚀 執行順序
1. 先執行資料庫架構: \`taiwan_stocks_schema.sql\`
2. 依序執行批次檔案: \`taiwan_stocks_real_batch1.sql\` 到 \`taiwan_stocks_real_batch${totalBatches}.sql\`

## 📈 股票類型分布
- **ETF**: ${stocks.filter(s => s.code.startsWith('00')).length} 檔
- **一般股票**: ${stocks.filter(s => !s.code.startsWith('00')).length} 檔

## 💰 價格範圍
- **最高價**: NT$${Math.max(...stocks.map(s => s.price)).toLocaleString()}
- **最低價**: NT$${Math.min(...stocks.map(s => s.price)).toLocaleString()}
- **平均價**: NT$${(stocks.reduce((sum, s) => sum + s.price, 0) / stocks.length).toFixed(2)}
`;

fs.writeFileSync(path.join(__dirname, 'batch_generation_report.md'), summaryContent);

console.log(`\n🎉 批次生成完成！`);
console.log(`📋 詳細報告已生成: batch_generation_report.md`);
console.log(`\n📊 統計資訊:`);
console.log(`   總股票數: ${stocks.length} 檔`);
console.log(`   批次數量: ${totalBatches} 批`);
console.log(`   ETF 數量: ${stocks.filter(s => s.code.startsWith('00')).length} 檔`);
console.log(`   一般股票: ${stocks.filter(s => !s.code.startsWith('00')).length} 檔`);
console.log(`   價格範圍: NT$${Math.min(...stocks.map(s => s.price))} - NT$${Math.max(...stocks.map(s => s.price)).toLocaleString()}`);
