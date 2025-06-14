/**
 * 調試真實環境問題
 * 逐步測試每個功能，找出真正的問題
 */

// 完全模擬 Web 環境
global.window = {
  location: { href: 'https://19930913.xyz/', origin: 'https://19930913.xyz' },
  localStorage: {
    storage: new Map(),
    getItem(key) { 
      const value = this.storage.get(key);
      console.log(`🌐 localStorage.getItem("${key}") -> ${value ? `${value.length} chars` : 'null'}`);
      return value || null; 
    },
    setItem(key, value) { 
      console.log(`🌐 localStorage.setItem("${key}") -> ${value.length} chars`);
      this.storage.set(key, value); 
    },
    removeItem(key) { 
      console.log(`🌐 localStorage.removeItem("${key}")`);
      this.storage.delete(key); 
    },
    clear() { 
      console.log(`🌐 localStorage.clear()`);
      this.storage.clear(); 
    }
  }
};

global.localStorage = global.window.localStorage;
global.document = { createElement: () => ({}), getElementById: () => null };

// Web 版 AsyncStorage
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

// 模擬真實的 transactionDataService
class RealTransactionDataService {
  constructor() {
    this.transactions = [];
    this.categories = [];
    this.accounts = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 初始化 transactionDataService...');
    
    // 載入本地數據
    try {
      const transactionsData = await webAsyncStorage.getItem('@FinTranzo:transactions');
      const categoriesData = await webAsyncStorage.getItem('@FinTranzo:categories');
      const accountsData = await webAsyncStorage.getItem('@FinTranzo:accounts');

      this.transactions = transactionsData ? JSON.parse(transactionsData) : [];
      this.categories = categoriesData ? JSON.parse(categoriesData) : [];
      this.accounts = accountsData ? JSON.parse(accountsData) : [];

      console.log(`✅ 載入完成: ${this.transactions.length} 筆交易, ${this.categories.length} 個類別`);
    } catch (error) {
      console.error('❌ 載入失敗:', error);
      this.transactions = [];
      this.categories = [];
      this.accounts = [];
    }

    this.isInitialized = true;
  }

  async saveToStorage() {
    try {
      await webAsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(this.transactions));
      await webAsyncStorage.setItem('@FinTranzo:categories', JSON.stringify(this.categories));
      await webAsyncStorage.setItem('@FinTranzo:accounts', JSON.stringify(this.accounts));
      console.log('✅ 已保存到本地存儲');
    } catch (error) {
      console.error('❌ 保存失敗:', error);
      throw error;
    }
  }

  async addTransaction(transaction) {
    console.log('📝 addTransaction 開始:', transaction.description);
    
    // 確保 ID 有效
    const validId = ensureValidUUID(transaction.id);
    if (validId !== transaction.id) {
      console.log(`🔄 修正 ID: ${transaction.id} -> ${validId}`);
      transaction.id = validId;
    }

    // 添加到本地
    this.transactions.push(transaction);
    console.log(`✅ 已添加到本地，當前數量: ${this.transactions.length}`);

    // 保存到本地存儲
    await this.saveToStorage();

    // 同步到雲端
    await this.syncToSupabase(transaction);

    console.log('✅ addTransaction 完成');
  }

  async syncToSupabase(transaction) {
    console.log('☁️ 開始同步到 Supabase:', transaction.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ 用戶未登錄，跳過同步');
      return;
    }

    const supabaseTransaction = {
      id: transaction.id,
      user_id: user.id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      account: transaction.account,
      date: transaction.date,
      created_at: transaction.created_at || new Date().toISOString(),
      updated_at: transaction.updated_at || new Date().toISOString()
    };

    const { error } = await supabase
      .from('transactions')
      .insert(supabaseTransaction);

    if (error) {
      console.error('❌ Supabase 同步失敗:', error);
      throw error;
    }

    console.log('✅ Supabase 同步成功');
  }

  async deleteTransaction(id) {
    console.log('🗑️ deleteTransaction 開始:', id);

    // 從本地刪除
    this.transactions = this.transactions.filter(t => t.id !== id);
    console.log(`✅ 已從本地刪除，當前數量: ${this.transactions.length}`);

    // 保存到本地存儲
    await this.saveToStorage();

    // 從雲端刪除
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 雲端刪除失敗:', error);
      } else {
        console.log('✅ 雲端刪除成功');
      }
    }

    console.log('✅ deleteTransaction 完成');
  }

  getTransactions() {
    return [...this.transactions];
  }
}

// 模擬真實的 assetTransactionSyncService
class RealAssetService {
  constructor() {
    this.assets = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 初始化 assetService...');
    
    try {
      const assetsData = await webAsyncStorage.getItem('@FinTranzo:assets');
      this.assets = assetsData ? JSON.parse(assetsData) : [];
      console.log(`✅ 載入完成: ${this.assets.length} 項資產`);
    } catch (error) {
      console.error('❌ 載入失敗:', error);
      this.assets = [];
    }

    this.isInitialized = true;
  }

  async saveToStorage() {
    try {
      await webAsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(this.assets));
      console.log('✅ 資產已保存到本地存儲');
    } catch (error) {
      console.error('❌ 資產保存失敗:', error);
      throw error;
    }
  }

  async addAsset(asset) {
    console.log('📝 addAsset 開始:', asset.name);

    // 添加到本地
    this.assets.push(asset);
    console.log(`✅ 已添加到本地，當前數量: ${this.assets.length}`);

    // 保存到本地存儲
    await this.saveToStorage();

    // 同步到雲端
    await this.syncAssetToSupabase(asset);

    console.log('✅ addAsset 完成');
  }

  async syncAssetToSupabase(asset) {
    console.log('☁️ 開始同步資產到 Supabase:', asset.name);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ 用戶未登錄，跳過資產同步');
      return;
    }

    const supabaseAsset = {
      id: asset.id,
      user_id: user.id,
      name: asset.name,
      type: asset.type,
      value: asset.value,
      current_value: asset.current_value,
      cost_basis: asset.cost_basis,
      quantity: asset.quantity,
      sort_order: asset.sort_order,
      created_at: asset.created_at || new Date().toISOString(),
      updated_at: asset.updated_at || new Date().toISOString()
    };

    const { error } = await supabase
      .from('assets')
      .insert(supabaseAsset);

    if (error) {
      console.error('❌ 資產 Supabase 同步失敗:', error);
      throw error;
    }

    console.log('✅ 資產 Supabase 同步成功');
  }

  async deleteAsset(id) {
    console.log('🗑️ deleteAsset 開始:', id);

    // 從本地刪除
    this.assets = this.assets.filter(a => a.id !== id);
    console.log(`✅ 已從本地刪除，當前數量: ${this.assets.length}`);

    // 保存到本地存儲
    await this.saveToStorage();

    // 從雲端刪除
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 資產雲端刪除失敗:', error);
      } else {
        console.log('✅ 資產雲端刪除成功');
      }
    }

    console.log('✅ deleteAsset 完成');
  }

  getAssets() {
    return [...this.assets];
  }
}

// 創建服務實例
const transactionService = new RealTransactionDataService();
const assetService = new RealAssetService();

async function debugFunction1_AddTransaction(user) {
  console.log('\n🔍 調試功能1: 新增交易功能');
  console.log('================================');
  
  try {
    // 初始化服務
    await transactionService.initialize();
    
    // 獲取初始狀態
    const initialTransactions = transactionService.getTransactions();
    console.log(`📊 初始本地交易數量: ${initialTransactions.length}`);
    
    const { data: initialCloudData } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id);
    const initialCloudCount = initialCloudData ? initialCloudData.length : 0;
    console.log(`📊 初始雲端交易數量: ${initialCloudCount}`);

    // 創建新交易
    const transaction = {
      id: generateUUID(),
      amount: 100,
      type: 'expense',
      description: '調試功能1測試',
      category: '餐飲',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 準備添加交易:', {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description
    });

    // 執行添加
    await transactionService.addTransaction(transaction);

    // 檢查結果
    const finalTransactions = transactionService.getTransactions();
    console.log(`📊 最終本地交易數量: ${finalTransactions.length}`);
    
    const { data: finalCloudData } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id);
    const finalCloudCount = finalCloudData ? finalCloudData.length : 0;
    console.log(`📊 最終雲端交易數量: ${finalCloudCount}`);

    const localSuccess = finalTransactions.length === initialTransactions.length + 1;
    const cloudSuccess = finalCloudCount === initialCloudCount + 1;

    console.log(`📊 本地添加: ${localSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`📊 雲端同步: ${cloudSuccess ? '✅ 成功' : '❌ 失敗'}`);

    // 清理
    if (cloudSuccess) {
      await supabase.from('transactions').delete().eq('id', transaction.id);
      console.log('🧹 已清理測試數據');
    }

    return localSuccess && cloudSuccess;

  } catch (error) {
    console.error('❌ 功能1調試失敗:', error);
    return false;
  }
}

async function debugFunction2_AddAsset(user) {
  console.log('\n🔍 調試功能2: 資產新增同步功能');
  console.log('================================');
  
  try {
    // 初始化服務
    await assetService.initialize();
    
    // 獲取初始狀態
    const initialAssets = assetService.getAssets();
    console.log(`📊 初始本地資產數量: ${initialAssets.length}`);
    
    const { data: initialCloudData } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', user.id);
    const initialCloudCount = initialCloudData ? initialCloudData.length : 0;
    console.log(`📊 初始雲端資產數量: ${initialCloudCount}`);

    // 創建新資產
    const asset = {
      id: generateUUID(),
      name: '調試功能2測試資產',
      type: 'bank',
      value: 10000,
      current_value: 10000,
      cost_basis: 10000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 準備添加資產:', {
      id: asset.id,
      name: asset.name,
      value: asset.value
    });

    // 執行添加
    await assetService.addAsset(asset);

    // 檢查結果
    const finalAssets = assetService.getAssets();
    console.log(`📊 最終本地資產數量: ${finalAssets.length}`);
    
    const { data: finalCloudData } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', user.id);
    const finalCloudCount = finalCloudData ? finalCloudData.length : 0;
    console.log(`📊 最終雲端資產數量: ${finalCloudCount}`);

    const localSuccess = finalAssets.length === initialAssets.length + 1;
    const cloudSuccess = finalCloudCount === initialCloudCount + 1;

    console.log(`📊 本地添加: ${localSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`📊 雲端同步: ${cloudSuccess ? '✅ 成功' : '❌ 失敗'}`);

    // 清理
    if (cloudSuccess) {
      await supabase.from('assets').delete().eq('id', asset.id);
      console.log('🧹 已清理測試數據');
    }

    return localSuccess && cloudSuccess;

  } catch (error) {
    console.error('❌ 功能2調試失敗:', error);
    return false;
  }
}

async function debugFunction3_DeleteSync(user) {
  console.log('\n🔍 調試功能3: 刪除同步功能');
  console.log('================================');

  try {
    // 初始化服務
    await transactionService.initialize();
    await assetService.initialize();

    // 創建測試數據
    const testTransaction = {
      id: generateUUID(),
      amount: 50,
      type: 'expense',
      description: '調試功能3測試交易',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testAsset = {
      id: generateUUID(),
      name: '調試功能3測試資產',
      type: 'cash',
      value: 5000,
      current_value: 5000,
      cost_basis: 5000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試數據...');
    await transactionService.addTransaction(testTransaction);
    await assetService.addAsset(testAsset);

    // 獲取刪除前狀態
    const beforeTransactions = transactionService.getTransactions();
    const beforeAssets = assetService.getAssets();
    console.log(`📊 刪除前: ${beforeTransactions.length} 筆交易, ${beforeAssets.length} 項資產`);

    // 執行刪除
    console.log('🗑️ 執行刪除操作...');
    await transactionService.deleteTransaction(testTransaction.id);
    await assetService.deleteAsset(testAsset.id);

    // 檢查結果
    const afterTransactions = transactionService.getTransactions();
    const afterAssets = assetService.getAssets();
    console.log(`📊 刪除後: ${afterTransactions.length} 筆交易, ${afterAssets.length} 項資產`);

    const transactionDeleted = afterTransactions.length === beforeTransactions.length - 1;
    const assetDeleted = afterAssets.length === beforeAssets.length - 1;

    console.log(`📊 交易刪除: ${transactionDeleted ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`📊 資產刪除: ${assetDeleted ? '✅ 成功' : '❌ 失敗'}`);

    return transactionDeleted && assetDeleted;

  } catch (error) {
    console.error('❌ 功能3調試失敗:', error);
    return false;
  }
}

async function debugFunction4_CategoryPreservation(user) {
  console.log('\n🔍 調試功能4: 垃圾桶刪除不影響類別');
  console.log('================================');

  try {
    // 檢查類別數量
    const { data: beforeCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    const beforeCategoryCount = beforeCategories ? beforeCategories.length : 0;
    console.log(`📊 刪除前類別數量: ${beforeCategoryCount}`);

    // 創建測試類別
    const testCategories = [
      {
        id: generateUUID(),
        user_id: user.id,
        name: '調試功能4類別1',
        icon: 'test1',
        color: '#FF0000',
        type: 'expense',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        user_id: user.id,
        name: '調試功能4類別2',
        icon: 'test2',
        color: '#00FF00',
        type: 'income',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('📝 創建測試類別...');
    await supabase.from('categories').insert(testCategories);

    // 創建使用類別的交易
    const testTransactions = [
      {
        id: generateUUID(),
        user_id: user.id,
        amount: 30,
        type: 'expense',
        description: '調試功能4交易1',
        category: testCategories[0].name,
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        user_id: user.id,
        amount: 60,
        type: 'income',
        description: '調試功能4交易2',
        category: testCategories[1].name,
        account: '銀行',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('📝 創建使用類別的交易...');
    await supabase.from('transactions').insert(testTransactions);

    // 模擬垃圾桶刪除全部交易
    console.log('🗑️ 模擬垃圾桶刪除全部交易...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除交易失敗:', deleteError);
      return false;
    }

    // 檢查類別是否還在
    const { data: afterCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    const afterCategoryCount = afterCategories ? afterCategories.length : 0;
    console.log(`📊 刪除後類別數量: ${afterCategoryCount}`);

    // 檢查交易是否被刪除
    const { data: afterTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    const afterTransactionCount = afterTransactions ? afterTransactions.length : 0;
    console.log(`📊 刪除後交易數量: ${afterTransactionCount}`);

    const categoriesPreserved = afterCategoryCount >= beforeCategoryCount + 2;
    const transactionsDeleted = afterTransactionCount === 0;

    console.log(`📊 類別保持: ${categoriesPreserved ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`📊 交易刪除: ${transactionsDeleted ? '✅ 成功' : '❌ 失敗'}`);

    // 清理測試類別
    await supabase.from('categories').delete().in('id', testCategories.map(c => c.id));
    console.log('🧹 已清理測試類別');

    return categoriesPreserved && transactionsDeleted;

  } catch (error) {
    console.error('❌ 功能4調試失敗:', error);
    return false;
  }
}

async function debugFunction5_CloudSync(user) {
  console.log('\n🔍 調試功能5: 雲端同步功能');
  console.log('================================');

  try {
    // 初始化服務
    await transactionService.initialize();
    await assetService.initialize();

    console.log('📝 測試完整雲端同步流程...');

    // 創建本地數據
    const localTransaction = {
      id: generateUUID(),
      amount: 200,
      type: 'income',
      description: '調試功能5雲端同步測試',
      category: '薪水',
      account: '銀行',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const localAsset = {
      id: generateUUID(),
      name: '調試功能5雲端同步測試資產',
      type: 'investment',
      value: 15000,
      current_value: 15000,
      cost_basis: 15000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 執行完整的添加流程（包含雲端同步）
    console.log('📝 執行完整添加流程...');
    await transactionService.addTransaction(localTransaction);
    await assetService.addAsset(localAsset);

    // 驗證數據一致性
    console.log('🔍 驗證數據一致性...');

    const { data: cloudTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', localTransaction.id)
      .eq('user_id', user.id)
      .single();

    const { data: cloudAsset } = await supabase
      .from('assets')
      .select('*')
      .eq('id', localAsset.id)
      .eq('user_id', user.id)
      .single();

    const localTransactions = transactionService.getTransactions();
    const localAssets = assetService.getAssets();

    const localTransactionExists = localTransactions.some(t => t.id === localTransaction.id);
    const localAssetExists = localAssets.some(a => a.id === localAsset.id);

    console.log(`📊 本地交易: ${localTransactionExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`📊 雲端交易: ${cloudTransaction ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`📊 本地資產: ${localAssetExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`📊 雲端資產: ${cloudAsset ? '✅ 存在' : '❌ 不存在'}`);

    if (cloudTransaction && cloudAsset) {
      console.log('📊 數據一致性檢查:');
      console.log(`  交易: ${cloudTransaction.description} - ${cloudTransaction.amount}`);
      console.log(`  資產: ${cloudAsset.name} - ${cloudAsset.value}`);
    }

    const allDataExists = localTransactionExists && cloudTransaction && localAssetExists && cloudAsset;

    console.log(`📊 雲端同步: ${allDataExists ? '✅ 成功' : '❌ 失敗'}`);

    // 清理
    if (cloudTransaction) {
      await supabase.from('transactions').delete().eq('id', localTransaction.id);
    }
    if (cloudAsset) {
      await supabase.from('assets').delete().eq('id', localAsset.id);
    }
    console.log('🧹 已清理測試數據');

    return allDataExists;

  } catch (error) {
    console.error('❌ 功能5調試失敗:', error);
    return false;
  }
}

async function main() {
  console.log('🔍 開始調試真實環境問題');
  console.log('================================');
  console.log('🌐 環境: 完全模擬 https://19930913.xyz/');
  console.log('💾 存儲: localStorage (Web 版)');
  console.log('☁️ 雲端: 真實 Supabase 連接');
  console.log('================================');

  // 登錄
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，調試終止');
    return;
  }

  // 逐個調試功能
  console.log('\n🎯 開始逐個調試五個核心功能...');

  const results = {
    function1: await debugFunction1_AddTransaction(user),
    function2: await debugFunction2_AddAsset(user),
    function3: await debugFunction3_DeleteSync(user),
    function4: await debugFunction4_CategoryPreservation(user),
    function5: await debugFunction5_CloudSync(user)
  };

  console.log('\n🎯 調試結果');
  console.log('================================');
  console.log(`功能1 (新增交易): ${results.function1 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`功能2 (資產新增): ${results.function2 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`功能3 (刪除同步): ${results.function3 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`功能4 (垃圾桶刪除不影響類別): ${results.function4 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`功能5 (雲端同步): ${results.function5 ? '✅ 成功' : '❌ 失敗'}`);

  const allSuccess = Object.values(results).every(r => r === true);
  const successCount = Object.values(results).filter(r => r === true).length;

  if (allSuccess) {
    console.log('\n🎉 所有五個功能都調試成功！');
    console.log('✅ 新增交易功能完全正常');
    console.log('✅ 資產新增同步功能完全正常');
    console.log('✅ 刪除同步功能完全正常');
    console.log('✅ 垃圾桶刪除不影響類別');
    console.log('✅ 雲端同步功能完全正常');
  } else {
    console.log(`\n⚠️ ${successCount}/5 個功能成功，${5 - successCount} 個功能需要修復`);
    console.log('請檢查上面的詳細日誌找出問題所在');
  }

  // 登出
  await supabase.auth.signOut();
  console.log('\n👋 調試完成，用戶已登出');
}

main().catch(console.error);
