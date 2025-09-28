/**
 * 恢復測試資產數據
 * 重新創建5000元現金和其他測試資產
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function restoreTestAssets() {
  console.log('🔄 開始恢復測試資產數據...');
  console.log('==========================================');
  
  // 初始化Supabase
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    // 登錄測試用戶
    console.log('👤 登錄測試用戶...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });
    
    if (authError) {
      console.error('❌ 登錄失敗:', authError.message);
      return;
    }
    
    const user = authData.user;
    console.log(`✅ 登錄成功: ${user.email}`);
    
    // 創建測試資產
    console.log('\n💰 創建測試資產...');
    
    const testAssets = [
      {
        id: uuidv4(),
        user_id: user.id,
        name: '現金',
        type: 'cash',
        current_value: 5000,
        value: 5000,
        cost_basis: 5000,
        quantity: 1,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: user.id,
        name: '銀行存款',
        type: 'bank',
        current_value: 10000,
        value: 10000,
        cost_basis: 10000,
        quantity: 1,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: user.id,
        name: '投資帳戶',
        type: 'investment',
        current_value: 25000,
        value: 25000,
        cost_basis: 20000,
        quantity: 1,
        sort_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    console.log('📝 準備創建的資產:');
    testAssets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value} (${asset.type})`);
    });
    
    // 批量插入資產
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(testAssets)
      .select();
    
    if (insertError) {
      console.error('❌ 創建資產失敗:', insertError);
      return;
    }
    
    console.log(`✅ 成功創建 ${insertResult.length} 個資產`);
    
    // 驗證創建結果
    console.log('\n🔍 驗證創建結果...');
    const { data: verifyAssets, error: verifyError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    
    if (verifyError) {
      console.error('❌ 驗證失敗:', verifyError);
      return;
    }
    
    console.log(`✅ 驗證成功，共 ${verifyAssets.length} 個資產:`);
    verifyAssets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value}`);
      console.log(`     ID: ${asset.id}`);
      console.log(`     類型: ${asset.type}`);
      console.log(`     創建時間: ${asset.created_at}`);
      console.log('');
    });
    
    // 創建一些測試交易
    console.log('💳 創建測試交易...');
    
    const testTransactions = [
      {
        id: uuidv4(),
        user_id: user.id,
        amount: 1000,
        type: 'income',
        description: '薪水',
        category: '薪水',
        account: '銀行存款',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: user.id,
        amount: 500,
        type: 'expense',
        description: '午餐',
        category: '餐飲',
        account: '現金',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    const { data: txResult, error: txError } = await supabase
      .from('transactions')
      .insert(testTransactions)
      .select();
    
    if (txError) {
      console.error('❌ 創建交易失敗:', txError);
    } else {
      console.log(`✅ 成功創建 ${txResult.length} 筆交易`);
    }
    
    // 測試資產顯示
    console.log('\n🖥️ 測試資產顯示...');
    
    // 模擬前端資產加載
    const { data: frontendAssets, error: frontendError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (frontendError) {
      console.error('❌ 前端資產加載失敗:', frontendError);
    } else {
      console.log('✅ 前端資產加載成功:');
      
      // 轉換為前端格式
      const displayAssets = frontendAssets.map((asset, index) => ({
        id: asset.id,
        name: asset.name || `資產${index + 1}`,
        type: asset.type || 'bank',
        quantity: Number(asset.quantity) || 1,
        cost_basis: Number(asset.cost_basis || asset.value || asset.current_value || 0),
        current_value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
        stock_code: asset.stock_code,
        purchase_price: Number(asset.purchase_price || 0),
        current_price: Number(asset.current_price || 0),
        last_updated: asset.updated_at || asset.created_at,
        sort_order: Number(asset.sort_order) || index
      }));
      
      console.log('📱 前端顯示格式:');
      displayAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} = NT$ ${asset.current_value.toLocaleString()}`);
      });
      
      // 計算總資產
      const totalAssets = displayAssets.reduce((sum, asset) => sum + asset.current_value, 0);
      console.log(`💰 總資產價值: NT$ ${totalAssets.toLocaleString()}`);
    }
    
    console.log('\n🎯 資產恢復完成！');
    console.log('==========================================');
    
    console.log('\n📋 摘要:');
    console.log(`✅ 用戶: ${user.email}`);
    console.log(`✅ 資產數量: ${verifyAssets.length} 個`);
    console.log(`✅ 交易數量: ${txResult ? txResult.length : 0} 筆`);
    console.log(`✅ 包含5000元現金: ${verifyAssets.some(a => a.name === '現金' && a.current_value === 5000) ? '是' : '否'}`);
    
    console.log('\n🔄 下一步:');
    console.log('1. 在應用中登錄 user01@gmail.com');
    console.log('2. 點擊"體驗雲端同步"按鈕');
    console.log('3. 檢查資產是否正確顯示');
    console.log('4. 如果仍有問題，檢查前端組件');
    
    return {
      success: true,
      assetsCreated: verifyAssets.length,
      transactionsCreated: txResult ? txResult.length : 0,
      user: user.email
    };
    
  } catch (error) {
    console.error('❌ 恢復過程中發生錯誤:', error);
    throw error;
  }
}

restoreTestAssets().catch(console.error);
