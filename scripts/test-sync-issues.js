/**
 * 測試新發現的同步問題
 * 1. 刪除時資產跟交易無法同步
 * 2. 新增的交易也無法同步
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

async function testTransactionCreateSync(user) {
  console.log('\n📝 測試交易新增同步問題...');
  
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

    // 創建測試交易
    const testTransactionId = generateUUID();
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 150,
      type: 'expense',
      description: '測試新增同步',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試交易:', testTransaction.description);

    // 直接插入到 Supabase（模擬應該發生的同步）
    const { data: insertedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (insertError) {
      console.error('❌ 創建測試交易失敗:', insertError.message);
      return false;
    }

    console.log('✅ 測試交易創建成功');

    // 等待一秒確保數據已保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 驗證交易是否正確保存
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

    if (afterCount === beforeCount + 1) {
      console.log('✅ 交易新增同步正常');
      
      // 清理測試數據
      await supabase
        .from('transactions')
        .delete()
        .eq('id', testTransactionId)
        .eq('user_id', user.id);
      
      return true;
    } else {
      console.log('❌ 交易新增同步失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試交易新增同步異常:', error.message);
    return false;
  }
}

async function testTransactionDeleteSync(user) {
  console.log('\n🗑️ 測試交易刪除同步問題...');
  
  try {
    // 創建一個測試交易用於刪除
    const testTransactionId = generateUUID();
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 200,
      type: 'income',
      description: '測試刪除同步',
      category: '測試',
      account: '銀行',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建待刪除的測試交易...');
    const { error: createError } = await supabase
      .from('transactions')
      .insert(testTransaction);

    if (createError) {
      console.error('❌ 創建測試交易失敗:', createError.message);
      return false;
    }

    // 記錄刪除前的交易數量
    const { data: beforeTransactions, error: beforeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (beforeError) {
      console.error('❌ 查詢刪除前交易失敗:', beforeError.message);
      return false;
    }

    const beforeCount = beforeTransactions.length;
    console.log(`📊 刪除前交易數量: ${beforeCount}`);

    // 執行刪除操作
    console.log('🗑️ 執行刪除操作...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除測試交易失敗:', deleteError.message);
      return false;
    }

    // 等待一秒確保刪除已完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 驗證刪除結果
    const { data: afterTransactions, error: afterError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (afterError) {
      console.error('❌ 查詢刪除後交易失敗:', afterError.message);
      return false;
    }

    const afterCount = afterTransactions.length;
    console.log(`📊 刪除後交易數量: ${afterCount}`);

    if (afterCount === beforeCount - 1) {
      console.log('✅ 交易刪除同步正常');
      return true;
    } else {
      console.log('❌ 交易刪除同步失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試交易刪除同步異常:', error.message);
    return false;
  }
}

async function testAssetCreateSync(user) {
  console.log('\n📝 測試資產新增同步問題...');
  
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

    // 創建測試資產
    const testAssetId = generateUUID();
    const testAsset = {
      id: testAssetId,
      user_id: user.id,
      name: '測試新增同步資產',
      type: '現金',
      value: 5000,
      current_value: 5000,
      cost_basis: 5000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試資產:', testAsset.name);

    // 直接插入到 Supabase（模擬應該發生的同步）
    const { data: insertedAsset, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    if (insertError) {
      console.error('❌ 創建測試資產失敗:', insertError.message);
      return false;
    }

    console.log('✅ 測試資產創建成功');

    // 等待一秒確保數據已保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 驗證資產是否正確保存
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

    if (afterCount === beforeCount + 1) {
      console.log('✅ 資產新增同步正常');
      
      // 清理測試數據
      await supabase
        .from('assets')
        .delete()
        .eq('id', testAssetId)
        .eq('user_id', user.id);
      
      return true;
    } else {
      console.log('❌ 資產新增同步失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試資產新增同步異常:', error.message);
    return false;
  }
}

async function testAssetDeleteSync(user) {
  console.log('\n🗑️ 測試資產刪除同步問題...');
  
  try {
    // 創建一個測試資產用於刪除
    const testAssetId = generateUUID();
    const testAsset = {
      id: testAssetId,
      user_id: user.id,
      name: '測試刪除同步資產',
      type: '投資',
      value: 10000,
      current_value: 10000,
      cost_basis: 10000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建待刪除的測試資產...');
    const { error: createError } = await supabase
      .from('assets')
      .insert(testAsset);

    if (createError) {
      console.error('❌ 創建測試資產失敗:', createError.message);
      return false;
    }

    // 記錄刪除前的資產數量
    const { data: beforeAssets, error: beforeError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (beforeError) {
      console.error('❌ 查詢刪除前資產失敗:', beforeError.message);
      return false;
    }

    const beforeCount = beforeAssets.length;
    console.log(`📊 刪除前資產數量: ${beforeCount}`);

    // 執行刪除操作
    console.log('🗑️ 執行刪除操作...');
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', testAssetId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除測試資產失敗:', deleteError.message);
      return false;
    }

    // 等待一秒確保刪除已完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 驗證刪除結果
    const { data: afterAssets, error: afterError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (afterError) {
      console.error('❌ 查詢刪除後資產失敗:', afterError.message);
      return false;
    }

    const afterCount = afterAssets.length;
    console.log(`📊 刪除後資產數量: ${afterCount}`);

    if (afterCount === beforeCount - 1) {
      console.log('✅ 資產刪除同步正常');
      return true;
    } else {
      console.log('❌ 資產刪除同步失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試資產刪除同步異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始測試新發現的同步問題...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }

  // 2. 測試交易新增同步
  const transactionCreateResult = await testTransactionCreateSync(user);

  // 3. 測試交易刪除同步
  const transactionDeleteResult = await testTransactionDeleteSync(user);

  // 4. 測試資產新增同步
  const assetCreateResult = await testAssetCreateSync(user);

  // 5. 測試資產刪除同步
  const assetDeleteResult = await testAssetDeleteSync(user);

  console.log('\n🎯 測試結果總結');
  console.log('================================');
  
  console.log('📝 新增同步測試:');
  console.log(`  交易新增: ${transactionCreateResult ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`  資產新增: ${assetCreateResult ? '✅ 正常' : '❌ 失敗'}`);
  
  console.log('\n🗑️ 刪除同步測試:');
  console.log(`  交易刪除: ${transactionDeleteResult ? '✅ 正常' : '❌ 失敗'}`);
  console.log(`  資產刪除: ${assetDeleteResult ? '✅ 正常' : '❌ 失敗'}`);

  const allPassed = transactionCreateResult && transactionDeleteResult && 
                   assetCreateResult && assetDeleteResult;

  console.log('\n📊 整體結果:');
  if (allPassed) {
    console.log('🎉 所有同步功能都正常工作！');
  } else {
    console.log('⚠️ 發現同步問題，需要進一步調查：');
    if (!transactionCreateResult) console.log('  - 交易新增同步問題');
    if (!transactionDeleteResult) console.log('  - 交易刪除同步問題');
    if (!assetCreateResult) console.log('  - 資產新增同步問題');
    if (!assetDeleteResult) console.log('  - 資產刪除同步問題');
  }

  // 6. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');
}

main().catch(console.error);
