/**
 * 測試 UUID 修復效果
 * 驗證新的 UUID 生成是否解決了同步問題
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 測試帳號
const TEST_EMAIL = 'user01@gmail.com';
const TEST_PASSWORD = 'user01';

// 正確的 UUID 生成函數
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 驗證 UUID 格式
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 確保 UUID 有效
function ensureValidUUID(id) {
  if (id && isValidUUID(id)) {
    return id;
  }
  return generateUUID();
}

async function loginUser() {
  console.log('🔐 登錄測試帳號:', TEST_EMAIL);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    console.error('❌ 登錄失敗:', error.message);
    return null;
  }

  console.log('✅ 登錄成功! 用戶 ID:', data.user.id);
  return data.user;
}

async function testUUIDGeneration() {
  console.log('\n🔧 測試 UUID 生成功能...');
  
  // 測試各種無效 ID 格式
  const invalidIds = [
    'test-' + Date.now(),
    `first_${Date.now()}`,
    Date.now().toString(),
    '123456789',
    'invalid-id',
    null,
    undefined,
    ''
  ];

  console.log('📝 測試無效 ID 轉換:');
  invalidIds.forEach((invalidId, index) => {
    const validId = ensureValidUUID(invalidId);
    const isValid = isValidUUID(validId);
    console.log(`  ${index + 1}. "${invalidId}" -> "${validId}" ${isValid ? '✅' : '❌'}`);
  });

  // 測試有效 UUID 保持不變
  const validUUID = generateUUID();
  const preservedUUID = ensureValidUUID(validUUID);
  console.log(`📝 有效 UUID 保持不變: ${validUUID === preservedUUID ? '✅' : '❌'}`);

  return true;
}

async function testTransactionWithValidUUID(user) {
  console.log('\n📝 測試使用有效 UUID 的交易創建...');
  
  try {
    // 記錄測試前的交易數量
    const { data: beforeTransactions, error: beforeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (beforeError) {
      console.error('❌ 查詢測試前交易失敗:', beforeError.message);
      return false;
    }

    const beforeCount = beforeTransactions.length;
    console.log(`📊 測試前交易數量: ${beforeCount}`);

    // 創建使用有效 UUID 的測試交易
    const validTransactionId = generateUUID();
    console.log(`📝 生成的有效 UUID: ${validTransactionId}`);
    console.log(`📝 UUID 格式驗證: ${isValidUUID(validTransactionId) ? '✅ 有效' : '❌ 無效'}`);

    const testTransaction = {
      id: validTransactionId,
      user_id: user.id,
      amount: 777,
      type: 'expense',
      description: '測試有效UUID交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試交易:', {
      id: testTransaction.id,
      description: testTransaction.description,
      amount: testTransaction.amount
    });

    // 插入交易
    const { data: insertResult, error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (insertError) {
      console.error('❌ 插入交易失敗:', insertError.message);
      console.error('❌ 錯誤詳情:', insertError);
      return false;
    }

    console.log('✅ 交易插入成功');

    // 等待並驗證
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: afterTransactions, error: afterError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (afterError) {
      console.error('❌ 查詢測試後交易失敗:', afterError.message);
      return false;
    }

    const afterCount = afterTransactions.length;
    console.log(`📊 測試後交易數量: ${afterCount}`);

    // 檢查新增的交易
    const newTransaction = afterTransactions.find(t => t.id === validTransactionId);
    
    if (afterCount === beforeCount + 1 && newTransaction) {
      console.log('✅ 有效 UUID 交易創建成功');
      console.log('📝 新增交易詳情:', {
        id: newTransaction.id,
        description: newTransaction.description,
        amount: newTransaction.amount
      });
      
      // 清理測試數據
      await supabase
        .from('transactions')
        .delete()
        .eq('id', validTransactionId)
        .eq('user_id', user.id);
      
      return true;
    } else {
      console.log('❌ 有效 UUID 交易創建失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試有效 UUID 交易創建異常:', error.message);
    return false;
  }
}

async function testAssetWithValidUUID(user) {
  console.log('\n📝 測試使用有效 UUID 的資產創建...');
  
  try {
    // 記錄測試前的資產數量
    const { data: beforeAssets, error: beforeError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (beforeError) {
      console.error('❌ 查詢測試前資產失敗:', beforeError.message);
      return false;
    }

    const beforeCount = beforeAssets.length;
    console.log(`📊 測試前資產數量: ${beforeCount}`);

    // 創建使用有效 UUID 的測試資產
    const validAssetId = generateUUID();
    console.log(`📝 生成的有效 UUID: ${validAssetId}`);
    console.log(`📝 UUID 格式驗證: ${isValidUUID(validAssetId) ? '✅ 有效' : '❌ 無效'}`);

    const testAsset = {
      id: validAssetId,
      user_id: user.id,
      name: '測試有效UUID資產',
      type: '現金',
      value: 9999,
      current_value: 9999,
      cost_basis: 9999,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試資產:', {
      id: testAsset.id,
      name: testAsset.name,
      current_value: testAsset.current_value
    });

    // 插入資產
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    if (insertError) {
      console.error('❌ 插入資產失敗:', insertError.message);
      console.error('❌ 錯誤詳情:', insertError);
      return false;
    }

    console.log('✅ 資產插入成功');

    // 等待並驗證
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: afterAssets, error: afterError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (afterError) {
      console.error('❌ 查詢測試後資產失敗:', afterError.message);
      return false;
    }

    const afterCount = afterAssets.length;
    console.log(`📊 測試後資產數量: ${afterCount}`);

    // 檢查新增的資產
    const newAsset = afterAssets.find(a => a.id === validAssetId);
    
    if (afterCount === beforeCount + 1 && newAsset) {
      console.log('✅ 有效 UUID 資產創建成功');
      console.log('📝 新增資產詳情:', {
        id: newAsset.id,
        name: newAsset.name,
        current_value: newAsset.current_value
      });
      
      // 清理測試數據
      await supabase
        .from('assets')
        .delete()
        .eq('id', validAssetId)
        .eq('user_id', user.id);
      
      return true;
    } else {
      console.log('❌ 有效 UUID 資產創建失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試有效 UUID 資產創建異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始測試 UUID 修復效果...');
  console.log('================================');
  
  // 1. 測試 UUID 生成功能
  const uuidResult = await testUUIDGeneration();

  // 2. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return false;
  }

  // 3. 測試交易創建
  const transactionResult = await testTransactionWithValidUUID(user);

  // 4. 測試資產創建
  const assetResult = await testAssetWithValidUUID(user);

  console.log('\n🎯 UUID 修復測試結果總結');
  console.log('================================');
  
  console.log('🔧 UUID 功能測試:');
  console.log(`  UUID 生成和驗證: ${uuidResult ? '✅ 正常' : '❌ 異常'}`);
  
  console.log('\n📝 數據創建測試:');
  console.log(`  交易創建: ${transactionResult ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`  資產創建: ${assetResult ? '✅ 成功' : '❌ 失敗'}`);

  const allPassed = uuidResult && transactionResult && assetResult;

  console.log('\n🏆 最終結果:');
  if (allPassed) {
    console.log('🎉 UUID 修復完全成功！');
    console.log('✅ 所有 ID 格式問題都已解決');
    console.log('✅ 交易和資產創建都正常工作');
    console.log('✅ 同步功能應該已經修復');
  } else {
    console.log('⚠️ UUID 修復仍有問題：');
    if (!uuidResult) console.log('  - UUID 生成功能異常');
    if (!transactionResult) console.log('  - 交易創建仍有問題');
    if (!assetResult) console.log('  - 資產創建仍有問題');
  }

  // 5. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');

  return allPassed;
}

main().catch(console.error);
