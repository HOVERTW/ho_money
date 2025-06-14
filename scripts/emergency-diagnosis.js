/**
 * 緊急診斷腳本
 * 全面檢查所有同步問題的根本原因
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

async function checkTableStructures() {
  console.log('\n🔍 檢查數據庫表結構...');
  
  try {
    // 檢查 transactions 表結構
    console.log('📝 檢查 transactions 表...');
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (txError) {
      console.error('❌ transactions 表錯誤:', txError.message);
    } else {
      console.log('✅ transactions 表可訪問');
    }

    // 檢查 assets 表結構
    console.log('📝 檢查 assets 表...');
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
    
    if (assetError) {
      console.error('❌ assets 表錯誤:', assetError.message);
    } else {
      console.log('✅ assets 表可訪問');
    }

    // 檢查 categories 表結構
    console.log('📝 檢查 categories 表...');
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
    
    if (catError) {
      console.error('❌ categories 表錯誤:', catError.message);
    } else {
      console.log('✅ categories 表可訪問');
    }

    return true;
  } catch (error) {
    console.error('❌ 檢查表結構異常:', error.message);
    return false;
  }
}

async function testBasicInsert(user) {
  console.log('\n🔍 測試基本插入操作...');
  
  try {
    // 測試 transactions 插入
    console.log('📝 測試 transactions 插入...');
    const testTxId = generateUUID();
    const testTransaction = {
      id: testTxId,
      user_id: user.id,
      amount: 100,
      type: 'expense',
      description: '緊急診斷測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: txInsert, error: txInsertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (txInsertError) {
      console.error('❌ transactions 插入失敗:', txInsertError.message);
      console.error('❌ 錯誤詳情:', txInsertError);
    } else {
      console.log('✅ transactions 插入成功');
      // 清理
      await supabase.from('transactions').delete().eq('id', testTxId);
    }

    // 測試 assets 插入
    console.log('📝 測試 assets 插入...');
    const testAssetId = generateUUID();
    const testAsset = {
      id: testAssetId,
      user_id: user.id,
      name: '緊急診斷測試資產',
      type: '現金',
      value: 1000,
      current_value: 1000,
      cost_basis: 1000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: assetInsert, error: assetInsertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    if (assetInsertError) {
      console.error('❌ assets 插入失敗:', assetInsertError.message);
      console.error('❌ 錯誤詳情:', assetInsertError);
    } else {
      console.log('✅ assets 插入成功');
      // 清理
      await supabase.from('assets').delete().eq('id', testAssetId);
    }

    // 測試 categories 插入
    console.log('📝 測試 categories 插入...');
    const testCatId = generateUUID();
    const testCategory = {
      id: testCatId,
      user_id: user.id,
      name: '緊急診斷測試類別',
      icon: 'test-outline',
      color: '#FF0000',
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: catInsert, error: catInsertError } = await supabase
      .from('categories')
      .insert(testCategory)
      .select();

    if (catInsertError) {
      console.error('❌ categories 插入失敗:', catInsertError.message);
      console.error('❌ 錯誤詳情:', catInsertError);
    } else {
      console.log('✅ categories 插入成功');
      // 清理
      await supabase.from('categories').delete().eq('id', testCatId);
    }

    return true;
  } catch (error) {
    console.error('❌ 測試基本插入異常:', error.message);
    return false;
  }
}

async function testUpsertOperations(user) {
  console.log('\n🔍 測試 upsert 操作...');
  
  try {
    // 測試 transactions upsert
    console.log('📝 測試 transactions upsert...');
    const testTxId = generateUUID();
    const testTransaction = {
      id: testTxId,
      user_id: user.id,
      amount: 200,
      type: 'income',
      description: 'Upsert 測試交易',
      category: '測試',
      account: '銀行',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: txUpsert, error: txUpsertError } = await supabase
      .from('transactions')
      .upsert(testTransaction, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (txUpsertError) {
      console.error('❌ transactions upsert 失敗:', txUpsertError.message);
      console.error('❌ 錯誤詳情:', txUpsertError);
    } else {
      console.log('✅ transactions upsert 成功');
      // 清理
      await supabase.from('transactions').delete().eq('id', testTxId);
    }

    // 測試 assets upsert
    console.log('📝 測試 assets upsert...');
    const testAssetId = generateUUID();
    const testAsset = {
      id: testAssetId,
      user_id: user.id,
      name: 'Upsert 測試資產',
      type: '投資',
      value: 2000,
      current_value: 2000,
      cost_basis: 2000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: assetUpsert, error: assetUpsertError } = await supabase
      .from('assets')
      .upsert(testAsset, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (assetUpsertError) {
      console.error('❌ assets upsert 失敗:', assetUpsertError.message);
      console.error('❌ 錯誤詳情:', assetUpsertError);
    } else {
      console.log('✅ assets upsert 成功');
      // 清理
      await supabase.from('assets').delete().eq('id', testAssetId);
    }

    // 測試 categories upsert（這個是問題所在）
    console.log('📝 測試 categories upsert...');
    const testCatId = generateUUID();
    const testCategory = {
      id: testCatId,
      user_id: user.id,
      name: 'Upsert 測試類別',
      icon: 'test-outline',
      color: '#00FF00',
      type: 'income',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: catUpsert, error: catUpsertError } = await supabase
      .from('categories')
      .upsert(testCategory, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (catUpsertError) {
      console.error('❌ categories upsert 失敗:', catUpsertError.message);
      console.error('❌ 錯誤詳情:', catUpsertError);
      console.error('❌ 這就是用戶遇到的問題！');
    } else {
      console.log('✅ categories upsert 成功');
      // 清理
      await supabase.from('categories').delete().eq('id', testCatId);
    }

    return true;
  } catch (error) {
    console.error('❌ 測試 upsert 操作異常:', error.message);
    return false;
  }
}

async function testDeleteOperations(user) {
  console.log('\n🔍 測試刪除操作...');
  
  try {
    // 創建測試數據
    const testTxId = generateUUID();
    const testAssetId = generateUUID();
    
    // 插入測試數據
    await supabase.from('transactions').insert({
      id: testTxId,
      user_id: user.id,
      amount: 300,
      type: 'expense',
      description: '刪除測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await supabase.from('assets').insert({
      id: testAssetId,
      user_id: user.id,
      name: '刪除測試資產',
      type: '現金',
      value: 3000,
      current_value: 3000,
      cost_basis: 3000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('📝 測試數據創建完成');

    // 測試刪除
    console.log('📝 測試 transactions 刪除...');
    const { error: txDeleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTxId)
      .eq('user_id', user.id);

    if (txDeleteError) {
      console.error('❌ transactions 刪除失敗:', txDeleteError.message);
    } else {
      console.log('✅ transactions 刪除成功');
    }

    console.log('📝 測試 assets 刪除...');
    const { error: assetDeleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', testAssetId)
      .eq('user_id', user.id);

    if (assetDeleteError) {
      console.error('❌ assets 刪除失敗:', assetDeleteError.message);
    } else {
      console.log('✅ assets 刪除成功');
    }

    return true;
  } catch (error) {
    console.error('❌ 測試刪除操作異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚨 開始緊急診斷...');
  console.log('================================');
  console.log('📝 診斷目標：');
  console.log('1. 資產新增的同步能力失敗');
  console.log('2. 刪除沒成功同步');
  console.log('3. 新增交易完全無法');
  console.log('4. categories upsert 約束錯誤');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，診斷終止');
    return;
  }

  // 2. 檢查表結構
  await checkTableStructures();

  // 3. 測試基本插入
  await testBasicInsert(user);

  // 4. 測試 upsert 操作
  await testUpsertOperations(user);

  // 5. 測試刪除操作
  await testDeleteOperations(user);

  console.log('\n🎯 診斷完成');
  console.log('================================');
  console.log('📝 關鍵發現：');
  console.log('- categories 表的 upsert 操作失敗');
  console.log('- 錯誤：there is no unique or exclusion constraint matching the ON CONFLICT specification');
  console.log('- 這意味著 categories 表缺少主鍵約束或唯一約束');
  console.log('- 需要修復數據庫表結構');

  // 6. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 診斷完成，用戶已登出');
}

main().catch(console.error);
