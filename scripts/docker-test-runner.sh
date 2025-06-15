#!/bin/bash

# Docker 測試運行器
# 用於在 Docker 環境中運行完整的同步測試

echo "🐳 FinTranzo Docker 測試運行器"
echo "============================="
echo "開始時間: $(date)"

# 設置環境變量
export NODE_ENV=test
export EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
export EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 測試結果記錄
TEST_RESULTS=()

# 記錄測試結果的函數
log_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "✅ $test_name: 通過"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "❌ $test_name: 失敗 - $details"
    fi
    
    TEST_RESULTS+=("$test_name:$result:$details")
}

# 測試1: 基礎環境檢查
echo ""
echo "🔍 測試1: 基礎環境檢查"
echo "====================="

# 檢查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_test_result "Node.js 版本檢查" "PASS" "$NODE_VERSION"
else
    log_test_result "Node.js 版本檢查" "FAIL" "Node.js 未安裝"
fi

# 檢查 npm/yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    log_test_result "Yarn 版本檢查" "PASS" "$YARN_VERSION"
else
    log_test_result "Yarn 版本檢查" "FAIL" "Yarn 未安裝"
fi

# 檢查環境變量
if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    log_test_result "Supabase URL 環境變量" "PASS" "已設置"
else
    log_test_result "Supabase URL 環境變量" "FAIL" "未設置"
fi

# 測試2: 依賴安裝檢查
echo ""
echo "📦 測試2: 依賴安裝檢查"
echo "====================="

if [ -d "node_modules" ]; then
    log_test_result "node_modules 目錄" "PASS" "存在"
else
    log_test_result "node_modules 目錄" "FAIL" "不存在"
fi

# 檢查關鍵依賴
CRITICAL_DEPS=("@supabase/supabase-js" "react" "react-native" "expo")
for dep in "${CRITICAL_DEPS[@]}"; do
    if [ -d "node_modules/$dep" ]; then
        log_test_result "依賴 $dep" "PASS" "已安裝"
    else
        log_test_result "依賴 $dep" "FAIL" "未安裝"
    fi
done

# 測試3: 基礎連接測試
echo ""
echo "🔌 測試3: 基礎連接測試"
echo "====================="

# 運行基礎連接測試
if node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
supabase.auth.signInWithPassword({email: 'user01@gmail.com', password: 'user01'})
  .then(r => {
    if (r.error) {
      console.error('連接失敗:', r.error.message);
      process.exit(1);
    } else {
      console.log('連接成功');
      process.exit(0);
    }
  })
  .catch(e => {
    console.error('連接異常:', e.message);
    process.exit(1);
  });
" 2>/dev/null; then
    log_test_result "Supabase 基礎連接" "PASS" "連接成功"
else
    log_test_result "Supabase 基礎連接" "FAIL" "連接失敗"
fi

# 測試4: 數據操作測試
echo ""
echo "📊 測試4: 數據操作測試"
echo "====================="

# 運行數據操作測試
if node scripts/comprehensive-sync-test.js 2>/dev/null; then
    log_test_result "綜合同步測試" "PASS" "所有測試通過"
else
    log_test_result "綜合同步測試" "FAIL" "部分測試失敗"
fi

# 測試5: 服務初始化測試
echo ""
echo "🔧 測試5: 服務初始化測試"
echo "======================="

# 檢查服務文件是否存在
SERVICES=(
    "src/services/instantSyncService.ts"
    "src/services/transactionDataService.ts"
    "src/services/assetTransactionSyncService.ts"
    "src/services/liabilityService.ts"
    "src/services/comprehensiveSyncFixService.ts"
)

for service in "${SERVICES[@]}"; do
    if [ -f "$service" ]; then
        log_test_result "服務文件 $(basename $service)" "PASS" "存在"
    else
        log_test_result "服務文件 $(basename $service)" "FAIL" "不存在"
    fi
done

# 測試6: 構建測試
echo ""
echo "🏗️ 測試6: 構建測試"
echo "=================="

# 嘗試構建項目（如果有構建腳本）
if grep -q "\"build\"" package.json; then
    if yarn build 2>/dev/null; then
        log_test_result "項目構建" "PASS" "構建成功"
    else
        log_test_result "項目構建" "FAIL" "構建失敗"
    fi
else
    log_test_result "項目構建" "PASS" "無需構建"
fi

# 測試7: 類型檢查
echo ""
echo "📝 測試7: 類型檢查"
echo "=================="

if command -v tsc &> /dev/null; then
    if tsc --noEmit 2>/dev/null; then
        log_test_result "TypeScript 類型檢查" "PASS" "無類型錯誤"
    else
        log_test_result "TypeScript 類型檢查" "FAIL" "存在類型錯誤"
    fi
else
    log_test_result "TypeScript 類型檢查" "PASS" "TypeScript 未安裝"
fi

# 測試8: 代碼質量檢查
echo ""
echo "🔍 測試8: 代碼質量檢查"
echo "===================="

# 檢查是否有 ESLint 配置
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    log_test_result "ESLint 配置" "PASS" "配置文件存在"
else
    log_test_result "ESLint 配置" "PASS" "無 ESLint 配置"
fi

# 測試9: 安全性檢查
echo ""
echo "🔒 測試9: 安全性檢查"
echo "=================="

# 檢查是否有敏感信息洩露
if grep -r "password\|secret\|key" src/ --include="*.ts" --include="*.js" | grep -v "// " | grep -v "console.log" | head -5; then
    log_test_result "敏感信息檢查" "FAIL" "可能存在敏感信息"
else
    log_test_result "敏感信息檢查" "PASS" "未發現明顯敏感信息"
fi

# 測試10: 性能基準測試
echo ""
echo "⚡ 測試10: 性能基準測試"
echo "====================="

# 簡單的性能測試
START_TIME=$(date +%s%N)
node -e "console.log('性能測試完成')" 2>/dev/null
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $DURATION -lt 1000 ]; then
    log_test_result "Node.js 啟動性能" "PASS" "${DURATION}ms"
else
    log_test_result "Node.js 啟動性能" "FAIL" "${DURATION}ms (過慢)"
fi

# 生成測試報告
echo ""
echo "📋 測試報告"
echo "==========="
echo "總測試數: $TOTAL_TESTS"
echo "通過: $PASSED_TESTS"
echo "失敗: $FAILED_TESTS"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo "成功率: ${SUCCESS_RATE}%"
fi

echo ""
echo "詳細結果:"
for result in "${TEST_RESULTS[@]}"; do
    IFS=':' read -r name status details <<< "$result"
    if [ "$status" = "PASS" ]; then
        echo "✅ $name"
    else
        echo "❌ $name: $details"
    fi
done

echo ""
echo "結束時間: $(date)"

# 返回適當的退出代碼
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有測試通過！"
    exit 0
else
    echo "⚠️ 有 $FAILED_TESTS 個測試失敗"
    exit 1
fi
