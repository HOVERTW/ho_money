# 🇺🇸 美國ETF數據庫設置指南

## 📋 **概述**

本指南將幫助您將 438 個美國ETF添加到 Supabase 數據庫中。

## 📁 **文件說明**

- `美國ETF.csv` - 原始ETF數據文件（438個ETF）
- `us_etf_setup.sql` - 數據庫結構設置腳本
- `us_etf_data.sql` - ETF數據插入腳本（自動生成）
- `generate-etf-sql.js` - SQL生成工具
- `import-us-etf.js` - Node.js導入工具（可選）

## 🚀 **快速開始**

### **步驟 1: 設置數據庫結構**

⚠️ **如果遇到函數衝突錯誤，請使用修復版本：**

```sql
-- 使用修復版本（推薦）
\i us_etf_setup_fixed.sql
```

或者使用原版本：

```sql
-- 原版本（可能有函數衝突）
\i us_etf_setup.sql
```

### **步驟 2: 導入ETF數據**

在 Supabase SQL 編輯器中執行：

```sql
-- 執行此文件來插入所有438個ETF數據
\i us_etf_data.sql
```

### **🔧 故障排除**

如果遇到以下錯誤：
```
ERROR: 42P13: cannot change return type of existing function
```

請使用修復版本：`us_etf_setup_fixed.sql`

## 📊 **數據結構**

### **us_stocks 表新增字段**

```sql
-- 新增字段
is_etf BOOLEAN DEFAULT false        -- 是否為ETF
asset_type VARCHAR(20) DEFAULT 'STOCK'  -- 資產類型 (STOCK/ETF)
```

### **ETF 數據示例**

```sql
symbol: 'SPY'
name: '標普500指數ETF-SPDR'
is_etf: true
asset_type: 'ETF'
sector: 'ETF'
is_sp500: false
```

## 🔍 **查詢功能**

### **1. 查看所有ETF**

```sql
SELECT * FROM us_etf_view ORDER BY symbol;
```

### **2. 搜索ETF**

```sql
SELECT * FROM search_us_etf('標普500', 10);
```

### **3. 獲取統計信息**

```sql
SELECT * FROM get_us_stock_stats();
```

### **4. 按分類查看ETF**

```sql
SELECT * FROM us_etf_by_sector;
```

## 📱 **應用程式整合**

### **TypeScript 接口**

```typescript
interface USETF {
  symbol: string;
  name: string;
  sector?: string;
  price?: number;
  change_percent?: number;
  market_cap?: number;
  is_etf: boolean;
  asset_type: 'ETF';
}
```

### **Supabase 查詢示例**

```typescript
// 獲取所有ETF
const { data: etfs } = await supabase
  .from('us_stocks')
  .select('*')
  .eq('is_etf', true)
  .order('symbol');

// 搜索ETF
const { data: searchResults } = await supabase
  .rpc('search_us_etf', {
    search_term: '標普500',
    limit_count: 10
  });
```

## 🛠️ **維護工具**

### **重新生成SQL文件**

```bash
node scripts/generate-etf-sql.js
```

### **使用Node.js導入（可選）**

```bash
# 需要先配置 Supabase 連接信息
node scripts/import-us-etf.js
```

## ✅ **驗證安裝**

執行以下查詢來驗證安裝是否成功：

```sql
-- 檢查ETF總數
SELECT COUNT(*) as etf_count FROM us_stocks WHERE is_etf = true;
-- 應該返回 438

-- 檢查前10個ETF
SELECT symbol, name FROM us_stocks 
WHERE is_etf = true 
ORDER BY symbol 
LIMIT 10;
```

## 📈 **熱門ETF列表**

以下是一些熱門的美國ETF：

| 代碼 | 名稱 | 類型 |
|------|------|------|
| SPY | 標普500指數ETF-SPDR | 大盤指數 |
| QQQ | 納指100ETF-Invesco QQQ Trust | 科技指數 |
| IWM | 羅素2000ETF-iShares | 小盤指數 |
| GLD | 黃金ETF-SPDR | 商品 |
| TLT | 20+年以上美國國債ETF-iShares | 債券 |
| VTI | 整體股市指數ETF-Vanguard | 全市場 |
| ARKK | 創新ETF-ARK | 主題投資 |
| IBIT | 比特幣ETF-iShares | 加密貨幣 |

## 🔧 **故障排除**

### **常見問題**

1. **重複數據錯誤**
   - SQL 腳本使用 `ON CONFLICT` 處理重複數據
   - 重複執行是安全的

2. **權限錯誤**
   - 確保有 `authenticated` 角色權限
   - 檢查 RLS 政策設置

3. **字段不存在錯誤**
   - 先執行 `us_etf_setup.sql`
   - 確保表結構正確

### **重置數據**

```sql
-- 刪除所有ETF數據
DELETE FROM us_stocks WHERE is_etf = true;

-- 重新執行插入腳本
\i us_etf_data.sql
```

## 📞 **支援**

如果遇到問題，請檢查：

1. Supabase 連接是否正常
2. SQL 腳本執行順序是否正確
3. 數據庫權限是否充足
4. CSV 文件是否完整

---

**🎉 完成！現在您的 Supabase 數據庫中已經包含了 438 個美國ETF的完整數據。**
