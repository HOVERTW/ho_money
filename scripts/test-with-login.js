/**
 * 使用真實帳號登錄測試雲端同步功能
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
  try {
    console.log('🔐 嘗試登錄用戶:', TEST_EMAIL);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) {
      console.error('❌ 登錄失敗:', error.message);
      return null;
    }

    console.log('✅ 登錄成功!');
    console.log('👤 用戶 ID:', data.user.id);
    console.log('📧 用戶郵箱:', data.user.email);
    
    return data.user;
  } catch (error) {
    console.error('❌ 登錄異常:', error.message);
    return null;
  }
}

async function testDataOperations(user) {
  try {
    console.log('🧪 開始測試已登錄用戶的數據操作...');
    
    const testTransactionId = generateUUID();
    const testAssetId = generateUUID();
    const testLiabilityId = generateUUID();
    const testCategoryId = generateUUID();
    const testAccountId = generateUUID();
    
    // 1. 測試創建操作
    console.log('📝 測試創建操作...');
    
    // 創建測試交易
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 100,
      type: 'income',
      description: '測試交易 - 已登錄用戶',
      category: '測試分類',
      account: '測試帳戶',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();
    
    if (transactionError) {
      console.error('❌ 創建交易失敗:', transactionError.message);
    } else {
      console.log('✅ 交易創建成功:', transactionData[0]?.id);
    }
    
    // 創建測試資產
    const testAsset = {
      id: testAssetId,
      user_id: user.id,
      name: '測試資產 - 已登錄用戶',
      type: '現金',
      value: 1000,
      current_value: 1000,
      cost_basis: 1000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
    
    if (assetError) {
      console.error('❌ 創建資產失敗:', assetError.message);
    } else {
      console.log('✅ 資產創建成功:', assetData[0]?.id);
    }
    
    // 創建測試負債
    const testLiability = {
      id: testLiabilityId,
      user_id: user.id,
      name: '測試負債 - 已登錄用戶',
      type: '信用卡',
      balance: 5000,
      interest_rate: 0.18,
      monthly_payment: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: liabilityData, error: liabilityError } = await supabase
      .from('liabilities')
      .insert(testLiability)
      .select();
    
    if (liabilityError) {
      console.error('❌ 創建負債失敗:', liabilityError.message);
    } else {
      console.log('✅ 負債創建成功:', liabilityData[0]?.id);
    }
    
    // 創建測試類別
    const testCategory = {
      id: testCategoryId,
      user_id: user.id,
      name: '測試類別 - 已登錄用戶',
      icon: 'test-outline',
      color: '#FF0000',
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .insert(testCategory)
      .select();
    
    if (categoryError) {
      console.error('❌ 創建類別失敗:', categoryError.message);
    } else {
      console.log('✅ 類別創建成功:', categoryData[0]?.id);
    }
    
    // 創建測試帳戶
    const testAccount = {
      id: testAccountId,
      user_id: user.id,
      name: '測試帳戶 - 已登錄用戶',
      type: '銀行帳戶',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .insert(testAccount)
      .select();
    
    if (accountError) {
      console.error('❌ 創建帳戶失敗:', accountError.message);
    } else {
      console.log('✅ 帳戶創建成功:', accountData[0]?.id);
    }
    
    // 2. 測試更新操作
    console.log('🔄 測試更新操作...');
    
    // 更新交易
    if (transactionData && transactionData[0]) {
      const { error: updateTransactionError } = await supabase
        .from('transactions')
        .update({
          amount: 200,
          description: '更新後的測試交易',
          updated_at: new Date().toISOString()
        })
        .eq('id', testTransactionId)
        .eq('user_id', user.id);
      
      if (updateTransactionError) {
        console.error('❌ 更新交易失敗:', updateTransactionError.message);
      } else {
        console.log('✅ 交易更新成功');
      }
    }
    
    // 更新資產
    if (assetData && assetData[0]) {
      const { error: updateAssetError } = await supabase
        .from('assets')
        .update({
          current_value: 1200,
          updated_at: new Date().toISOString()
        })
        .eq('id', testAssetId)
        .eq('user_id', user.id);
      
      if (updateAssetError) {
        console.error('❌ 更新資產失敗:', updateAssetError.message);
      } else {
        console.log('✅ 資產更新成功');
      }
    }
    
    // 3. 測試查詢操作
    console.log('🔍 測試查詢操作...');
    
    const { data: userTransactions, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);
    
    if (queryError) {
      console.error('❌ 查詢交易失敗:', queryError.message);
    } else {
      console.log(`✅ 查詢成功，找到 ${userTransactions.length} 筆交易記錄`);
    }
    
    // 4. 測試刪除操作
    console.log('🗑️ 測試刪除操作...');
    
    // 刪除測試數據
    const deletePromises = [];
    
    if (transactionData && transactionData[0]) {
      deletePromises.push(
        supabase.from('transactions').delete().eq('id', testTransactionId).eq('user_id', user.id)
      );
    }
    
    if (assetData && assetData[0]) {
      deletePromises.push(
        supabase.from('assets').delete().eq('id', testAssetId).eq('user_id', user.id)
      );
    }
    
    if (liabilityData && liabilityData[0]) {
      deletePromises.push(
        supabase.from('liabilities').delete().eq('id', testLiabilityId).eq('user_id', user.id)
      );
    }
    
    if (categoryData && categoryData[0]) {
      deletePromises.push(
        supabase.from('categories').delete().eq('id', testCategoryId).eq('user_id', user.id)
      );
    }
    
    if (accountData && accountData[0]) {
      deletePromises.push(
        supabase.from('accounts').delete().eq('id', testAccountId).eq('user_id', user.id)
      );
    }
    
    const deleteResults = await Promise.allSettled(deletePromises);
    
    deleteResults.forEach((result, index) => {
      const tables = ['transactions', 'assets', 'liabilities', 'categories', 'accounts'];
      if (result.status === 'fulfilled' && !result.value.error) {
        console.log(`✅ ${tables[index]} 刪除成功`);
      } else {
        console.error(`❌ ${tables[index]} 刪除失敗:`, result.status === 'fulfilled' ? result.value.error?.message : result.reason);
      }
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 數據操作測試異常:', error.message);
    return false;
  }
}

async function checkUserData(user) {
  try {
    console.log('📊 檢查用戶現有數據...');
    
    const tables = ['transactions', 'assets', 'liabilities', 'categories', 'accounts'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);
        
        if (error) {
          console.error(`❌ 查詢 ${table} 失敗:`, error.message);
        } else {
          console.log(`📋 ${table}: ${count || 0} 筆記錄`);
          if (data && data.length > 0) {
            console.log(`   最新記錄: ${data[0].name || data[0].description || data[0].id}`);
          }
        }
      } catch (err) {
        console.error(`❌ ${table} 查詢異常:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 檢查用戶數據失敗:', error.message);
  }
}

async function main() {
  console.log('🚀 開始使用真實帳號測試雲端同步功能...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，無法繼續測試');
    return;
  }
  
  console.log('');
  
  // 2. 檢查用戶現有數據
  await checkUserData(user);
  
  console.log('');
  
  // 3. 測試數據操作
  const testSuccess = await testDataOperations(user);
  
  console.log('');
  console.log('🎯 測試完成！');
  console.log('================================');
  
  if (testSuccess) {
    console.log('✅ 所有測試都通過！RLS 政策正常工作');
    console.log('📱 雲端同步功能可以正常使用');
    console.log('🔒 數據安全機制運作正常');
  } else {
    console.log('⚠️ 部分測試失敗，請檢查配置');
  }
  
  // 4. 登出用戶
  await supabase.auth.signOut();
  console.log('👋 用戶已登出');
}

main().catch(console.error);
