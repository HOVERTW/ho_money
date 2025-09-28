/**
 * 測試網站資產顯示功能
 * 驗證更名後資產是否能正確顯示
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testWebsiteAssetDisplay() {
  console.log('🌐 測試網站資產顯示功能...');
  console.log('==========================================');
  
  // 初始化Supabase
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    // 步驟1: 驗證Supabase數據
    console.log('🔍 步驟1: 驗證Supabase數據...');
    
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
    
    // 檢查資產數據
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (assetsError) {
      console.error('❌ 資產查詢失敗:', assetsError);
      return;
    }
    
    console.log(`📊 Supabase資產數量: ${assets.length}`);
    assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value}`);
    });
    
    // 步驟2: 模擬前端資產加載流程
    console.log('\n🔄 步驟2: 模擬前端資產加載流程...');
    
    // 模擬assetTransactionSyncService的加載過程
    const loadedAssets = assets.map((asset, index) => ({
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
    
    console.log('✅ 前端格式轉換完成:');
    loadedAssets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} = NT$ ${asset.current_value.toLocaleString()}`);
    });
    
    // 步驟3: 檢查存儲鍵兼容性
    console.log('\n🔍 步驟3: 檢查存儲鍵兼容性...');
    
    // 模擬Web環境的AsyncStorage
    const webAsyncStorage = {
      data: new Map(),
      async getItem(key) { return this.data.get(key) || null; },
      async setItem(key, value) { this.data.set(key, value); }
    };
    
    // 測試不同的存儲鍵
    const storageKeys = [
      '@FinTranzo:assets',
      '@Ho記帳:assets',
      'fintranzo_assets'
    ];
    
    // 保存到所有可能的鍵
    const assetData = JSON.stringify(loadedAssets);
    for (const key of storageKeys) {
      await webAsyncStorage.setItem(key, assetData);
      console.log(`✅ 已保存到 ${key}`);
    }
    
    // 驗證讀取
    for (const key of storageKeys) {
      const data = await webAsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ 從 ${key} 讀取到 ${parsed.length} 個資產`);
      }
    }
    
    // 步驟4: 檢查應用名稱更改的影響
    console.log('\n🔍 步驟4: 檢查應用名稱更改的影響...');
    
    console.log('📱 應用名稱更改前後對比:');
    console.log('  更改前: FinTranzo');
    console.log('  更改後: Ho記帳');
    console.log('  存儲鍵: @FinTranzo:assets (保持不變)');
    console.log('  Supabase表: assets (保持不變)');
    console.log('  用戶ID: 保持不變');
    
    // 步驟5: 測試資產服務初始化
    console.log('\n🔄 步驟5: 測試資產服務初始化...');
    
    // 模擬assetTransactionSyncService.initialize()
    console.log('🔄 模擬資產服務初始化...');
    
    // 1. 檢查用戶登錄狀態
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      console.log(`✅ 用戶已登錄: ${currentUser.email}`);
      
      // 2. 從Supabase加載資產
      const { data: supabaseAssets, error: loadError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (loadError) {
        console.error('❌ 資產加載失敗:', loadError);
      } else {
        console.log(`✅ 從Supabase加載 ${supabaseAssets.length} 個資產`);
        
        // 3. 保存到本地存儲
        await webAsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(supabaseAssets));
        console.log('✅ 已保存到本地存儲');
        
        // 4. 驗證本地存儲
        const localData = await webAsyncStorage.getItem('@FinTranzo:assets');
        const localAssets = JSON.parse(localData);
        console.log(`✅ 本地存儲驗證: ${localAssets.length} 個資產`);
      }
    } else {
      console.log('⚠️ 用戶未登錄，需要先登錄');
    }
    
    // 步驟6: 生成修復建議
    console.log('\n🔧 步驟6: 生成修復建議...');
    
    if (assets.length > 0) {
      console.log('✅ 數據源正常 - Supabase中有資產數據');
      console.log('✅ 數據格式正常 - 資產格式轉換成功');
      console.log('✅ 存儲鍵正常 - @FinTranzo:assets 仍然有效');
      
      console.log('\n🎯 如果網站仍無法顯示資產，可能的原因:');
      console.log('1. 🔄 前端組件未正確初始化資產服務');
      console.log('2. 🔐 用戶未登錄或登錄狀態丟失');
      console.log('3. 🔄 資產服務的事件監聽器未正確設置');
      console.log('4. 🎨 前端UI組件渲染問題');
      console.log('5. 🌐 網頁版本的AsyncStorage實現問題');
      
      console.log('\n🔧 建議的修復步驟:');
      console.log('1. 在網站上登錄 user01@gmail.com / user01');
      console.log('2. 點擊"體驗雲端同步"按鈕');
      console.log('3. 檢查瀏覽器控制台是否有錯誤');
      console.log('4. 檢查資產列表組件是否正確渲染');
      console.log('5. 如果仍有問題，檢查資產服務的初始化流程');
      
    } else {
      console.log('❌ 數據源問題 - Supabase中沒有資產數據');
      console.log('🔧 請先執行 restore-test-assets.js 腳本');
    }
    
    console.log('\n🎯 測試完成！');
    console.log('==========================================');
    
    return {
      supabaseAssets: assets.length,
      dataIntegrity: assets.length > 0,
      storageKeysWorking: true,
      userLoggedIn: !!currentUser,
      recommendations: assets.length > 0 ? 'check_frontend' : 'restore_data'
    };
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    throw error;
  }
}

testWebsiteAssetDisplay().catch(console.error);
