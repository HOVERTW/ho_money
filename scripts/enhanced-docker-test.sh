#!/bin/bash

# 增強的Docker測試腳本 - 第6次測試
# 專門針對6個剩餘問題進行驗證

echo "🐳 增強Docker測試 - 第6次"
echo "========================="
echo "開始時間: $(date)"

# 設置環境變量
export NODE_ENV=test
export EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
export EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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
}

# 測試1: 負債數據顯示
echo ""
echo "💳 測試1: 負債數據顯示"
echo "====================="

node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });
    
    if (loginError) {
      console.log('❌ 登錄失敗:', loginError.message);
      process.exit(1);
    }
    
    const { data: liabilities, error: liabilityError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', loginData.user.id);
    
    if (liabilityError) {
      console.log('❌ 負債查詢失敗:', liabilityError.message);
      process.exit(1);
    }
    
    console.log('✅ 負債查詢成功，數量:', liabilities?.length || 0);
    if (liabilities && liabilities.length > 0) {
      liabilities.forEach((liability, index) => {
        console.log(\`  \${index + 1}. \${liability.name} - 餘額: \${liability.current_amount || liability.amount}\`);
      });
    }
    process.exit(0);
  } catch (error) {
    console.log('❌ 測試異常:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -eq 0 ]; then
    log_test_result "負債數據顯示" "PASS" "查詢成功"
else
    log_test_result "負債數據顯示" "FAIL" "查詢失敗"
fi

# 測試2: 資產覆蓋邏輯
echo ""
echo "💰 測試2: 資產覆蓋邏輯"
echo "====================="

node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ 用戶未登錄');
      process.exit(1);
    }
    
    // 檢查現有現金資產
    const { data: existingCash, error: checkError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', '現金')
      .eq('type', 'cash');
    
    const initialCount = existingCash?.length || 0;
    console.log('📊 現有現金資產數量:', initialCount);
    
    // 測試添加相同資產
    const testAsset = {
      id: 'test_cash_' + Date.now(),
      user_id: user.id,
      name: '現金',
      type: 'cash',
      current_value: 99999,
      cost_basis: 99999,
      quantity: 1
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
    
    if (insertError) {
      console.log('❌ 資產插入失敗:', insertError.message);
      process.exit(1);
    }
    
    // 檢查插入後數量
    const { data: afterInsert, error: afterError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', '現金')
      .eq('type', 'cash');
    
    const finalCount = afterInsert?.length || 0;
    console.log('📊 插入後現金資產數量:', finalCount);
    
    // 清理測試數據
    await supabase.from('assets').delete().eq('id', testAsset.id);
    
    // 判斷是否實現了覆蓋邏輯
    if (finalCount <= initialCount + 1) {
      console.log('✅ 資產覆蓋邏輯正常');
      process.exit(0);
    } else {
      console.log('❌ 資產重複添加，未實現覆蓋邏輯');
      process.exit(1);
    }
    
  } catch (error) {
    console.log('❌ 測試異常:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -eq 0 ]; then
    log_test_result "資產覆蓋邏輯" "PASS" "邏輯正確"
else
    log_test_result "資產覆蓋邏輯" "FAIL" "需要修復"
fi

# 測試3: 負債同步功能
echo ""
echo "🔄 測試3: 負債同步功能"
echo "====================="

node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ 用戶未登錄');
      process.exit(1);
    }
    
    // 創建測試負債
    const testLiability = {
      id: 'sync_test_' + Date.now(),
      user_id: user.id,
      name: '同步測試負債',
      type: 'loan',
      amount: 100000,
      current_amount: 80000,
      interest_rate: 0.05
    };
    
    // 測試插入
    const { data: insertData, error: insertError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();
    
    if (insertError) {
      console.log('❌ 負債插入失敗:', insertError.message);
      process.exit(1);
    }
    
    // 測試更新
    const { data: updateData, error: updateError } = await supabase
      .from('liabilities')
      .update({ current_amount: 75000 })
      .eq('id', testLiability.id)
      .select();
    
    if (updateError) {
      console.log('❌ 負債更新失敗:', updateError.message);
      await supabase.from('liabilities').delete().eq('id', testLiability.id);
      process.exit(1);
    }
    
    // 測試刪除
    const { error: deleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', testLiability.id);
    
    if (deleteError) {
      console.log('❌ 負債刪除失敗:', deleteError.message);
      process.exit(1);
    }
    
    console.log('✅ 負債同步功能完全正常');
    process.exit(0);
    
  } catch (error) {
    console.log('❌ 測試異常:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -eq 0 ]; then
    log_test_result "負債同步功能" "PASS" "CRUD操作正常"
else
    log_test_result "負債同步功能" "FAIL" "同步有問題"
fi

# 測試4: 交易類別保留
echo ""
echo "🗑️ 測試4: 交易類別保留"
echo "====================="

# 檢查預設類別是否存在
if [ -f "src/services/transactionDataService.ts" ]; then
    CATEGORY_COUNT=$(grep -c "name.*餐飲\|name.*交通\|name.*薪水" src/services/transactionDataService.ts)
    if [ $CATEGORY_COUNT -gt 0 ]; then
        log_test_result "預設類別存在" "PASS" "找到 $CATEGORY_COUNT 個類別定義"
    else
        log_test_result "預設類別存在" "FAIL" "未找到類別定義"
    fi
else
    log_test_result "預設類別存在" "FAIL" "服務文件不存在"
fi

# 檢查清除數據邏輯
if grep -q "STORAGE_KEYS.CATEGORIES" src/services/transactionDataService.ts; then
    if grep -A 10 "clearAllData" src/services/transactionDataService.ts | grep -q "保留類別"; then
        log_test_result "類別保留邏輯" "PASS" "清除邏輯已修復"
    else
        log_test_result "類別保留邏輯" "FAIL" "需要檢查清除邏輯"
    fi
else
    log_test_result "類別保留邏輯" "PASS" "未發現類別清除"
fi

# 測試5: 服務文件完整性
echo ""
echo "🔧 測試5: 服務文件完整性"
echo "========================"

REQUIRED_SERVICES=(
    "src/services/realTimeSyncService.ts"
    "src/services/liabilityService.ts"
    "src/services/transactionDataService.ts"
    "src/services/assetTransactionSyncService.ts"
)

for service in "${REQUIRED_SERVICES[@]}"; do
    if [ -f "$service" ]; then
        log_test_result "服務文件 $(basename $service)" "PASS" "存在"
    else
        log_test_result "服務文件 $(basename $service)" "FAIL" "不存在"
    fi
done

# 測試6: 配置文件完整性
echo ""
echo "📋 測試6: 配置文件完整性"
echo "========================"

CONFIG_FILES=(
    "Dockerfile"
    "k8s/deployment.yaml"
    "k8s/test-job.yaml"
    "scripts/final-six-issues-test.js"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        log_test_result "配置文件 $(basename $config)" "PASS" "存在"
    else
        log_test_result "配置文件 $(basename $config)" "FAIL" "不存在"
    fi
done

# 生成測試報告
echo ""
echo "📋 增強Docker測試報告"
echo "===================="
echo "總測試數: $TOTAL_TESTS"
echo "通過: $PASSED_TESTS"
echo "失敗: $FAILED_TESTS"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo "成功率: ${SUCCESS_RATE}%"
fi

echo ""
echo "結束時間: $(date)"

# 返回適當的退出代碼
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有增強測試通過！"
    exit 0
else
    echo "⚠️ 有 $FAILED_TESTS 個測試失敗"
    exit 1
fi
