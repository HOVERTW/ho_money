# 🔧 GitHub Actions 工作流程選項修正

## 📊 問題發現

用戶反映在 GitHub Actions 手動觸發時，只看到 4 個選項：
- `tw`
- `tw-batch-1`
- `tw-batch-2`
- `tw-batch-3`

但缺少了：
- `tw-batch-4`
- `tw-batch-5`

## 🔍 問題原因

在 `.github/workflows/update-stocks.yml` 的 `workflow_dispatch` 配置中，`inputs.update_type.options` 只包含了前 3 個批次選項，沒有添加批次 4 和 5。

### ❌ 原來的配置
```yaml
workflow_dispatch:
  inputs:
    update_type:
      options:
        - all
        - tw
        - tw-batch-1
        - tw-batch-2
        - tw-batch-3  # 只到批次 3
        - us
        - rates
```

## ✅ 修正方案

### 1. 添加缺少的批次選項
```yaml
workflow_dispatch:
  inputs:
    update_type:
      options:
        - all
        - tw
        - tw-batch-1
        - tw-batch-2
        - tw-batch-3
        - tw-batch-4  # 新增
        - tw-batch-5  # 新增
        - us
        - rates
```

### 2. 更新每個批次的條件判斷
為每個批次添加對應的單獨執行條件：

```yaml
# 批次 1
if: ${{ ... || github.event.inputs.update_type == 'tw-batch-1' }}

# 批次 2  
if: ${{ ... || github.event.inputs.update_type == 'tw-batch-2' }}

# 批次 3
if: ${{ ... || github.event.inputs.update_type == 'tw-batch-3' }}

# 批次 4
if: ${{ ... || github.event.inputs.update_type == 'tw-batch-4' }}

# 批次 5
if: ${{ ... || github.event.inputs.update_type == 'tw-batch-5' }}
```

### 3. 修正顯示訊息
將批次 1 的結果訊息從 "1/3" 修正為 "1/5"。

## 🎯 修正後的完整選項

現在 GitHub Actions 手動觸發將顯示以下選項：

### 📋 可用選項
1. **`all`** - 執行所有更新（匯率 + 台股 5 批次 + 美股）
2. **`tw`** - 執行所有台股批次（批次 1-5）
3. **`tw-batch-1`** - 只執行台股批次 1
4. **`tw-batch-2`** - 只執行台股批次 2  
5. **`tw-batch-3`** - 只執行台股批次 3
6. **`tw-batch-4`** - 只執行台股批次 4
7. **`tw-batch-5`** - 只執行台股批次 5
8. **`us`** - 只執行美股更新
9. **`rates`** - 只執行匯率更新

### 🔄 執行邏輯

#### 選擇 `all` 或 `tw`
```
匯率更新 → 台股批次1 → 台股批次2 → 台股批次3 → 台股批次4 → 台股批次5 → 美股更新
```

#### 選擇特定批次（如 `tw-batch-3`）
```
只執行台股批次3（獨立執行，不依賴其他批次）
```

#### 選擇 `us`
```
只執行美股更新（獨立執行）
```

#### 選擇 `rates`
```
只執行匯率更新（獨立執行）
```

## 📊 批次覆蓋範圍

### 🎯 每批次處理範圍
```
批次 1: 股票 1-420     (約 420 支)
批次 2: 股票 421-840   (約 420 支)  
批次 3: 股票 841-1260  (約 420 支)
批次 4: 股票 1261-1680 (約 420 支)
批次 5: 股票 1681-2100+ (約 420+ 支)
```

### 📈 總覆蓋範圍
- **總股票數**：2100+ 支
- **代號範圍**：1001 到 9962
- **覆蓋率**：100%

## 🚀 使用建議

### 🔧 開發測試
```bash
# 測試單一批次
選擇 tw-batch-1

# 測試特定範圍
選擇 tw-batch-4 (測試高代號股票)
```

### 📅 日常使用
```bash
# 完整更新
選擇 all

# 只更新台股
選擇 tw

# 緊急修復特定批次
選擇對應的 tw-batch-X
```

### 🛠️ 故障排除
```bash
# 如果某個批次失敗
1. 查看失敗的批次號
2. 選擇對應的 tw-batch-X 重新執行
3. 不需要重新執行整個流程
```

## ✅ 修正完成

### 已更新的檔案
- `.github/workflows/update-stocks.yml`
  - 添加 `tw-batch-4` 和 `tw-batch-5` 選項
  - 更新每個批次的條件判斷
  - 修正顯示訊息

### 預期效果
- ✅ GitHub Actions 手動觸發顯示 9 個選項
- ✅ 可以單獨執行任何批次
- ✅ 可以執行完整的 5 批次流程
- ✅ 靈活的故障排除和測試

## 🎉 現在可以使用

前往 GitHub Actions 頁面，點擊 "Run workflow"，您將看到完整的 9 個選項，包括所有 5 個台股批次！

**修正完成！現在您可以靈活地執行任何批次組合。** 🚀
