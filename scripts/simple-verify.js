/**
 * 簡化驗證測試
 * 快速驗證7個問題的修復狀態
 */

console.log('🔍 簡化驗證測試');
console.log('===============');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yrryyapzkgrsahranzvo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM'
);

// UUID生成函數
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function quickVerify() {
  try {
    // 登錄
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

    // 測試1: 負債同步 (修復字段映射)
    console.log('\n💳 測試1: 負債同步');
    const testLiability = {
      id: generateUUID(),
      user_id: userId,
      name: '快速測試負債',
      type: 'credit_card',
      balance: 10000,
      interest_rate: 0.15,
      monthly_payment: 1000,
      payment_day: 10,
      payment_account: '測試帳戶'
    };

    const { data: liabilityData, error: liabilityError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();

    console.log('負債插入:', liabilityError ? '❌ ' + liabilityError.message : '✅ 成功');

    // 測試2: 交易同步
    console.log('\n📝 測試2: 交易同步');
    const testTransaction = {
      id: generateUUID(),
      user_id: userId,
      type: 'expense',
      amount: 500,
      description: '快速測試交易',
      category: '測試',
      account: '測試帳戶',
      date: new Date().toISOString().split('T')[0]
    };

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    console.log('交易插入:', transactionError ? '❌ ' + transactionError.message : '✅ 成功');

    // 測試3: 資產同步
    console.log('\n💰 測試3: 資產同步');
    const testAsset = {
      id: generateUUID(),
      user_id: userId,
      name: '快速測試資產',
      type: 'bank',
      value: 5000, // 確保 value 字段存在
      current_value: 5000,
      cost_basis: 5000,
      quantity: 1
    };

    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    console.log('資產插入:', assetError ? '❌ ' + assetError.message : '✅ 成功');

    // 測試4: 批量刪除
    console.log('\n🗑️ 測試4: 批量刪除');
    const deletePromises = [];
    
    if (!liabilityError) {
      deletePromises.push(supabase.from('liabilities').delete().eq('id', testLiability.id));
    }
    if (!transactionError) {
      deletePromises.push(supabase.from('transactions').delete().eq('id', testTransaction.id));
    }
    if (!assetError) {
      deletePromises.push(supabase.from('assets').delete().eq('id', testAsset.id));
    }

    const deleteResults = await Promise.allSettled(deletePromises);
    const deleteSuccess = deleteResults.every(result => 
      result.status === 'fulfilled' && !result.value.error
    );

    console.log('批量刪除:', deleteSuccess ? '✅ 成功' : '❌ 失敗');

    // 測試5: 資產穩定性
    console.log('\n🔄 測試5: 資產穩定性');
    let stableCount = 0;
    for (let i = 0; i < 3; i++) {
      const { data: assets, error: assetQueryError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId);
      
      if (!assetQueryError) stableCount++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('穩定性測試:', stableCount === 3 ? '✅ 成功' : '❌ 失敗');

    // 生成報告
    console.log('\n📊 快速驗證報告');
    console.log('================');
    
    const results = [
      !liabilityError,
      !transactionError,
      !assetError,
      deleteSuccess,
      stableCount === 3
    ];
    
    const successCount = results.filter(r => r).length;
    console.log(`成功: ${successCount}/5`);
    console.log(`成功率: ${(successCount / 5 * 100).toFixed(1)}%`);

    console.log('\n詳細結果:');
    const testNames = [
      '負債同步到Supabase',
      '交易同步到Supabase',
      '資產同步到Supabase',
      '批量刪除同步',
      '資產顯示穩定性'
    ];

    results.forEach((success, index) => {
      console.log(`${index + 1}. ${testNames[index]} - ${success ? '✅ 成功' : '❌ 失敗'}`);
    });

    if (successCount === 5) {
      console.log('\n🎉 所有基礎同步功能正常！');
    } else {
      console.log(`\n⚠️ 還有 ${5 - successCount} 個功能需要修復`);
    }

  } catch (error) {
    console.error('❌ 驗證測試失敗:', error.message);
  }
}

quickVerify();
