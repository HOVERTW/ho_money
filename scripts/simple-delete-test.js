/**
 * 簡化的刪除功能測試
 * 專注於找出刪除失敗的根本原因
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

// 測試基本的 CRUD 操作
async function testBasicCRUD(user) {
  console.log('\n🔧 測試基本 CRUD 操作');
  console.log('========================');

  try {
    // 1. 創建測試數據
    const testData = {
      transaction: {
        id: generateUUID(),
        user_id: user.id,
        type: 'expense',
        amount: 100,
        description: '刪除測試交易',
        category: '測試',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      liability: {
        id: generateUUID(),
        user_id: user.id,
        name: '刪除測試負債',
        type: 'credit_card',
        balance: 5000,
        interest_rate: 0.18,
        monthly_payment: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      asset: {
        id: generateUUID(),
        user_id: user.id,
        name: '刪除測試資產',
        type: 'bank',
        value: 10000,
        current_value: 10000,
        cost_basis: 10000,
        quantity: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    // 2. 插入測試數據
    console.log('📝 插入測試數據...');

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert(testData.transaction)
      .select();

    if (txError) {
      logTest('交易插入', false, txError.message);
    } else {
      logTest('交易插入', true, `插入成功，ID: ${txData[0].id}`);
    }

    const { data: liabilityData, error: liabilityError } = await supabase
      .from('liabilities')
      .insert(testData.liability)
      .select();

    if (liabilityError) {
      logTest('負債插入', false, liabilityError.message);
    } else {
      logTest('負債插入', true, `插入成功，ID: ${liabilityData[0].id}`);
    }

    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert(testData.asset)
      .select();

    if (assetError) {
      logTest('資產插入', false, assetError.message);
    } else {
      logTest('資產插入', true, `插入成功，ID: ${assetData[0].id}`);
    }

    // 3. 測試個別刪除
    console.log('\n🗑️ 測試個別刪除...');

    // 刪除交易
    const { error: deleteTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testData.transaction.id)
      .eq('user_id', user.id);

    if (deleteTxError) {
      logTest('交易個別刪除', false, deleteTxError.message);
    } else {
      logTest('交易個別刪除', true, '刪除成功');
    }

    // 刪除負債
    const { error: deleteLiabilityError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', testData.liability.id)
      .eq('user_id', user.id);

    if (deleteLiabilityError) {
      logTest('負債個別刪除', false, deleteLiabilityError.message);
    } else {
      logTest('負債個別刪除', true, '刪除成功');
    }

    // 刪除資產
    const { error: deleteAssetError } = await supabase
      .from('assets')
      .delete()
      .eq('id', testData.asset.id)
      .eq('user_id', user.id);

    if (deleteAssetError) {
      logTest('資產個別刪除', false, deleteAssetError.message);
    } else {
      logTest('資產個別刪除', true, '刪除成功');
    }

    return testData;

  } catch (error) {
    logTest('基本CRUD測試異常', false, error.message);
    return null;
  }
}

// 測試批量刪除
async function testBulkDelete(user) {
  console.log('\n🗑️ 測試批量刪除');
  console.log('========================');

  try {
    // 1. 創建多筆測試數據
    const testTransactions = [];
    const testLiabilities = [];
    const testAssets = [];

    for (let i = 0; i < 3; i++) {
      testTransactions.push({
        id: generateUUID(),
        user_id: user.id,
        type: 'expense',
        amount: 100 + i,
        description: `批量刪除測試交易 ${i + 1}`,
        category: '測試',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      testLiabilities.push({
        id: generateUUID(),
        user_id: user.id,
        name: `批量刪除測試負債 ${i + 1}`,
        type: 'credit_card',
        balance: 1000 + i * 1000,
        interest_rate: 0.18,
        monthly_payment: 100 + i * 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      testAssets.push({
        id: generateUUID(),
        user_id: user.id,
        name: `批量刪除測試資產 ${i + 1}`,
        type: 'bank',
        value: 5000 + i * 1000,
        current_value: 5000 + i * 1000,
        cost_basis: 5000 + i * 1000,
        quantity: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // 2. 批量插入
    console.log('📝 批量插入測試數據...');

    const { error: insertTxError } = await supabase
      .from('transactions')
      .insert(testTransactions);

    if (insertTxError) {
      logTest('批量插入交易', false, insertTxError.message);
    } else {
      logTest('批量插入交易', true, `插入 ${testTransactions.length} 筆交易`);
    }

    const { error: insertLiabilityError } = await supabase
      .from('liabilities')
      .insert(testLiabilities);

    if (insertLiabilityError) {
      logTest('批量插入負債', false, insertLiabilityError.message);
    } else {
      logTest('批量插入負債', true, `插入 ${testLiabilities.length} 筆負債`);
    }

    const { error: insertAssetError } = await supabase
      .from('assets')
      .insert(testAssets);

    if (insertAssetError) {
      logTest('批量插入資產', false, insertAssetError.message);
    } else {
      logTest('批量插入資產', true, `插入 ${testAssets.length} 筆資產`);
    }

    // 3. 批量刪除
    console.log('🗑️ 執行批量刪除...');

    const { error: deleteTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .in('id', testTransactions.map(t => t.id));

    if (deleteTxError) {
      logTest('批量刪除交易', false, deleteTxError.message);
    } else {
      logTest('批量刪除交易', true, `刪除 ${testTransactions.length} 筆交易`);
    }

    const { error: deleteLiabilityError } = await supabase
      .from('liabilities')
      .delete()
      .eq('user_id', user.id)
      .in('id', testLiabilities.map(l => l.id));

    if (deleteLiabilityError) {
      logTest('批量刪除負債', false, deleteLiabilityError.message);
    } else {
      logTest('批量刪除負債', true, `刪除 ${testLiabilities.length} 筆負債`);
    }

    const { error: deleteAssetError } = await supabase
      .from('assets')
      .delete()
      .eq('user_id', user.id)
      .in('id', testAssets.map(a => a.id));

    if (deleteAssetError) {
      logTest('批量刪除資產', false, deleteAssetError.message);
    } else {
      logTest('批量刪除資產', true, `刪除 ${testAssets.length} 筆資產`);
    }

  } catch (error) {
    logTest('批量刪除測試異常', false, error.message);
  }
}

// 測試全部清空
async function testClearAll(user) {
  console.log('\n🧹 測試全部清空');
  console.log('========================');

  try {
    // 獲取當前數據量
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id);

    const { data: liabilities } = await supabase
      .from('liabilities')
      .select('id')
      .eq('user_id', user.id);

    const { data: assets } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', user.id);

    console.log(`📊 清空前數據量: 交易 ${transactions?.length || 0}, 負債 ${liabilities?.length || 0}, 資產 ${assets?.length || 0}`);

    // 全部清空
    const { error: clearTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (clearTxError) {
      logTest('清空所有交易', false, clearTxError.message);
    } else {
      logTest('清空所有交易', true, `清空 ${transactions?.length || 0} 筆交易`);
    }

    const { error: clearLiabilityError } = await supabase
      .from('liabilities')
      .delete()
      .eq('user_id', user.id);

    if (clearLiabilityError) {
      logTest('清空所有負債', false, clearLiabilityError.message);
    } else {
      logTest('清空所有負債', true, `清空 ${liabilities?.length || 0} 筆負債`);
    }

    const { error: clearAssetError } = await supabase
      .from('assets')
      .delete()
      .eq('user_id', user.id);

    if (clearAssetError) {
      logTest('清空所有資產', false, clearAssetError.message);
    } else {
      logTest('清空所有資產', true, `清空 ${assets?.length || 0} 筆資產`);
    }

  } catch (error) {
    logTest('全部清空測試異常', false, error.message);
  }
}

async function runSimpleDeleteTest() {
  console.log('🧪 簡化刪除功能測試');
  console.log('====================');
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

    // 執行測試
    await testBasicCRUD(user);
    await testBulkDelete(user);
    await testClearAll(user);

    // 生成報告
    console.log('\n📋 簡化刪除測試報告');
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

      console.log('\n🔧 可能的問題:');
      console.log('1. RLS 政策設置問題');
      console.log('2. 外鍵約束阻止刪除');
      console.log('3. 權限不足');
      console.log('4. 數據庫連接問題');
    } else {
      console.log('\n🎉 所有刪除測試都通過！');
      console.log('✅ 數據庫層面的刪除功能正常');
      console.log('❓ 問題可能在應用層面的邏輯');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 簡化刪除測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runSimpleDeleteTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('簡化刪除測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runSimpleDeleteTest };
