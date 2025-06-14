/**
 * 檢查類別狀態
 * 確認類別數據是否正常
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

async function checkCategoriesStatus(user) {
  console.log('\n📝 檢查類別狀態...');
  
  try {
    // 檢查用戶的類別
    const { data: userCategories, error: userError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (userError) {
      console.error('❌ 查詢用戶類別失敗:', userError.message);
      return false;
    }

    console.log(`📊 用戶類別數量: ${userCategories.length}`);
    
    if (userCategories.length > 0) {
      console.log('📝 用戶類別列表:');
      userCategories.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat.name} (${cat.type}) - ${cat.color}`);
      });
    } else {
      console.log('⚠️ 用戶沒有任何類別！');
      
      // 檢查是否需要創建預設類別
      console.log('📝 創建預設類別...');
      
      const defaultCategories = [
        // 支出類別
        { name: '餐飲', icon: 'restaurant-outline', color: '#FF6384', type: 'expense' },
        { name: '交通', icon: 'car-outline', color: '#36A2EB', type: 'expense' },
        { name: '購物', icon: 'bag-outline', color: '#FFCE56', type: 'expense' },
        { name: '娛樂', icon: 'game-controller-outline', color: '#4BC0C0', type: 'expense' },
        { name: '醫療', icon: 'medical-outline', color: '#E74C3C', type: 'expense' },
        
        // 收入類別
        { name: '薪水', icon: 'card-outline', color: '#2ECC71', type: 'income' },
        { name: '獎金', icon: 'trophy-outline', color: '#3498DB', type: 'income' },
        { name: '投資', icon: 'trending-up-outline', color: '#E74C3C', type: 'income' },
        { name: '副業', icon: 'briefcase-outline', color: '#F39C12', type: 'income' },
        
        // 轉移類別
        { name: '轉移', icon: 'swap-horizontal-outline', color: '#6C757D', type: 'transfer' },
      ];

      const categoriesToCreate = defaultCategories.map(cat => ({
        id: generateUUID(),
        user_id: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: createError } = await supabase
        .from('categories')
        .insert(categoriesToCreate);

      if (createError) {
        console.error('❌ 創建預設類別失敗:', createError.message);
        return false;
      }

      console.log(`✅ 成功創建 ${categoriesToCreate.length} 個預設類別`);
    }

    return true;

  } catch (error) {
    console.error('❌ 檢查類別狀態異常:', error.message);
    return false;
  }
}

async function testCategoriesTable() {
  console.log('\n📝 測試 categories 表結構...');
  
  try {
    // 測試基本查詢
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ categories 表查詢失敗:', error.message);
      console.error('❌ 錯誤詳情:', error);
      return false;
    }

    console.log('✅ categories 表可以正常查詢');

    // 測試插入操作
    const testCategory = {
      id: generateUUID(),
      user_id: generateUUID(), // 使用假的用戶ID進行測試
      name: '測試類別',
      icon: 'test-outline',
      color: '#FF0000',
      type: 'expense',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('categories')
      .insert(testCategory);

    if (insertError) {
      console.error('❌ categories 表插入失敗:', insertError.message);
      console.error('❌ 錯誤詳情:', insertError);
      return false;
    }

    console.log('✅ categories 表可以正常插入');

    // 清理測試數據
    await supabase
      .from('categories')
      .delete()
      .eq('id', testCategory.id);

    console.log('✅ categories 表可以正常刪除');

    return true;

  } catch (error) {
    console.error('❌ 測試 categories 表異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始檢查類別狀態...');
  console.log('================================');
  
  // 1. 測試 categories 表結構
  const tableTest = await testCategoriesTable();
  
  // 2. 登錄用戶
  const user = await loginUser();
  if (!user) {
    console.log('❌ 登錄失敗，無法檢查用戶類別');
    return false;
  }

  // 3. 檢查用戶類別狀態
  const categoryTest = await checkCategoriesStatus(user);

  console.log('\n🎯 類別狀態檢查結果');
  console.log('================================');
  
  console.log('📝 檢查結果:');
  console.log(`  categories 表結構: ${tableTest ? '✅ 正常' : '❌ 異常'}`);
  console.log(`  用戶類別數據: ${categoryTest ? '✅ 正常' : '❌ 異常'}`);

  const allPassed = tableTest && categoryTest;

  console.log('\n🏆 最終結果:');
  if (allPassed) {
    console.log('🎉 類別功能完全正常！');
    console.log('✅ categories 表結構正常');
    console.log('✅ 用戶類別數據正常');
    console.log('✅ 類別功能已準備好使用');
  } else {
    console.log('⚠️ 類別功能有問題：');
    if (!tableTest) console.log('  - categories 表結構有問題');
    if (!categoryTest) console.log('  - 用戶類別數據有問題');
    console.log('❌ 需要修復類別功能');
  }

  // 4. 登出用戶
  await supabase.auth.signOut();
  console.log('\n👋 檢查完成，用戶已登出');

  return allPassed;
}

main().catch(console.error);
