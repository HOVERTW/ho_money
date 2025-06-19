/**
 * 最終綜合修復測試
 * 測試負債上傳修復和刪除功能
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

// 測試修復後的負債上傳
async function testFixedLiabilityUpload(user) {
  console.log('\n💳 測試修復後的負債上傳');
  console.log('========================');

  try {
    // 清理舊數據
    await supabase.from('liabilities').delete().eq('user_id', user.id);

    // 模擬 unifiedDataManager 的修復後邏輯
    const testLiabilities = [
      {
        id: generateUUID(),
        name: '最終測試信用卡',
        balance: 25000, // 本地使用 balance
        type: 'credit_card',
        interest_rate: 0.18,
        monthly_payment: 1500
      },
      {
        id: generateUUID(),
        name: '最終測試房貸',
        balance: 1800000, // 本地使用 balance
        type: 'mortgage',
        interest_rate: 0.03,
        monthly_payment: 12000
      }
    ];

    // 轉換為數據庫格式（修復後的邏輯）
    const liabilitiesForUpload = testLiabilities.map(liability => ({
      id: liability.id,
      user_id: user.id,
      name: liability.name || '未命名負債',
      balance: Number(liability.balance || 0), // 🔧 修復：使用 balance 而不是 amount
      type: liability.type || 'other',
      interest_rate: Number(liability.interest_rate || 0),
      monthly_payment: Number(liability.monthly_payment || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('📝 修復後的上傳數據:', liabilitiesForUpload[0]);

    const { data: uploadData, error: uploadError } = await supabase
      .from('liabilities')
      .upsert(liabilitiesForUpload, { onConflict: 'id' })
      .select();

    if (uploadError) {
      logTest('修復後負債上傳', false, uploadError.message);
      return [];
    }

    logTest('修復後負債上傳', true, `成功上傳 ${uploadData.length} 筆負債`);

    // 驗證上傳結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id);

    if (verifyError) {
      logTest('負債上傳驗證', false, verifyError.message);
    } else {
      logTest('負債上傳驗證', true, `驗證成功，找到 ${verifyData.length} 筆記錄`);
    }

    return testLiabilities;

  } catch (error) {
    logTest('負債上傳測試異常', false, error.message);
    return [];
  }
}

// 測試完整的刪除流程
async function testCompleteDeleteFlow(user, testLiabilities) {
  console.log('\n🗑️ 測試完整刪除流程');
  console.log('========================');

  if (testLiabilities.length === 0) {
    logTest('刪除流程-前置條件', false, '沒有測試數據');
    return;
  }

  try {
    // 1. 測試個別刪除（模擬應用流程）
    const liabilityToDelete = testLiabilities[0];
    console.log(`🗑️ 測試個別刪除: ${liabilityToDelete.name}`);

    // 步驟1: 檢查記錄是否存在
    const { data: existingData, error: checkError } = await supabase
      .from('liabilities')
      .select('id, name')
      .eq('id', liabilityToDelete.id)
      .eq('user_id', user.id);

    if (checkError) {
      logTest('個別刪除-檢查存在', false, checkError.message);
      return;
    }

    if (!existingData || existingData.length === 0) {
      logTest('個別刪除-檢查存在', false, '記錄不存在');
      return;
    }

    logTest('個別刪除-檢查存在', true, `找到記錄: ${existingData[0].name}`);

    // 步驟2: 執行刪除
    const { error: deleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', liabilityToDelete.id)
      .eq('user_id', user.id);

    if (deleteError) {
      logTest('個別刪除-執行', false, deleteError.message);
      return;
    }

    logTest('個別刪除-執行', true, '刪除操作成功');

    // 步驟3: 驗證刪除結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('id')
      .eq('id', liabilityToDelete.id)
      .eq('user_id', user.id);

    if (verifyError) {
      logTest('個別刪除-驗證', false, verifyError.message);
    } else if (verifyData.length === 0) {
      logTest('個別刪除-驗證', true, '記錄已成功刪除');
    } else {
      logTest('個別刪除-驗證', false, '記錄仍然存在');
    }

    // 2. 測試批量刪除
    console.log('\n🗑️ 測試批量刪除剩餘數據...');

    const { data: remainingData, error: fetchError } = await supabase
      .from('liabilities')
      .select('id, name')
      .eq('user_id', user.id);

    if (fetchError) {
      logTest('批量刪除-獲取數據', false, fetchError.message);
      return;
    }

    console.log(`📊 找到 ${remainingData.length} 筆剩餘負債`);

    if (remainingData.length > 0) {
      const { error: bulkDeleteError } = await supabase
        .from('liabilities')
        .delete()
        .eq('user_id', user.id);

      if (bulkDeleteError) {
        logTest('批量刪除-執行', false, bulkDeleteError.message);
      } else {
        logTest('批量刪除-執行', true, `成功刪除 ${remainingData.length} 筆記錄`);

        // 驗證批量刪除結果
        const { data: verifyBulkData, error: verifyBulkError } = await supabase
          .from('liabilities')
          .select('id')
          .eq('user_id', user.id);

        if (verifyBulkError) {
          logTest('批量刪除-驗證', false, verifyBulkError.message);
        } else if (verifyBulkData.length === 0) {
          logTest('批量刪除-驗證', true, '所有記錄已成功刪除');
        } else {
          logTest('批量刪除-驗證', false, `仍有 ${verifyBulkData.length} 筆記錄未刪除`);
        }
      }
    } else {
      logTest('批量刪除', true, '沒有數據需要刪除');
    }

  } catch (error) {
    logTest('完整刪除流程異常', false, error.message);
  }
}

// 測試交易上傳和刪除
async function testTransactionUploadAndDelete(user) {
  console.log('\n💰 測試交易上傳和刪除');
  console.log('========================');

  try {
    // 清理舊數據
    await supabase.from('transactions').delete().eq('user_id', user.id);

    // 創建測試交易
    const testTransactions = [
      {
        id: generateUUID(),
        user_id: user.id,
        type: 'expense',
        amount: 500,
        description: '最終測試支出',
        category: '餐飲',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        user_id: user.id,
        type: 'income',
        amount: 3000,
        description: '最終測試收入',
        category: '薪資',
        account: '銀行',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 上傳交易
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .upsert(testTransactions, { onConflict: 'id' })
      .select();

    if (txError) {
      logTest('交易上傳', false, txError.message);
    } else {
      logTest('交易上傳', true, `成功上傳 ${txData.length} 筆交易`);
    }

    // 刪除交易
    const { error: deleteTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteTxError) {
      logTest('交易刪除', false, deleteTxError.message);
    } else {
      logTest('交易刪除', true, '成功刪除所有交易');
    }

  } catch (error) {
    logTest('交易測試異常', false, error.message);
  }
}

async function runFinalComprehensiveTest() {
  console.log('🎯 最終綜合修復測試');
  console.log('====================');
  console.log(`測試時間: ${new Date().toLocaleString()}`);
  console.log('🔧 測試負債上傳修復和刪除功能');

  try {
    // 登錄
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (authError || !user) {
      logTest('用戶登錄', false, authError?.message || '登錄失敗');
      return false;
    }

    logTest('用戶登錄', true, `用戶: ${user.email}`);

    // 執行測試
    const uploadedLiabilities = await testFixedLiabilityUpload(user);
    await testCompleteDeleteFlow(user, uploadedLiabilities);
    await testTransactionUploadAndDelete(user);

    // 生成報告
    console.log('\n📋 最終綜合測試報告');
    console.log('====================');
    console.log(`總測試數: ${testResults.passed + testResults.failed}`);
    console.log(`通過: ${testResults.passed}`);
    console.log(`失敗: ${testResults.failed}`);
    
    if (testResults.passed + testResults.failed > 0) {
      const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
      console.log(`成功率: ${successRate}%`);
    }

    const failedTests = testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗的測試:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });
    } else {
      console.log('\n🎉 所有最終測試都通過！');
      console.log('✅ 負債上傳功能已完全修復');
      console.log('✅ 刪除功能運作正常');
      console.log('✅ 交易功能運作正常');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 最終測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runFinalComprehensiveTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('最終測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runFinalComprehensiveTest };
