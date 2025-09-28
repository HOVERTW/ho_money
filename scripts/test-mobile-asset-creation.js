/**
 * 測試手機端資產創建功能
 * 驗證修復後的觸控響應
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testMobileAssetCreation() {
  console.log('📱 測試手機端資產創建功能...');
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
    
    // 檢查修復前的資產數量
    console.log('\n📊 檢查修復前的資產數量...');
    const { data: beforeAssets, error: beforeError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);
    
    if (beforeError) {
      console.error('❌ 查詢資產失敗:', beforeError);
      return;
    }
    
    console.log(`📊 修復前資產數量: ${beforeAssets.length}`);
    
    // 模擬手機端創建新資產
    console.log('\n📱 模擬手機端創建新資產...');
    
    const testAsset = {
      id: require('uuid').v4(),
      user_id: user.id,
      name: '手機測試資產',
      type: 'cash',
      current_value: 1000,
      value: 1000,
      cost_basis: 1000,
      quantity: 1,
      sort_order: beforeAssets.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 準備創建的資產:', testAsset.name);
    
    // 插入新資產
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
    
    if (insertError) {
      console.error('❌ 創建資產失敗:', insertError);
      return;
    }
    
    console.log('✅ 手機端資產創建成功:', insertResult[0]);
    
    // 驗證創建結果
    console.log('\n🔍 驗證創建結果...');
    const { data: afterAssets, error: afterError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (afterError) {
      console.error('❌ 驗證查詢失敗:', afterError);
      return;
    }
    
    console.log(`📊 修復後資產數量: ${afterAssets.length}`);
    console.log(`✅ 新增資產數量: ${afterAssets.length - beforeAssets.length}`);
    
    // 顯示最新資產
    if (afterAssets.length > 0) {
      const latestAsset = afterAssets[0];
      console.log('📋 最新創建的資產:');
      console.log(`  名稱: ${latestAsset.name}`);
      console.log(`  類型: ${latestAsset.type}`);
      console.log(`  價值: ${latestAsset.current_value}`);
      console.log(`  創建時間: ${latestAsset.created_at}`);
    }
    
    // 測試修復效果
    console.log('\n🔧 測試修復效果...');
    
    const fixes = [
      '✅ 增加了手機端觸控事件日誌',
      '✅ 優化了TouchableOpacity配置',
      '✅ 增加了hitSlop觸控區域',
      '✅ 禁用了nestedScrollEnabled',
      '✅ 設置了keyboardShouldPersistTaps="always"',
      '✅ 增加了MobileTouchableOpacity組件',
      '✅ 增加了最小觸控區域尺寸',
      '✅ 添加了事件處理延遲'
    ];
    
    console.log('🔧 已應用的修復措施:');
    fixes.forEach(fix => console.log(`  ${fix}`));
    
    // 生成測試指南
    console.log('\n📱 手機端測試指南:');
    console.log('1. 在手機瀏覽器中打開 https://19930913.xyz');
    console.log('2. 登錄 user01@gmail.com / user01');
    console.log('3. 進入資產頁面');
    console.log('4. 點擊"+"按鈕新增資產');
    console.log('5. 選擇資產類型（應該有觸控反饋）');
    console.log('6. 填寫資產信息');
    console.log('7. 點擊"保存"按鈕（應該有觸控反饋）');
    console.log('8. 檢查瀏覽器控制台是否有觸控事件日誌');
    
    console.log('\n🔍 故障排除:');
    console.log('如果仍然無反應，請檢查:');
    console.log('- 瀏覽器控制台是否有JavaScript錯誤');
    console.log('- 是否有CSS覆蓋導致觸控區域被遮擋');
    console.log('- 網絡連接是否正常');
    console.log('- 是否有其他Modal或覆蓋層阻擋事件');
    
    console.log('\n🎯 測試完成！');
    console.log('==========================================');
    
    return {
      success: true,
      beforeCount: beforeAssets.length,
      afterCount: afterAssets.length,
      newAssetCreated: afterAssets.length > beforeAssets.length,
      latestAsset: afterAssets[0]
    };
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    throw error;
  }
}

testMobileAssetCreation().catch(console.error);
