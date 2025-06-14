/**
 * 模擬 React Native 環境測試
 * 盡可能接近真實的應用執行環境
 */

// 模擬 React Native 全局環境
global.__DEV__ = true;
global.window = global;
global.document = {};
global.navigator = { userAgent: 'ReactNative' };

// 模擬 AsyncStorage
const mockAsyncStorage = {
  storage: new Map(),
  
  async getItem(key) {
    const value = this.storage.get(key);
    console.log(`📱 AsyncStorage.getItem("${key}") -> ${value ? `${value.length} chars` : 'null'}`);
    return value || null;
  },
  
  async setItem(key, value) {
    console.log(`📱 AsyncStorage.setItem("${key}", ${value.length} chars)`);
    this.storage.set(key, value);
  },
  
  async removeItem(key) {
    console.log(`📱 AsyncStorage.removeItem("${key}")`);
    this.storage.delete(key);
  },
  
  async clear() {
    console.log(`📱 AsyncStorage.clear()`);
    this.storage.clear();
  }
};

// 模擬 React Native 模組
const mockModules = {
  '@react-native-async-storage/async-storage': {
    default: mockAsyncStorage
  },
  'react-native': {
    Platform: { OS: 'ios' },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    Alert: {
      alert: (title, message, buttons) => {
        console.log(`📱 Alert.alert("${title}", "${message}")`);
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    }
  },
  'expo-status-bar': { StatusBar: {} },
  '@expo/vector-icons': { Ionicons: {} },
  'react-native-safe-area-context': {
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 })
  }
};

// 設置模組解析
const originalRequire = require;
require = function(id) {
  if (mockModules[id]) {
    return mockModules[id];
  }
  return originalRequire.apply(this, arguments);
};

// 現在載入真實的服務
const { createClient } = originalRequire('@supabase/supabase-js');
originalRequire('dotenv').config();

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

// 模擬 UUID 工具（從真實代碼複製）
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

// 模擬 transactionDataService 的核心邏輯
class MockTransactionDataService {
  constructor() {
    this.transactions = [];
    this.categories = [];
    this.accounts = [];
    this.listeners = [];
  }

  async initialize() {
    console.log('🚀 MockTransactionDataService 初始化...');
    await this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      console.log('📱 從本地存儲載入數據...');
      
      const transactionsData = await mockAsyncStorage.getItem('@FinTranzo:transactions');
      const categoriesData = await mockAsyncStorage.getItem('@FinTranzo:categories');
      const accountsData = await mockAsyncStorage.getItem('@FinTranzo:accounts');

      this.transactions = transactionsData ? JSON.parse(transactionsData) : [];
      this.categories = categoriesData ? JSON.parse(categoriesData) : [];
      this.accounts = accountsData ? JSON.parse(accountsData) : [];

      console.log(`📊 載入完成: ${this.transactions.length} 筆交易, ${this.categories.length} 個類別, ${this.accounts.length} 個帳戶`);
    } catch (error) {
      console.error('❌ 載入本地數據失敗:', error);
      this.transactions = [];
      this.categories = [];
      this.accounts = [];
    }
  }

  async saveToStorage() {
    try {
      console.log('💾 保存數據到本地存儲...');
      console.log(`📊 交易數量: ${this.transactions.length}`);
      console.log(`📊 類別數量: ${this.categories.length}`);
      console.log(`📊 帳戶數量: ${this.accounts.length}`);

      await mockAsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(this.transactions));
      await mockAsyncStorage.setItem('@FinTranzo:categories', JSON.stringify(this.categories));
      await mockAsyncStorage.setItem('@FinTranzo:accounts', JSON.stringify(this.accounts));

      console.log('✅ 所有數據已成功保存到本地存儲');
    } catch (error) {
      console.error('❌ 保存數據到本地存儲失敗:', error);
      throw error;
    }
  }

  async addTransaction(transaction) {
    try {
      console.log('📝 開始添加交易記錄:', transaction.description);
      console.log('📝 交易 ID:', transaction.id);
      console.log('📝 交易詳情:', {
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        account: transaction.account
      });

      // 確保 ID 是有效的 UUID
      const validId = ensureValidUUID(transaction.id);
      if (validId !== transaction.id) {
        console.log(`🔄 修正交易 ID: ${transaction.id} -> ${validId}`);
        transaction.id = validId;
      }

      // 添加到本地數據
      this.transactions.push(transaction);
      console.log('✅ 已添加到本地數據，當前交易數量:', this.transactions.length);

      // 保存到本地存儲
      try {
        await this.saveToStorage();
        console.log('✅ 已保存到本地存儲');
      } catch (storageError) {
        console.error('❌ 保存到本地存儲失敗:', storageError);
      }

      // 同步到雲端
      try {
        await this.syncTransactionToSupabase(transaction);
        console.log('✅ 已同步到雲端');
      } catch (syncError) {
        console.error('❌ 雲端同步失敗:', syncError);
      }

      console.log('✅ 交易記錄添加成功');
    } catch (error) {
      console.error('❌ 添加交易記錄失敗:', error);
      
      // 回滾本地數據
      const index = this.transactions.findIndex(t => t.id === transaction.id);
      if (index !== -1) {
        this.transactions.splice(index, 1);
        console.log('🔄 已回滾本地數據');
      }
      
      throw error;
    }
  }

  async syncTransactionToSupabase(transaction) {
    try {
      console.log('☁️ 開始同步交易到 Supabase:', transaction.id);

      // 檢查用戶認證
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('用戶未登錄或認證失敗');
      }

      // 確保 ID 是有效的 UUID 格式
      const validId = ensureValidUUID(transaction.id);
      
      // 準備 Supabase 格式的數據
      const supabaseTransaction = {
        id: validId,
        user_id: user.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        account: transaction.account,
        date: transaction.date,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at
      };

      console.log('📝 準備同步的數據:', {
        id: supabaseTransaction.id,
        user_id: supabaseTransaction.user_id,
        amount: supabaseTransaction.amount,
        description: supabaseTransaction.description
      });

      // 先檢查是否存在
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', validId)
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
            date: supabaseTransaction.date,
            updated_at: supabaseTransaction.updated_at
          })
          .eq('id', validId)
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
        throw error;
      } else {
        console.log('✅ 雲端交易記錄同步成功:', validId);
      }

    } catch (error) {
      console.error('❌ syncTransactionToSupabase 異常:', error);
      throw error;
    }
  }

  getTransactions() {
    return this.transactions;
  }
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

async function simulateRealUserFlow() {
  console.log('\n🎭 模擬真實用戶操作流程...');
  
  try {
    // 1. 初始化服務
    console.log('📱 步驟1: 初始化應用服務...');
    const transactionService = new MockTransactionDataService();
    await transactionService.initialize();

    // 2. 用戶登錄
    console.log('📱 步驟2: 用戶登錄...');
    const user = await loginUser();
    if (!user) {
      throw new Error('登錄失敗');
    }

    // 3. 模擬用戶在 AddTransactionModal 中填寫表單
    console.log('📱 步驟3: 用戶填寫新增交易表單...');
    const userInput = {
      amount: '150',
      type: 'expense',
      description: '模擬環境測試交易',
      category: '餐飲',
      account: '現金'
    };

    // 4. 模擬 AddTransactionModal.handleSubmit
    console.log('📱 步驟4: 模擬 AddTransactionModal.handleSubmit...');
    const editingTransaction = null; // 新增交易
    const transaction = {
      id: ensureValidUUID(editingTransaction?.id),
      amount: parseFloat(userInput.amount),
      type: userInput.type,
      description: userInput.description.trim(),
      category: userInput.category,
      account: userInput.account,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📝 創建的交易對象:', transaction);

    // 5. 模擬 TransactionsScreen.handleAddTransaction
    console.log('📱 步驟5: 模擬 TransactionsScreen.handleAddTransaction...');
    await transactionService.addTransaction(transaction);

    // 6. 驗證結果
    console.log('📱 步驟6: 驗證結果...');
    const localTransactions = transactionService.getTransactions();
    console.log(`📊 本地交易數量: ${localTransactions.length}`);

    // 檢查雲端數據
    const { data: cloudTransactions, error: cloudError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', transaction.id);

    if (cloudError) {
      console.error('❌ 查詢雲端數據失敗:', cloudError);
      return false;
    }

    console.log(`📊 雲端交易數量: ${cloudTransactions.length}`);

    if (localTransactions.length > 0 && cloudTransactions.length > 0) {
      console.log('✅ 模擬測試成功：本地和雲端都有數據');
      
      // 清理測試數據
      await supabase.from('transactions').delete().eq('id', transaction.id);
      console.log('🧹 已清理測試數據');
      
      return true;
    } else {
      console.log('❌ 模擬測試失敗：數據同步有問題');
      console.log(`本地: ${localTransactions.length}, 雲端: ${cloudTransactions.length}`);
      return false;
    }

  } catch (error) {
    console.error('❌ 模擬測試異常:', error);
    return false;
  }
}

async function main() {
  console.log('🎭 開始模擬 React Native 環境測試...');
  console.log('================================');
  console.log('📱 模擬環境設置：');
  console.log('- AsyncStorage: 內存模擬');
  console.log('- React Native 模組: Mock');
  console.log('- Supabase: 真實連接');
  console.log('- 服務邏輯: 真實代碼邏輯');
  console.log('================================');

  const result = await simulateRealUserFlow();

  console.log('\n🎯 模擬環境測試結果');
  console.log('================================');
  
  if (result) {
    console.log('🎉 模擬環境測試成功！');
    console.log('✅ 用戶操作流程正常');
    console.log('✅ 本地存儲功能正常');
    console.log('✅ 雲端同步功能正常');
    console.log('✅ 與真實環境應該一致');
  } else {
    console.log('⚠️ 模擬環境測試失敗');
    console.log('❌ 發現問題，需要進一步調查');
  }

  // 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 測試完成，用戶已登出');

  return result;
}

main().catch(console.error);
