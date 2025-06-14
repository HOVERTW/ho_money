/**
 * 測試類別顯示修復
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

async function testCategoryDisplayIssue(user) {
  console.log('🔍 測試類別顯示問題...');
  
  try {
    // 1. 獲取所有交易和類別
    const [transactionsResult, categoriesResult] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id)
    ]);

    if (transactionsResult.error) {
      console.error('❌ 查詢交易失敗:', transactionsResult.error.message);
      return;
    }

    if (categoriesResult.error) {
      console.error('❌ 查詢類別失敗:', categoriesResult.error.message);
      return;
    }

    const transactions = transactionsResult.data;
    const categories = categoriesResult.data;

    console.log(`📊 找到 ${transactions.length} 筆交易，${categories.length} 個類別`);

    // 2. 分析類別匹配問題
    console.log('\n📝 類別列表:');
    categories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name} (${category.type}) - ${category.color}`);
    });

    console.log('\n📝 交易列表及類別匹配:');
    transactions.forEach((transaction, index) => {
      const matchedCategory = categories.find(cat => cat.name === transaction.category);
      console.log(`  ${index + 1}. ${transaction.description} - 類別: "${transaction.category}" ${matchedCategory ? '✅' : '❌ 未匹配'}`);
      
      if (!matchedCategory && transaction.category) {
        console.log(`    ⚠️ 找不到類別 "${transaction.category}"，可能需要創建`);
      }
    });

    // 3. 創建缺失的類別
    const missingCategories = [];
    for (const transaction of transactions) {
      if (transaction.category && !categories.find(cat => cat.name === transaction.category)) {
        if (!missingCategories.includes(transaction.category)) {
          missingCategories.push(transaction.category);
        }
      }
    }

    if (missingCategories.length > 0) {
      console.log(`\n🔧 發現 ${missingCategories.length} 個缺失的類別，正在創建...`);
      
      for (const categoryName of missingCategories) {
        const newCategory = {
          id: generateUUID(),
          user_id: user.id,
          name: categoryName,
          icon: 'help-outline',
          color: '#007AFF',
          type: 'expense', // 默認為支出類別
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('categories')
          .insert(newCategory);

        if (insertError) {
          console.error(`❌ 創建類別 "${categoryName}" 失敗:`, insertError.message);
        } else {
          console.log(`✅ 創建類別 "${categoryName}" 成功`);
        }
      }
    } else {
      console.log('\n✅ 所有交易都有對應的類別');
    }

    // 4. 測試 replica identity 修復
    console.log('\n🔧 測試類別更新和刪除功能...');
    
    if (categories.length > 0) {
      const testCategory = categories[0];
      
      // 測試更新
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: testCategory.name + ' (已測試)',
          updated_at: new Date().toISOString()
        })
        .eq('id', testCategory.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ 類別更新失敗:', updateError.message);
        console.log('🔧 需要執行 replica identity 修復腳本');
      } else {
        console.log('✅ 類別更新成功');
        
        // 恢復原名稱
        await supabase
          .from('categories')
          .update({
            name: testCategory.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', testCategory.id)
          .eq('user_id', user.id);
      }
    }

  } catch (error) {
    console.error('❌ 測試類別顯示問題異常:', error.message);
  }
}

async function testDeleteSyncFix(user) {
  console.log('\n🗑️ 測試刪除同步修復...');
  
  try {
    // 創建一個測試交易
    const testTransactionId = generateUUID();
    const testTransaction = {
      id: testTransactionId,
      user_id: user.id,
      amount: 50,
      type: 'expense',
      description: '測試刪除同步',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 創建測試交易...');
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(testTransaction);

    if (insertError) {
      console.error('❌ 創建測試交易失敗:', insertError.message);
      return;
    }

    console.log('✅ 測試交易創建成功');

    // 等待一秒確保數據已保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 驗證交易存在
    const { data: beforeDelete, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (queryError || !beforeDelete || beforeDelete.length === 0) {
      console.error('❌ 無法找到剛創建的測試交易');
      return;
    }

    console.log('📝 確認交易存在，開始測試刪除...');

    // 執行刪除
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ 刪除測試交易失敗:', deleteError.message);
      return;
    }

    console.log('✅ 刪除操作執行成功');

    // 驗證刪除結果
    const { data: afterDelete, error: verifyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', testTransactionId)
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ 驗證刪除結果失敗:', verifyError.message);
      return;
    }

    if (afterDelete.length === 0) {
      console.log('✅ 交易刪除同步正常工作');
    } else {
      console.log('❌ 交易刪除同步失敗，記錄仍然存在');
    }

  } catch (error) {
    console.error('❌ 測試刪除同步修復異常:', error.message);
  }
}

async function main() {
  console.log('🚀 開始測試類別顯示和刪除同步修復...');
  console.log('================================');
  
  // 1. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，測試終止');
    return;
  }
  
  console.log('');

  // 2. 測試類別顯示問題
  await testCategoryDisplayIssue(user);

  // 3. 測試刪除同步修復
  await testDeleteSyncFix(user);

  console.log('\n🎯 測試完成！');
  console.log('================================');
  console.log('📝 修復總結：');
  console.log('1. 檢查並創建缺失的類別');
  console.log('2. 測試類別更新功能（需要 replica identity 修復）');
  console.log('3. 驗證交易刪除同步功能');

  // 4. 登出用戶
  await supabase.auth.signOut();
  console.log('👋 測試完成，用戶已登出');
}

main().catch(console.error);
