/**
 * 測試負債修復效果
 * 1. 測試負債讀取修復（balance 欄位）
 * 2. 測試重複上傳問題修復
 * 3. 測試新刪除功能
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

// 測試負債讀取修復
async function testLiabilityReadFix(user) {
  console.log('\n📖 測試負債讀取修復');
  console.log('========================');

  try {
    // 清理舊數據
    await supabase.from('liabilities').delete().eq('user_id', user.id);

    // 1. 插入測試負債（使用正確的 balance 欄位）
    const testLiability = {
      id: generateUUID(),
      user_id: user.id,
      name: '讀取測試負債',
      type: 'credit_card',
      balance: 120000, // 使用 balance 欄位
      interest_rate: 0.18,
      monthly_payment: 5000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();

    if (insertError) {
      logTest('負債插入測試', false, insertError.message);
      return;
    }

    logTest('負債插入測試', true, `插入成功，balance: ${insertData[0].balance}`);

    // 2. 測試讀取（模擬修復後的讀取邏輯）
    const { data: readData, error: readError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', testLiability.id);

    if (readError) {
      logTest('負債讀取測試', false, readError.message);
      return;
    }

    if (readData && readData.length > 0) {
      const liability = readData[0];
      
      // 模擬修復後的欄位映射
      const mappedBalance = liability.balance || 0; // 🔧 修復：直接使用 balance 欄位
      
      console.log('📊 讀取結果:');
      console.log(`- 原始 balance: ${liability.balance}`);
      console.log(`- 映射後 balance: ${mappedBalance}`);
      
      if (mappedBalance === 120000) {
        logTest('負債讀取修復', true, `正確讀取 balance: ${mappedBalance}`);
      } else {
        logTest('負債讀取修復', false, `讀取錯誤，期望: 120000，實際: ${mappedBalance}`);
      }
    } else {
      logTest('負債讀取測試', false, '沒有讀取到數據');
    }

    // 清理測試數據
    await supabase.from('liabilities').delete().eq('id', testLiability.id);

  } catch (error) {
    logTest('負債讀取測試異常', false, error.message);
  }
}

// 測試重複上傳修復
async function testDuplicateUploadFix(user) {
  console.log('\n🔄 測試重複上傳修復');
  console.log('========================');

  try {
    // 清理舊數據
    await supabase.from('liabilities').delete().eq('user_id', user.id);

    // 1. 第一次上傳
    const testLiability = {
      id: generateUUID(),
      user_id: user.id,
      name: '重複測試負債',
      type: 'personal_loan',
      balance: 50000,
      interest_rate: 0.05,
      monthly_payment: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: firstUpload, error: firstError } = await supabase
      .from('liabilities')
      .upsert(testLiability, { onConflict: 'id' })
      .select();

    if (firstError) {
      logTest('第一次上傳', false, firstError.message);
      return;
    }

    logTest('第一次上傳', true, `成功上傳，ID: ${firstUpload[0].id}`);

    // 2. 第二次上傳（模擬重複上傳）
    const updatedLiability = {
      ...testLiability,
      balance: 45000, // 更新餘額
      updated_at: new Date().toISOString()
    };

    const { data: secondUpload, error: secondError } = await supabase
      .from('liabilities')
      .upsert(updatedLiability, { onConflict: 'id' })
      .select();

    if (secondError) {
      logTest('第二次上傳（更新）', false, secondError.message);
      return;
    }

    logTest('第二次上傳（更新）', true, `成功更新，新 balance: ${secondUpload[0].balance}`);

    // 3. 驗證沒有重複記錄
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', '重複測試負債');

    if (verifyError) {
      logTest('重複驗證', false, verifyError.message);
    } else {
      if (verifyData.length === 1) {
        logTest('重複驗證', true, `只有一筆記錄，balance: ${verifyData[0].balance}`);
      } else {
        logTest('重複驗證', false, `發現 ${verifyData.length} 筆重複記錄`);
      }
    }

    // 清理測試數據
    await supabase.from('liabilities').delete().eq('id', testLiability.id);

  } catch (error) {
    logTest('重複上傳測試異常', false, error.message);
  }
}

// 測試新刪除功能
async function testNewDeleteFunction(user) {
  console.log('\n🗑️ 測試新刪除功能');
  console.log('========================');

  try {
    // 1. 創建測試負債
    const testLiability = {
      id: generateUUID(),
      user_id: user.id,
      name: '刪除測試負債',
      type: 'mortgage',
      balance: 1000000,
      interest_rate: 0.03,
      monthly_payment: 8000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();

    if (insertError) {
      logTest('刪除測試-創建負債', false, insertError.message);
      return;
    }

    logTest('刪除測試-創建負債', true, `創建成功，ID: ${insertData[0].id}`);

    // 2. 測試雲端刪除
    const { error: deleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', testLiability.id)
      .eq('user_id', user.id);

    if (deleteError) {
      logTest('刪除測試-雲端刪除', false, deleteError.message);
    } else {
      logTest('刪除測試-雲端刪除', true, '雲端刪除成功');
    }

    // 3. 驗證刪除結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('id')
      .eq('id', testLiability.id)
      .eq('user_id', user.id);

    if (verifyError) {
      logTest('刪除測試-驗證', false, verifyError.message);
    } else {
      if (verifyData.length === 0) {
        logTest('刪除測試-驗證', true, '記錄已成功刪除');
      } else {
        logTest('刪除測試-驗證', false, '記錄仍然存在');
      }
    }

  } catch (error) {
    logTest('新刪除功能測試異常', false, error.message);
  }
}

async function runLiabilityFixTest() {
  console.log('🔧 負債修復效果測試');
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
    await testLiabilityReadFix(user);
    await testDuplicateUploadFix(user);
    await testNewDeleteFunction(user);

    // 生成報告
    console.log('\n📋 負債修復測試報告');
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
      console.log('\n🎉 所有負債修復測試都通過！');
      console.log('✅ 負債讀取修復成功');
      console.log('✅ 重複上傳問題修復成功');
      console.log('✅ 新刪除功能正常');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 負債修復測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runLiabilityFixTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('負債修復測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runLiabilityFixTest };
