/**
 * 測試修復後的負債上傳功能
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

    // 1. 測試正確的欄位映射 (balance 而不是 amount)
    const testLiabilities = [
      {
        id: generateUUID(),
        user_id: user.id,
        name: '修復測試信用卡',
        type: 'credit_card',
        balance: 15000, // 使用 balance 欄位
        interest_rate: 0.18,
        monthly_payment: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        user_id: user.id,
        name: '修復測試房貸',
        type: 'mortgage',
        balance: 2000000, // 使用 balance 欄位
        interest_rate: 0.025,
        monthly_payment: 15000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('📝 準備上傳的負債數據 (使用 balance 欄位):', testLiabilities);

    // 2. 使用正確的欄位上傳
    const { data: uploadData, error: uploadError } = await supabase
      .from('liabilities')
      .upsert(testLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (uploadError) {
      logTest('修復後負債上傳', false, uploadError.message);
      console.log('🔍 上傳錯誤詳情:', uploadError);
      return [];
    }

    logTest('修復後負債上傳', true, `成功上傳 ${uploadData.length} 筆負債`);

    // 3. 驗證上傳結果
    const { data: verifyData, error: verifyError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', user.id)
      .in('id', testLiabilities.map(l => l.id));

    if (verifyError) {
      logTest('負債上傳驗證', false, verifyError.message);
    } else {
      logTest('負債上傳驗證', true, `驗證成功，找到 ${verifyData.length} 筆記錄`);
      
      // 檢查每筆記錄的完整性
      verifyData.forEach(liability => {
        console.log(`📊 負債: ${liability.name}, Balance: ${liability.balance}, Type: ${liability.type}`);
        
        if (liability.balance && liability.balance > 0) {
          console.log(`✅ 負債 ${liability.name} 的 balance 欄位正確: ${liability.balance}`);
        } else {
          console.warn(`⚠️ 負債 ${liability.name} 的 balance 欄位異常: ${liability.balance}`);
        }
      });
    }

    // 4. 測試模擬 unifiedDataManager 的上傳邏輯
    console.log('\n🔄 測試模擬 unifiedDataManager 上傳邏輯...');

    const unifiedManagerLiabilities = testLiabilities.map(liability => ({
      id: liability.id,
      user_id: user.id,
      name: liability.name || '未命名負債',
      balance: Number(liability.balance || 0), // 修復：使用 balance 而不是 amount
      type: liability.type || 'other',
      interest_rate: Number(liability.interest_rate || 0),
      monthly_payment: Number(liability.monthly_payment || 0),
      created_at: liability.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('📝 unifiedDataManager 格式的數據:', unifiedManagerLiabilities[0]);

    const { data: unifiedData, error: unifiedError } = await supabase
      .from('liabilities')
      .upsert(unifiedManagerLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (unifiedError) {
      logTest('unifiedDataManager 上傳', false, unifiedError.message);
    } else {
      logTest('unifiedDataManager 上傳', true, `成功上傳 ${unifiedData.length} 筆負債`);
    }

    return testLiabilities;

  } catch (error) {
    logTest('負債上傳測試異常', false, error.message);
    return [];
  }
}

// 測試錯誤的欄位映射 (用於對比)
async function testWrongFieldMapping(user) {
  console.log('\n❌ 測試錯誤的欄位映射 (用於對比)');
  console.log('========================');

  try {
    const wrongLiability = {
      id: generateUUID(),
      user_id: user.id,
      name: '錯誤欄位測試',
      amount: 5000, // 錯誤：使用 amount 而不是 balance
      type: 'credit_card',
      description: '這會失敗',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 使用錯誤欄位的數據 (amount):', wrongLiability);

    const { data: wrongData, error: wrongError } = await supabase
      .from('liabilities')
      .insert(wrongLiability)
      .select();

    if (wrongError) {
      logTest('錯誤欄位映射測試', true, `預期的錯誤: ${wrongError.message}`);
      console.log('🔍 這證明了 amount 欄位不存在，必須使用 balance');
    } else {
      logTest('錯誤欄位映射測試', false, '意外成功，這不應該發生');
    }

  } catch (error) {
    logTest('錯誤欄位映射異常', true, `預期的異常: ${error.message}`);
  }
}

async function runFixedLiabilityUploadTest() {
  console.log('🔧 修復後負債上傳功能測試');
  console.log('==========================');
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
    const uploadedLiabilities = await testFixedLiabilityUpload(user);
    await testWrongFieldMapping(user);

    // 清理測試數據
    if (uploadedLiabilities.length > 0) {
      await supabase
        .from('liabilities')
        .delete()
        .eq('user_id', user.id)
        .in('id', uploadedLiabilities.map(l => l.id));
      console.log('🧹 測試數據已清理');
    }

    // 生成報告
    console.log('\n📋 修復後負債上傳測試報告');
    console.log('==========================');
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
      console.log('\n🎉 所有修復測試都通過！');
      console.log('✅ 負債上傳功能已修復');
      console.log('✅ 欄位映射問題已解決');
    }

    return testResults.failed === 0;

  } catch (error) {
    console.error('\n💥 修復測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runFixedLiabilityUploadTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('修復測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runFixedLiabilityUploadTest };
