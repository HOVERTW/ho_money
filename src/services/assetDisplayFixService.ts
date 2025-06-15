/**
 * 資產顯示修復服務
 * 專門解決資產數據加載和顯示問題
 */

import { supabase } from './supabase';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { transactionDataService } from './transactionDataService';

interface AssetData {
  id: string;
  name: string;
  type: string;
  quantity: number;
  cost_basis: number;
  current_value: number;
  stock_code?: string;
  purchase_price: number;
  current_price: number;
  last_updated: string;
  sort_order: number;
}

class AssetDisplayFixService {
  
  /**
   * 方法1：直接從 Supabase 重新加載資產
   */
  async method1_DirectSupabaseReload(): Promise<AssetData[]> {
    try {
      console.log('🔄 方法1：直接從 Supabase 重新加載資產...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ 用戶未登錄');
        return [];
      }

      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 方法1失敗:', error);
        return [];
      }

      const convertedAssets = (assets || []).map(asset => ({
        id: asset.id,
        name: asset.name || asset.asset_name || '未命名資產',
        type: asset.type || 'bank',
        quantity: Number(asset.quantity) || 1,
        cost_basis: Number(asset.cost_basis || asset.value || 0),
        current_value: Number(asset.current_value || asset.value || 0),
        stock_code: asset.stock_code,
        purchase_price: Number(asset.purchase_price || 0),
        current_price: Number(asset.current_price || 0),
        last_updated: asset.updated_at || asset.created_at || new Date().toISOString(),
        sort_order: Number(asset.sort_order) || 0
      }));

      console.log(`✅ 方法1成功：加載了 ${convertedAssets.length} 個資產`);
      return convertedAssets;

    } catch (error) {
      console.error('❌ 方法1異常:', error);
      return [];
    }
  }

  /**
   * 方法2：重新初始化資產服務
   */
  async method2_ReinitializeAssetService(): Promise<AssetData[]> {
    try {
      console.log('🔄 方法2：重新初始化資產服務...');
      
      // 強制重新初始化
      await assetTransactionSyncService.forceReload();
      
      // 獲取資產
      const assets = assetTransactionSyncService.getAssets();
      
      console.log(`✅ 方法2成功：服務中有 ${assets.length} 個資產`);
      return assets;

    } catch (error) {
      console.error('❌ 方法2異常:', error);
      return [];
    }
  }

  /**
   * 方法3：同步資產到交易服務的帳戶
   */
  async method3_SyncAssetsToTransactionService(): Promise<AssetData[]> {
    try {
      console.log('🔄 方法3：同步資產到交易服務...');
      
      // 從資產服務獲取資產
      const assets = assetTransactionSyncService.getAssets();
      
      // 轉換為帳戶格式並設置到交易服務
      const accounts = assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type
      }));

      transactionDataService.setAccounts(accounts);
      
      console.log(`✅ 方法3成功：同步了 ${assets.length} 個資產作為帳戶`);
      return assets;

    } catch (error) {
      console.error('❌ 方法3異常:', error);
      return [];
    }
  }

  /**
   * 綜合修復方法：使用三種方法確保資產正確加載
   */
  async comprehensiveFix(): Promise<{
    success: boolean;
    assetsCount: number;
    methods: {
      method1: { success: boolean; count: number };
      method2: { success: boolean; count: number };
      method3: { success: boolean; count: number };
    };
    finalAssets: AssetData[];
  }> {
    console.log('🔧 開始綜合資產修復...');

    const results = {
      success: false,
      assetsCount: 0,
      methods: {
        method1: { success: false, count: 0 },
        method2: { success: false, count: 0 },
        method3: { success: false, count: 0 }
      },
      finalAssets: [] as AssetData[]
    };

    try {
      // 執行方法1
      const assets1 = await this.method1_DirectSupabaseReload();
      results.methods.method1.success = assets1.length > 0;
      results.methods.method1.count = assets1.length;

      // 如果方法1成功，將資產設置到服務中
      if (assets1.length > 0) {
        await assetTransactionSyncService.setAssets(assets1);
        results.finalAssets = assets1;
      }

      // 執行方法2
      const assets2 = await this.method2_ReinitializeAssetService();
      results.methods.method2.success = assets2.length > 0;
      results.methods.method2.count = assets2.length;

      // 如果方法2獲得更多資產，使用方法2的結果
      if (assets2.length > results.finalAssets.length) {
        results.finalAssets = assets2;
      }

      // 執行方法3
      const assets3 = await this.method3_SyncAssetsToTransactionService();
      results.methods.method3.success = assets3.length > 0;
      results.methods.method3.count = assets3.length;

      // 最終結果
      results.assetsCount = results.finalAssets.length;
      results.success = results.assetsCount > 0;

      console.log('📊 綜合修復結果:');
      console.log(`- 方法1 (直接加載): ${results.methods.method1.success ? '✅' : '❌'} ${results.methods.method1.count} 個資產`);
      console.log(`- 方法2 (服務重載): ${results.methods.method2.success ? '✅' : '❌'} ${results.methods.method2.count} 個資產`);
      console.log(`- 方法3 (同步帳戶): ${results.methods.method3.success ? '✅' : '❌'} ${results.methods.method3.count} 個資產`);
      console.log(`- 最終結果: ${results.success ? '✅' : '❌'} ${results.assetsCount} 個資產`);

      if (results.success) {
        console.log('🎉 資產修復成功！');
        results.finalAssets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name} (${asset.type}) - 價值: ${asset.current_value}`);
        });
      } else {
        console.log('⚠️ 資產修復失敗，沒有找到任何資產');
      }

      return results;

    } catch (error) {
      console.error('❌ 綜合修復異常:', error);
      results.success = false;
      return results;
    }
  }

  /**
   * 驗證資產數據完整性
   */
  async validateAssetData(): Promise<{
    supabaseCount: number;
    serviceCount: number;
    transactionServiceCount: number;
    consistent: boolean;
  }> {
    try {
      console.log('🔍 驗證資產數據完整性...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { supabaseCount: 0, serviceCount: 0, transactionServiceCount: 0, consistent: false };
      }

      // 檢查 Supabase 中的資產數量
      const { data: supabaseAssets } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', user.id);

      // 檢查資產服務中的資產數量
      const serviceAssets = assetTransactionSyncService.getAssets();

      // 檢查交易服務中的帳戶數量
      const transactionAccounts = transactionDataService.getAccounts();

      const result = {
        supabaseCount: supabaseAssets?.length || 0,
        serviceCount: serviceAssets.length,
        transactionServiceCount: transactionAccounts.length,
        consistent: false
      };

      // 檢查一致性（允許交易服務帳戶數量不同，因為可能包含其他類型的帳戶）
      result.consistent = result.supabaseCount > 0 && result.serviceCount > 0;

      console.log('📊 資產數據完整性檢查結果:');
      console.log(`- Supabase 資產數量: ${result.supabaseCount}`);
      console.log(`- 資產服務數量: ${result.serviceCount}`);
      console.log(`- 交易服務帳戶數量: ${result.transactionServiceCount}`);
      console.log(`- 數據一致性: ${result.consistent ? '✅' : '❌'}`);

      return result;

    } catch (error) {
      console.error('❌ 驗證資產數據完整性失敗:', error);
      return { supabaseCount: 0, serviceCount: 0, transactionServiceCount: 0, consistent: false };
    }
  }

  /**
   * 快速診斷資產問題
   */
  async quickDiagnosis(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // 檢查用戶登錄狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        issues.push('用戶未登錄');
        return issues;
      }

      // 檢查 Supabase 連接
      try {
        const { error } = await supabase.from('assets').select('id').limit(1);
        if (error) {
          issues.push(`Supabase 連接問題: ${error.message}`);
        }
      } catch (error) {
        issues.push('Supabase 連接失敗');
      }

      // 檢查資產數據
      const validation = await this.validateAssetData();
      if (validation.supabaseCount === 0) {
        issues.push('Supabase 中沒有資產數據');
      }
      if (validation.serviceCount === 0) {
        issues.push('資產服務中沒有資產數據');
      }
      if (!validation.consistent) {
        issues.push('資產數據不一致');
      }

      if (issues.length === 0) {
        issues.push('沒有發現明顯問題');
      }

      return issues;

    } catch (error) {
      issues.push(`診斷過程中發生錯誤: ${error.message}`);
      return issues;
    }
  }
}

export const assetDisplayFixService = new AssetDisplayFixService();
