/**
 * 調試交易類別缺失和刪除同步問題
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

async function testCategoryIssue(user) {
  console.log('🔍 測試交易類別問題...');
  
  try {
    // 1. 檢查現有的交易記錄
    const { data: existingTransactions, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (queryError) {
      console.error('❌ 查詢交易失敗:', queryError.message);
      return;
    }

    console.log(`📊 找到 ${existingTransactions.length} 筆交易記錄`);
    
    // 檢查類別字段
    existingTransactions.forEach((transaction, index) => {
      console.log(`交易 ${index + 1}:`, {
        id: transaction.id,
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount,
        type: transaction.type
      });
    });

    // 2. 檢查類別表
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (categoryError) {
      console.error('❌ 查詢類別失敗:', categoryError.message);
    } else {
      console.log(`📊 找到 ${categories.length} 個類別`);
      categories.forEach((category, index) => {
        console.log(`類別 ${index + 1}:`, {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color
        });
      });
    }

    // 3. 創建一個測試交易，檢查類別是否正確保存
    const testTransactionId = generateUUID();
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 100,
      type: 'expense',
      description: '測試交易 - 類別檢查',
      category: '餐飲',  // 明確指定類別
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試交易，檢查類別保存:', testTransaction);

    const { data: insertedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (insertError) {
      console.error('❌ 創建測試交易失敗:', insertError.message);
    } else {
      console.log('✅ 測試交易創建成功');
      console.log('📝 保存的交易數據:', insertedTransaction[0]);
      
      // 檢查類別字段是否正確保存
      if (insertedTransaction[0].category === '餐飲') {
        console.log('✅ 類別字段正確保存');
      } else {
        console.log('❌ 類別字段保存異常:', insertedTransaction[0].category);
      }
    }

    return testTransactionId;

  } catch (error) {
    console.error('❌ 測試類別問題異常:', error.message);
    return null;
  }
}

async function testDeleteSync(user, transactionId) {
  console.log('🗑️ 測試刪除同步問題...');
  
  if (!transactionId) {
    console.log('⚠️ 沒有測試交易 ID，跳過刪除測試');
    return;
  }

  try {
    // 1. 確認交易存在
    const { data: beforeDelete, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (queryError) {
      console.error('❌ 查詢交易失敗:', queryError.message);
      return;
    }

    if (beforeDelete.length === 0) {
      console.log('⚠️ 找不到要刪除的交易');
      return;
    }

    console.log('📝 刪除前的交易:', beforeDelete[0]);

    // 2. 執行刪除操作
    console.log('🗑️ 執行刪除操作...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除交易失敗:', deleteError.message);
      return;
    }

    console.log('✅ 刪除操作執行成功');

    // 3. 驗證刪除結果
    const { data: afterDelete, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ 驗證刪除失敗:', verifyError.message);
      return;
    }

    if (afterDelete.length === 0) {
      console.log('✅ 交易已成功從雲端刪除');
    } else {
      console.log('❌ 交易仍然存在於雲端:', afterDelete[0]);
    }

    // 4. 檢查總交易數量變化
    const { data: allTransactions, error: countError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (countError) {
      console.error('❌ 查詢總交易數失敗:', countError.message);
    } else {
      console.log(`📊 刪除後總交易數: ${allTransactions.length}`);
    }

  } catch (error) {
    console.error('❌ 測試刪除同步異常:', error.message);
  }
}

async function testCategorySync(user) {
  console.log('🔄 測試類別同步問題...');
  
  try {
    // 1. 創建一個測試類別
    const testCategoryId = generateUUID();
    const testCategory = {
      id: testCategoryId,
      user_id: user.id,
      name: '測試類別同步',
      icon: 'test-outline',
      color: '#FF0000',
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試類別:', testCategory);

    const { data: insertedCategory, error: insertError } = await supabase
      .from('categories')
      .insert(testCategory)
      .select();

    if (insertError) {
      console.error('❌ 創建測試類別失敗:', insertError.message);
      return null;
    }

    console.log('✅ 測試類別創建成功:', insertedCategory[0]);

    // 2. 更新類別
    const { error: updateError } = await supabase
      .from('categories')
      .update({
        name: '測試類別同步 - 已更新',
        color: '#00FF00',
        updated_at: new Date().toISOString()
      })
      .eq('id', testCategoryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ 更新測試類別失敗:', updateError.message);
    } else {
      console.log('✅ 測試類別更新成功');
    }

    // 3. 刪除類別
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', testCategoryId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除測試類別失敗:', deleteError.message);
      console.error('❌ 錯誤詳情:', deleteError);
    } else {
      console.log('✅ 測試類別刪除成功');
    }

    return testCategoryId;

  } catch (error) {
    console.error('❌ 測試類別同步異常:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 開始調試交易類別和刪除同步問題...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }
  
  console.log('');

  // 2. 測試交易類別問題
  const testTransactionId = await testCategoryIssue(user);
  console.log('');

  // 3. 測試刪除同步問題
  await testDeleteSync(user, testTransactionId);
  console.log('');

  // 4. 測試類別同步問題
  await testCategorySync(user);
  console.log('');

  console.log('🎯 調試完成！');
  console.log('================================');
  console.log('📝 問題分析：');
  console.log('1. 檢查交易記錄中的 category 字段是否正確保存');
  console.log('2. 檢查刪除操作是否真的同步到雲端');
  console.log('3. 檢查類別的 CRUD 操作是否正常');

  // 5. 登出用戶
  await supabase.auth.signOut();
  console.log('👋 測試完成，用戶已登出');
}

main().catch(console.error);
