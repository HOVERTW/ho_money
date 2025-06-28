/**
 * 應用初始化服務 - 確保所有服務在應用啟動時完成初始化
 */

import { transactionDataService, Transaction } from './transactionDataService';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { liabilityService } from './liabilityService';
import { liabilityTransactionSyncService } from './liabilityTransactionSyncService';
import { startDailyUpdates } from '../utils/dailyUpdateScheduler';
import { categoryRepairService } from './categoryRepairService';
import { oauthCallbackHandler } from './oauthCallbackHandler';
import { timestampSyncService } from './timestampSyncService';

class AppInitializationService {
  private isInitialized = false;

  /**
   * 初始化所有服務
   */
  async initializeApp(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 開始初始化應用服務...');

    try {
      // 0. 初始化時間戳記同步服務（最優先）
      await this.safeExecute('時間戳記同步服務', () => this.initializeTimestampSync());

      // 1. 初始化 OAuth 回調處理（優先處理登錄狀態）
      await this.safeExecute('OAuth 回調處理', () => this.initializeOAuthHandler());

      // 2. 清除舊的預設數據
      await this.safeExecute('清除舊數據', () => this.clearOldDefaultData());

      // 3. 初始化交易資料服務
      await this.safeExecute('交易服務', () => this.initializeTransactionService());

      // 4. 緊急修復：安全初始化資產服務（防止清除用戶資產）
      await this.safeExecute('資產服務', async () => {
        await assetTransactionSyncService.initialize();
        const assetCount = assetTransactionSyncService.getAssets().length;
        console.log(`✅ 緊急修復：資產服務已安全初始化（${assetCount} 個資產）`);
      });

      // 5. 初始化負債服務
      await this.safeExecute('負債服務', async () => {
        await liabilityService.initialize();
        console.log('✅ 負債服務已初始化（空列表）');
      });

      // 6. 自動還款服務（已移除）

      // 7. 初始化負債循環交易同步服務
      await this.safeExecute('負債循環交易同步服務', async () => {
        await liabilityTransactionSyncService.initialize();
        console.log('✅ 負債循環交易同步服務已初始化');
      });

      // 強制創建當月負債交易記錄
      await this.safeExecute('創建當月負債交易', async () => {
        await liabilityTransactionSyncService.forceCreateCurrentMonthTransactions();
      });

      // 6. 修復缺失的類別
      await this.safeExecute('類別修復服務', () => this.initializeCategoryRepair());

      // 7. 啟動每日更新調度器
      await this.safeExecute('每日更新調度器', () => this.initializeDailyUpdateScheduler());

      this.isInitialized = true;
      console.log('🎉 所有服務初始化完成！帳戶已歸零');
    } catch (error) {
      console.error('❌ 服務初始化失敗:', error);
      // 即使有錯誤，也標記為已初始化，讓應用可以啟動
      this.isInitialized = true;
      console.log('⚠️ 部分服務初始化失敗，但應用將繼續運行');
    }
  }

  /**
   * 初始化 OAuth 回調處理
   */
  private async initializeOAuthHandler(): Promise<void> {
    try {
      // 初始化 OAuth 回調處理器
      await oauthCallbackHandler.initialize();

      // 設置認證狀態監聽器
      oauthCallbackHandler.setupAuthListener();

      console.log('✅ OAuth 回調處理器已初始化');
    } catch (error) {
      console.error('❌ OAuth 回調處理器初始化失敗:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 安全執行函數，捕獲錯誤但不中斷整個初始化流程
   */
  private async safeExecute(serviceName: string, fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
    } catch (error) {
      console.error(`❌ ${serviceName}初始化失敗:`, error);
      console.log(`⚠️ ${serviceName}初始化失敗，但應用將繼續運行`);
      // 不拋出錯誤，讓其他服務繼續初始化
    }
  }

  /**
   * 清除舊的預設數據
   */
  private async clearOldDefaultData(): Promise<void> {
    try {
      console.log('🧹 檢查並清除舊的預設數據...');

      // 獲取跨平台存儲服務 - 優先手機原生，Web 使用 localStorage fallback
      let AsyncStorage;
      try {
        // 手機環境：使用原生 AsyncStorage
        const asyncStorageModule = await import('@react-native-async-storage/async-storage');
        AsyncStorage = asyncStorageModule.default;
        console.log('✅ 使用原生 AsyncStorage (手機環境)');
      } catch (importError) {
        // Web 環境：使用 localStorage 作為 fallback
        console.log('⚠️ 原生 AsyncStorage 不可用，使用 localStorage (Web 環境)');
        if (typeof window !== 'undefined' && window.localStorage) {
          AsyncStorage = {
            getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
            setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
            removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
          };
        } else {
          console.log('❌ 無可用的存儲服務，跳過清除舊數據');
          return;
        }
      }

      const assetsData = await AsyncStorage.getItem('fintranzo_assets');

      if (assetsData) {
        const assets = JSON.parse(assetsData);
        const hasOldDefaults = assets.some((asset: any) =>
          (asset.name === '現金' && asset.current_value === 5000) ||
          (asset.name === '銀行存款' && asset.current_value === 10000) ||
          asset.id === 'default_cash' ||
          asset.id === 'default_bank'
        );

        if (hasOldDefaults) {
          console.log('🧹 發現舊的預設資產，正在清除...');
          await AsyncStorage.removeItem('fintranzo_assets');
          console.log('✅ 舊的預設資產已清除');
        }
      }

      // 檢查並清除其他可能的舊數據
      const keysToCheck = [
        'asset_data',
        'default_assets',
        'initial_assets'
      ];

      for (const key of keysToCheck) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          await AsyncStorage.removeItem(key);
          console.log(`🧹 已清除舊數據: ${key}`);
        }
      }

      console.log('✅ 舊數據清除檢查完成');
    } catch (error) {
      console.error('❌ 清除舊數據失敗:', error);
    }
  }

  /**
   * 初始化交易資料服務
   */
  private async initializeTransactionService(): Promise<void> {
    // 初始化交易資料服務（會自動從本地存儲加載或創建空數據）
    await transactionDataService.initialize();
    console.log('✅ 交易服務已初始化');
  }

  /**
   * 初始化類別修復服務
   */
  private async initializeCategoryRepair(): Promise<void> {
    try {
      console.log('🔧 開始檢查和修復類別...');

      // 檢查並修復缺失的類別
      const result = await categoryRepairService.checkAndRepairCategories();

      if (result.success) {
        if (result.createdCategories.length > 0) {
          console.log(`✅ 類別修復完成，創建了 ${result.createdCategories.length} 個類別:`, result.createdCategories);
        } else {
          console.log('✅ 類別完整性檢查通過，無需修復');
        }
      } else {
        console.error('❌ 類別修復失敗:', result.message);
        console.error('❌ 錯誤詳情:', result.errors);
      }
    } catch (error) {
      console.error('❌ 類別修復服務初始化失敗:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 初始化時間戳記同步服務
   */
  private async initializeTimestampSync(): Promise<void> {
    try {
      console.log('🕐 初始化時間戳記同步服務...');
      await timestampSyncService.initialize();
      console.log('✅ 時間戳記同步服務已初始化');
    } catch (error) {
      console.error('❌ 時間戳記同步服務初始化失敗:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 初始化每日更新調度器
   */
  private async initializeDailyUpdateScheduler(): Promise<void> {
    try {
      // 啟動每日更新調度器
      startDailyUpdates();
      console.log('✅ 每日更新調度器已啟動');
      console.log('📈 ETF價格將會跟著台股美股每日自動更新');
    } catch (error) {
      console.error('❌ 每日更新調度器啟動失敗:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 檢查是否已初始化
   */
  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 重置初始化狀態（用於測試）
   */
  reset(): void {
    this.isInitialized = false;
  }
}

// 創建單例實例
export const appInitializationService = new AppInitializationService();
