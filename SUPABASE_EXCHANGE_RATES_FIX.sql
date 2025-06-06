-- 🚨 修正 exchange_rates 資料表結構
-- 解決 GitHub Actions 錯誤：Could not find the 'base_currency' column

-- 步驟 1：檢查當前資料表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'exchange_rates'
ORDER BY ordinal_position;

-- 步驟 2：刪除舊的資料表（如果結構不正確）
DROP TABLE IF EXISTS exchange_rates;

-- 步驟 3：創建正確的 exchange_rates 資料表
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
    rate DECIMAL(10, 4) NOT NULL,
    spot_buy DECIMAL(10, 4) NOT NULL,
    spot_sell DECIMAL(10, 4) NOT NULL,
    source VARCHAR(50) NOT NULL,
    rate_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步驟 4：創建索引以提升查詢效能
CREATE INDEX idx_exchange_rates_date 
ON exchange_rates(rate_date DESC);

CREATE INDEX idx_exchange_rates_currency_pair 
ON exchange_rates(base_currency, target_currency);

CREATE UNIQUE INDEX idx_exchange_rates_unique_daily 
ON exchange_rates(base_currency, target_currency, rate_date);

-- 步驟 5：設置 RLS (Row Level Security) 政策
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取匯率資料
CREATE POLICY "Allow read access to exchange rates" 
ON exchange_rates FOR SELECT 
USING (true);

-- 允許服務角色寫入匯率資料
CREATE POLICY "Allow service role to insert exchange rates" 
ON exchange_rates FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role to update exchange rates" 
ON exchange_rates FOR UPDATE 
USING (true);

CREATE POLICY "Allow service role to delete exchange rates" 
ON exchange_rates FOR DELETE 
USING (true);

-- 步驟 6：插入測試資料
INSERT INTO exchange_rates (
    base_currency, 
    target_currency, 
    rate, 
    spot_buy, 
    spot_sell, 
    source, 
    rate_date
) VALUES (
    'USD', 
    'TWD', 
    31.5, 
    31.437, 
    31.563, 
    '初始化資料', 
    CURRENT_DATE
);

-- 步驟 7：檢查修正後的資料表結構
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'exchange_rates'
ORDER BY ordinal_position;

-- 步驟 8：檢查資料表內容
SELECT * FROM exchange_rates;
