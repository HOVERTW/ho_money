/**
 * 調試負債問題腳本
 * 檢查負債創建和月曆交易的問題
 */

console.log('🔍 調試負債問題');
console.log('===============');
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

async function debugLiabilityIssue() {
  try {
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
    console.log('✅ 登錄成功');
    
    // 問題1調試：一鍵刪除失效
    console.log('\n🗑️ 問題1調試：一鍵刪除失效');
    console.log('==============================');
    
    // 檢查當前用戶的數據
    console.log('📊 檢查當前用戶數據...');
    
    const dataQueries = [
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('assets').select('*').eq('user_id', userId),
      supabase.from('liabilities').select('*').eq('user_id', userId)
    ];
    
    const dataResults = await Promise.allSettled(dataQueries);
    
    let currentCounts = [0, 0, 0];
    dataResults.forEach((result, index) => {
      const tableName = ['transactions', 'assets', 'liabilities'][index];
      if (result.status === 'fulfilled' && !result.value.error) {
        currentCounts[index] = result.value.data?.length || 0;
        console.log(`📊 ${tableName}: ${currentCounts[index]} 筆`);
      } else {
        console.log(`❌ ${tableName} 查詢失敗`);
      }
    });
    
    const totalData = currentCounts.reduce((sum, count) => sum + count, 0);
    console.log(`📊 總數據量: ${totalData} 筆`);
    
    if (totalData === 0) {
      console.log('✅ 問題1: 一鍵刪除功能正常 - 沒有數據殘留');
    } else {
      console.log(`❌ 問題1: 一鍵刪除失效 - 還有 ${totalData} 筆數據未刪除`);
      
      // 顯示詳細數據
      dataResults.forEach((result, index) => {
        const tableName = ['transactions', 'assets', 'liabilities'][index];
        if (result.status === 'fulfilled' && !result.value.error && result.value.data?.length > 0) {
          console.log(`\n${tableName} 詳細數據:`);
          result.value.data.slice(0, 3).forEach((item, i) => {
            console.log(`  ${i + 1}. ID: ${item.id?.substring(0, 8)}..., 描述: ${item.description || item.name}, 金額: ${item.amount || item.value || item.balance}`);
          });
          if (result.value.data.length > 3) {
            console.log(`  ... 還有 ${result.value.data.length - 3} 筆`);
          }
        }
      });
    }
    
    // 問題2調試：負債月曆交易不顯示
    console.log('\n💳 問題2調試：負債月曆交易不顯示');
    console.log('================================');
    
    // 創建一個完整的測試負債
    const testLiability = {
      id: generateUUID(),
      user_id: userId,
      name: '調試測試負債',
      type: 'credit_card',
      balance: 50000,
      monthly_payment: 5000,
      payment_day: 20,
      payment_account: '銀行帳戶'
    };
    
    console.log('📝 創建完整的測試負債...');
    console.log('負債參數:', {
      name: testLiability.name,
      balance: testLiability.balance,
      monthly_payment: testLiability.monthly_payment,
      payment_day: testLiability.payment_day,
      payment_account: testLiability.payment_account
    });
    
    // 檢查負債創建條件
    const hasMonthlyPayment = !!testLiability.monthly_payment;
    const hasPaymentAccount = !!testLiability.payment_account;
    const hasPaymentDay = !!testLiability.payment_day;
    const hasPositiveBalance = testLiability.balance > 0;
    
    console.log('🔍 負債循環交易條件檢查:');
    console.log(`- 有月付金額: ${hasMonthlyPayment} (${testLiability.monthly_payment})`);
    console.log(`- 有付款帳戶: ${hasPaymentAccount} (${testLiability.payment_account})`);
    console.log(`- 有付款日期: ${hasPaymentDay} (${testLiability.payment_day})`);
    console.log(`- 有正餘額: ${hasPositiveBalance} (${testLiability.balance})`);
    
    const shouldCreateTransaction = hasMonthlyPayment && hasPaymentAccount && hasPaymentDay && hasPositiveBalance;
    console.log(`✅ 應該創建循環交易: ${shouldCreateTransaction}`);
    
    if (!shouldCreateTransaction) {
      console.log('❌ 問題2原因: 負債不滿足循環交易創建條件');
      return;
    }
    
    // 插入負債到Supabase
    const { error: liabilityError } = await supabase
      .from('liabilities')
      .insert(testLiability);
    
    if (liabilityError) {
      console.log('❌ 負債創建失敗:', liabilityError.message);
      return;
    }
    
    console.log('✅ 負債創建成功');
    
    // 手動創建對應的月曆交易（模擬應用程序邏輯）
    console.log('📝 手動創建月曆交易...');
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const paymentDay = testLiability.payment_day;
    
    // 計算實際付款日期
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualPaymentDay = Math.min(paymentDay, lastDayOfMonth);
    
    const paymentDate = new Date(currentYear, currentMonth, actualPaymentDay);
    
    console.log('📅 付款日期計算:');
    console.log(`- 設定付款日: ${paymentDay}號`);
    console.log(`- 當月最後一天: ${lastDayOfMonth}號`);
    console.log(`- 實際付款日: ${actualPaymentDay}號`);
    console.log(`- 付款日期: ${paymentDate.toLocaleDateString('zh-TW')}`);
    
    const calendarTransaction = {
      id: generateUUID(),
      user_id: userId,
      type: 'expense',
      amount: testLiability.monthly_payment,
      description: testLiability.name,
      category: '還款',
      account: testLiability.payment_account,
      date: paymentDate.toISOString().split('T')[0],
      is_recurring: true,
      recurring_frequency: 'monthly'
    };
    
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert(calendarTransaction);
    
    if (transactionError) {
      console.log('❌ 月曆交易創建失敗:', transactionError.message);
    } else {
      console.log('✅ 月曆交易創建成功');
      
      // 驗證月曆交易
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: verifyTransactions, error: verifyError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('category', '還款')
        .eq('description', testLiability.name);
      
      if (verifyError) {
        console.log('❌ 月曆交易驗證失敗:', verifyError.message);
      } else {
        const transactionCount = verifyTransactions?.length || 0;
        console.log(`📊 找到 ${transactionCount} 筆月曆交易`);
        
        if (transactionCount === 0) {
          console.log('❌ 問題2: 月曆交易未找到');
        } else if (transactionCount === 1) {
          console.log('✅ 問題2: 月曆交易正常，只有一筆');
          console.log('交易詳情:', {
            id: verifyTransactions[0].id.substring(0, 8) + '...',
            amount: verifyTransactions[0].amount,
            date: verifyTransactions[0].date,
            description: verifyTransactions[0].description
          });
        } else {
          console.log(`❌ 問題2: 發現 ${transactionCount} 筆重複交易`);
          verifyTransactions.forEach((tx, index) => {
            console.log(`  ${index + 1}. ${tx.id.substring(0, 8)}... - ${tx.amount} - ${tx.date}`);
          });
        }
      }
    }
    
    // 清理測試數據
    console.log('\n🧹 清理測試數據...');
    
    await supabase.from('liabilities').delete().eq('id', testLiability.id);
    
    if (!transactionError) {
      await supabase.from('transactions').delete().eq('id', calendarTransaction.id);
    }
    
    console.log('✅ 測試數據清理完成');
    
    // 生成調試報告
    console.log('\n📊 調試報告');
    console.log('============');
    console.log('問題1（一鍵刪除）:', totalData === 0 ? '✅ 正常' : '❌ 失效');
    console.log('問題2（負債月曆交易）:', shouldCreateTransaction ? '✅ 條件滿足' : '❌ 條件不滿足');
    
    console.log('\n建議修復方案:');
    if (totalData > 0) {
      console.log('1. 檢查一鍵刪除的雲端同步邏輯');
      console.log('2. 確認用戶登錄狀態');
      console.log('3. 檢查Supabase權限設置');
    }
    
    if (shouldCreateTransaction) {
      console.log('4. 檢查負債服務的事件觸發機制');
      console.log('5. 確認循環交易服務的初始化');
      console.log('6. 檢查月曆組件的數據加載邏輯');
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
  }
}

debugLiabilityIssue();
