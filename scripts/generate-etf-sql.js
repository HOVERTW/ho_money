#!/usr/bin/env node

/**
 * 生成美國ETF SQL插入語句
 * 從 CSV 文件讀取數據並生成 SQL 文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 解析 CSV 文件並生成 SQL
 */
function generateETFSQL() {
  try {
    console.log('🎯 美國ETF SQL生成工具');
    console.log('================================');
    
    // CSV 文件路徑
    const csvPath = path.join(__dirname, '../database/美國ETF.csv');
    
    // 檢查文件是否存在
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV 文件不存在: ${csvPath}`);
      return;
    }
    
    // 讀取 CSV 文件
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    const etfData = [];
    
    // 解析每一行
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // 分割 CSV 行，只取前兩個字段
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        const symbol = parts[0].trim();
        const name = parts[1].trim();
        
        // 檢查是否為有效的 ETF 代碼（只包含字母）
        if (symbol && name && /^[A-Z]+$/.test(symbol)) {
          etfData.push({
            symbol: symbol,
            name: name.replace(/'/g, "''") // 轉義單引號
          });
        }
      }
    }
    
    console.log(`✅ 成功解析 ${etfData.length} 個 ETF`);
    
    // 生成 SQL 內容
    let sqlContent = `-- =====================================================
-- 美國ETF數據插入腳本
-- 自動生成於: ${new Date().toISOString()}
-- 總共 ${etfData.length} 個 ETF
-- =====================================================

-- 1. 首先確保表結構正確
DO $$ 
BEGIN
    -- 添加 is_etf 字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'us_stocks' AND column_name = 'is_etf'
    ) THEN
        ALTER TABLE us_stocks ADD COLUMN is_etf BOOLEAN DEFAULT false;
    END IF;
    
    -- 添加 asset_type 字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'us_stocks' AND column_name = 'asset_type'
    ) THEN
        ALTER TABLE us_stocks ADD COLUMN asset_type VARCHAR(20) DEFAULT 'STOCK';
    END IF;
END $$;

-- 2. 插入 ETF 數據
INSERT INTO us_stocks (symbol, name, is_etf, asset_type, sector, is_sp500, created_at, updated_at)
VALUES
`;
    
    // 生成插入語句
    const insertValues = etfData.map((etf, index) => {
      const isLast = index === etfData.length - 1;
      return `    ('${etf.symbol}', '${etf.name}', true, 'ETF', 'ETF', false, NOW(), NOW())${isLast ? ';' : ','}`;
    });
    
    sqlContent += insertValues.join('\n');
    
    // 添加衝突處理
    sqlContent += `

-- 3. 處理重複數據（更新現有記錄）
INSERT INTO us_stocks (symbol, name, is_etf, asset_type, sector, is_sp500, created_at, updated_at)
VALUES
`;
    
    const upsertValues = etfData.map((etf, index) => {
      const isLast = index === etfData.length - 1;
      return `    ('${etf.symbol}', '${etf.name}', true, 'ETF', 'ETF', false, NOW(), NOW())${isLast ? '' : ','}`;
    });
    
    sqlContent += upsertValues.join('\n');
    
    sqlContent += `
ON CONFLICT (symbol) 
DO UPDATE SET
    name = EXCLUDED.name,
    is_etf = true,
    asset_type = 'ETF',
    sector = 'ETF',
    updated_at = NOW();

-- 4. 創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_us_stocks_is_etf ON us_stocks(is_etf);
CREATE INDEX IF NOT EXISTS idx_us_stocks_asset_type ON us_stocks(asset_type);

-- 5. 驗證插入結果
DO $$
DECLARE
    etf_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO etf_count FROM us_stocks WHERE is_etf = true;
    RAISE NOTICE '✅ 成功插入/更新 % 個 ETF', etf_count;
END $$;

-- 6. 顯示前 10 個 ETF
SELECT symbol, name, is_etf, asset_type, created_at 
FROM us_stocks 
WHERE is_etf = true 
ORDER BY symbol 
LIMIT 10;
`;
    
    // 寫入 SQL 文件
    const sqlPath = path.join(__dirname, '../database/us_etf_data.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf-8');
    
    console.log(`📄 SQL 文件已生成: ${sqlPath}`);
    console.log(`📊 包含 ${etfData.length} 個 ETF 的插入語句`);
    
    // 顯示前幾個 ETF 作為預覽
    console.log('\n📋 ETF 數據預覽:');
    etfData.slice(0, 10).forEach((etf, index) => {
      console.log(`${index + 1}. ${etf.symbol} - ${etf.name}`);
    });
    
    if (etfData.length > 10) {
      console.log(`... 還有 ${etfData.length - 10} 個 ETF`);
    }
    
    console.log('\n🎉 SQL 生成完成！');
    console.log('💡 請在 Supabase SQL 編輯器中執行生成的 SQL 文件');
    
  } catch (error) {
    console.error('❌ 生成 SQL 失敗:', error.message);
  }
}

// 執行函數
if (require.main === module) {
  generateETFSQL();
}

module.exports = { generateETFSQL };
