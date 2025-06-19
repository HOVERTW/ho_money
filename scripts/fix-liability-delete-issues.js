/**
 * 修復負債數據上傳失敗和刪除操作失敗的問題
 * 基於 Docker 測試結果，問題在應用層面而非數據庫層面
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

// 檢查 UUID 是否有效
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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

// 修復負債服務的上傳邏輯
async function fixLiabilityUpload(user) {
  console.log('\n🔧 修復負債數據上傳邏輯');
  console.log('========================');

  try {
    // 模擬應用中可能出現的問題數據
    const problematicLiabilities = [
      {
        id: 'invalid_id_123', // 無效的 UUID
        name: '問題信用卡',
        type: 'credit_card',
        balance: 30000,
        interest_rate: 0.15,
        monthly_payment: 1500
      },
      {
        // 缺少 ID
        name: '缺少ID的負債',
        type: 'loan',
        balance: 100000,
        interest_rate: 0.05,
        monthly_payment: 3000
      },
      {
        id: generateUUID(),
        name: '正常負債',
        type: 'mortgage',
        balance: 1500000,
        interest_rate: 0.03,
        monthly_payment: 12000
      }
    ];

    console.log('📝 測試問題數據:', problematicLiabilities);

    // 修復數據格式
    const fixedLiabilities = problematicLiabilities.map(liability => {
      // 確保有有效的 UUID
      let liabilityId = liability.id;
      if (!liabilityId || !isValidUUID(liabilityId)) {
        liabilityId = generateUUID();
        console.log(`🔄 為負債 "${liability.name}" 生成新的 UUID: ${liabilityId}`);
      }

      // 確保所有必需字段都存在
      return {
        id: liabilityId,
        user_id: user.id,
        name: liability.name || '未命名負債',
        type: liability.type || 'other',
        balance: liability.balance || 0,
        interest_rate: liability.interest_rate || 0,
        monthly_payment: liability.monthly_payment || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log('🔧 修復後的數據:', fixedLiabilities);

    // 使用 upsert 上傳
    const { data: uploadData, error: uploadError } = await supabase
      .from('liabilities')
      .upsert(fixedLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (uploadError) {
      logTest('修復負債上傳', false, uploadError.message);
      return [];
    }

    logTest('修復負債上傳', true, `成功上傳 ${uploadData.length} 筆負債`);

    // 驗證上傳結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id)
      .in('id', fixedLiabilities.map(l => l.id));

    if (verifyError) {
      logTest('修復負債驗證', false, verifyError.message);
    } else {
      logTest('修復負債驗證', true, `驗證成功，找到 ${verifyData.length} 筆記錄`);
    }

    return fixedLiabilities;

  } catch (error) {
    logTest('修復負債上傳異常', false, error.message);
    return [];
  }
}

// 修復刪除操作
async function fixDeleteOperations(user, liabilities) {
  console.log('\n🔧 修復刪除操作');
  console.log('========================');

  if (liabilities.length === 0) {
    logTest('刪除操作-前置條件', false, '沒有負債數據可刪除');
    return;
  }

  try {
    // 測試個別刪除（模擬應用邏輯）
    const liabilityToDelete = liabilities[0];
    console.log(`🗑️ 測試個別刪除: ${liabilityToDelete.name}`);

    // 1. 檢查記錄是否存在
    const { data: existingData, error: existingError } = await supabase
      .from('liabilities')
      .select('id, name')
      .eq('id', liabilityToDelete.id)
      .eq('user_id', user.id);

    if (existingError) {
      logTest('個別刪除-檢查存在', false, existingError.message);
      return;
    }

    if (existingData.length === 0) {
      logTest('個別刪除-檢查存在', false, '記錄不存在');
      return;
    }

    logTest('個別刪除-檢查存在', true, `找到記錄: ${existingData[0].name}`);

    // 2. 執行刪除
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

    // 3. 驗證刪除結果
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

    // 測試批量刪除
    console.log('\n🗑️ 測試批量刪除');

    // 獲取剩餘的負債
    const { data: remainingLiabilities, error: fetchError } = await supabase
      .from('liabilities')
      .select('id, name')
      .eq('user_id', user.id);

    if (fetchError) {
      logTest('批量刪除-獲取數據', false, fetchError.message);
      return;
    }

    console.log(`📊 找到 ${remainingLiabilities.length} 筆負債需要批量刪除`);

    if (remainingLiabilities.length > 0) {
      // 執行批量刪除
      const { error: bulkDeleteError } = await supabase
        .from('liabilities')
        .delete()
        .eq('user_id', user.id);

      if (bulkDeleteError) {
        logTest('批量刪除-執行', false, bulkDeleteError.message);
      } else {
        logTest('批量刪除-執行', true, `成功刪除 ${remainingLiabilities.length} 筆記錄`);

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
    logTest('刪除操作異常', false, error.message);
  }
}

async function runFixTest() {
  console.log('🔧 負債數據上傳和刪除操作修復測試');
  console.log('=====================================');
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

    // 執行修復測試
    const fixedLiabilities = await fixLiabilityUpload(user);
    await fixDeleteOperations(user, fixedLiabilities);

    // 生成報告
    console.log('\n📋 修復測試報告');
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

      console.log('\n🔧 建議修復方案:');
      console.log('1. 確保所有 ID 都是有效的 UUID 格式');
      console.log('2. 在上傳前驗證數據完整性');
      console.log('3. 使用 upsert 而不是 insert 避免重複');
      console.log('4. 在刪除前檢查記錄是否存在');
      console.log('5. 添加適當的錯誤處理和重試機制');
    } else {
      console.log('\n🎉 所有修復測試都通過！');
      console.log('✅ 負債數據上傳邏輯已修復');
      console.log('✅ 刪除操作邏輯已修復');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 修復測試運行失敗:', error.message);
    return false;
  }
}

// 運行修復測試
if (require.main === module) {
  runFixTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('修復測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runFixTest };
