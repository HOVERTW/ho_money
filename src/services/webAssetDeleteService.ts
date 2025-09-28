/**
 * 網頁版專用資產刪除服務
 * 確保完全刪除所有相關數據
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { STORAGE_KEYS } from '../utils/storageManager';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { unifiedDataManager } from './unifiedDataManager';

export interface WebDeleteResult {
  success: boolean;
  deletedAssetId: string;
  deletedFromLocal: boolean;
  deletedFromCloud: boolean;
  deletedFromCache: boolean;
  deletedFromServices: boolean;
  relatedTransactionsDeleted: number;
  errors: string[];
  timestamp: string;
}

export class WebAssetDeleteService {
  /**
   * 完全刪除資產 - 網頁版專用
   * 確保從所有存儲位置和服務中移除
   */
  static async deleteAssetCompletely(assetId: string): Promise<WebDeleteResult> {
    console.log('🗑️ 網頁版：開始完全刪除資產', assetId);
    
    const result: WebDeleteResult = {
      success: false,
      deletedAssetId: assetId,
      deletedFromLocal: false,
      deletedFromCloud: false,
      deletedFromCache: false,
      deletedFromServices: false,
      relatedTransactionsDeleted: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 步驟 1: 獲取資產信息（用於日誌）
      const assetInfo = await this.getAssetInfo(assetId);
      console.log('🔍 找到要刪除的資產:', assetInfo?.name || assetId);

      // 步驟 2: 刪除相關交易
      const relatedTransactionsCount = await this.deleteRelatedTransactions(assetId);
      result.relatedTransactionsDeleted = relatedTransactionsCount;
      console.log(`🗑️ 已刪除 ${relatedTransactionsCount} 筆相關交易`);

      // 步驟 3: 從本地存儲刪除
      const localDeleted = await this.deleteFromLocalStorage(assetId);
      result.deletedFromLocal = localDeleted;
      if (localDeleted) {
        console.log('✅ 本地存儲刪除成功');
      } else {
        result.errors.push('本地存儲刪除失敗');
      }

      // 步驟 4: 從雲端刪除
      const cloudDeleted = await this.deleteFromCloud(assetId);
      result.deletedFromCloud = cloudDeleted;
      if (cloudDeleted) {
        console.log('✅ 雲端刪除成功');
      } else {
        result.errors.push('雲端刪除失敗');
      }

      // 步驟 5: 從緩存和服務中清除
      const cacheDeleted = await this.deleteFromCache(assetId);
      result.deletedFromCache = cacheDeleted;
      if (cacheDeleted) {
        console.log('✅ 緩存清除成功');
      } else {
        result.errors.push('緩存清除失敗');
      }

      // 步驟 6: 從服務實例中移除
      const servicesDeleted = await this.deleteFromServices(assetId);
      result.deletedFromServices = servicesDeleted;
      if (servicesDeleted) {
        console.log('✅ 服務實例清除成功');
      } else {
        result.errors.push('服務實例清除失敗');
      }

      // 步驟 7: 驗證刪除結果
      const verificationPassed = await this.verifyDeletion(assetId);
      if (verificationPassed) {
        console.log('✅ 刪除驗證通過');
        result.success = true;
      } else {
        result.errors.push('刪除驗證失敗 - 資產仍然存在');
      }

      // 步驟 8: 強制刷新所有相關服務
      await this.forceRefreshServices();
      console.log('🔄 已強制刷新所有服務');

      console.log('🎯 資產刪除完成:', result);
      return result;

    } catch (error) {
      console.error('❌ 資產刪除過程中發生錯誤:', error);
      result.errors.push(`刪除過程異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 獲取資產信息
   */
  private static async getAssetInfo(assetId: string): Promise<any> {
    try {
      // 先從本地存儲查找
      const localAssets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (localAssets) {
        const assets = JSON.parse(localAssets);
        const asset = assets.find((a: any) => a.id === assetId);
        if (asset) return asset;
      }

      // 從服務實例查找
      const serviceAssets = assetTransactionSyncService.getAssets();
      const asset = serviceAssets.find((a: any) => a.id === assetId);
      return asset;
    } catch (error) {
      console.warn('⚠️ 無法獲取資產信息:', error);
      return null;
    }
  }

  /**
   * 刪除相關交易
   */
  private static async deleteRelatedTransactions(assetId: string): Promise<number> {
    try {
      let deletedCount = 0;

      // 從本地存儲獲取交易
      const localTransactions = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (localTransactions) {
        const transactions = JSON.parse(localTransactions);
        const relatedTransactions = transactions.filter((t: any) =>
          t.account === assetId ||
          t.fromAccount === assetId ||
          t.toAccount === assetId ||
          (t.description && t.description.includes(assetId))
        );

        // 刪除相關交易
        const remainingTransactions = transactions.filter((t: any) =>
          t.account !== assetId &&
          t.fromAccount !== assetId &&
          t.toAccount !== assetId &&
          !(t.description && t.description.includes(assetId))
        );

        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(remainingTransactions));
        deletedCount = relatedTransactions.length;

        // 從雲端刪除相關交易
        if (deletedCount > 0) {
          await this.deleteRelatedTransactionsFromCloud(assetId);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ 刪除相關交易失敗:', error);
      return 0;
    }
  }

  /**
   * 從雲端刪除相關交易
   */
  private static async deleteRelatedTransactionsFromCloud(assetId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .or(`account.eq.${assetId},from_account.eq.${assetId},to_account.eq.${assetId}`);

      console.log('✅ 雲端相關交易刪除成功');
    } catch (error) {
      console.error('❌ 雲端相關交易刪除失敗:', error);
    }
  }

  /**
   * 從本地存儲刪除
   */
  private static async deleteFromLocalStorage(assetId: string): Promise<boolean> {
    try {
      // 刪除資產
      const assetsData = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (assetsData) {
        const assets = JSON.parse(assetsData);
        const filteredAssets = assets.filter((asset: any) => asset.id !== assetId);
        await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(filteredAssets));
      }

      // 清除其他可能的存儲位置
      const storageKeys = [
        '@FinTranzo:assets',
        '@FinTranzo:cached_assets',
        '@FinTranzo:asset_cache',
        `@FinTranzo:asset_${assetId}`,
        `asset_${assetId}`,
        `cached_asset_${assetId}`
      ];

      for (const key of storageKeys) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          // 忽略不存在的鍵
        }
      }

      return true;
    } catch (error) {
      console.error('❌ 本地存儲刪除失敗:', error);
      return false;
    }
  }

  /**
   * 從雲端刪除
   */
  private static async deleteFromCloud(assetId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 用戶未登錄，跳過雲端刪除');
        return true; // 未登錄時視為成功
      }

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 雲端刪除失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ 雲端刪除異常:', error);
      return false;
    }
  }

  /**
   * 從緩存清除
   */
  private static async deleteFromCache(assetId: string): Promise<boolean> {
    try {
      // 清除瀏覽器 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const cacheKeys = [
          'assets',
          'cached_assets',
          'asset_cache',
          `asset_${assetId}`,
          `cached_asset_${assetId}`,
          'FinTranzo_assets',
          'FinTranzo_cached_assets'
        ];

        for (const key of cacheKeys) {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            // 忽略錯誤
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ 緩存清除失敗:', error);
      return false;
    }
  }

  /**
   * 從服務實例中移除
   */
  private static async deleteFromServices(assetId: string): Promise<boolean> {
    try {
      // 從 assetTransactionSyncService 移除
      await assetTransactionSyncService.deleteAsset(assetId);

      // 從 unifiedDataManager 移除
      await unifiedDataManager.deleteAsset(assetId);

      return true;
    } catch (error) {
      console.error('❌ 服務實例清除失敗:', error);
      return false;
    }
  }

  /**
   * 驗證刪除結果
   */
  private static async verifyDeletion(assetId: string): Promise<boolean> {
    try {
      // 檢查本地存儲
      const localAssets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (localAssets) {
        const assets = JSON.parse(localAssets);
        const stillExists = assets.some((asset: any) => asset.id === assetId);
        if (stillExists) {
          console.warn('⚠️ 資產仍存在於本地存儲中');
          return false;
        }
      }

      // 檢查服務實例
      const serviceAssets = assetTransactionSyncService.getAssets();
      const stillInService = serviceAssets.some((asset: any) => asset.id === assetId);
      if (stillInService) {
        console.warn('⚠️ 資產仍存在於服務實例中');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ 刪除驗證失敗:', error);
      return false;
    }
  }

  /**
   * 強制刷新所有服務
   */
  private static async forceRefreshServices(): Promise<void> {
    try {
      // 重新加載資產數據
      await assetTransactionSyncService.loadAssets();
      
      // 重新加載交易數據
      await assetTransactionSyncService.loadTransactions();

      console.log('🔄 所有服務已強制刷新');
    } catch (error) {
      console.error('❌ 服務刷新失敗:', error);
    }
  }
}

export default WebAssetDeleteService;
