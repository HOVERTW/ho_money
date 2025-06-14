/**
 * 測試真實代碼環境
 * 使用實際的服務實例，而不是模擬的
 */

// 設置 Node.js 環境來模擬 React Native
global.__DEV__ = true;
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

// 模擬 React Native 模組
const mockRN = {
  Platform: { OS: 'web', select: (obj) => obj.web || obj.default },
  Dimensions: { get: () => ({ width: 1920, height: 1080 }) },
  Alert: { alert: (title, message) => console.log(`🌐 Alert: ${title} - ${message}`) }
};

// Web 版 AsyncStorage (使用 localStorage)
const webAsyncStorage = {
  async getItem(key) { return global.localStorage.getItem(key); },
  async setItem(key, value) { global.localStorage.setItem(key, value); },
  async removeItem(key) { global.localStorage.removeItem(key); },
  async clear() { global.localStorage.clear(); },
  async multiRemove(keys) { 
    keys.forEach(key => global.localStorage.removeItem(key)); 
  }
};

// 設置模組解析
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Mock React Native 核心模組
  if (id === 'react-native') {
    return mockRN;
  }
  
  // Mock AsyncStorage
  if (id === '@react-native-async-storage/async-storage') {
    return { default: webAsyncStorage };
  }
  
  // Mock Expo 模組
  if (id === 'expo-status-bar') {
    return { StatusBar: {} };
  }
  
  if (id.startsWith('@expo/vector-icons')) {
    return { Ionicons: {} };
  }
  
  // Mock React
  if (id === 'react') {
    return {
      useState: (initial) => [initial, () => {}],
      useEffect: (fn) => fn(),
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
      createContext: () => ({}),
      useContext: () => ({}),
      Component: class Component {},
      createElement: () => ({}),
      Fragment: 'Fragment'
    };
  }
  
  // 對於其他模組，使用原始 require
  return originalRequire.apply(this, arguments);
};

// 載入環境變量
require('dotenv').config();

// 檢查環境變量
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變量');
  process.exit(1);
}

console.log('🔄 載入真實的服務...');

// 現在載入真實的服務
let transactionDataService, assetTransactionSyncService, appInitializationService, supabase;

try {
  // 載入 Supabase
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase 客戶端載入成功');

  // 載入真實的服務
  const transactionModule = require('../src/services/transactionDataService.ts');
  transactionDataService = transactionModule.transactionDataService;
  console.log('✅ transactionDataService 載入成功');

  const assetModule = require('../src/services/assetTransactionSyncService.ts');
  assetTransactionSyncService = assetModule.assetTransactionSyncService;
  console.log('✅ assetTransactionSyncService 載入成功');

  const appInitModule = require('../src/services/appInitializationService.ts');
  appInitializationService = appInitModule.appInitializationService;
  console.log('✅ appInitializationService 載入成功');

} catch (error) {
  console.error('❌ 載入真實服務失敗:', error.message);
  console.error('詳細錯誤:', error);
  process.exit(1);
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

async function testRealFunction1_AddTransaction(user) {
  console.log('\n🔍 測試真實功能1: 新增交易功能');
  console.log('================================');
  
  try {
    // 使用真實的初始化流程
    console.log('🚀 執行真實的應用初始化...');
    await appInitializationService.initializeApp();
    console.log('✅ 真實應用初始化完成');

    // 獲取初始狀態
    const initialTransactions = transactionDataService.getTransactions();
    console.log(`📊 初始本地交易數量: ${initialTransactions.length}`);
    
    const { data: initialCloudData } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id);
    const initialCloudCount = initialCloudData ? initialCloudData.length : 0;
    console.log(`📊 初始雲端交易數量: ${initialCloudCount}`);

    // 使用真實的 UUID 工具
    const { generateUUID } = require('../src/utils/uuid.ts');
    
    // 創建新交易（模擬 AddTransactionModal 的邏輯）
    const transaction = {
      id: generateUUID(),
      amount: 100,
      type: 'expense',
      description: '真實功能1測試',
      category: '餐飲',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 準備添加交易（使用真實服務）:', {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description
    });

    // 使用真實的 addTransaction 方法
    await transactionDataService.addTransaction(transaction);

    // 檢查結果
    const finalTransactions = transactionDataService.getTransactions();
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
    console.error('❌ 真實功能1測試失敗:', error);
    console.error('詳細錯誤:', error.stack);
    return false;
  }
}

async function testRealFunction2_AddAsset(user) {
  console.log('\n🔍 測試真實功能2: 資產新增同步功能');
  console.log('================================');
  
  try {
    // 確保資產服務已初始化
    await assetTransactionSyncService.initialize();
    console.log('✅ 真實資產服務初始化完成');

    // 獲取初始狀態
    const initialAssets = assetTransactionSyncService.getAssets();
    console.log(`📊 初始本地資產數量: ${initialAssets.length}`);
    
    const { data: initialCloudData } = await supabase
      .from('assets')
      .select('id')
      .eq('user_id', user.id);
    const initialCloudCount = initialCloudData ? initialCloudData.length : 0;
    console.log(`📊 初始雲端資產數量: ${initialCloudCount}`);

    // 使用真實的 UUID 工具
    const { generateUUID } = require('../src/utils/uuid.ts');
    
    // 創建新資產
    const asset = {
      id: generateUUID(),
      name: '真實功能2測試資產',
      type: 'bank',
      value: 10000,
      current_value: 10000,
      cost_basis: 10000,
      quantity: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 準備添加資產（使用真實服務）:', {
      id: asset.id,
      name: asset.name,
      value: asset.value
    });

    // 使用真實的 addAsset 方法
    await assetTransactionSyncService.addAsset(asset);

    // 檢查結果
    const finalAssets = assetTransactionSyncService.getAssets();
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
    console.error('❌ 真實功能2測試失敗:', error);
    console.error('詳細錯誤:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🔍 測試真實代碼環境');
  console.log('================================');
  console.log('🌐 環境: 完全模擬 https://19930913.xyz/');
  console.log('💾 存儲: localStorage (Web 版)');
  console.log('☁️ 雲端: 真實 Supabase 連接');
  console.log('⚙️ 服務: 真實的 transactionDataService 和 assetTransactionSyncService');
  console.log('================================');

  // 登錄
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }

  // 測試真實的功能
  console.log('\n🎯 開始測試真實代碼的功能...');
  
  const results = {
    function1: await testRealFunction1_AddTransaction(user),
    function2: await testRealFunction2_AddAsset(user),
  };

  console.log('\n🎯 真實代碼測試結果');
  console.log('================================');
  console.log(`功能1 (新增交易): ${results.function1 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`功能2 (資產新增): ${results.function2 ? '✅ 成功' : '❌ 失敗'}`);

  if (!results.function1 || !results.function2) {
    console.log('\n❌ 真實代碼測試發現問題！');
    console.log('這說明我的修復沒有解決實際問題');
    console.log('需要進一步分析真實代碼的問題');
  } else {
    console.log('\n✅ 真實代碼測試成功！');
    console.log('這說明代碼邏輯是正確的');
    console.log('問題可能在於瀏覽器環境或其他因素');
  }

  // 登出
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');
}

main().catch(error => {
  console.error('❌ 測試過程中發生嚴重錯誤:', error);
  console.error('詳細錯誤:', error.stack);
});
