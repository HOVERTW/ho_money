/**
 * 測試最終修復效果
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

async function testCategoryFix(user) {
  console.log('🔧 測試類別修復功能...');
  
  try {
    // 1. 檢查當前狀態
    const [transactionsResult, categoriesResult] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id)
    ]);

    if (transactionsResult.error || categoriesResult.error) {
      console.error('❌ 查詢數據失敗');
      return;
    }

    const transactions = transactionsResult.data;
    const categories = categoriesResult.data;

    console.log(`📊 當前狀態: ${transactions.length} 筆交易，${categories.length} 個類別`);

    // 2. 檢查類別匹配情況
    console.log('\n📝 類別匹配檢查:');
    let missingCount = 0;
    
    for (const transaction of transactions) {
      const matchedCategory = categories.find(cat => cat.name === transaction.category);
      const status = matchedCategory ? '✅' : '❌';
      console.log(`  ${transaction.description} - 類別: "${transaction.category}" ${status}`);
      
      if (!matchedCategory) {
        missingCount++;
      }
    }

    if (missingCount === 0) {
      console.log('✅ 所有交易都有對應的類別！');
    } else {
      console.log(`⚠️ 發現 ${missingCount} 筆交易缺少對應類別`);
    }

    // 3. 測試類別顯示邏輯
    console.log('\n🎨 模擬前端顯示邏輯:');
    for (const transaction of transactions) {
      const category = categories.find(cat => cat.name === transaction.category);
      const displayName = category?.name || '未分類';
      const displayIcon = category?.icon || 'help-outline';
      const displayColor = category?.color || '#007AFF';
      
      console.log(`  交易: ${transaction.description}`);
      console.log(`    顯示: ${displayName} (${displayIcon}, ${displayColor})`);
    }

    return { transactions: transactions.length, categories: categories.length, missingCount };

  } catch (error) {
    console.error('❌ 測試類別修復功能異常:', error.message);
    return null;
  }
}

async function testCategoryOperations(user) {
  console.log('\n🔄 測試類別 CRUD 操作...');
  
  try {
    // 1. 測試創建類別
    const testCategoryId = generateUUID();
    const testCategory = {
      id: testCategoryId,
      user_id: user.id,
      name: '測試 CRUD 類別',
      icon: 'test-outline',
      color: '#FF0000',
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 測試創建類別...');
    const { error: createError } = await supabase
      .from('categories')
      .insert(testCategory);

    if (createError) {
      console.error('❌ 創建類別失敗:', createError.message);
      return false;
    }
    console.log('✅ 類別創建成功');

    // 2. 測試更新類別
    console.log('📝 測試更新類別...');
    const { error: updateError } = await supabase
      .from('categories')
      .update({
        name: '測試 CRUD 類別 - 已更新',
        color: '#00FF00',
        updated_at: new Date().toISOString()
      })
      .eq('id', testCategoryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ 更新類別失敗:', updateError.message);
      console.log('🔧 可能需要執行 replica identity 修復');
      return false;
    }
    console.log('✅ 類別更新成功');

    // 3. 測試刪除類別
    console.log('📝 測試刪除類別...');
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', testCategoryId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除類別失敗:', deleteError.message);
      console.log('🔧 可能需要執行 replica identity 修復');
      return false;
    }
    console.log('✅ 類別刪除成功');

    return true;

  } catch (error) {
    console.error('❌ 測試類別 CRUD 操作異常:', error.message);
    return false;
  }
}

async function testTransactionDeleteSync(user) {
  console.log('\n🗑️ 測試交易刪除同步...');
  
  try {
    // 1. 創建測試交易
    const testTransactionId = generateUUID();
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 100,
      type: 'expense',
      description: '測試刪除同步',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試交易...');
    const { error: createError } = await supabase
      .from('transactions')
      .insert(testTransaction);

    if (createError) {
      console.error('❌ 創建測試交易失敗:', createError.message);
      return false;
    }
    console.log('✅ 測試交易創建成功');

    // 2. 驗證交易存在
    const { data: beforeDelete, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (queryError || !beforeDelete || beforeDelete.length === 0) {
      console.error('❌ 無法找到剛創建的測試交易');
      return false;
    }

    // 3. 執行刪除
    console.log('📝 執行刪除操作...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除測試交易失敗:', deleteError.message);
      return false;
    }

    // 4. 驗證刪除結果
    const { data: afterDelete, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ 驗證刪除結果失敗:', verifyError.message);
      return false;
    }

    if (afterDelete.length === 0) {
      console.log('✅ 交易刪除同步正常工作');
      return true;
    } else {
      console.log('❌ 交易刪除同步失敗，記錄仍然存在');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試交易刪除同步異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始測試最終修復效果...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }
  
  console.log('');

  // 2. 測試類別修復
  const categoryResult = await testCategoryFix(user);

  // 3. 測試類別 CRUD 操作
  const crudResult = await testCategoryOperations(user);

  // 4. 測試交易刪除同步
  const deleteResult = await testTransactionDeleteSync(user);

  console.log('\n🎯 測試總結');
  console.log('================================');
  
  if (categoryResult) {
    console.log(`📊 數據狀態: ${categoryResult.transactions} 筆交易，${categoryResult.categories} 個類別`);
    if (categoryResult.missingCount === 0) {
      console.log('✅ 問題1 - 交易類別缺失：已修復');
    } else {
      console.log(`❌ 問題1 - 交易類別缺失：仍有 ${categoryResult.missingCount} 筆缺失`);
    }
  }

  if (crudResult) {
    console.log('✅ 類別 CRUD 操作：正常工作');
  } else {
    console.log('❌ 類別 CRUD 操作：需要 replica identity 修復');
  }

  if (deleteResult) {
    console.log('✅ 問題2 - 刪除同步：正常工作');
  } else {
    console.log('❌ 問題2 - 刪除同步：仍有問題');
  }

  console.log('');
  
  if (categoryResult?.missingCount === 0 && deleteResult) {
    console.log('🎉 所有問題都已修復！');
  } else {
    console.log('⚠️ 部分問題仍需處理：');
    if (categoryResult?.missingCount > 0) {
      console.log('  - 需要運行類別修復服務');
    }
    if (!crudResult) {
      console.log('  - 需要在 Supabase 中執行 replica identity 修復');
    }
    if (!deleteResult) {
      console.log('  - 需要檢查刪除同步邏輯');
    }
  }

  // 5. 登出用戶
  await supabase.auth.signOut();
  console.log('👋 測試完成，用戶已登出');
}

main().catch(console.error);
