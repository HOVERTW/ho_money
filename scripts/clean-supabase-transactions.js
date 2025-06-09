const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = 'https://yrryyapzkgrsahranzvo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicateTransactions() {
  try {
    console.log('🧹 開始清理 Supabase transactions 表...');

    // 1. 檢查當前資料狀況
    console.log('\n📊 檢查當前資料狀況...');
    const { data: allTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*');

    if (fetchError) {
      console.error('❌ 獲取資料失敗:', fetchError);
      return;
    }

    console.log(`📈 總記錄數: ${allTransactions.length}`);

    // 2. 識別無效資料
    const invalidTransactions = allTransactions.filter(t => 
      !t.type || t.type === 'undefined' || t.type === '' || t.type === null
    );

    console.log(`🚫 無效資料數量: ${invalidTransactions.length}`);

    // 3. 識別重複資料
    const transactionMap = new Map();
    const duplicates = [];

    allTransactions.forEach(transaction => {
      const key = `${transaction.amount}-${transaction.category}-${transaction.date}-${transaction.description}-${transaction.type}-${transaction.account}`;
      
      if (transactionMap.has(key)) {
        duplicates.push(transaction);
      } else {
        transactionMap.set(key, transaction);
      }
    });

    console.log(`🔄 重複資料數量: ${duplicates.length}`);

    // 4. 刪除無效資料
    if (invalidTransactions.length > 0) {
      console.log('\n🗑️ 刪除無效資料...');
      
      const invalidIds = invalidTransactions.map(t => t.id);
      const { error: deleteInvalidError } = await supabase
        .from('transactions')
        .delete()
        .in('id', invalidIds);

      if (deleteInvalidError) {
        console.error('❌ 刪除無效資料失敗:', deleteInvalidError);
      } else {
        console.log(`✅ 成功刪除 ${invalidIds.length} 筆無效資料`);
      }
    }

    // 5. 刪除重複資料
    if (duplicates.length > 0) {
      console.log('\n🔄 刪除重複資料...');
      
      const duplicateIds = duplicates.map(t => t.id);
      const { error: deleteDuplicateError } = await supabase
        .from('transactions')
        .delete()
        .in('id', duplicateIds);

      if (deleteDuplicateError) {
        console.error('❌ 刪除重複資料失敗:', deleteDuplicateError);
      } else {
        console.log(`✅ 成功刪除 ${duplicateIds.length} 筆重複資料`);
      }
    }

    // 6. 驗證清理結果
    console.log('\n📊 驗證清理結果...');
    const { data: cleanedTransactions, error: verifyError } = await supabase
      .from('transactions')
      .select('*');

    if (verifyError) {
      console.error('❌ 驗證失敗:', verifyError);
      return;
    }

    console.log(`📈 清理後記錄數: ${cleanedTransactions.length}`);
    console.log(`🧹 清理完成！共清理了 ${allTransactions.length - cleanedTransactions.length} 筆資料`);

    // 7. 顯示剩餘資料的類型分布
    const typeDistribution = {};
    cleanedTransactions.forEach(t => {
      typeDistribution[t.type] = (typeDistribution[t.type] || 0) + 1;
    });

    console.log('\n📊 剩餘資料類型分布:');
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} 筆`);
    });

  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
  }
}

// 執行清理
cleanDuplicateTransactions();
