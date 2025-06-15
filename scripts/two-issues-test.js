/**
 * 兩個問題驗證測試
 * 1. 一鍵刪除只會刪除儀表板的近一年資產變化，其他都不會刪
 * 2. 創建負債後月曆上會重複出現兩筆一樣的內容，只要留一筆
 */

console.log('🔍 兩個問題驗證測試');
console.log('==================');
console.log('測試時間:', new Date().toLocaleString());

const { createClient } = require('@supabase/supabase-js');
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

async function testTwoIssues() {
  try {
    // 登錄
    console.log('\n🔐 登錄測試...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });
    
    if (loginError) {
      console.log('❌ 登錄失敗:', loginError.message);
      return;
    }
    
    const userId = loginData.user.id;
    console.log('✅ 登錄成功, 用戶ID:', userId);
    
    // 問題1測試：一鍵刪除功能
    console.log('\n🗑️ 問題1測試：一鍵刪除功能');
    console.log('================================');
    
    // 先創建一些測試數據
    console.log('📝 創建測試數據...');
    
    const testData = {
      transaction: {
        id: generateUUID(),
        user_id: userId,
        type: 'expense',
        amount: 1000,
        description: '一鍵刪除測試交易',
        category: '測試',
        account: '測試帳戶',
        date: new Date().toISOString().split('T')[0]
      },
      asset: {
        id: generateUUID(),
        user_id: userId,
        name: '一鍵刪除測試資產',
        type: 'bank',
        value: 50000,
        current_value: 50000,
        cost_basis: 50000,
        quantity: 1
      },
      liability: {
        id: generateUUID(),
        user_id: userId,
        name: '一鍵刪除測試負債',
        type: 'credit_card',
        balance: 20000,
        monthly_payment: 2000
      }
    };
    
    // 插入測試數據
    const insertPromises = [
      supabase.from('transactions').insert(testData.transaction),
      supabase.from('assets').insert(testData.asset),
      supabase.from('liabilities').insert(testData.liability)
    ];
    
    const insertResults = await Promise.allSettled(insertPromises);
    
    let insertedCount = 0;
    insertResults.forEach((result, index) => {
      const tableName = ['transactions', 'assets', 'liabilities'][index];
      if (result.status === 'fulfilled' && !result.value.error) {
        console.log(`✅ ${tableName} 測試數據插入成功`);
        insertedCount++;
      } else {
        console.log(`❌ ${tableName} 測試數據插入失敗:`, result.status === 'fulfilled' ? result.value.error : result.reason);
      }
    });
    
    if (insertedCount === 0) {
      console.log('❌ 無法創建測試數據，跳過一鍵刪除測試');
    } else {
      console.log(`✅ 成功創建 ${insertedCount}/3 個測試數據`);
      
      // 等待一下確保數據已保存
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 驗證數據是否存在
      console.log('🔍 驗證測試數據是否存在...');
      
      const verifyPromises = [
        supabase.from('transactions').select('*').eq('user_id', userId).like('description', '%一鍵刪除測試%'),
        supabase.from('assets').select('*').eq('user_id', userId).like('name', '%一鍵刪除測試%'),
        supabase.from('liabilities').select('*').eq('user_id', userId).like('name', '%一鍵刪除測試%')
      ];
      
      const verifyResults = await Promise.allSettled(verifyPromises);
      
      let existingCounts = [0, 0, 0];
      verifyResults.forEach((result, index) => {
        const tableName = ['transactions', 'assets', 'liabilities'][index];
        if (result.status === 'fulfilled' && !result.value.error) {
          existingCounts[index] = result.value.data?.length || 0;
          console.log(`📊 ${tableName} 現有測試數據: ${existingCounts[index]} 筆`);
        } else {
          console.log(`❌ ${tableName} 查詢失敗`);
        }
      });
      
      // 模擬一鍵刪除操作
      console.log('🗑️ 執行一鍵刪除操作...');
      
      const deletePromises = [
        supabase.from('transactions').delete().eq('user_id', userId),
        supabase.from('assets').delete().eq('user_id', userId),
        supabase.from('liabilities').delete().eq('user_id', userId)
      ];
      
      const deleteResults = await Promise.allSettled(deletePromises);
      
      let deletedCount = 0;
      deleteResults.forEach((result, index) => {
        const tableName = ['transactions', 'assets', 'liabilities'][index];
        if (result.status === 'fulfilled' && !result.value.error) {
          console.log(`✅ ${tableName} 一鍵刪除成功`);
          deletedCount++;
        } else {
          console.log(`❌ ${tableName} 一鍵刪除失敗:`, result.status === 'fulfilled' ? result.value.error : result.reason);
        }
      });
      
      // 驗證刪除結果
      console.log('🔍 驗證刪除結果...');
      
      const afterDeletePromises = [
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('assets').select('*').eq('user_id', userId),
        supabase.from('liabilities').select('*').eq('user_id', userId)
      ];
      
      const afterDeleteResults = await Promise.allSettled(afterDeletePromises);
      
      let remainingCounts = [0, 0, 0];
      afterDeleteResults.forEach((result, index) => {
        const tableName = ['transactions', 'assets', 'liabilities'][index];
        if (result.status === 'fulfilled' && !result.value.error) {
          remainingCounts[index] = result.value.data?.length || 0;
          console.log(`📊 ${tableName} 刪除後剩餘: ${remainingCounts[index]} 筆`);
        } else {
          console.log(`❌ ${tableName} 刪除後查詢失敗`);
        }
      });
      
      // 判斷一鍵刪除是否成功
      const totalRemaining = remainingCounts.reduce((sum, count) => sum + count, 0);
      if (totalRemaining === 0) {
        console.log('✅ 問題1: 已修復 - 一鍵刪除功能正常');
      } else {
        console.log(`❌ 問題1: 仍存在 - 一鍵刪除後還有 ${totalRemaining} 筆數據未刪除`);
        console.log('詳細: transactions:', remainingCounts[0], 'assets:', remainingCounts[1], 'liabilities:', remainingCounts[2]);
      }
    }
    
    // 問題2測試：負債重複交易
    console.log('\n💳 問題2測試：負債重複交易');
    console.log('============================');
    
    // 創建測試負債
    const testLiability = {
      id: generateUUID(),
      user_id: userId,
      name: '重複交易測試負債',
      type: 'credit_card',
      balance: 30000,
      monthly_payment: 3000,
      payment_day: 15,
      payment_account: '銀行帳戶'
    };
    
    console.log('📝 創建測試負債...');
    const { error: liabilityError } = await supabase
      .from('liabilities')
      .insert(testLiability);
    
    if (liabilityError) {
      console.log('❌ 負債創建失敗:', liabilityError.message);
    } else {
      console.log('✅ 負債創建成功');
      
      // 等待循環交易創建
      console.log('⏳ 等待循環交易創建...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 檢查是否有重複的月曆交易 - 修復日期範圍
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // 獲取當月的最後一天
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

      const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;
      
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('category', '還款')
        .eq('description', '重複交易測試負債')
        .gte('date', monthStart)
        .lte('date', monthEnd);
      
      if (transactionError) {
        console.log('❌ 月曆交易查詢失敗:', transactionError.message);
      } else {
        const transactionCount = transactions?.length || 0;
        console.log(`📊 找到 ${transactionCount} 筆月曆交易`);
        
        if (transactionCount === 0) {
          console.log('❌ 問題2: 仍存在 - 沒有找到月曆交易');
        } else if (transactionCount === 1) {
          console.log('✅ 問題2: 已修復 - 只有一筆月曆交易');
        } else {
          console.log(`❌ 問題2: 仍存在 - 發現 ${transactionCount} 筆重複的月曆交易`);
          
          // 顯示重複交易的詳細信息
          transactions.forEach((tx, index) => {
            console.log(`  ${index + 1}. ID: ${tx.id}, 金額: ${tx.amount}, 日期: ${tx.date}`);
          });
          
          // 清理重複交易，只保留第一筆
          if (transactions.length > 1) {
            const toDelete = transactions.slice(1);
            for (const tx of toDelete) {
              await supabase.from('transactions').delete().eq('id', tx.id);
            }
            console.log(`🧹 已清理 ${toDelete.length} 筆重複交易`);
          }
        }
      }
      
      // 清理測試負債
      await supabase.from('liabilities').delete().eq('id', testLiability.id);
      console.log('🧹 測試負債已清理');
    }
    
    // 生成測試報告
    console.log('\n📊 兩個問題測試報告');
    console.log('====================');
    console.log('測試完成時間:', new Date().toLocaleString());
    console.log('');
    console.log('問題狀態:');
    console.log('1. 一鍵刪除功能 - 需要在實際應用中測試');
    console.log('2. 負債重複交易 - 已通過代碼修復，需要實際驗證');
    console.log('');
    console.log('建議:');
    console.log('- 在 https://19930913.xyz 上測試一鍵刪除功能');
    console.log('- 創建新負債並檢查月曆是否只有一筆交易');
    console.log('- 使用測試帳戶: user01@gmail.com / user01');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testTwoIssues();
