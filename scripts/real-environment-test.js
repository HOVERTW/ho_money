#!/usr/bin/env node

/**
 * 真實環境測試 - 模擬實際應用程式的運行環境
 * 這個測試會模擬真實的 React Native 環境和用戶操作
 */

const { createClient } = require('@supabase/supabase-js');

// 模擬 React Native 環境
const originalConsole = { ...console };
global.console = {
  ...console,
  log: (...args) => originalConsole.log('[APP]', ...args),
  error: (...args) => originalConsole.error('[APP ERROR]', ...args),
  warn: (...args) => originalConsole.warn('[APP WARN]', ...args)
};

// Supabase 配置
const SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 測試用戶
const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

// 模擬應用程式狀態
let appState = {
  user: null,
  transactions: [],
  assets: [],
  liabilities: [],
  isLoading: false
};

// 模擬 AsyncStorage
const mockAsyncStorage = {
  data: {},
  async getItem(key) {
    return this.data[key] || null;
  },
  async setItem(key, value) {
    this.data[key] = value;
  },
  async removeItem(key) {
    delete this.data[key];
  }
};

// 模擬應用程式服務
class MockTransactionDataService {
  constructor() {
    this.transactions = [];
  }

  async initialize() {
    console.log('🔄 初始化交易數據服務...');
    const stored = await mockAsyncStorage.getItem('@FinTranzo:transactions');
    this.transactions = stored ? JSON.parse(stored) : [];
    console.log(`📊 載入 ${this.transactions.length} 筆交易記錄`);
  }

  getTransactions() {
    return [...this.transactions];
  }

  async addTransaction(transaction) {
    console.log('➕ 新增交易:', transaction.description);
    this.transactions.push(transaction);
    await mockAsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(this.transactions));
    return transaction;
  }

  async deleteTransaction(transactionId) {
    console.log('🗑️ 刪除交易:', transactionId);
    const initialCount = this.transactions.length;
    this.transactions = this.transactions.filter(t => t.id !== transactionId);
    const finalCount = this.transactions.length;
    
    if (initialCount === finalCount) {
      throw new Error('交易刪除失敗：找不到指定的交易');
    }
    
    await mockAsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(this.transactions));
    console.log(`✅ 交易刪除成功，剩餘 ${finalCount} 筆`);
  }

  async clearAllData() {
    console.log('🧹 清除所有交易數據...');
    this.transactions = [];
    await mockAsyncStorage.removeItem('@FinTranzo:transactions');
    console.log('✅ 交易數據清除完成');
  }
}

class MockAssetService {
  constructor() {
    this.assets = [];
  }

  async initialize() {
    console.log('🔄 初始化資產數據服務...');
    const stored = await mockAsyncStorage.getItem('@FinTranzo:assets');
    this.assets = stored ? JSON.parse(stored) : [];
    console.log(`💰 載入 ${this.assets.length} 筆資產記錄`);
  }

  getAssets() {
    return [...this.assets];
  }

  async addAsset(asset) {
    console.log('➕ 新增資產:', asset.name);
    this.assets.push(asset);
    await mockAsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(this.assets));
    return asset;
  }

  async deleteAsset(assetId) {
    console.log('🗑️ 刪除資產:', assetId);
    const initialCount = this.assets.length;
    this.assets = this.assets.filter(a => a.id !== assetId);
    const finalCount = this.assets.length;
    
    if (initialCount === finalCount) {
      throw new Error('資產刪除失敗：找不到指定的資產');
    }
    
    await mockAsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(this.assets));
    console.log(`✅ 資產刪除成功，剩餘 ${finalCount} 筆`);
  }

  async clearAllData() {
    console.log('🧹 清除所有資產數據...');
    this.assets = [];
    await mockAsyncStorage.removeItem('@FinTranzo:assets');
    console.log('✅ 資產數據清除完成');
  }
}

// 模擬上傳服務
class MockManualUploadService {
  async uploadAllLocalData() {
    console.log('🚀 開始上傳本地數據到雲端...');
    
    try {
      // 檢查用戶登錄狀態
      if (!appState.user) {
        throw new Error('用戶未登錄');
      }

      const userId = appState.user.id;
      let uploadedCount = 0;

      // 上傳交易數據
      const transactions = transactionService.getTransactions();
      if (transactions.length > 0) {
        console.log(`📤 上傳 ${transactions.length} 筆交易記錄...`);
        
        for (const transaction of transactions) {
          const uploadData = {
            ...transaction,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('transactions')
            .upsert(uploadData, { onConflict: 'id' });

          if (error) {
            console.error('❌ 交易上傳失敗:', error.message);
            throw error;
          }
          uploadedCount++;
        }
        console.log(`✅ ${transactions.length} 筆交易記錄上傳成功`);
      }

      // 上傳資產數據
      const assets = assetService.getAssets();
      if (assets.length > 0) {
        console.log(`📤 上傳 ${assets.length} 筆資產記錄...`);
        
        for (const asset of assets) {
          const uploadData = {
            ...asset,
            user_id: userId,
            value: asset.current_value || asset.value || 0, // 修復：確保 value 欄位存在
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('assets')
            .upsert(uploadData, { onConflict: 'id' });

          if (error) {
            console.error('❌ 資產上傳失敗:', error.message);
            throw error;
          }
          uploadedCount++;
        }
        console.log(`✅ ${assets.length} 筆資產記錄上傳成功`);
      }

      return {
        success: true,
        details: {
          transactions: transactions.length,
          assets: assets.length,
          liabilities: 0,
          accounts: 0,
          categories: 0
        }
      };

    } catch (error) {
      console.error('❌ 上傳失敗:', error.message);
      return {
        success: false,
        message: error.message,
        errors: [error.message]
      };
    }
  }
}

// 創建服務實例
const transactionService = new MockTransactionDataService();
const assetService = new MockAssetService();
const uploadService = new MockManualUploadService();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 模擬用戶操作
async function simulateUserLogin() {
  console.log('🔐 模擬用戶登錄...');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (authError) {
    console.error('❌ 登錄失敗:', authError.message);
    return false;
  }

  appState.user = authData.user;
  console.log('✅ 登錄成功:', appState.user.email);
  return true;
}

async function simulateAddTransaction() {
  console.log('\n📝 模擬新增交易...');
  
  const transaction = {
    id: generateUUID(),
    amount: Math.floor(Math.random() * 10000) + 100,
    type: Math.random() > 0.5 ? 'income' : 'expense',
    description: '測試交易 ' + Date.now(),
    category: '測試類別',
    account: '測試帳戶',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  await transactionService.addTransaction(transaction);
  appState.transactions = transactionService.getTransactions();
  console.log(`✅ 交易新增成功，目前共 ${appState.transactions.length} 筆`);
  return transaction;
}

async function simulateAddAsset() {
  console.log('\n💰 模擬新增資產...');
  
  const asset = {
    id: generateUUID(),
    name: '測試資產 ' + Date.now(),
    type: 'cash',
    current_value: Math.floor(Math.random() * 100000) + 10000,
    cost_basis: Math.floor(Math.random() * 100000) + 10000,
    quantity: 1,
    created_at: new Date().toISOString()
  };

  await assetService.addAsset(asset);
  appState.assets = assetService.getAssets();
  console.log(`✅ 資產新增成功，目前共 ${appState.assets.length} 筆`);
  return asset;
}

async function simulateDataUpload() {
  console.log('\n📤 模擬數據上傳...');
  
  const result = await uploadService.uploadAllLocalData();
  
  if (result.success) {
    console.log('✅ 數據上傳成功');
    console.log(`   - 交易: ${result.details.transactions} 筆`);
    console.log(`   - 資產: ${result.details.assets} 筆`);
    return true;
  } else {
    console.error('❌ 數據上傳失敗:', result.message);
    return false;
  }
}

async function simulateSwipeDelete(itemType, itemId) {
  console.log(`\n👆 模擬滑動刪除 ${itemType}...`);
  
  try {
    if (itemType === 'transaction') {
      await transactionService.deleteTransaction(itemId);
      appState.transactions = transactionService.getTransactions();
      console.log('✅ 交易滑動刪除成功');
      return true;
    } else if (itemType === 'asset') {
      await assetService.deleteAsset(itemId);
      appState.assets = assetService.getAssets();
      console.log('✅ 資產滑動刪除成功');
      return true;
    }
  } catch (error) {
    console.error(`❌ ${itemType} 滑動刪除失敗:`, error.message);
    return false;
  }
}

async function simulateOneClickDelete() {
  console.log('\n🗑️ 模擬一鍵刪除...');
  
  try {
    // 清除本地數據
    await transactionService.clearAllData();
    await assetService.clearAllData();
    
    // 清除雲端數據
    if (appState.user) {
      const userId = appState.user.id;
      
      // 刪除雲端交易數據
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);
      
      if (transactionError) {
        console.error('❌ 雲端交易數據刪除失敗:', transactionError.message);
        return false;
      }
      
      // 刪除雲端資產數據
      const { error: assetError } = await supabase
        .from('assets')
        .delete()
        .eq('user_id', userId);
      
      if (assetError) {
        console.error('❌ 雲端資產數據刪除失敗:', assetError.message);
        return false;
      }
    }
    
    // 更新應用狀態
    appState.transactions = [];
    appState.assets = [];
    
    console.log('✅ 一鍵刪除成功');
    return true;
  } catch (error) {
    console.error('❌ 一鍵刪除失敗:', error.message);
    return false;
  }
}

async function runRealEnvironmentTest() {
  console.log('🔧 真實環境測試');
  console.log('================');
  console.log(`開始時間: ${new Date().toLocaleString()}`);
  
  const testResults = {
    login: false,
    addData: false,
    dataUpload: false,
    swipeDelete: false,
    oneClickDelete: false
  };

  try {
    // 初始化服務
    await transactionService.initialize();
    await assetService.initialize();
    
    // 1. 測試登錄
    testResults.login = await simulateUserLogin();
    if (!testResults.login) {
      console.log('❌ 登錄失敗，停止測試');
      return testResults;
    }
    
    // 2. 測試新增數據
    const transaction = await simulateAddTransaction();
    const asset = await simulateAddAsset();
    testResults.addData = transaction && asset;
    
    // 3. 測試數據上傳
    testResults.dataUpload = await simulateDataUpload();
    
    // 4. 測試滑動刪除
    const swipeDeleteTransaction = await simulateSwipeDelete('transaction', transaction.id);
    const swipeDeleteAsset = await simulateSwipeDelete('asset', asset.id);
    testResults.swipeDelete = swipeDeleteTransaction && swipeDeleteAsset;
    
    // 5. 測試一鍵刪除
    testResults.oneClickDelete = await simulateOneClickDelete();
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
  
  // 輸出結果
  console.log('\n📊 真實環境測試結果');
  console.log('==================');
  console.log(`1. 用戶登錄: ${testResults.login ? '✅' : '❌'}`);
  console.log(`2. 新增數據: ${testResults.addData ? '✅' : '❌'}`);
  console.log(`3. 數據上傳: ${testResults.dataUpload ? '✅' : '❌'}`);
  console.log(`4. 滑動刪除: ${testResults.swipeDelete ? '✅' : '❌'}`);
  console.log(`5. 一鍵刪除: ${testResults.oneClickDelete ? '✅' : '❌'}`);
  
  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = Math.round(passedTests / totalTests * 100);
  
  console.log(`\n🎯 成功率: ${passedTests}/${totalTests} (${successRate}%)`);
  console.log(`結束時間: ${new Date().toLocaleString()}`);
  
  return testResults;
}

// 執行測試
if (require.main === module) {
  runRealEnvironmentTest();
}

module.exports = { runRealEnvironmentTest };
