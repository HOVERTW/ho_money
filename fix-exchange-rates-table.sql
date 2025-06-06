-- 修正 exchange_rates 資料表結構
-- 問題：缺少 base_currency 等欄位

-- 步驟 1：檢查當前資料表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'exchange_rates'
ORDER BY ordinal_position;

-- 步驟 2：如果資料表不存在，創建完整的資料表
CREATE TABLE IF NOT EXISTS exchange_rates (
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

-- 步驟 3：如果資料表存在但缺少欄位，添加缺少的欄位
ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS target_currency VARCHAR(3) DEFAULT 'TWD',
ADD COLUMN IF NOT EXISTS rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS spot_buy DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS spot_sell DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS rate_date DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 步驟 4：創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates(rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_pair 
ON exchange_rates(base_currency, target_currency);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_unique_daily 
ON exchange_rates(base_currency, target_currency, rate_date);

-- 步驟 5：設置 RLS (Row Level Security) 政策
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取匯率資料
CREATE POLICY IF NOT EXISTS "Allow read access to exchange rates" 
ON exchange_rates FOR SELECT 
USING (true);

-- 允許服務角色寫入匯率資料
CREATE POLICY IF NOT EXISTS "Allow service role to insert exchange rates" 
ON exchange_rates FOR INSERT 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role to update exchange rates" 
ON exchange_rates FOR UPDATE 
USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role to delete exchange rates" 
ON exchange_rates FOR DELETE 
USING (true);

-- 步驟 6：插入測試資料（如果表是空的）
INSERT INTO exchange_rates (
    base_currency, 
    target_currency, 
    rate, 
    spot_buy, 
    spot_sell, 
    source, 
    rate_date
) 
SELECT 
    'USD', 
    'TWD', 
    31.5, 
    31.437, 
    31.563, 
    '初始化資料', 
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM exchange_rates 
    WHERE base_currency = 'USD' 
    AND target_currency = 'TWD' 
    AND rate_date = CURRENT_DATE
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
SELECT * FROM exchange_rates 
ORDER BY rate_date DESC, updated_at DESC 
LIMIT 5;
