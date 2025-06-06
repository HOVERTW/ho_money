import AsyncStorage from '@react-native-async-storage/async-storage';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { liabilityService } from './liabilityService';
import { bankAccountService } from './bankAccountService';
import { transactionDataService } from './transactionDataService';
import { userProfileService } from './userProfileService';

/**
 * 數據重置服務
 * 用於清除所有預設數據，讓帳戶歸零
 */
class DataResetService {
  /**
   * 清除所有數據並重置為空狀態
   */
  async resetAllData(): Promise<void> {
    try {
      console.log('🔄 開始重置所有數據...');

      // 1. 清除交易數據服務
      await transactionDataService.clearAllData();
      console.log('✅ 交易數據已清除');

      // 2. 重置資產服務
      if (typeof assetTransactionSyncService.setAssets === 'function') {
        assetTransactionSyncService.setAssets([]);
        console.log('✅ 資產數據已清除');
      } else {
        console.log('⚠️ 資產服務 setAssets 方法不可用，跳過');
      }

      // 3. 重置負債服務
      liabilityService.setLiabilities([]);
      console.log('✅ 負債數據已清除');

      // 4. 重置銀行帳戶服務
      bankAccountService.resetToDefault();
      console.log('✅ 銀行帳戶已清除');

      // 5. 清除用戶資料中的相關存儲
      await this.clearUserDataStorage();
      console.log('✅ 用戶相關存儲已清除');

      // 6. 清除其他可能的存儲項目
      await this.clearOtherStorage();
      console.log('✅ 其他存儲項目已清除');

      console.log('🎉 所有數據重置完成！帳戶已歸零');
    } catch (error) {
      console.error('❌ 數據重置失敗:', error);
      throw error;
    }
  }

  /**
   * 清除用戶相關的存儲
   */
  private async clearUserDataStorage(): Promise<void> {
    try {
      const keysToRemove = [
        'user_profile',
        'financial_summary',
        'app_settings',
        'last_sync_time',
        'cached_data',
      ];

      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.error('❌ 清除用戶存儲失敗:', error);
    }
  }

  /**
   * 清除其他可能的存儲項目
   */
  private async clearOtherStorage(): Promise<void> {
    try {
      // 獲取所有存儲的鍵
      const allKeys = await AsyncStorage.getAllKeys();
      
      // 過濾出需要清除的鍵（保留系統設置）
      const keysToRemove = allKeys.filter(key => 
        !key.startsWith('system_') && 
        !key.startsWith('expo_') &&
        !key.startsWith('RCT') &&
        key !== 'expo-constants-installation-id'
      );

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`✅ 清除了 ${keysToRemove.length} 個存儲項目`);
      }
    } catch (error) {
      console.error('❌ 清除其他存儲失敗:', error);
    }
  }

  /**
   * 檢查是否有舊數據需要清除
   */
  async hasOldData(): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dataKeys = keys.filter(key => 
        key.includes('transaction') || 
        key.includes('asset') || 
        key.includes('liability') ||
        key.includes('account')
      );
      return dataKeys.length > 0;
    } catch (error) {
      console.error('❌ 檢查舊數據失敗:', error);
      return false;
    }
  }

  /**
   * 僅清除預設數據，保留用戶添加的數據
   */
  async clearDefaultDataOnly(): Promise<void> {
    try {
      console.log('🔄 開始清除預設數據...');

      // 獲取當前數據
      const currentAssets = assetTransactionSyncService.getAssets();
      const currentLiabilities = liabilityService.getLiabilities();
      const currentAccounts = transactionDataService.getAccounts();
      const currentTransactions = transactionDataService.getTransactions();

      // 過濾掉預設數據（根據ID或名稱識別）
      const filteredAssets = currentAssets.filter(asset =>
        !['1', '2', '3'].includes(asset.id) && // 預設資產ID
        !['現金', '銀行', '房地產'].includes(asset.name) // 預設資產名稱
      );

      const filteredAccounts = currentAccounts.filter(account =>
        !['1', '2'].includes(account.id) && // 預設帳戶ID
        !['現金', '銀行'].includes(account.name) // 預設帳戶名稱
      );

      // 過濾掉測試交易（根據描述和金額識別）
      const filteredTransactions = currentTransactions.filter(transaction => {
        // 檢查是否為測試交易
        const isTestTransaction = (
          (transaction.description === '餐飲' && transaction.amount === 5000) ||
          (transaction.description === '薪水' && transaction.amount === 30000) ||
          (transaction.category === '餐飲' && transaction.amount === 5000) ||
          (transaction.category === '薪水' && transaction.amount === 30000)
        );

        return !isTestTransaction; // 保留非測試交易
      });

      // 設置過濾後的數據
      if (typeof assetTransactionSyncService.setAssets === 'function') {
        assetTransactionSyncService.setAssets(filteredAssets);
      } else {
        console.log('⚠️ 資產服務 setAssets 方法不可用，跳過資產清除');
      }

      transactionDataService.setAccounts(filteredAccounts);
      transactionDataService.setTransactions(filteredTransactions);

      // 負債通常沒有預設數據，但為了保險起見也檢查一下
      const filteredLiabilities = currentLiabilities.filter(liability =>
        !liability.name.includes('預設') && !liability.name.includes('示例')
      );
      liabilityService.setLiabilities(filteredLiabilities);

      console.log('✅ 預設數據清除完成，用戶數據已保留');
    } catch (error) {
      console.error('❌ 清除預設數據失敗:', error);
      throw error;
    }
  }

  /**
   * 重新初始化所有服務
   */
  async reinitializeServices(): Promise<void> {
    try {
      console.log('🔄 重新初始化所有服務...');

      // 重新初始化交易數據服務
      await transactionDataService.initialize();

      console.log('✅ 所有服務重新初始化完成');
    } catch (error) {
      console.error('❌ 重新初始化服務失敗:', error);
      throw error;
    }
  }
}

// 創建單例實例
export const dataResetService = new DataResetService();
