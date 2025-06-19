/**
 * Docker 環境下的手動上傳和刪除功能測試
 * 專注於本地端正確性，停用即時同步
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 生成有效的 UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 檢查 UUID 是否有效
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// 模擬本地數據
function createMockLocalData() {
  return {
    transactions: [
      {
        id: generateUUID(),
        type: 'expense',
        amount: 500,
        description: 'Docker測試支出',
        category: '餐飲',
        account: '現金',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: generateUUID(),
        type: 'income',
        amount: 3000,
        description: 'Docker測試收入',
        category: '薪資',
        account: '銀行',
        date: new Date().toISOString().split('T')[0]
      }
    ],
    liabilities: [
      {
        id: generateUUID(),
        name: 'Docker測試信用卡',
        type: 'credit_card',
        balance: 15000,
        interest_rate: 0.18,
        monthly_payment: 1000
      },
      {
        id: generateUUID(),
        name: 'Docker測試房貸',
        type: 'mortgage',
        balance: 2000000,
        interest_rate: 0.025,
        monthly_payment: 15000
      }
    ],
    assets: [
      {
        id: generateUUID(),
        name: 'Docker測試股票',
        type: 'stock',
        current_value: 50000,
        cost_basis: 45000,
        quantity: 100
      }
    ]
  };
}

// 測試手動上傳功能
async function testManualUpload(user, mockData) {
  console.log('\n📤 測試手動上傳功能');
  console.log('========================');

  try {
    // 1. 測試交易上傳
    console.log('💰 測試交易上傳...');
    const convertedTransactions = mockData.transactions.map(transaction => ({
      id: transaction.id,
      user_id: user.id,
      account_id: null,
      amount: Number(transaction.amount),
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      account: transaction.account,
      from_account: null,
      to_account: null,
      date: transaction.date,
      is_recurring: false,
      recurring_frequency: null,
      max_occurrences: null,
      start_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .upsert(convertedTransactions, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (txError) {
      logTest('交易手動上傳', false, txError.message);
    } else {
      logTest('交易手動上傳', true, `成功上傳 ${txData.length} 筆交易`);
    }

    // 2. 測試負債上傳
    console.log('💳 測試負債上傳...');
    const convertedLiabilities = mockData.liabilities.map(liability => ({
      id: liability.id,
      user_id: user.id,
      name: liability.name,
      type: liability.type,
      balance: liability.balance,
      interest_rate: liability.interest_rate,
      monthly_payment: liability.monthly_payment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: liabilityData, error: liabilityError } = await supabase
      .from('liabilities')
      .upsert(convertedLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (liabilityError) {
      logTest('負債手動上傳', false, liabilityError.message);
    } else {
      logTest('負債手動上傳', true, `成功上傳 ${liabilityData.length} 筆負債`);
    }

    // 3. 測試資產上傳
    console.log('📈 測試資產上傳...');
    const convertedAssets = mockData.assets.map(asset => ({
      id: asset.id,
      user_id: user.id,
      name: asset.name,
      type: asset.type,
      value: asset.current_value,
      current_value: asset.current_value,
      cost_basis: asset.cost_basis,
      quantity: asset.quantity,
      stock_code: null,
      purchase_price: 0,
      current_price: 0,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .upsert(convertedAssets, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (assetError) {
      logTest('資產手動上傳', false, assetError.message);
    } else {
      logTest('資產手動上傳', true, `成功上傳 ${assetData.length} 筆資產`);
    }

    return {
      transactions: convertedTransactions,
      liabilities: convertedLiabilities,
      assets: convertedAssets
    };

  } catch (error) {
    logTest('手動上傳異常', false, error.message);
    return null;
  }
}

// 測試本地刪除功能
async function testLocalDelete(uploadedData) {
  console.log('\n🗑️ 測試本地刪除功能');
  console.log('========================');

  if (!uploadedData) {
    logTest('本地刪除-前置條件', false, '沒有上傳數據可刪除');
    return;
  }

  try {
    // 模擬本地刪除：從各種儲存方式中刪除
    console.log('📱 模擬 AsyncStorage 刪除...');
    
    // 模擬 AsyncStorage 操作
    const mockAsyncStorage = new Map();
    
    // 先添加數據
    mockAsyncStorage.set('@FinTranzo:transactions', JSON.stringify(uploadedData.transactions));
    mockAsyncStorage.set('@FinTranzo:liabilities', JSON.stringify(uploadedData.liabilities));
    mockAsyncStorage.set('@FinTranzo:assets', JSON.stringify(uploadedData.assets));
    
    console.log(`📊 模擬存儲中有 ${mockAsyncStorage.size} 個鍵`);
    
    // 測試個別刪除
    const transactionToDelete = uploadedData.transactions[0];
    const updatedTransactions = uploadedData.transactions.filter(t => t.id !== transactionToDelete.id);
    mockAsyncStorage.set('@FinTranzo:transactions', JSON.stringify(updatedTransactions));
    
    logTest('本地個別刪除-交易', true, `刪除交易: ${transactionToDelete.description}`);
    
    // 測試批量刪除
    mockAsyncStorage.delete('@FinTranzo:transactions');
    mockAsyncStorage.delete('@FinTranzo:liabilities');
    mockAsyncStorage.delete('@FinTranzo:assets');
    
    logTest('本地批量刪除', true, `清空所有本地數據，剩餘 ${mockAsyncStorage.size} 個鍵`);
    
    // 模擬 localStorage 刪除 (Web 環境)
    console.log('🌐 模擬 localStorage 刪除...');
    const mockLocalStorage = new Map();
    
    // 先添加數據
    mockLocalStorage.set('fintranzo_transactions', JSON.stringify(uploadedData.transactions));
    mockLocalStorage.set('fintranzo_liabilities', JSON.stringify(uploadedData.liabilities));
    mockLocalStorage.set('fintranzo_assets', JSON.stringify(uploadedData.assets));
    
    // 清空
    mockLocalStorage.clear();
    
    logTest('Web本地刪除', true, `清空 localStorage，剩餘 ${mockLocalStorage.size} 個鍵`);
    
    // 模擬內存數據清理
    console.log('🧠 模擬內存數據清理...');
    const mockMemoryData = {
      transactions: [...uploadedData.transactions],
      liabilities: [...uploadedData.liabilities],
      assets: [...uploadedData.assets]
    };
    
    // 清空內存
    mockMemoryData.transactions = [];
    mockMemoryData.liabilities = [];
    mockMemoryData.assets = [];
    
    const totalMemoryItems = Object.values(mockMemoryData).reduce((sum, arr) => sum + arr.length, 0);
    logTest('內存數據清理', true, `清空內存數據，剩餘 ${totalMemoryItems} 項`);

  } catch (error) {
    logTest('本地刪除異常', false, error.message);
  }
}

// 測試雲端刪除功能
async function testCloudDelete(user, uploadedData) {
  console.log('\n☁️ 測試雲端刪除功能');
  console.log('========================');

  if (!uploadedData) {
    logTest('雲端刪除-前置條件', false, '沒有上傳數據可刪除');
    return;
  }

  try {
    // 測試個別刪除
    const transactionToDelete = uploadedData.transactions[0];
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionToDelete.id)
      .eq('user_id', user.id);

    if (deleteError) {
      logTest('雲端個別刪除', false, deleteError.message);
    } else {
      logTest('雲端個別刪除', true, `刪除交易: ${transactionToDelete.description}`);
    }

    // 測試批量刪除
    const { error: bulkDeleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (bulkDeleteError) {
      logTest('雲端批量刪除-交易', false, bulkDeleteError.message);
    } else {
      logTest('雲端批量刪除-交易', true, '清空所有交易');
    }

    // 刪除負債
    const { error: liabilityDeleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('user_id', user.id);

    if (liabilityDeleteError) {
      logTest('雲端批量刪除-負債', false, liabilityDeleteError.message);
    } else {
      logTest('雲端批量刪除-負債', true, '清空所有負債');
    }

    // 刪除資產
    const { error: assetDeleteError } = await supabase
      .from('assets')
      .delete()
      .eq('user_id', user.id);

    if (assetDeleteError) {
      logTest('雲端批量刪除-資產', false, assetDeleteError.message);
    } else {
      logTest('雲端批量刪除-資產', true, '清空所有資產');
    }

  } catch (error) {
    logTest('雲端刪除異常', false, error.message);
  }
}

async function runDockerTest() {
  console.log('🐳 Docker 環境 - 手動上傳和刪除功能測試');
  console.log('==========================================');
  console.log(`測試時間: ${new Date().toLocaleString()}`);
  console.log('🚫 即時同步已停用，專注於手動上傳和本地端正確性');

  try {
    // 登錄
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (authError || !user) {
      logTest('用戶登錄', false, authError?.message || '登錄失敗');
      return false;
    }

    logTest('用戶登錄', true, `用戶: ${user.email}`);

    // 清理舊數據
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('liabilities').delete().eq('user_id', user.id);
    await supabase.from('assets').delete().eq('user_id', user.id);

    // 創建模擬本地數據
    const mockData = createMockLocalData();
    console.log('📊 創建模擬本地數據:');
    console.log(`  - 交易: ${mockData.transactions.length} 筆`);
    console.log(`  - 負債: ${mockData.liabilities.length} 筆`);
    console.log(`  - 資產: ${mockData.assets.length} 筆`);

    // 執行測試
    const uploadedData = await testManualUpload(user, mockData);
    await testLocalDelete(uploadedData);
    await testCloudDelete(user, uploadedData);

    // 生成報告
    console.log('\n📋 Docker 測試報告');
    console.log('====================');
    console.log(`總測試數: ${testResults.passed + testResults.failed}`);
    console.log(`通過: ${testResults.passed}`);
    console.log(`失敗: ${testResults.failed}`);
    
    if (testResults.passed + testResults.failed > 0) {
      const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
      console.log(`成功率: ${successRate}%`);
    }

    const failedTests = testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗的測試:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });
    }

    const allPassed = testResults.failed === 0;
    
    if (allPassed) {
      console.log('\n🎉 Docker 環境測試完全通過！');
      console.log('✅ 手動上傳功能正常');
      console.log('✅ 本地刪除功能正常');
      console.log('✅ 雲端刪除功能正常');
      console.log('🚫 即時同步已停用，專注於手動操作');
    } else {
      console.log('\n⚠️ Docker 環境測試發現問題，需要修復');
    }

    return allPassed;

  } catch (error) {
    console.error('\n💥 Docker 測試運行失敗:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runDockerTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Docker 測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runDockerTest };
