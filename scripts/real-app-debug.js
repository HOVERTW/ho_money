/**
 * 真實應用調試腳本
 * 檢查實際的應用邏輯問題
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

// 模擬真實的 UUID 工具
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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

async function debugRealTransactionFlow(user) {
  console.log('\n🔍 調試真實交易流程...');
  
  try {
    // 步驟1: 模擬 AddTransactionModal.handleSubmit
    console.log('📝 步驟1: 模擬 AddTransactionModal.handleSubmit...');
    
    const editingTransaction = null; // 新增交易
    const amount = '100';
    const type = 'expense';
    const description = '調試測試交易';
    const category = '餐飲';
    const account = '現金';
    const startDate = new Date();
    
    // 模擬 AddTransactionModal 的交易對象創建
    const transaction = {
      id: ensureValidUUID(editingTransaction?.id), // 這裡是關鍵
      amount: parseFloat(amount),
      type,
      description: description.trim(),
      category,
      account: account,
      bank_account_id: undefined,
      date: startDate.toISOString(),
      is_recurring: false,
      recurring_frequency: undefined,
      max_occurrences: undefined,
      start_date: undefined,
      created_at: editingTransaction?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📝 AddTransactionModal 創建的交易對象:', {
      id: transaction.id,
      id_valid: isValidUUID(transaction.id),
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      account: transaction.account
    });

    // 步驟2: 模擬 TransactionsScreen.handleUpdateTransaction
    console.log('📝 步驟2: 模擬 TransactionsScreen.handleUpdateTransaction...');
    
    // 由於 editingTransaction 是 null，會調用 handleAddTransaction
    
    // 步驟3: 模擬 TransactionsScreen.handleAddTransaction
    console.log('📝 步驟3: 模擬 TransactionsScreen.handleAddTransaction...');
    
    // 由於 is_recurring 是 false，會執行普通交易邏輯
    // await transactionDataService.addTransaction(newTransaction);
    
    // 步驟4: 模擬 transactionDataService.addTransaction
    console.log('📝 步驟4: 模擬 transactionDataService.addTransaction...');
    
    // 檢查 ID 是否會被修改
    const originalId = transaction.id;
    console.log('📝 原始 ID:', originalId);
    
    // 模擬 syncTransactionToSupabase 中的 ID 處理
    const validId = ensureValidUUID(transaction.id);
    console.log('📝 ensureValidUUID 後的 ID:', validId);
    console.log('📝 ID 是否改變:', originalId !== validId);
    
    // 準備 Supabase 格式的數據
    const supabaseTransaction = {
      id: validId,
      user_id: user.id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      account: transaction.account,
      from_account: transaction.fromAccount,
      to_account: transaction.toAccount,
      date: transaction.date,
      is_recurring: transaction.is_recurring,
      recurring_frequency: transaction.recurring_frequency,
      max_occurrences: transaction.max_occurrences,
      start_date: transaction.start_date,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    };

    console.log('📝 準備插入 Supabase 的數據:', {
      id: supabaseTransaction.id,
      user_id: supabaseTransaction.user_id,
      amount: supabaseTransaction.amount,
      description: supabaseTransaction.description
    });

    // 步驟5: 實際測試插入到 Supabase
    console.log('📝 步驟5: 實際測試插入到 Supabase...');
    
    // 先檢查是否存在
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', validId)
      .eq('user_id', user.id)
      .single();

    console.log('📝 檢查現有交易結果:', existingTransaction ? '存在' : '不存在');

    let error;
    if (existingTransaction) {
      // 更新現有交易
      console.log('📝 執行更新操作...');
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          amount: supabaseTransaction.amount,
          type: supabaseTransaction.type,
          description: supabaseTransaction.description,
          category: supabaseTransaction.category,
          account: supabaseTransaction.account,
          from_account: supabaseTransaction.from_account,
          to_account: supabaseTransaction.to_account,
          date: supabaseTransaction.date,
          is_recurring: supabaseTransaction.is_recurring,
          recurring_frequency: supabaseTransaction.recurring_frequency,
          max_occurrences: supabaseTransaction.max_occurrences,
          start_date: supabaseTransaction.start_date,
          updated_at: supabaseTransaction.updated_at
        })
        .eq('id', validId)
        .eq('user_id', user.id);
      error = updateError;
    } else {
      // 插入新交易
      console.log('📝 執行插入操作...');
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(supabaseTransaction);
      error = insertError;
    }

    if (error) {
      console.error('❌ Supabase 操作失敗:', error.message);
      console.error('❌ 錯誤詳情:', error);
      return false;
    } else {
      console.log('✅ Supabase 操作成功');
      
      // 驗證插入結果
      const { data: insertedTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', validId)
        .eq('user_id', user.id)
        .single();

      if (insertedTransaction) {
        console.log('✅ 交易已成功插入到數據庫');
        console.log('📝 插入的交易:', {
          id: insertedTransaction.id,
          amount: insertedTransaction.amount,
          description: insertedTransaction.description,
          category: insertedTransaction.category
        });
        
        // 清理測試數據
        await supabase
          .from('transactions')
          .delete()
          .eq('id', validId)
          .eq('user_id', user.id);
        
        return true;
      } else {
        console.log('❌ 交易未能插入到數據庫');
        return false;
      }
    }

  } catch (error) {
    console.error('❌ 調試真實交易流程異常:', error.message);
    return false;
  }
}

async function debugAssetSync(user) {
  console.log('\n🔍 調試資產同步問題...');
  
  try {
    // 檢查用戶是否有資產
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (assetError) {
      console.error('❌ 查詢資產失敗:', assetError.message);
      return false;
    }

    console.log(`📊 用戶資產數量: ${assets.length}`);
    
    if (assets.length === 0) {
      console.log('⚠️ 用戶沒有資產，這可能是問題所在');
      
      // 創建測試資產
      const testAsset = {
        id: generateUUID(),
        user_id: user.id,
        name: '調試測試資產',
        type: '現金',
        value: 10000,
        current_value: 10000,
        cost_basis: 10000,
        quantity: 1,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: createAssetError } = await supabase
        .from('assets')
        .insert(testAsset);

      if (createAssetError) {
        console.error('❌ 創建測試資產失敗:', createAssetError.message);
        return false;
      } else {
        console.log('✅ 創建測試資產成功');
        
        // 清理
        await supabase.from('assets').delete().eq('id', testAsset.id);
        return true;
      }
    } else {
      console.log('✅ 用戶有資產，資產同步應該正常');
      assets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} - ${asset.current_value}`);
      });
      return true;
    }

  } catch (error) {
    console.error('❌ 調試資產同步異常:', error.message);
    return false;
  }
}

async function debugCategoryIssue(user) {
  console.log('\n🔍 調試類別問題...');
  
  try {
    // 檢查用戶類別
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (categoryError) {
      console.error('❌ 查詢類別失敗:', categoryError.message);
      return false;
    }

    console.log(`📊 用戶類別數量: ${categories.length}`);
    
    if (categories.length === 0) {
      console.log('⚠️ 用戶沒有類別，這可能影響交易創建');
      return false;
    } else {
      console.log('✅ 用戶有類別');
      categories.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat.name} (${cat.type})`);
      });
      return true;
    }

  } catch (error) {
    console.error('❌ 調試類別問題異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始真實應用調試...');
  console.log('================================');
  console.log('📝 調試目標：');
  console.log('1. 檢查真實的交易創建流程');
  console.log('2. 檢查資產同步問題');
  console.log('3. 檢查類別問題');
  console.log('4. 找出實際執行與測試的差異');
  console.log('================================');
  
  // 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，調試終止');
    return false;
  }

  // 調試各個問題
  const transactionResult = await debugRealTransactionFlow(user);
  const assetResult = await debugAssetSync(user);
  const categoryResult = await debugCategoryIssue(user);

  console.log('\n🎯 真實應用調試結果');
  console.log('================================');
  
  console.log('📝 調試結果:');
  console.log(`  真實交易流程: ${transactionResult ? '✅ 正常' : '❌ 異常'}`);
  console.log(`  資產同步: ${assetResult ? '✅ 正常' : '❌ 異常'}`);
  console.log(`  類別功能: ${categoryResult ? '✅ 正常' : '❌ 異常'}`);

  const allPassed = transactionResult && assetResult && categoryResult;

  console.log('\n🏆 調試結論:');
  if (allPassed) {
    console.log('🎉 所有調試都通過！');
    console.log('⚠️ 但用戶實際執行仍有問題，可能的原因：');
    console.log('1. 前端狀態管理問題');
    console.log('2. React Native 環境差異');
    console.log('3. 本地存儲問題');
    console.log('4. 網絡連接問題');
    console.log('5. 用戶操作流程與測試不同');
  } else {
    console.log('⚠️ 發現問題：');
    if (!transactionResult) console.log('  - 真實交易流程有問題');
    if (!assetResult) console.log('  - 資產同步有問題');
    if (!categoryResult) console.log('  - 類別功能有問題');
  }

  // 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 調試完成，用戶已登出');

  return allPassed;
}

main().catch(console.error);
