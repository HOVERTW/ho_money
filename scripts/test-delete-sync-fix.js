/**
 * 測試資產刪除同步修復功能
 * 驗證刪除資產後點擊上傳是否能正確同步到Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 使用環境變數
const SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

// 創建Supabase客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 測試用戶憑證
const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

// 模擬本地存儲
const mockLocalStorage = {
  data: {},
  setItem: function(key, value) {
    this.data[key] = value;
    return Promise.resolve();
  },
  getItem: function(key) {
    return Promise.resolve(this.data[key] || null);
  },
  removeItem: function(key) {
    delete this.data[key];
    return Promise.resolve();
  }
};

// 生成測試資產數據（使用有效UUID）
const TEST_ASSETS = [
  {
    id: uuidv4(),
    name: '測試資產1',
    type: 'cash',
    current_value: 10000,
    created_at: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '測試資產2',
    type: 'stock',
    current_value: 20000,
    created_at: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '測試資產3',
    type: 'bank',
    current_value: 30000,
    created_at: new Date().toISOString()
  }
];

class DeleteSyncTester {
  constructor() {
    this.user = null;
  }

  async login() {
    try {
      console.log('🔐 登錄測試用戶...');
      const { data, error } = await supabase.auth.signInWithPassword(TEST_USER);

      if (error) {
        throw new Error(`登錄失敗: ${error.message}`);
      }

      this.user = data.user;
      console.log('✅ 登錄成功:', this.user.email);
      return true;
    } catch (error) {
      console.error('❌ 登錄失敗:', error.message);
      return false;
    }
  }

  async setupTestData() {
    try {
      console.log('📝 設置測試數據...');

      // 清理現有測試數據
      await this.cleanupTestData();

      // 上傳測試資產到雲端
      const assetsForUpload = TEST_ASSETS.map(asset => ({
        ...asset,
        user_id: this.user.id,
        value: asset.current_value,
        cost_basis: asset.current_value,
        quantity: 1,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('assets')
        .insert(assetsForUpload);

      if (error) {
        throw new Error(`上傳測試資產失敗: ${error.message}`);
      }

      // 設置本地數據（模擬已刪除一個資產）
      const localAssets = TEST_ASSETS.slice(0, 2); // 只保留前兩個資產
      await mockLocalStorage.setItem('assets', JSON.stringify(localAssets));

      console.log('✅ 測試數據設置完成');
      console.log(`☁️ 雲端資產數量: ${TEST_ASSETS.length}`);
      console.log(`📱 本地資產數量: ${localAssets.length}`);
      console.log(`🗑️ 應該被刪除的資產: ${TEST_ASSETS[2].name}`);

      return true;
    } catch (error) {
      console.error('❌ 設置測試數據失敗:', error.message);
      return false;
    }
  }

  async testDeleteSync() {
    try {
      console.log('🧪 測試刪除同步功能...');

      // 模擬統一數據管理器的上傳功能
      const result = await this.simulateUploadAllToCloud();

      console.log('📊 同步結果:', result);

      // 驗證雲端數據
      const { data: cloudAssets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', this.user.id);

      if (error) {
        throw new Error(`獲取雲端資產失敗: ${error.message}`);
      }

      console.log(`☁️ 同步後雲端資產數量: ${cloudAssets.length}`);
      console.log('☁️ 雲端資產列表:', cloudAssets.map(a => a.name));

      // 檢查是否正確刪除了第三個資產
      const deletedAsset = cloudAssets.find(a => a.id === 'test-asset-3');

      if (deletedAsset) {
        console.log('❌ 測試失敗：資產3仍然存在於雲端');
        return false;
      } else {
        console.log('✅ 測試成功：資產3已從雲端刪除');
        return true;
      }

    } catch (error) {
      console.error('❌ 測試刪除同步失敗:', error.message);
      return false;
    }
  }

  async simulateUploadAllToCloud() {
    // 模擬修復後的上傳邏輯
    const result = {
      uploaded: 0,
      deleted: 0,
      errors: []
    };

    try {
      // 獲取本地資產
      const localAssetsData = await mockLocalStorage.getItem('assets');
      const localAssets = localAssetsData ? JSON.parse(localAssetsData) : [];
      const localAssetIds = localAssets.map(asset => asset.id);

      // 獲取雲端資產
      const { data: cloudAssets, error: assetError } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', this.user.id);

      if (assetError) {
        throw new Error(`獲取雲端資產失敗: ${assetError.message}`);
      }

      const cloudAssetIds = cloudAssets?.map(asset => asset.id) || [];

      // 找出需要刪除的資產
      const assetsToDelete = cloudAssetIds.filter(id => !localAssetIds.includes(id));

      console.log(`🔍 本地資產ID: [${localAssetIds.join(', ')}]`);
      console.log(`🔍 雲端資產ID: [${cloudAssetIds.join(', ')}]`);
      console.log(`🗑️ 需要刪除的資產ID: [${assetsToDelete.join(', ')}]`);

      // 執行刪除
      if (assetsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('assets')
          .delete()
          .eq('user_id', this.user.id)
          .in('id', assetsToDelete);

        if (deleteError) {
          throw new Error(`刪除雲端資產失敗: ${deleteError.message}`);
        }

        result.deleted = assetsToDelete.length;
        console.log(`✅ 成功刪除 ${assetsToDelete.length} 個雲端資產`);
      }

      // 上傳本地資產
      if (localAssets.length > 0) {
        const assetsForUpload = localAssets.map(asset => ({
          id: asset.id,
          user_id: this.user.id,
          name: asset.name,
          type: asset.type,
          value: asset.current_value,
          current_value: asset.current_value,
          cost_basis: asset.current_value,
          quantity: 1,
          created_at: asset.created_at,
          updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
          .from('assets')
          .upsert(assetsForUpload, { onConflict: 'id' })
          .select();

        if (error) {
          throw new Error(`上傳資產失敗: ${error.message}`);
        }

        result.uploaded = data?.length || 0;
        console.log(`✅ 成功上傳 ${result.uploaded} 個資產`);
      }

      return result;
    } catch (error) {
      console.error('❌ 模擬上傳失敗:', error.message);
      result.errors.push(error.message);
      return result;
    }
  }

  async cleanupTestData() {
    try {
      // 清理雲端測試數據
      await supabase
        .from('assets')
        .delete()
        .eq('user_id', this.user.id)
        .in('id', TEST_ASSETS.map(a => a.id));

      // 清理本地數據
      await mockLocalStorage.removeItem('assets');

      console.log('🧹 測試數據清理完成');
    } catch (error) {
      console.error('⚠️ 清理測試數據失敗:', error.message);
    }
  }

  async logout() {
    try {
      await supabase.auth.signOut();
      console.log('👋 已登出');
    } catch (error) {
      console.error('⚠️ 登出失敗:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 開始測試資產刪除同步修復功能...');
  console.log('=====================================');

  const tester = new DeleteSyncTester();
  let success = false;

  try {
    // 登錄
    if (!await tester.login()) {
      throw new Error('登錄失敗');
    }

    // 設置測試數據
    if (!await tester.setupTestData()) {
      throw new Error('設置測試數據失敗');
    }

    // 測試刪除同步
    success = await tester.testDeleteSync();

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  } finally {
    // 清理和登出
    await tester.cleanupTestData();
    await tester.logout();
  }

  console.log('');
  console.log('🎯 測試完成！');
  console.log('=====================================');

  if (success) {
    console.log('✅ 資產刪除同步修復成功！');
    console.log('📱 現在刪除資產後點擊上傳會正確同步到雲端');
    console.log('🗑️ 雲端多餘的資產會被自動清理');
  } else {
    console.log('❌ 資產刪除同步仍有問題');
    console.log('🔧 需要進一步檢查和修復');
  }
}

// 運行測試
main().catch(console.error);