/**
 * 診斷資產顯示問題
 * 檢查Supabase數據、本地存儲、以及可能的連結問題
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 模擬Web環境的AsyncStorage
const webAsyncStorage = {
  data: new Map(),
  
  async getItem(key) {
    const value = this.data.get(key);
    console.log(`📖 讀取 ${key}: ${value ? '有數據' : '無數據'}`);
    return value || null;
  },
  
  async setItem(key, value) {
    this.data.set(key, value);
    console.log(`💾 保存 ${key}: ${value.length} 字符`);
  },
  
  async removeItem(key) {
    this.data.delete(key);
    console.log(`🗑️ 刪除 ${key}`);
  },
  
  async getAllKeys() {
    return Array.from(this.data.keys());
  }
};

async function diagnoseAssetIssue() {
  console.log('🔍 開始診斷資產顯示問題...');
  console.log('==========================================');
  
  // 初始化Supabase
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    // 步驟1: 檢查用戶登錄狀態
    console.log('🔍 步驟1: 檢查用戶登錄狀態...');
    
    // 使用測試用戶登錄
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
    console.log(`👤 用戶ID: ${user.id}`);
    
    // 步驟2: 檢查Supabase中的資產數據
    console.log('\n🔍 步驟2: 檢查Supabase中的資產數據...');
    
    const { data: supabaseAssets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (assetsError) {
      console.error('❌ Supabase資產查詢失敗:', assetsError);
      return;
    }
    
    console.log(`📊 Supabase資產數量: ${supabaseAssets.length}`);
    
    if (supabaseAssets.length > 0) {
      console.log('📋 Supabase資產詳情:');
      supabaseAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name || '未命名'}`);
        console.log(`     類型: ${asset.type || '未知'}`);
        console.log(`     價值: ${asset.current_value || asset.value || 0}`);
        console.log(`     ID: ${asset.id}`);
        console.log(`     創建時間: ${asset.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Supabase中沒有找到資產數據');
    }
    
    // 步驟3: 檢查本地存儲鍵
    console.log('🔍 步驟3: 檢查本地存儲鍵...');
    
    const storageKeys = [
      '@FinTranzo:assets',
      '@Ho記帳:assets',  // 檢查是否因為更名產生新鍵
      'fintranzo_assets',
      'ho_assets',
      'assets'
    ];
    
    for (const key of storageKeys) {
      const data = await webAsyncStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ 找到存儲鍵 ${key}: ${parsed.length} 個資產`);
          parsed.forEach((asset, index) => {
            console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value || asset.value || 0}`);
          });
        } catch (e) {
          console.log(`⚠️ 存儲鍵 ${key} 數據格式錯誤`);
        }
      } else {
        console.log(`❌ 存儲鍵 ${key}: 無數據`);
      }
    }
    
    // 步驟4: 模擬資產加載過程
    console.log('\n🔍 步驟4: 模擬資產加載過程...');
    
    if (supabaseAssets.length > 0) {
      // 轉換為本地格式
      const localAssets = supabaseAssets.map((asset, index) => ({
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
      
      console.log('🔄 轉換後的本地資產格式:');
      localAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} = ${asset.current_value}`);
      });
      
      // 保存到本地存儲
      await webAsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(localAssets));
      console.log('✅ 已保存到本地存儲');
      
      // 驗證保存
      const savedData = await webAsyncStorage.getItem('@FinTranzo:assets');
      const savedAssets = JSON.parse(savedData);
      console.log(`✅ 驗證保存: ${savedAssets.length} 個資產`);
    }
    
    // 步驟5: 檢查可能的問題
    console.log('\n🔍 步驟5: 檢查可能的問題...');
    
    const issues = [];
    
    // 檢查應用名稱更改影響
    if (supabaseAssets.length > 0) {
      const oldKey = await webAsyncStorage.getItem('@FinTranzo:assets');
      const newKey = await webAsyncStorage.getItem('@Ho記帳:assets');
      
      if (!oldKey && !newKey) {
        issues.push('本地存儲中沒有資產數據，可能是存儲鍵問題');
      }
      
      if (newKey) {
        issues.push('檢測到新的存儲鍵，可能是應用名稱更改導致');
      }
    }
    
    // 檢查數據格式
    if (supabaseAssets.length > 0) {
      const hasInvalidData = supabaseAssets.some(asset => 
        !asset.name || 
        (!asset.current_value && !asset.value) ||
        !asset.id
      );
      
      if (hasInvalidData) {
        issues.push('Supabase中有無效的資產數據');
      }
    }
    
    if (issues.length > 0) {
      console.log('⚠️ 發現的問題:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ 沒有發現明顯問題');
    }
    
    // 步驟6: 提供修復建議
    console.log('\n🔧 修復建議:');
    
    if (supabaseAssets.length > 0) {
      console.log('1. ✅ Supabase中有資產數據，數據源正常');
      console.log('2. 🔄 建議強制重新加載資產服務');
      console.log('3. 🧹 清除本地緩存並重新同步');
      console.log('4. 🔍 檢查前端組件是否正確讀取資產數據');
    } else {
      console.log('1. ❌ Supabase中沒有資產數據');
      console.log('2. 📝 需要重新創建測試資產');
      console.log('3. 🔄 檢查資產上傳功能是否正常');
    }
    
    console.log('\n🎯 診斷完成！');
    console.log('==========================================');
    
    return {
      supabaseAssets: supabaseAssets.length,
      localAssets: (await webAsyncStorage.getItem('@FinTranzo:assets')) ? 
        JSON.parse(await webAsyncStorage.getItem('@FinTranzo:assets')).length : 0,
      issues: issues.length,
      user: user.email
    };
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error);
    throw error;
  }
}

// 執行診斷
main().catch(console.error);

async function main() {
  try {
    const result = await diagnoseAssetIssue();
    console.log('\n📊 診斷結果摘要:');
    console.log(`👤 用戶: ${result.user}`);
    console.log(`☁️ Supabase資產: ${result.supabaseAssets} 個`);
    console.log(`📱 本地資產: ${result.localAssets} 個`);
    console.log(`⚠️ 發現問題: ${result.issues} 個`);
    
    if (result.supabaseAssets > 0 && result.localAssets === 0) {
      console.log('\n🔧 建議執行修復操作:');
      console.log('1. 在應用中點擊"體驗雲端同步"');
      console.log('2. 或執行強制重新加載資產');
      console.log('3. 檢查前端資產顯示組件');
    }
    
  } catch (error) {
    console.error('❌ 主程序執行失敗:', error);
  }
}
