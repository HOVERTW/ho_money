/**
 * 定時股票更新系統
 * 支援每日自動更新和手動觸發
 */

import { multiAPIStockSync } from './multiAPIStockSync';

class ScheduledStockUpdate {
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateDate: string | null = null;

  /**
   * 啟動定時更新
   */
  startScheduledUpdates(): void {
    console.log('⏰ 啟動定時股票更新系統...');
    
    // 檢查是否今天已經更新過
    this.checkAndRunDailyUpdate();
    
    // 設定每小時檢查一次
    this.updateInterval = setInterval(() => {
      this.checkAndRunDailyUpdate();
    }, 60 * 60 * 1000); // 每小時檢查

    console.log('✅ 定時更新系統已啟動');
  }

  /**
   * 停止定時更新
   */
  stopScheduledUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ 定時更新系統已停止');
    }
  }

  /**
   * 檢查並執行每日更新
   */
  private async checkAndRunDailyUpdate(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // 如果今天已經更新過，跳過
    if (this.lastUpdateDate === today) {
      return;
    }

    // 檢查是否在交易時間後（美東時間下午4點後）
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    
    // 只在美東時間下午4點後到晚上11點之間更新
    if (hour >= 16 && hour <= 23) {
      console.log('🕐 交易時間結束，開始每日更新...');
      
      try {
        await multiAPIStockSync.dailyUpdateTask();
        this.lastUpdateDate = today;
        
        // 記錄更新時間到本地存儲
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lastStockUpdate', today);
        }
        
        console.log('✅ 每日更新完成');
      } catch (error) {
        console.error('❌ 每日更新失敗:', error);
      }
    }
  }

  /**
   * 手動觸發更新
   */
  async manualUpdate(): Promise<void> {
    console.log('🔄 手動觸發股票更新...');
    
    try {
      await multiAPIStockSync.dailyUpdateTask();
      this.lastUpdateDate = new Date().toISOString().split('T')[0];
      
      console.log('✅ 手動更新完成');
    } catch (error) {
      console.error('❌ 手動更新失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取上次更新時間
   */
  getLastUpdateTime(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('lastStockUpdate');
    }
    return this.lastUpdateDate;
  }

  /**
   * 檢查是否需要更新
   */
  needsUpdate(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = this.getLastUpdateTime();
    
    return lastUpdate !== today;
  }
}

// 創建實例
export const scheduledStockUpdate = new ScheduledStockUpdate();

// 導出功能
export const startStockUpdateScheduler = () => scheduledStockUpdate.startScheduledUpdates();
export const stopStockUpdateScheduler = () => scheduledStockUpdate.stopScheduledUpdates();
export const manualStockUpdate = () => scheduledStockUpdate.manualUpdate();
export const checkUpdateStatus = () => ({
  lastUpdate: scheduledStockUpdate.getLastUpdateTime(),
  needsUpdate: scheduledStockUpdate.needsUpdate()
});
