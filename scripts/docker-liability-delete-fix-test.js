/**
 * Docker 環境下的負債數據上傳和刪除操作修復測試
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

// 模擬負債服務的上傳邏輯
async function testLiabilityUpload(user) {
  console.log('\n💳 測試負債數據上傳修復');
  console.log('========================');

  try {
    // 模擬應用中的負債數據結構
    const testLiabilities = [
      {
        id: generateUUID(),
        name: 'Docker測試信用卡1',
        type: 'credit_card',
        balance: 50000,
        interest_rate: 0.18,
        monthly_payment: 2000,
        sort_order: 1
      },
      {
        id: generateUUID(),
        name: 'Docker測試房貸',
        type: 'mortgage',
        balance: 2000000,
        interest_rate: 0.025,
        monthly_payment: 15000,
        sort_order: 2
      }
    ];

    console.log('📝 準備上傳的負債數據:', testLiabilities);

    // 轉換為數據庫格式（模擬 manualUploadService 的邏輯）
    const convertedLiabilities = testLiabilities.map(liability => ({
      id: liability.id,
      user_id: user.id,
      name: liability.name,
      type: liability.type,
      balance: liability.balance,
      interest_rate: liability.interest_rate || 0,
      monthly_payment: liability.monthly_payment || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // 使用 upsert 上傳（模擬實際應用邏輯）
    const { data: uploadData, error: uploadError } = await supabase
      .from('liabilities')
      .upsert(convertedLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (uploadError) {
      logTest('負債數據上傳', false, uploadError.message);
      return [];
    }

    logTest('負債數據上傳', true, `成功上傳 ${uploadData.length} 筆負債`);

    // 驗證上傳結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id)
      .in('id', testLiabilities.map(l => l.id));

    if (verifyError) {
      logTest('負債數據驗證', false, verifyError.message);
    } else {
      logTest('負債數據驗證', true, `驗證成功，找到 ${verifyData.length} 筆記錄`);
      
      // 檢查每筆記錄的完整性
      verifyData.forEach(liability => {
        console.log(`📊 負債: ${liability.name}, Balance: ${liability.balance}, Type: ${liability.type}`);
      });
    }

    return testLiabilities;

  } catch (error) {
    logTest('負債上傳異常', false, error.message);
    return [];
  }
}

// 測試個別刪除
async function testIndividualDelete(user, liabilities) {
  console.log('\n🗑️ 測試個別刪除');
  console.log('========================');

  if (liabilities.length === 0) {
    logTest('個別刪除-前置條件', false, '沒有負債數據可刪除');
    return;
  }

  try {
    const liabilityToDelete = liabilities[0];
    console.log(`🗑️ 準備刪除負債: ${liabilityToDelete.name} (${liabilityToDelete.id})`);

    // 模擬應用中的刪除邏輯（先從本地刪除，再同步到雲端）
    
    // 1. 雲端刪除
    const { error: deleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', liabilityToDelete.id)
      .eq('user_id', user.id);

    if (deleteError) {
      logTest('個別刪除-雲端刪除', false, deleteError.message);
      return;
    }

    logTest('個別刪除-雲端刪除', true, '雲端刪除成功');

    // 2. 驗證刪除結果
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

    // 從測試數據中移除已刪除的項目
    const index = liabilities.findIndex(l => l.id === liabilityToDelete.id);
    if (index !== -1) {
      liabilities.splice(index, 1);
    }

  } catch (error) {
    logTest('個別刪除異常', false, error.message);
  }
}

// 測試全部刪除
async function testBulkDelete(user, liabilities) {
  console.log('\n🗑️ 測試全部刪除');
  console.log('========================');

  try {
    // 獲取用戶的所有負債
    const { data: allLiabilities, error: fetchError } = await supabase
      .from('liabilities')
      .select('id, name')
      .eq('user_id', user.id);

    if (fetchError) {
      logTest('全部刪除-獲取數據', false, fetchError.message);
      return;
    }

    console.log(`📊 找到 ${allLiabilities.length} 筆負債需要刪除`);

    if (allLiabilities.length === 0) {
      logTest('全部刪除', true, '沒有數據需要刪除');
      return;
    }

    // 批量刪除
    const { error: bulkDeleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('user_id', user.id);

    if (bulkDeleteError) {
      logTest('全部刪除-執行', false, bulkDeleteError.message);
      return;
    }

    logTest('全部刪除-執行', true, `成功刪除 ${allLiabilities.length} 筆記錄`);

    // 驗證全部刪除結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('id')
      .eq('user_id', user.id);

    if (verifyError) {
      logTest('全部刪除-驗證', false, verifyError.message);
    } else if (verifyData.length === 0) {
      logTest('全部刪除-驗證', true, '所有記錄已成功刪除');
    } else {
      logTest('全部刪除-驗證', false, `仍有 ${verifyData.length} 筆記錄未刪除`);
    }

  } catch (error) {
    logTest('全部刪除異常', false, error.message);
  }
}

// 測試交易刪除
async function testTransactionDelete(user) {
  console.log('\n🗑️ 測試交易刪除');
  console.log('========================');

  try {
    // 創建測試交易
    const testTransaction = {
      id: generateUUID(),
      user_id: user.id,
      type: 'expense',
      amount: 500,
      description: 'Docker測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 插入測試交易
    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (insertError) {
      logTest('交易刪除-創建測試數據', false, insertError.message);
      return;
    }

    logTest('交易刪除-創建測試數據', true, '測試交易創建成功');

    // 刪除交易
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransaction.id)
      .eq('user_id', user.id);

    if (deleteError) {
      logTest('交易刪除-執行', false, deleteError.message);
    } else {
      logTest('交易刪除-執行', true, '交易刪除成功');

      // 驗證刪除
      const { data: verifyData, error: verifyError } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', testTransaction.id);

      if (verifyError) {
        logTest('交易刪除-驗證', false, verifyError.message);
      } else if (verifyData.length === 0) {
        logTest('交易刪除-驗證', true, '交易已成功刪除');
      } else {
        logTest('交易刪除-驗證', false, '交易仍然存在');
      }
    }

  } catch (error) {
    logTest('交易刪除異常', false, error.message);
  }
}

async function runDockerTest() {
  console.log('🐳 Docker 環境 - 負債數據上傳和刪除操作修復測試');
  console.log('================================================');
  console.log(`測試時間: ${new Date().toLocaleString()}`);

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

    // 清理舊數據
    await supabase.from('liabilities').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('user_id', user.id);

    // 執行測試
    const uploadedLiabilities = await testLiabilityUpload(user);
    await testIndividualDelete(user, uploadedLiabilities);
    await testBulkDelete(user, uploadedLiabilities);
    await testTransactionDelete(user);

    // 生成報告
    console.log('\n📋 Docker 測試報告');
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
    }

    const allPassed = testResults.failed === 0;
    
    if (allPassed) {
      console.log('\n🎉 Docker 環境測試完全通過！');
      console.log('✅ 負債數據上傳功能正常');
      console.log('✅ 個別刪除功能正常');
      console.log('✅ 全部刪除功能正常');
      console.log('✅ 交易刪除功能正常');
    } else {
      console.log('\n⚠️ Docker 環境測試發現問題，需要修復');
    }

    return allPassed;

  } catch (error) {
    console.error('\n💥 Docker 測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runDockerTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Docker 測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runDockerTest };
