/**
 * 最終綜合同步測試
 * 測試所有同步功能：新增、更新、刪除
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

// UUID 生成函數
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

async function testTransactionCRUD(user) {
  console.log('\n📝 測試交易 CRUD 同步...');
  
  try {
    const testTransactionId = generateUUID();
    
    // 1. 測試新增
    console.log('1️⃣ 測試交易新增同步...');
    const createData = {
      id: testTransactionId,
      user_id: user.id,
      account_id: null,
      amount: 800,
      type: 'expense',
      description: '綜合測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: createError } = await supabase
      .from('transactions')
      .insert(createData);

    if (createError) {
      console.error('❌ 交易新增失敗:', createError.message);
      return false;
    }
    console.log('✅ 交易新增成功');

    // 2. 測試更新
    console.log('2️⃣ 測試交易更新同步...');
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        amount: 900,
        description: '綜合測試交易 - 已更新',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ 交易更新失敗:', updateError.message);
      return false;
    }
    console.log('✅ 交易更新成功');

    // 3. 驗證更新
    const { data: updatedTransaction, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !updatedTransaction) {
      console.error('❌ 查詢更新後交易失敗');
      return false;
    }

    if (updatedTransaction.amount === 900 && updatedTransaction.description === '綜合測試交易 - 已更新') {
      console.log('✅ 交易更新驗證成功');
    } else {
      console.log('❌ 交易更新驗證失敗');
      return false;
    }

    // 4. 測試刪除
    console.log('3️⃣ 測試交易刪除同步...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 交易刪除失敗:', deleteError.message);
      return false;
    }
    console.log('✅ 交易刪除成功');

    // 5. 驗證刪除
    const { data: deletedTransaction, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ 驗證刪除失敗:', verifyError.message);
      return false;
    }

    if (deletedTransaction.length === 0) {
      console.log('✅ 交易刪除驗證成功');
      return true;
    } else {
      console.log('❌ 交易刪除驗證失敗，記錄仍然存在');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試交易 CRUD 同步異常:', error.message);
    return false;
  }
}

async function testAssetCRUD(user) {
  console.log('\n📝 測試資產 CRUD 同步...');
  
  try {
    const testAssetId = generateUUID();
    
    // 1. 測試新增
    console.log('1️⃣ 測試資產新增同步...');
    const createData = {
      id: testAssetId,
      user_id: user.id,
      name: '綜合測試資產',
      type: '投資',
      value: 15000,
      current_value: 15000,
      cost_basis: 15000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: createError } = await supabase
      .from('assets')
      .insert(createData);

    if (createError) {
      console.error('❌ 資產新增失敗:', createError.message);
      return false;
    }
    console.log('✅ 資產新增成功');

    // 2. 測試更新
    console.log('2️⃣ 測試資產更新同步...');
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        name: '綜合測試資產 - 已更新',
        current_value: 16000,
        value: 16000,
        updated_at: new Date().toISOString()
      })
      .eq('id', testAssetId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ 資產更新失敗:', updateError.message);
      return false;
    }
    console.log('✅ 資產更新成功');

    // 3. 驗證更新
    const { data: updatedAsset, error: queryError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', testAssetId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !updatedAsset) {
      console.error('❌ 查詢更新後資產失敗');
      return false;
    }

    if (updatedAsset.current_value === 16000 && updatedAsset.name === '綜合測試資產 - 已更新') {
      console.log('✅ 資產更新驗證成功');
    } else {
      console.log('❌ 資產更新驗證失敗');
      return false;
    }

    // 4. 測試刪除
    console.log('3️⃣ 測試資產刪除同步...');
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', testAssetId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 資產刪除失敗:', deleteError.message);
      return false;
    }
    console.log('✅ 資產刪除成功');

    // 5. 驗證刪除
    const { data: deletedAsset, error: verifyError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', testAssetId)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ 驗證刪除失敗:', verifyError.message);
      return false;
    }

    if (deletedAsset.length === 0) {
      console.log('✅ 資產刪除驗證成功');
      return true;
    } else {
      console.log('❌ 資產刪除驗證失敗，記錄仍然存在');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試資產 CRUD 同步異常:', error.message);
    return false;
  }
}

async function testDataConsistency(user) {
  console.log('\n📊 測試數據一致性...');
  
  try {
    // 檢查交易數據
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (transactionError) {
      console.error('❌ 查詢交易數據失敗:', transactionError.message);
      return false;
    }

    // 檢查資產數據
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (assetError) {
      console.error('❌ 查詢資產數據失敗:', assetError.message);
      return false;
    }

    // 檢查類別數據
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (categoryError) {
      console.error('❌ 查詢類別數據失敗:', categoryError.message);
      return false;
    }

    console.log('📊 數據統計:');
    console.log(`  交易記錄: ${transactions.length} 筆`);
    console.log(`  資產記錄: ${assets.length} 筆`);
    console.log(`  類別記錄: ${categories.length} 筆`);

    // 檢查數據完整性
    let consistencyIssues = 0;

    // 檢查交易是否有對應的類別
    for (const transaction of transactions) {
      const hasCategory = categories.find(cat => cat.name === transaction.category);
      if (!hasCategory && transaction.category) {
        console.log(`⚠️ 交易 "${transaction.description}" 的類別 "${transaction.category}" 不存在`);
        consistencyIssues++;
      }
    }

    if (consistencyIssues === 0) {
      console.log('✅ 數據一致性檢查通過');
      return true;
    } else {
      console.log(`❌ 發現 ${consistencyIssues} 個數據一致性問題`);
      return false;
    }

  } catch (error) {
    console.error('❌ 測試數據一致性異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始最終綜合同步測試...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return false;
  }

  // 2. 測試交易 CRUD 同步
  const transactionResult = await testTransactionCRUD(user);

  // 3. 測試資產 CRUD 同步
  const assetResult = await testAssetCRUD(user);

  // 4. 測試數據一致性
  const consistencyResult = await testDataConsistency(user);

  console.log('\n🎯 最終測試結果總結');
  console.log('================================');
  
  console.log('📝 CRUD 同步測試:');
  console.log(`  交易 CRUD 同步: ${transactionResult ? '✅ 完全正常' : '❌ 有問題'}`);
  console.log(`  資產 CRUD 同步: ${assetResult ? '✅ 完全正常' : '❌ 有問題'}`);
  
  console.log('\n📊 數據完整性測試:');
  console.log(`  數據一致性: ${consistencyResult ? '✅ 完全正常' : '❌ 有問題'}`);

  const allPassed = transactionResult && assetResult && consistencyResult;

  console.log('\n🏆 最終結果:');
  if (allPassed) {
    console.log('🎉 所有測試都通過！同步功能完全正常！');
    console.log('✅ 交易的新增、更新、刪除都會正確同步');
    console.log('✅ 資產的新增、更新、刪除都會正確同步');
    console.log('✅ 數據一致性完美，沒有孤立記錄');
    console.log('✅ 系統已準備好投入使用');
  } else {
    console.log('⚠️ 部分測試失敗，需要進一步檢查：');
    if (!transactionResult) console.log('  - 交易 CRUD 同步有問題');
    if (!assetResult) console.log('  - 資產 CRUD 同步有問題');
    if (!consistencyResult) console.log('  - 數據一致性有問題');
  }

  // 5. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');

  return allPassed;
}

main().catch(console.error);
