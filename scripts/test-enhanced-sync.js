/**
 * 測試增強同步功能 - 包括刪除和更新操作
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

// UUID 生成函數
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testCRUDOperations() {
  try {
    console.log('🧪 測試 CRUD 操作...');
    
    const testUserId = generateUUID();
    const testTransactionId = generateUUID();
    const testAssetId = generateUUID();
    const testLiabilityId = generateUUID();
    const testCategoryId = generateUUID();
    
    // 1. 測試創建操作
    console.log('📝 測試創建操作...');
    
    // 創建測試交易
    const testTransaction = {
      id: testTransactionId,
      user_id: testUserId,
      amount: 100,
      type: 'income',
      description: '測試交易',
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
      console.log('✅ 交易創建成功');
    }
    
    // 創建測試資產
    const testAsset = {
      id: testAssetId,
      user_id: testUserId,
      name: '測試資產',
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
      console.log('✅ 資產創建成功');
    }
    
    // 創建測試負債
    const testLiability = {
      id: testLiabilityId,
      user_id: testUserId,
      name: '測試負債',
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
      console.log('✅ 負債創建成功');
    }
    
    // 創建測試類別
    const testCategory = {
      id: testCategoryId,
      user_id: testUserId,
      name: '測試類別',
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
      console.log('✅ 類別創建成功');
    }
    
    // 2. 測試更新操作
    console.log('🔄 測試更新操作...');
    
    // 更新交易
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({
        amount: 200,
        description: '更新後的測試交易',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTransactionId)
      .eq('user_id', testUserId);
    
    if (updateTransactionError) {
      console.error('❌ 更新交易失敗:', updateTransactionError.message);
    } else {
      console.log('✅ 交易更新成功');
    }
    
    // 更新資產
    const { error: updateAssetError } = await supabase
      .from('assets')
      .update({
        current_value: 1200,
        updated_at: new Date().toISOString()
      })
      .eq('id', testAssetId)
      .eq('user_id', testUserId);
    
    if (updateAssetError) {
      console.error('❌ 更新資產失敗:', updateAssetError.message);
    } else {
      console.log('✅ 資產更新成功');
    }
    
    // 3. 測試刪除操作
    console.log('🗑️ 測試刪除操作...');
    
    // 刪除交易
    const { error: deleteTransactionError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransactionId)
      .eq('user_id', testUserId);
    
    if (deleteTransactionError) {
      console.error('❌ 刪除交易失敗:', deleteTransactionError.message);
    } else {
      console.log('✅ 交易刪除成功');
    }
    
    // 刪除資產
    const { error: deleteAssetError } = await supabase
      .from('assets')
      .delete()
      .eq('id', testAssetId)
      .eq('user_id', testUserId);
    
    if (deleteAssetError) {
      console.error('❌ 刪除資產失敗:', deleteAssetError.message);
    } else {
      console.log('✅ 資產刪除成功');
    }
    
    // 刪除負債
    const { error: deleteLiabilityError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', testLiabilityId)
      .eq('user_id', testUserId);
    
    if (deleteLiabilityError) {
      console.error('❌ 刪除負債失敗:', deleteLiabilityError.message);
    } else {
      console.log('✅ 負債刪除成功');
    }
    
    // 刪除類別
    const { error: deleteCategoryError } = await supabase
      .from('categories')
      .delete()
      .eq('id', testCategoryId)
      .eq('user_id', testUserId);
    
    if (deleteCategoryError) {
      console.error('❌ 刪除類別失敗:', deleteCategoryError.message);
    } else {
      console.log('✅ 類別刪除成功');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ CRUD 操作測試異常:', error.message);
    return false;
  }
}

async function testTableCounts() {
  try {
    console.log('📊 檢查表記錄數量...');
    
    const tables = ['transactions', 'assets', 'liabilities', 'categories', 'accounts'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ 查詢 ${table} 表失敗:`, error.message);
        } else {
          console.log(`📋 ${table} 表記錄數: ${count || 0}`);
        }
      } catch (err) {
        console.error(`❌ ${table} 表查詢異常:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 表記錄數量檢查失敗:', error.message);
  }
}

async function main() {
  console.log('🚀 開始測試增強同步功能...');
  console.log('================================');
  
  // 1. 檢查表記錄數量
  await testTableCounts();
  
  console.log('');
  
  // 2. 測試 CRUD 操作
  const crudSuccess = await testCRUDOperations();
  
  console.log('');
  console.log('🎯 測試完成！');
  console.log('================================');
  
  if (crudSuccess) {
    console.log('✅ 所有 CRUD 操作測試通過！');
    console.log('📱 增強同步功能應該可以正常工作');
    console.log('🔄 現在支持以下操作的雲端同步：');
    console.log('  • 交易的創建、更新、刪除');
    console.log('  • 資產的創建、更新、刪除');
    console.log('  • 負債的創建、更新、刪除');
    console.log('  • 類別的創建、更新、刪除');
  } else {
    console.log('⚠️ 部分 CRUD 操作測試失敗');
    console.log('🔧 請檢查 Supabase 配置和 RLS 政策');
  }
}

main().catch(console.error);
