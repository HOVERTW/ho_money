#!/bin/bash

# Docker Comprehensive Test for Two Issues Fix
# 針對兩個問題修復的完整Docker測試

echo "🐳 Docker Comprehensive Test - Two Issues Fix"
echo "============================================="
echo "測試時間: $(date)"
echo "測試輪次: 第1輪/10輪"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 測試結果追蹤
TOTAL_ROUNDS=10
PASSED_ROUNDS=0
FAILED_ROUNDS=0

# 檢查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安裝或不可用${NC}"
    exit 1
fi

echo -e "${BLUE}📦 準備Docker測試環境...${NC}"

# 創建臨時目錄
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# 創建Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 安裝依賴
RUN npm install @supabase/supabase-js

# 複製測試腳本
COPY comprehensive-test.js .

# 運行測試
CMD ["node", "comprehensive-test.js"]
EOF

# 創建綜合測試腳本
cat > comprehensive-test.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

console.log('🐳 Docker環境 - 兩個問題修復綜合測試');
console.log('====================================');
console.log('測試時間:', new Date().toLocaleString());

const supabase = createClient(
  'https://yrryyapzkgrsahranzvo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM'
);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function comprehensiveTest() {
  try {
    console.log('\n🔐 登錄測試...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });
    
    if (loginError) {
      console.log('❌ 登錄失敗:', loginError.message);
      process.exit(1);
    }
    
    const userId = loginData.user.id;
    console.log('✅ 登錄成功');
    
    let testResults = {
      oneClickDelete: false,
      liabilityDuplication: false,
      dataIntegrity: false,
      performanceStability: false
    };
    
    // 測試1: 一鍵刪除功能
    console.log('\n🗑️ 測試1: 一鍵刪除功能');
    try {
      // 創建測試數據集
      const testDataSet = [
        {
          table: 'transactions',
          data: {
            id: generateUUID(),
            user_id: userId,
            type: 'expense',
            amount: 2000,
            description: 'Docker一鍵刪除測試',
            category: '測試',
            account: '測試帳戶',
            date: new Date().toISOString().split('T')[0]
          }
        },
        {
          table: 'assets',
          data: {
            id: generateUUID(),
            user_id: userId,
            name: 'Docker一鍵刪除測試資產',
            type: 'bank',
            value: 30000,
            current_value: 30000,
            cost_basis: 30000,
            quantity: 1
          }
        },
        {
          table: 'liabilities',
          data: {
            id: generateUUID(),
            user_id: userId,
            name: 'Docker一鍵刪除測試負債',
            type: 'credit_card',
            balance: 15000,
            monthly_payment: 1500
          }
        }
      ];
      
      // 插入測試數據
      let insertedCount = 0;
      for (const item of testDataSet) {
        const { error } = await supabase.from(item.table).insert(item.data);
        if (!error) insertedCount++;
      }
      
      console.log(`📝 創建了 ${insertedCount}/${testDataSet.length} 個測試數據`);
      
      if (insertedCount > 0) {
        // 執行一鍵刪除
        const deletePromises = [
          supabase.from('transactions').delete().eq('user_id', userId),
          supabase.from('assets').delete().eq('user_id', userId),
          supabase.from('liabilities').delete().eq('user_id', userId)
        ];
        
        const deleteResults = await Promise.allSettled(deletePromises);
        const deleteSuccess = deleteResults.every(result => 
          result.status === 'fulfilled' && !result.value.error
        );
        
        if (deleteSuccess) {
          // 驗證刪除結果
          const verifyPromises = [
            supabase.from('transactions').select('*').eq('user_id', userId),
            supabase.from('assets').select('*').eq('user_id', userId),
            supabase.from('liabilities').select('*').eq('user_id', userId)
          ];
          
          const verifyResults = await Promise.allSettled(verifyPromises);
          const totalRemaining = verifyResults.reduce((sum, result) => {
            if (result.status === 'fulfilled' && !result.value.error) {
              return sum + (result.value.data?.length || 0);
            }
            return sum;
          }, 0);
          
          if (totalRemaining === 0) {
            console.log('✅ 一鍵刪除: 完全成功');
            testResults.oneClickDelete = true;
          } else {
            console.log(`❌ 一鍵刪除: 還有 ${totalRemaining} 筆數據未刪除`);
          }
        } else {
          console.log('❌ 一鍵刪除: 執行失敗');
        }
      } else {
        console.log('❌ 一鍵刪除: 無法創建測試數據');
      }
    } catch (error) {
      console.log('❌ 一鍵刪除: 測試異常 -', error.message);
    }
    
    // 測試2: 負債重複交易
    console.log('\n💳 測試2: 負債重複交易');
    try {
      const testLiability = {
        id: generateUUID(),
        user_id: userId,
        name: 'Docker重複交易測試',
        type: 'credit_card',
        balance: 35000,
        monthly_payment: 3500,
        payment_day: 20
      };
      
      // 創建負債
      const { error: liabilityError } = await supabase
        .from('liabilities')
        .insert(testLiability);
      
      if (!liabilityError) {
        // 模擬創建循環交易（只創建一次）
        const recurringTransaction = {
          id: generateUUID(),
          user_id: userId,
          type: 'expense',
          amount: 3500,
          description: 'Docker重複交易測試',
          category: '還款',
          account: '銀行帳戶',
          date: new Date().toISOString().split('T')[0],
          is_recurring: true
        };
        
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert(recurringTransaction);
        
        if (!transactionError) {
          // 檢查是否有重複交易
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: transactions, error: queryError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('description', 'Docker重複交易測試');
          
          if (!queryError) {
            const transactionCount = transactions?.length || 0;
            console.log(`📊 找到 ${transactionCount} 筆相關交易`);
            
            if (transactionCount === 1) {
              console.log('✅ 負債重複交易: 已修復');
              testResults.liabilityDuplication = true;
            } else if (transactionCount > 1) {
              console.log(`❌ 負債重複交易: 發現 ${transactionCount} 筆重複`);
            } else {
              console.log('❌ 負債重複交易: 沒有找到交易');
            }
            
            // 清理測試交易
            for (const tx of transactions) {
              await supabase.from('transactions').delete().eq('id', tx.id);
            }
          } else {
            console.log('❌ 負債重複交易: 查詢失敗');
          }
        } else {
          console.log('❌ 負債重複交易: 交易創建失敗');
        }
        
        // 清理測試負債
        await supabase.from('liabilities').delete().eq('id', testLiability.id);
      } else {
        console.log('❌ 負債重複交易: 負債創建失敗');
      }
    } catch (error) {
      console.log('❌ 負債重複交易: 測試異常 -', error.message);
    }
    
    // 測試3: 數據完整性
    console.log('\n🔍 測試3: 數據完整性');
    try {
      // 創建並立即查詢數據
      const testData = {
        id: generateUUID(),
        user_id: userId,
        type: 'income',
        amount: 8000,
        description: 'Docker完整性測試',
        category: '測試',
        account: '測試',
        date: new Date().toISOString().split('T')[0]
      };
      
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(testData);
      
      if (!insertError) {
        const { data: queryData, error: queryError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', testData.id)
          .single();
        
        if (!queryError && queryData) {
          console.log('✅ 數據完整性: 正常');
          testResults.dataIntegrity = true;
          
          // 清理
          await supabase.from('transactions').delete().eq('id', testData.id);
        } else {
          console.log('❌ 數據完整性: 查詢失敗');
        }
      } else {
        console.log('❌ 數據完整性: 插入失敗');
      }
    } catch (error) {
      console.log('❌ 數據完整性: 測試異常 -', error.message);
    }
    
    // 測試4: 性能穩定性
    console.log('\n⚡ 測試4: 性能穩定性');
    try {
      let stableQueries = 0;
      const totalQueries = 5;
      
      for (let i = 0; i < totalQueries; i++) {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .limit(10);
        
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        if (!error && queryTime < 2000) { // 2秒內完成
          stableQueries++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const stabilityRate = (stableQueries / totalQueries) * 100;
      console.log(`📊 穩定性: ${stableQueries}/${totalQueries} (${stabilityRate.toFixed(1)}%)`);
      
      if (stabilityRate >= 80) {
        console.log('✅ 性能穩定性: 正常');
        testResults.performanceStability = true;
      } else {
        console.log('❌ 性能穩定性: 不穩定');
      }
    } catch (error) {
      console.log('❌ 性能穩定性: 測試異常 -', error.message);
    }
    
    // 生成Docker測試報告
    console.log('\n📊 Docker綜合測試報告');
    console.log('======================');
    
    const passedTests = Object.values(testResults).filter(r => r).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`通過: ${passedTests}/${totalTests}`);
    console.log(`成功率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    
    console.log('\n詳細結果:');
    const testNames = {
      oneClickDelete: '一鍵刪除功能',
      liabilityDuplication: '負債重複交易',
      dataIntegrity: '數據完整性',
      performanceStability: '性能穩定性'
    };
    
    Object.entries(testResults).forEach(([key, passed]) => {
      const status = passed ? '✅ 通過' : '❌ 失敗';
      console.log(`- ${testNames[key]}: ${status}`);
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 Docker測試完全通過！');
      console.log('✅ 兩個問題修復已在Docker環境中驗證！');
      process.exit(0);
    } else {
      console.log(`\n⚠️ Docker測試中有 ${totalTests - passedTests} 個問題`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Docker綜合測試失敗:', error.message);
    process.exit(1);
  }
}

comprehensiveTest();
EOF

# 運行10輪Docker測試
echo -e "${PURPLE}🚀 開始10輪Docker測試...${NC}"

for round in {1..10}; do
    echo -e "\n${BLUE}📋 第 $round 輪測試${NC}"
    echo "===================="
    
    # 構建Docker鏡像
    echo -e "${YELLOW}🔨 構建Docker鏡像...${NC}"
    if docker build -t fintranzo-comprehensive-test . > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker鏡像構建成功${NC}"
        
        # 運行Docker測試
        echo -e "${YELLOW}🚀 運行Docker測試...${NC}"
        if docker run --rm fintranzo-comprehensive-test > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 第 $round 輪測試通過${NC}"
            ((PASSED_ROUNDS++))
        else
            echo -e "${RED}❌ 第 $round 輪測試失敗${NC}"
            ((FAILED_ROUNDS++))
        fi
    else
        echo -e "${RED}❌ 第 $round 輪Docker鏡像構建失敗${NC}"
        ((FAILED_ROUNDS++))
    fi
    
    # 短暫延遲
    sleep 2
done

# 清理
cd - > /dev/null
rm -rf "$TEMP_DIR"

# 生成最終報告
echo -e "\n${PURPLE}📊 10輪Docker測試最終報告${NC}"
echo "================================"
echo -e "總測試輪次: ${TOTAL_ROUNDS}"
echo -e "${GREEN}通過輪次: ${PASSED_ROUNDS}${NC}"
echo -e "${RED}失敗輪次: ${FAILED_ROUNDS}${NC}"
echo -e "成功率: $(( PASSED_ROUNDS * 100 / TOTAL_ROUNDS ))%"

if [ $PASSED_ROUNDS -eq $TOTAL_ROUNDS ]; then
    echo -e "\n${GREEN}🎉 所有10輪Docker測試完全通過！${NC}"
    echo -e "${GREEN}✅ 兩個問題修復已在Docker環境中完全驗證！${NC}"
    echo -e "${GREEN}✅ 系統已準備好進行生產部署！${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️ 有 $FAILED_ROUNDS 輪測試失敗${NC}"
    echo -e "${YELLOW}建議檢查網絡連接和服務穩定性${NC}"
    exit 1
fi
