/**
 * 即時同步服務
 * 提供快速的同步反饋和狀態更新
 */

import { supabase, TABLES } from './supabase';
import { eventEmitter, EVENTS } from './eventEmitter';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncInProgress: boolean;
}

class InstantSyncService {
  private syncStatus: SyncStatus = {
    isOnline: true,
    lastSyncTime: null,
    pendingOperations: 0,
    syncInProgress: false
  };

  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * 添加同步操作到隊列
   */
  async addToSyncQueue(operation: () => Promise<void>, description: string): Promise<void> {
    console.log(`⚡ 添加即時同步操作: ${description}`);
    
    this.syncStatus.pendingOperations++;
    this.notifySyncStatusChange();

    // 立即執行，不等待隊列
    try {
      this.syncStatus.syncInProgress = true;
      this.notifySyncStatusChange();

      await operation();
      
      console.log(`✅ 即時同步完成: ${description}`);
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingOperations = Math.max(0, this.syncStatus.pendingOperations - 1);
      
      // 立即通知 UI 更新
      eventEmitter.emit(EVENTS.SYNC_SUCCESS, {
        operation: description,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ 即時同步失敗: ${description}`, error);
      this.syncStatus.pendingOperations = Math.max(0, this.syncStatus.pendingOperations - 1);
      
      eventEmitter.emit(EVENTS.SYNC_ERROR, {
        operation: description,
        error: error,
        timestamp: new Date()
      });
    } finally {
      this.syncStatus.syncInProgress = false;
      this.notifySyncStatusChange();
    }
  }

  /**
   * 即時同步交易
   */
  async syncTransactionInstantly(transaction: any): Promise<void> {
    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      const supabaseTransaction = {
        id: transaction.id,
        user_id: user.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        account: transaction.account,
        date: transaction.date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .upsert(supabaseTransaction, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    }, `交易同步: ${transaction.description}`);
  }

  /**
   * 即時同步資產
   */
  async syncAssetInstantly(asset: any): Promise<void> {
    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      const supabaseAsset = {
        id: asset.id,
        user_id: user.id,
        name: asset.name,
        type: asset.type,
        value: asset.current_value || asset.cost_basis || 0,
        current_value: asset.current_value || asset.cost_basis || 0,
        cost_basis: asset.cost_basis || asset.current_value || 0,
        quantity: asset.quantity || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(TABLES.ASSETS)
        .upsert(supabaseAsset, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    }, `資產同步: ${asset.name}`);
  }

  /**
   * 即時刪除同步
   */
  async syncDeleteInstantly(table: string, id: string, description: string): Promise<void> {
    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }, `刪除同步: ${description}`);
  }

  /**
   * 檢查網絡連接狀態
   */
  async checkConnectionStatus(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id')
        .limit(1);
      
      this.syncStatus.isOnline = !error;
      this.notifySyncStatusChange();
      return this.syncStatus.isOnline;
    } catch (error) {
      this.syncStatus.isOnline = false;
      this.notifySyncStatusChange();
      return false;
    }
  }

  /**
   * 獲取同步狀態
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 通知同步狀態變化
   */
  private notifySyncStatusChange(): void {
    eventEmitter.emit(EVENTS.SYNC_STATUS_CHANGED, this.syncStatus);
  }

  /**
   * 強制刷新所有數據
   */
  async forceRefreshAll(): Promise<void> {
    console.log('⚡ 強制刷新所有數據...');
    
    // 立即發送刷新事件
    eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL);
    eventEmitter.emit(EVENTS.FORCE_REFRESH_DASHBOARD);
    eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
      type: 'force_refresh',
      timestamp: new Date()
    });

    console.log('✅ 強制刷新事件已發送');
  }

  /**
   * 批量同步操作（用於初始上傳）
   */
  async batchSync(operations: Array<{ operation: () => Promise<void>, description: string }>): Promise<void> {
    console.log(`⚡ 開始批量同步 ${operations.length} 個操作...`);
    
    const results = await Promise.allSettled(
      operations.map(({ operation, description }) => 
        this.addToSyncQueue(operation, description)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ 批量同步完成: ${successful} 成功, ${failed} 失敗`);
    
    // 批量同步完成後強制刷新
    await this.forceRefreshAll();
  }
}

// 創建單例實例
export const instantSyncService = new InstantSyncService();
