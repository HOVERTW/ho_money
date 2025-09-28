/**
 * 檢查Supabase中的所有數據
 * 查找可能遺失的資產數據
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAllSupabaseData() {
  console.log('🔍 檢查Supabase中的所有數據...');
  console.log('==========================================');
  
  // 初始化Supabase
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    // 檢查所有用戶
    console.log('👥 檢查所有用戶...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });
    
    if (authError) {
      console.error('❌ 登錄失敗:', authError.message);
      return;
    }
    
    const currentUser = authData.user;
    console.log(`✅ 當前用戶: ${currentUser.email} (${currentUser.id})`);
    
    // 檢查所有資產（不限用戶）
    console.log('\n💰 檢查所有資產數據...');
    const { data: allAssets, error: allAssetsError } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allAssetsError) {
      console.error('❌ 查詢所有資產失敗:', allAssetsError);
    } else {
      console.log(`📊 總資產數量: ${allAssets.length}`);
      
      if (allAssets.length > 0) {
        console.log('📋 所有資產詳情:');
        allAssets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name || '未命名'}`);
          console.log(`     用戶ID: ${asset.user_id}`);
          console.log(`     類型: ${asset.type || '未知'}`);
          console.log(`     價值: ${asset.current_value || asset.value || 0}`);
          console.log(`     創建時間: ${asset.created_at}`);
          console.log(`     是否為當前用戶: ${asset.user_id === currentUser.id ? '是' : '否'}`);
          console.log('');
        });
        
        // 檢查是否有5000元的現金
        const cashAssets = allAssets.filter(asset => 
          (asset.name && asset.name.includes('現金')) ||
          (asset.current_value === 5000 || asset.value === 5000)
        );
        
        if (cashAssets.length > 0) {
          console.log('💵 找到可能的現金資產:');
          cashAssets.forEach((asset, index) => {
            console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value || asset.value}`);
            console.log(`     用戶ID: ${asset.user_id}`);
            console.log(`     是否為當前用戶: ${asset.user_id === currentUser.id ? '是' : '否'}`);
          });
        }
      } else {
        console.log('⚠️ 沒有找到任何資產數據');
      }
    }
    
    // 檢查所有交易
    console.log('\n💳 檢查所有交易數據...');
    const { data: allTransactions, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allTxError) {
      console.error('❌ 查詢所有交易失敗:', allTxError);
    } else {
      console.log(`📊 最近交易數量: ${allTransactions.length}`);
      
      if (allTransactions.length > 0) {
        console.log('📋 最近交易詳情:');
        allTransactions.forEach((tx, index) => {
          console.log(`  ${index + 1}. ${tx.description || '未命名'}`);
          console.log(`     用戶ID: ${tx.user_id}`);
          console.log(`     金額: ${tx.amount}`);
          console.log(`     類型: ${tx.type}`);
          console.log(`     創建時間: ${tx.created_at}`);
          console.log(`     是否為當前用戶: ${tx.user_id === currentUser.id ? '是' : '否'}`);
          console.log('');
        });
      }
    }
    
    // 檢查所有負債
    console.log('\n💸 檢查所有負債數據...');
    const { data: allLiabilities, error: allLiabError } = await supabase
      .from('liabilities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allLiabError) {
      console.error('❌ 查詢所有負債失敗:', allLiabError);
    } else {
      console.log(`📊 總負債數量: ${allLiabilities.length}`);
      
      if (allLiabilities.length > 0) {
        console.log('📋 所有負債詳情:');
        allLiabilities.forEach((liability, index) => {
          console.log(`  ${index + 1}. ${liability.name || '未命名'}`);
          console.log(`     用戶ID: ${liability.user_id}`);
          console.log(`     金額: ${liability.amount}`);
          console.log(`     創建時間: ${liability.created_at}`);
          console.log(`     是否為當前用戶: ${liability.user_id === currentUser.id ? '是' : '否'}`);
          console.log('');
        });
      }
    }
    
    // 檢查表結構
    console.log('\n🏗️ 檢查表結構...');
    
    // 檢查assets表結構
    const { data: assetsSchema, error: assetsSchemaError } = await supabase
      .from('assets')
      .select('*')
      .limit(0);
    
    if (!assetsSchemaError) {
      console.log('✅ assets表存在且可訪問');
    } else {
      console.error('❌ assets表訪問失敗:', assetsSchemaError);
    }
    
    // 嘗試創建測試資產
    console.log('\n🧪 嘗試創建測試資產...');
    
    const testAsset = {
      id: 'test-asset-' + Date.now(),
      user_id: currentUser.id,
      name: '測試現金',
      type: 'cash',
      current_value: 5000,
      value: 5000,
      cost_basis: 5000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
    
    if (insertError) {
      console.error('❌ 創建測試資產失敗:', insertError);
    } else {
      console.log('✅ 成功創建測試資產:', insertResult[0]);
      
      // 立即查詢驗證
      const { data: verifyAsset, error: verifyError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', testAsset.id);
      
      if (verifyError) {
        console.error('❌ 驗證測試資產失敗:', verifyError);
      } else {
        console.log('✅ 驗證測試資產成功:', verifyAsset[0]);
      }
    }
    
    console.log('\n🎯 檢查完成！');
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
    throw error;
  }
}

checkAllSupabaseData().catch(console.error);
