/**
 * 診斷負債數據上傳失敗和刪除操作失敗的問題
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 生成有效的 UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function diagnoseIssues() {
  console.log('🔍 診斷負債數據上傳失敗和刪除操作失敗問題');
  console.log('==============================================');
  console.log(`測試時間: ${new Date().toLocaleString()}`);

  try {
    // 1. 測試基礎連接
    console.log('\n🔌 測試1: 基礎連接和認證');
    console.log('========================');

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (authError || !user) {
      logTest('基礎登錄', false, authError?.message || '登錄失敗');
      return;
    }

    logTest('基礎登錄', true, `用戶: ${user.email}`);

    // 2. 測試負債數據上傳
    console.log('\n💳 測試2: 負債數據上傳診斷');
    console.log('========================');

    // 檢查負債表結構
    const { data: liabilitySchema, error: schemaError } = await supabase
      .from('liabilities')
      .select('*')
      .limit(1);

    if (schemaError) {
      logTest('負債表結構檢查', false, schemaError.message);
    } else {
      logTest('負債表結構檢查', true, '負債表可訪問');
    }

    // 測試負債數據插入
    const testLiability = {
      id: generateUUID(),
      user_id: user.id,
      name: '診斷測試信用卡',
      type: 'credit_card',
      balance: 50000,
      interest_rate: 0.18,
      monthly_payment: 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 嘗試插入負債數據:', testLiability);

    const { data: insertData, error: insertError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();

    if (insertError) {
      logTest('負債數據插入', false, insertError.message);
      console.log('🔍 詳細錯誤信息:', insertError);
    } else {
      logTest('負債數據插入', true, `插入成功，ID: ${insertData[0]?.id}`);

      // 3. 測試刪除操作
      console.log('\n🗑️ 測試3: 刪除操作診斷');
      console.log('========================');

      // 測試硬刪除
      const { error: deleteError } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', testLiability.id)
        .eq('user_id', user.id);

      if (deleteError) {
        logTest('負債硬刪除', false, deleteError.message);
        console.log('🔍 刪除錯誤詳情:', deleteError);
      } else {
        logTest('負債硬刪除', true, '硬刪除成功');
      }
    }

    // 4. 測試交易刪除
    console.log('\n🗑️ 測試4: 交易刪除診斷');
    console.log('========================');

    // 創建測試交易
    const testTransaction = {
      id: generateUUID(),
      user_id: user.id,
      type: 'expense',
      amount: 100,
      description: '診斷測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: txInsertData, error: txInsertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (txInsertError) {
      logTest('測試交易插入', false, txInsertError.message);
    } else {
      logTest('測試交易插入', true, `交易插入成功，ID: ${txInsertData[0]?.id}`);

      // 測試交易刪除
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', testTransaction.id)
        .eq('user_id', user.id);

      if (txDeleteError) {
        logTest('交易刪除', false, txDeleteError.message);
        console.log('🔍 交易刪除錯誤詳情:', txDeleteError);
      } else {
        logTest('交易刪除', true, '交易刪除成功');
      }
    }

    // 5. 測試資產刪除
    console.log('\n🗑️ 測試5: 資產刪除診斷');
    console.log('========================');

    // 創建測試資產
    const testAsset = {
      id: generateUUID(),
      user_id: user.id,
      name: '診斷測試資產',
      type: 'bank',
      value: 10000,
      current_value: 10000,
      quantity: 1,
      cost_basis: 10000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: assetInsertData, error: assetInsertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    if (assetInsertError) {
      logTest('測試資產插入', false, assetInsertError.message);
    } else {
      logTest('測試資產插入', true, `資產插入成功，ID: ${assetInsertData[0]?.id}`);

      // 測試資產刪除
      const { error: assetDeleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', testAsset.id)
        .eq('user_id', user.id);

      if (assetDeleteError) {
        logTest('資產刪除', false, assetDeleteError.message);
        console.log('🔍 資產刪除錯誤詳情:', assetDeleteError);
      } else {
        logTest('資產刪除', true, '資產刪除成功');
      }
    }

    // 6. 測試權限問題
    console.log('\n🔒 測試6: 權限診斷');
    console.log('========================');

    // 檢查 RLS 政策
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'liabilities' })
      .catch(() => ({ data: null, error: { message: 'RPC 函數不存在' } }));

    if (policyError) {
      logTest('RLS 政策檢查', false, policyError.message);
    } else {
      logTest('RLS 政策檢查', true, `找到 ${policies?.length || 0} 個政策`);
    }

    // 生成診斷報告
    console.log('\n📋 診斷報告');
    console.log('====================');
    console.log(`總測試數: ${testResults.passed + testResults.failed}`);
    console.log(`通過: ${testResults.passed}`);
    console.log(`失敗: ${testResults.failed}`);
    
    if (testResults.passed + testResults.failed > 0) {
      const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
      console.log(`成功率: ${successRate}%`);
    }

    // 顯示失敗的測試
    const failedTests = testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗的測試:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });

      console.log('\n🔧 建議修復方案:');
      failedTests.forEach(test => {
        if (test.name.includes('負債數據插入')) {
          console.log('- 檢查負債表結構是否正確');
          console.log('- 確認所有必需字段都有提供');
          console.log('- 檢查數據類型是否匹配');
        }
        if (test.name.includes('刪除')) {
          console.log('- 檢查 RLS 政策是否正確設置');
          console.log('- 確認用戶有刪除權限');
          console.log('- 檢查外鍵約束');
        }
      });
    } else {
      console.log('\n🎉 所有測試都通過！問題可能在應用層面。');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 診斷過程中發生錯誤:', error.message);
    return false;
  }
}

// 運行診斷
if (require.main === module) {
  diagnoseIssues().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('診斷運行異常:', error);
    process.exit(1);
  });
}

module.exports = { diagnoseIssues };
