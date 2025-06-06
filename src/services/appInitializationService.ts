/**
 * 應用初始化服務 - 確保所有服務在應用啟動時完成初始化
 */

import { transactionDataService, Transaction } from './transactionDataService';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { liabilityService } from './liabilityService';
import { automaticPaymentService } from './automaticPaymentService';
import { liabilityTransactionSyncService } from './liabilityTransactionSyncService';
import { startDailyUpdates } from '../utils/dailyUpdateScheduler';
import { dataResetService } from './dataResetService';

class AppInitializationService {
  private isInitialized = false;

  /**
   * 初始化所有服務
   */
  async initializeApp(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 開始初始化應用服務...');

    try {
      // 0. 檢查是否需要清除舊的預設數據
      await this.checkAndClearOldData();

      // 1. 初始化交易資料服務
      await this.initializeTransactionService();

      // 2. 初始化資產服務
      await assetTransactionSyncService.initialize();
      console.log('✅ 資產服務已初始化（空列表）');

      // 3. 初始化負債服務
      await liabilityService.initialize();
      console.log('✅ 負債服務已初始化（空列表）');

      // 4. 初始化自動還款服務
      automaticPaymentService.initialize();
      console.log('✅ 自動還款服務已初始化');

      // 5. 初始化負債循環交易同步服務
      await liabilityTransactionSyncService.initialize();
      console.log('✅ 負債循環交易同步服務已初始化');

      // 強制創建當月負債交易記錄
      await liabilityTransactionSyncService.forceCreateCurrentMonthTransactions();

      // 6. 啟動每日更新調度器
      await this.initializeDailyUpdateScheduler();

      this.isInitialized = true;
      console.log('🎉 所有服務初始化完成！帳戶已歸零');
    } catch (error) {
      console.error('❌ 服務初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查並清除舊的預設數據
   */
  private async checkAndClearOldData(): Promise<void> {
    try {
      // 檢查是否有舊數據
      const hasOldData = await dataResetService.hasOldData();

      if (hasOldData) {
        console.log('🔄 檢測到舊數據，正在清除預設數據...');
        await dataResetService.clearDefaultDataOnly();
        console.log('✅ 舊的預設數據已清除');
      } else {
        console.log('✅ 沒有檢測到舊數據');
      }
    } catch (error) {
      console.error('❌ 清除舊數據失敗:', error);
      // 不拋出錯誤，繼續初始化
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
