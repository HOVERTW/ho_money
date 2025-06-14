/**
 * 測試真實應用行為
 * 檢查新增交易失效和刪除後上傳同步問題
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

async function checkCurrentData(user) {
  console.log('\n📊 檢查當前雲端數據狀態...');
  
  try {
    // 檢查交易數據
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    if (transactionError) {
      console.error('❌ 查詢交易數據失敗:', transactionError.message);
    } else {
      console.log(`📝 雲端交易記錄: ${transactions.length} 筆`);
      transactions.forEach((t, index) => {
        console.log(`  ${index + 1}. ${t.description} - ${t.amount} (${t.type})`);
      });
    }

    // 檢查資產數據
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (assetError) {
      console.error('❌ 查詢資產數據失敗:', assetError.message);
    } else {
      console.log(`💰 雲端資產記錄: ${assets.length} 筆`);
      assets.forEach((a, index) => {
        console.log(`  ${index + 1}. ${a.name} - ${a.current_value} (${a.type})`);
      });
    }

    // 檢查類別數據
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (categoryError) {
      console.error('❌ 查詢類別數據失敗:', categoryError.message);
    } else {
      console.log(`🏷️ 雲端類別記錄: ${categories.length} 筆`);
      categories.forEach((c, index) => {
        console.log(`  ${index + 1}. ${c.name} (${c.type})`);
      });
    }

    return {
      transactions: transactions || [],
      assets: assets || [],
      categories: categories || []
    };

  } catch (error) {
    console.error('❌ 檢查當前數據異常:', error.message);
    return null;
  }
}

async function testNewTransactionIssue(user) {
  console.log('\n🔍 測試新增交易失效問題...');
  
  try {
    // 1. 檢查當前交易數量
    const beforeData = await checkCurrentData(user);
    if (!beforeData) return false;
    
    const beforeCount = beforeData.transactions.length;
    console.log(`📊 測試前交易數量: ${beforeCount}`);

    // 2. 嘗試直接創建交易（模擬應用行為）
    console.log('📝 嘗試創建新交易...');
    
    const testTransaction = {
      id: 'test-' + Date.now(),
      user_id: user.id,
      amount: 999,
      type: 'expense',
      description: '測試新增失效問題',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. 直接插入到 Supabase（檢查基本功能）
    const { data: insertResult, error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();

    if (insertError) {
      console.error('❌ 直接插入交易失敗:', insertError.message);
      console.error('❌ 錯誤詳情:', insertError);
      return false;
    }

    console.log('✅ 直接插入交易成功');

    // 4. 等待並驗證
    await new Promise(resolve => setTimeout(resolve, 2000));

    const afterData = await checkCurrentData(user);
    if (!afterData) return false;

    const afterCount = afterData.transactions.length;
    console.log(`📊 測試後交易數量: ${afterCount}`);

    if (afterCount === beforeCount + 1) {
      console.log('✅ 基本插入功能正常');
      
      // 清理測試數據
      await supabase
        .from('transactions')
        .delete()
        .eq('id', testTransaction.id);
      
      return true;
    } else {
      console.log('❌ 基本插入功能異常');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試新增交易失效問題異常:', error.message);
    return false;
  }
}

async function testDeleteAndUploadIssue(user) {
  console.log('\n🗑️ 測試刪除後上傳同步問題...');
  
  try {
    // 1. 創建一些測試數據
    console.log('📝 創建測試數據...');
    
    const testTransactions = [
      {
        id: 'test-tx-1-' + Date.now(),
        user_id: user.id,
        amount: 100,
        type: 'expense',
        description: '測試交易1',
        category: '測試',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-tx-2-' + Date.now(),
        user_id: user.id,
        amount: 200,
        type: 'income',
        description: '測試交易2',
        category: '薪水',
        account: '銀行',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const testAssets = [
      {
        id: 'test-asset-1-' + Date.now(),
        user_id: user.id,
        name: '測試資產1',
        type: '現金',
        value: 5000,
        current_value: 5000,
        cost_basis: 5000,
        quantity: 1,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 插入測試數據
    const { error: txError } = await supabase
      .from('transactions')
      .insert(testTransactions);

    if (txError) {
      console.error('❌ 插入測試交易失敗:', txError.message);
      return false;
    }

    const { error: assetError } = await supabase
      .from('assets')
      .insert(testAssets);

    if (assetError) {
      console.error('❌ 插入測試資產失敗:', assetError.message);
      return false;
    }

    console.log('✅ 測試數據創建成功');

    // 2. 檢查數據是否存在
    await new Promise(resolve => setTimeout(resolve, 1000));
    const beforeDeleteData = await checkCurrentData(user);
    if (!beforeDeleteData) return false;

    console.log(`📊 刪除前: ${beforeDeleteData.transactions.length} 筆交易, ${beforeDeleteData.assets.length} 筆資產`);

    // 3. 模擬垃圾桶刪除全部操作
    console.log('🗑️ 模擬刪除全部交易和資產...');

    // 刪除所有交易
    const { error: deleteTransactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteTransactionsError) {
      console.error('❌ 刪除全部交易失敗:', deleteTransactionsError.message);
      return false;
    }

    // 刪除所有資產
    const { error: deleteAssetsError } = await supabase
      .from('assets')
      .delete()
      .eq('user_id', user.id);

    if (deleteAssetsError) {
      console.error('❌ 刪除全部資產失敗:', deleteAssetsError.message);
      return false;
    }

    console.log('✅ 全部刪除操作完成');

    // 4. 驗證刪除結果
    await new Promise(resolve => setTimeout(resolve, 1000));
    const afterDeleteData = await checkCurrentData(user);
    if (!afterDeleteData) return false;

    console.log(`📊 刪除後: ${afterDeleteData.transactions.length} 筆交易, ${afterDeleteData.assets.length} 筆資產`);

    if (afterDeleteData.transactions.length === 0 && afterDeleteData.assets.length === 0) {
      console.log('✅ 刪除操作驗證成功');
    } else {
      console.log('❌ 刪除操作驗證失敗，仍有殘留數據');
      return false;
    }

    // 5. 模擬上傳操作（重新插入數據）
    console.log('📤 模擬上傳操作...');

    const uploadTransactions = [
      {
        id: 'upload-tx-1-' + Date.now(),
        user_id: user.id,
        amount: 300,
        type: 'expense',
        description: '上傳測試交易1',
        category: '測試',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const uploadAssets = [
      {
        id: 'upload-asset-1-' + Date.now(),
        user_id: user.id,
        name: '上傳測試資產1',
        type: '投資',
        value: 8000,
        current_value: 8000,
        cost_basis: 8000,
        quantity: 1,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // 執行上傳（插入）
    const { error: uploadTxError } = await supabase
      .from('transactions')
      .insert(uploadTransactions);

    if (uploadTxError) {
      console.error('❌ 上傳交易失敗:', uploadTxError.message);
      return false;
    }

    const { error: uploadAssetError } = await supabase
      .from('assets')
      .insert(uploadAssets);

    if (uploadAssetError) {
      console.error('❌ 上傳資產失敗:', uploadAssetError.message);
      return false;
    }

    console.log('✅ 上傳操作完成');

    // 6. 驗證上傳結果
    await new Promise(resolve => setTimeout(resolve, 1000));
    const afterUploadData = await checkCurrentData(user);
    if (!afterUploadData) return false;

    console.log(`📊 上傳後: ${afterUploadData.transactions.length} 筆交易, ${afterUploadData.assets.length} 筆資產`);

    if (afterUploadData.transactions.length > 0 && afterUploadData.assets.length > 0) {
      console.log('✅ 上傳同步驗證成功');
      
      // 清理測試數據
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('assets').delete().eq('user_id', user.id);
      
      return true;
    } else {
      console.log('❌ 上傳同步驗證失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ 測試刪除後上傳同步問題異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始測試真實應用行為...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }

  // 2. 檢查當前數據狀態
  await checkCurrentData(user);

  // 3. 測試新增交易失效問題
  const newTransactionResult = await testNewTransactionIssue(user);

  // 4. 測試刪除後上傳同步問題
  const deleteUploadResult = await testDeleteAndUploadIssue(user);

  console.log('\n🎯 真實應用行為測試結果');
  console.log('================================');
  
  console.log('📝 問題驗證結果:');
  console.log(`  新增交易失效: ${newTransactionResult ? '❌ 未重現' : '✅ 已重現'}`);
  console.log(`  刪除後上傳同步失敗: ${deleteUploadResult ? '❌ 未重現' : '✅ 已重現'}`);

  if (!newTransactionResult || !deleteUploadResult) {
    console.log('\n⚠️ 發現問題，需要進一步調查：');
    if (!newTransactionResult) console.log('  - 新增交易確實有問題');
    if (!deleteUploadResult) console.log('  - 刪除後上傳同步確實有問題');
  } else {
    console.log('\n🤔 基本功能測試正常，問題可能在應用層面：');
    console.log('  - 檢查前端交易創建邏輯');
    console.log('  - 檢查手動上傳功能實現');
    console.log('  - 檢查本地存儲機制');
  }

  // 5. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');
}

main().catch(console.error);
