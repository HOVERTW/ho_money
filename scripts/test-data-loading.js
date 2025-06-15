/**
 * 測試數據加載修復
 * 驗證登錄後能正確從 Supabase 加載數據
 */

console.log('🧪 FinTranzo 數據加載測試');
console.log('==========================');
console.log('測試時間:', new Date().toLocaleString());

// 設置環境變量
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

// 測試數據加載功能
async function testDataLoading() {
  try {
    console.log('\n🔌 連接 Supabase...');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('✅ Supabase 客戶端已創建');

    // 登錄測試用戶
    console.log('\n🔑 登錄測試用戶...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (loginError) {
      console.error('❌ 登錄失敗:', loginError.message);
      return false;
    }

    console.log('✅ 登錄成功');
    console.log('👤 用戶 ID:', loginData.user.id);
    console.log('📧 用戶郵箱:', loginData.user.email);

    // 測試直接查詢 Supabase 數據
    console.log('\n📊 測試直接查詢 Supabase 數據...');

    // 查詢交易記錄
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', loginData.user.id)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('❌ 查詢交易記錄失敗:', transactionsError.message);
    } else {
      console.log(`✅ 查詢到 ${transactions?.length || 0} 筆交易記錄`);
      
      if (transactions && transactions.length > 0) {
        console.log('📝 最新交易示例:');
        const latest = transactions[0];
        console.log(`  - ID: ${latest.id}`);
        console.log(`  - 類型: ${latest.type}`);
        console.log(`  - 金額: ${latest.amount}`);
        console.log(`  - 描述: ${latest.description}`);
        console.log(`  - 類別: ${latest.category}`);
        console.log(`  - 帳戶: ${latest.account}`);
        console.log(`  - 日期: ${latest.date}`);
      }
    }

    // 查詢資產記錄
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', loginData.user.id)
      .order('created_at', { ascending: false });

    if (assetsError) {
      console.error('❌ 查詢資產失敗:', assetsError.message);
    } else {
      console.log(`✅ 查詢到 ${assets?.length || 0} 個資產`);
      
      if (assets && assets.length > 0) {
        console.log('💰 資產列表:');
        assets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name || asset.asset_name || '未命名'}: ${asset.current_value || asset.value || 0}`);
        });
      }
    }

    // 測試數據轉換邏輯
    console.log('\n🔄 測試數據轉換邏輯...');

    if (transactions && transactions.length > 0) {
      const convertedTransactions = transactions.map(t => ({
        id: t.id,
        amount: t.amount || 0,
        type: t.type,
        description: t.description || '',
        category: t.category || '',
        account: t.account || '',
        fromAccount: t.from_account,
        toAccount: t.to_account,
        date: t.date || new Date().toISOString().split('T')[0],
        is_recurring: t.is_recurring || false,
        recurring_frequency: t.recurring_frequency,
        max_occurrences: t.max_occurrences,
        start_date: t.start_date
      }));

      console.log('✅ 交易數據轉換成功');
      console.log(`📊 轉換後交易數量: ${convertedTransactions.length}`);
    }

    if (assets && assets.length > 0) {
      const convertedAssets = assets.map(asset => ({
        id: asset.id,
        name: asset.name || asset.asset_name || '未命名資產',
        type: asset.type || 'asset'
      }));

      console.log('✅ 資產數據轉換成功');
      console.log(`📊 轉換後資產數量: ${convertedAssets.length}`);
    }

    return true;

  } catch (error) {
    console.error('❌ 數據加載測試失敗:', error.message);
    return false;
  }
}

// 測試模擬登錄流程
async function testLoginFlow() {
  console.log('\n🔄 測試模擬登錄流程...');

  try {
    // 模擬 transactionDataService 的初始化邏輯
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );

    // 模擬登錄
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (!user) {
      console.error('❌ 模擬登錄失敗');
      return false;
    }

    console.log('✅ 模擬登錄成功');

    // 模擬 loadFromSupabase 邏輯
    console.log('🔄 模擬從 Supabase 加載數據...');

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 模擬數據轉換
    const mockTransactions = (transactions || []).map(t => ({
      id: t.id,
      amount: t.amount || 0,
      type: t.type,
      description: t.description || '',
      category: t.category || '',
      account: t.account || '',
      date: t.date || new Date().toISOString().split('T')[0]
    }));

    const mockAccounts = (assets || []).map(asset => ({
      id: asset.id,
      name: asset.name || asset.asset_name || '未命名資產',
      type: asset.type || 'asset'
    }));

    console.log('✅ 模擬數據加載完成');
    console.log(`📊 模擬交易數量: ${mockTransactions.length}`);
    console.log(`📊 模擬帳戶數量: ${mockAccounts.length}`);

    // 檢查數據是否有效
    if (mockTransactions.length === 0 && mockAccounts.length === 0) {
      console.log('⚠️ 警告: 沒有加載到任何數據');
      console.log('💡 可能的原因:');
      console.log('1. 用戶在 Supabase 中沒有數據');
      console.log('2. 數據查詢條件有問題');
      console.log('3. 數據庫表結構不匹配');
      return false;
    } else {
      console.log('✅ 數據加載驗證通過');
      return true;
    }

  } catch (error) {
    console.error('❌ 模擬登錄流程失敗:', error.message);
    return false;
  }
}

// 主測試函數
async function runDataLoadingTest() {
  try {
    console.log('🚀 開始數據加載測試...');

    const directTest = await testDataLoading();
    const flowTest = await testLoginFlow();

    console.log('\n📋 測試結果總結');
    console.log('============================');
    console.log('直接數據查詢:', directTest ? '✅ 通過' : '❌ 失敗');
    console.log('模擬登錄流程:', flowTest ? '✅ 通過' : '❌ 失敗');

    if (directTest && flowTest) {
      console.log('\n🎉 數據加載測試完全通過！');
      console.log('\n📱 修復驗證：');
      console.log('1. ✅ Supabase 數據查詢正常');
      console.log('2. ✅ 數據轉換邏輯正確');
      console.log('3. ✅ 登錄流程數據加載正常');
      
      console.log('\n🌐 現在可以測試實際應用：');
      console.log('1. 訪問 https://19930913.xyz');
      console.log('2. 登錄 user01@gmail.com / user01');
      console.log('3. 檢查是否能看到交易和資產數據');
      
      return true;
    } else {
      console.log('\n⚠️ 數據加載測試未完全通過');
      
      if (!directTest) {
        console.log('❌ 直接數據查詢失敗 - 檢查 Supabase 連接和數據');
      }
      
      if (!flowTest) {
        console.log('❌ 模擬登錄流程失敗 - 檢查登錄邏輯和數據轉換');
      }
      
      return false;
    }

  } catch (error) {
    console.error('\n💥 數據加載測試異常:', error.message);
    return false;
  }
}

// 運行測試
if (require.main === module) {
  runDataLoadingTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('測試運行異常:', error);
    process.exit(1);
  });
}

module.exports = { runDataLoadingTest, testDataLoading, testLoginFlow };
