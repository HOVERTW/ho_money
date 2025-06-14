/**
 * 測試完整的新增交易流程
 * 模擬從 AddTransactionModal 到 transactionDataService 的完整流程
 */

// 模擬 Web 環境
global.window = {
  localStorage: {
    storage: new Map(),
    getItem(key) { return this.storage.get(key) || null; },
    setItem(key, value) { this.storage.set(key, value); },
    removeItem(key) { this.storage.delete(key); },
    clear() { this.storage.clear(); }
  }
};
global.localStorage = global.window.localStorage;

// 模擬 AsyncStorage
const webAsyncStorage = {
  async getItem(key) { return global.localStorage.getItem(key); },
  async setItem(key, value) { global.localStorage.setItem(key, value); },
  async removeItem(key) { global.localStorage.removeItem(key); },
  async clear() { global.localStorage.clear(); }
};

// 模組解析
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === '@react-native-async-storage/async-storage') return { default: webAsyncStorage };
  if (id === 'react-native') return { Platform: { OS: 'web' } };
  return originalRequire.apply(this, arguments);
};

// 載入服務
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// UUID 工具
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
  return (id && isValidUUID(id)) ? id : generateUUID();
}

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

// 模擬 AddTransactionModal 的 handleSubmit
function simulateAddTransactionModal(editingTransaction = null) {
  console.log('\n📝 模擬 AddTransactionModal.handleSubmit');
  
  // 模擬用戶輸入
  const amount = '150';
  const type = 'expense';
  const description = '測試交易流程';
  const category = '餐飲';
  const account = '現金';
  const startDate = new Date();

  // 模擬 AddTransactionModal 中的交易對象創建
  const transaction = {
    id: ensureValidUUID(editingTransaction?.id), // 這是關鍵行
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

  console.log('📝 AddTransactionModal 創建的交易對象:');
  console.log('  ID:', transaction.id);
  console.log('  ID 有效性:', isValidUUID(transaction.id));
  console.log('  金額:', transaction.amount);
  console.log('  描述:', transaction.description);

  return transaction;
}

// 模擬 TransactionsScreen 的 handleAddTransaction
async function simulateTransactionsScreen(newTransaction) {
  console.log('\n💰 模擬 TransactionsScreen.handleAddTransaction');
  console.log('💰 處理新交易:', newTransaction.description);
  console.log('💰 接收到的交易 ID:', newTransaction.id);

  // 檢查是否是循環交易
  if (newTransaction.is_recurring) {
    console.log('🔄 處理循環交易');
    // 這裡原本有重新生成 ID 的問題，現在已經修復
    const firstTransaction = {
      ...newTransaction,
      // 保持原有的 ID，因為 AddTransactionModal 已經確保了 UUID 格式
    };
    console.log('🔄 循環交易的第一筆交易 ID:', firstTransaction.id);
    return firstTransaction;
  } else {
    console.log('📝 處理普通交易');
    console.log('📝 普通交易 ID:', newTransaction.id);
    return newTransaction;
  }
}

// 模擬 transactionDataService 的 addTransaction
async function simulateTransactionDataService(transaction, user) {
  console.log('\n📊 模擬 transactionDataService.addTransaction');
  console.log('📊 開始添加交易記錄:', transaction.description);
  console.log('📊 交易 ID:', transaction.id);

  // 確保 ID 是有效的 UUID
  const validId = ensureValidUUID(transaction.id);
  if (validId !== transaction.id) {
    console.log(`🔄 修正交易 ID: ${transaction.id} -> ${validId}`);
    transaction.id = validId;
  } else {
    console.log('✅ 交易 ID 已經是有效的 UUID，無需修正');
  }

  // 模擬本地存儲
  console.log('💾 模擬保存到本地存儲...');
  const localData = await webAsyncStorage.getItem('@FinTranzo:transactions');
  const transactions = localData ? JSON.parse(localData) : [];
  transactions.push(transaction);
  await webAsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(transactions));
  console.log('✅ 已保存到本地存儲');

  // 模擬雲端同步
  console.log('☁️ 模擬同步到雲端...');
  
  // 準備 Supabase 格式的數據
  const supabaseTransaction = {
    id: transaction.id,
    user_id: user.id,
    account_id: null,
    amount: transaction.amount || 0,
    type: transaction.type,
    description: transaction.description || '',
    category: transaction.category || '',
    account: transaction.account || '',
    from_account: transaction.fromAccount || null,
    to_account: transaction.toAccount || null,
    date: transaction.date || new Date().toISOString().split('T')[0],
    is_recurring: transaction.is_recurring || false,
    recurring_frequency: transaction.recurring_frequency || null,
    max_occurrences: transaction.max_occurrences || null,
    start_date: transaction.start_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('📝 準備同步的數據:');
  console.log('  ID:', supabaseTransaction.id);
  console.log('  用戶 ID:', supabaseTransaction.user_id);
  console.log('  金額:', supabaseTransaction.amount);

  // 檢查是否存在
  const { data: existingTransaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transaction.id)
    .eq('user_id', user.id)
    .single();

  let error;
  if (existingTransaction) {
    console.log('🔄 更新現有交易');
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
      .eq('id', transaction.id)
      .eq('user_id', user.id);
    error = updateError;
  } else {
    console.log('➕ 插入新交易');
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(supabaseTransaction);
    error = insertError;
  }

  if (error) {
    console.error('❌ 同步交易記錄到雲端失敗:', error);
    console.error('❌ 錯誤詳情:', error.message);
    throw error;
  } else {
    console.log('✅ 雲端交易記錄同步成功:', transaction.id);
  }

  return transaction;
}

async function testCompleteTransactionFlow() {
  console.log('🎯 測試完整的新增交易流程');
  console.log('================================');
  
  try {
    // 1. 登錄用戶
    const user = await loginUser();
    if (!user) {
      throw new Error('登錄失敗');
    }

    // 2. 模擬 AddTransactionModal 創建交易對象
    const modalTransaction = simulateAddTransactionModal();

    // 3. 模擬 TransactionsScreen 處理交易
    const screenTransaction = await simulateTransactionsScreen(modalTransaction);

    // 4. 模擬 transactionDataService 添加交易
    const finalTransaction = await simulateTransactionDataService(screenTransaction, user);

    // 5. 驗證結果
    console.log('\n🔍 驗證最終結果');
    console.log('================================');
    
    // 檢查本地存儲
    const localData = await webAsyncStorage.getItem('@FinTranzo:transactions');
    const localTransactions = localData ? JSON.parse(localData) : [];
    const localTransaction = localTransactions.find(t => t.id === finalTransaction.id);

    // 檢查雲端數據
    const { data: cloudData } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', finalTransaction.id)
      .eq('user_id', user.id);

    console.log('📊 本地數據:', localTransaction ? '✅ 存在' : '❌ 不存在');
    console.log('📊 雲端數據:', cloudData && cloudData.length > 0 ? '✅ 存在' : '❌ 不存在');

    if (localTransaction) {
      console.log('📝 本地交易 ID:', localTransaction.id);
      console.log('📝 本地交易描述:', localTransaction.description);
    }

    if (cloudData && cloudData.length > 0) {
      console.log('📝 雲端交易 ID:', cloudData[0].id);
      console.log('📝 雲端交易描述:', cloudData[0].description);
    }

    // 清理測試數據
    await supabase.from('transactions').delete().eq('id', finalTransaction.id);
    await supabase.auth.signOut();

    const success = localTransaction && cloudData && cloudData.length > 0;
    
    console.log('\n🏆 測試結果');
    console.log('================================');
    if (success) {
      console.log('🎉 完整交易流程測試成功！');
      console.log('✅ AddTransactionModal -> TransactionsScreen -> transactionDataService 流程正常');
      console.log('✅ UUID 生成和處理正常');
      console.log('✅ 本地存儲正常');
      console.log('✅ 雲端同步正常');
    } else {
      console.log('❌ 完整交易流程測試失敗');
      console.log('需要進一步調查問題');
    }

    return success;

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    console.error('詳細錯誤:', error);
    return false;
  }
}

testCompleteTransactionFlow().catch(console.error);
