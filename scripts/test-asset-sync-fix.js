/**
 * 測試資產更新同步功能
 * 驗證修復後的資產同步是否正常工作
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = 'https://yrryyapzkgrsahranzvo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const supabase = createClient(supabaseUrl, supabaseKey);

// 生成 UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 測試用戶登錄
async function loginTestUser() {
  console.log('🔐 登錄測試用戶...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user01@gmail.com',
    password: 'user01'
  });

  if (error) {
    console.error('❌ 登錄失敗:', error);
    throw error;
  }

  console.log('✅ 登錄成功:', data.user.email);
  return data.user;
}

// 創建測試資產
async function createTestAsset(user) {
  console.log('📝 創建測試資產...');
  
  const testAsset = {
    id: generateUUID(),
    user_id: user.id,
    name: '測試資產_' + Date.now(),
    type: 'bank',
    value: 100000,
    current_value: 100000,
    cost_basis: 100000,
    quantity: 1,
    purchase_price: 100000,
    current_price: 100000,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('assets')
    .insert(testAsset)
    .select()
    .single();

  if (error) {
    console.error('❌ 創建測試資產失敗:', error);
    throw error;
  }

  console.log('✅ 測試資產創建成功:', data);
  return data;
}

// 測試資產更新
async function testAssetUpdate(asset) {
  console.log('🔄 測試資產更新...');
  
  const updatedData = {
    name: asset.name + '_已更新',
    current_value: 150000,
    value: 150000,
    updated_at: new Date().toISOString()
  };

  console.log('📝 更新數據:', updatedData);

  const { data, error } = await supabase
    .from('assets')
    .update(updatedData)
    .eq('id', asset.id)
    .eq('user_id', asset.user_id)
    .select()
    .single();

  if (error) {
    console.error('❌ 資產更新失敗:', error);
    throw error;
  }

  console.log('✅ 資產更新成功:', data);
  return data;
}

// 驗證資產更新
async function verifyAssetUpdate(assetId, expectedValue) {
  console.log('🔍 驗證資產更新...');
  
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) {
    console.error('❌ 驗證失敗:', error);
    throw error;
  }

  console.log('📊 當前資產數據:', data);

  if (data.current_value === expectedValue) {
    console.log('✅ 資產值驗證成功');
    return true;
  } else {
    console.error(`❌ 資產值驗證失敗: 期望 ${expectedValue}, 實際 ${data.current_value}`);
    return false;
  }
}

// 測試 upsert 功能
async function testUpsertFunctionality(user) {
  console.log('🔄 測試 upsert 功能...');
  
  const testAsset = {
    id: generateUUID(),
    user_id: user.id,
    name: 'Upsert測試資產',
    type: 'investment',
    value: 200000,
    current_value: 200000,
    cost_basis: 200000,
    quantity: 1,
    purchase_price: 200000,
    current_price: 200000,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 第一次 upsert (插入)
  console.log('📝 第一次 upsert (插入)...');
  const { data: insertData, error: insertError } = await supabase
    .from('assets')
    .upsert(testAsset, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Upsert 插入失敗:', insertError);
    throw insertError;
  }

  console.log('✅ Upsert 插入成功:', insertData);

  // 第二次 upsert (更新)
  console.log('📝 第二次 upsert (更新)...');
  testAsset.current_value = 250000;
  testAsset.value = 250000;
  testAsset.updated_at = new Date().toISOString();

  const { data: updateData, error: updateError } = await supabase
    .from('assets')
    .upsert(testAsset, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (updateError) {
    console.error('❌ Upsert 更新失敗:', updateError);
    throw updateError;
  }

  console.log('✅ Upsert 更新成功:', updateData);
  return updateData;
}

// 清理測試數據
async function cleanupTestData(user) {
  console.log('🧹 清理測試數據...');
  
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('user_id', user.id)
    .like('name', '%測試%');

  if (error) {
    console.error('❌ 清理失敗:', error);
  } else {
    console.log('✅ 測試數據清理完成');
  }
}

// 主測試函數
async function main() {
  console.log('🚀 開始測試資產更新同步功能...');
  console.log('================================');

  try {
    // 1. 登錄測試用戶
    const user = await loginTestUser();
    console.log('');

    // 2. 創建測試資產
    const asset = await createTestAsset(user);
    console.log('');

    // 3. 測試資產更新
    const updatedAsset = await testAssetUpdate(asset);
    console.log('');

    // 4. 驗證更新結果
    const verifyResult = await verifyAssetUpdate(asset.id, 150000);
    console.log('');

    // 5. 測試 upsert 功能
    const upsertAsset = await testUpsertFunctionality(user);
    console.log('');

    // 6. 驗證 upsert 結果
    const upsertVerifyResult = await verifyAssetUpdate(upsertAsset.id, 250000);
    console.log('');

    // 7. 清理測試數據
    await cleanupTestData(user);
    console.log('');

    // 總結
    console.log('🎯 測試完成！');
    console.log('================================');
    
    if (verifyResult && upsertVerifyResult) {
      console.log('✅ 所有測試通過！');
      console.log('📱 資產更新同步功能正常工作');
      console.log('🔄 Upsert 功能正常工作');
      console.log('💾 數據正確保存到 Supabase');
    } else {
      console.log('⚠️ 部分測試失敗');
      console.log('🔧 請檢查錯誤詳情並修復');
    }

    // 登出用戶
    await supabase.auth.signOut();
    console.log('👋 用戶已登出');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

main().catch(console.error);
