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
    console.log(`⚡ 開始即時同步操作: ${description}`);

    this.syncStatus.pendingOperations++;
    this.notifySyncStatusChange();

    // 立即執行，不等待隊列
    try {
      this.syncStatus.syncInProgress = true;
      this.notifySyncStatusChange();

      // 執行操作，操作內部會進行驗證並記錄真實結果
      await operation();

      // 只有操作成功完成（沒有拋出異常）才記錄成功
      console.log(`✅ 即時同步操作執行完成: ${description}`);
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingOperations = Math.max(0, this.syncStatus.pendingOperations - 1);

      // 立即通知 UI 更新
      eventEmitter.emit(EVENTS.SYNC_SUCCESS, {
        operation: description,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ 即時同步操作失敗: ${description}`, error);
      console.error(`❌ 錯誤詳情:`, error.message);
      this.syncStatus.pendingOperations = Math.max(0, this.syncStatus.pendingOperations - 1);

      eventEmitter.emit(EVENTS.SYNC_ERROR, {
        operation: description,
        error: error,
        timestamp: new Date()
      });

      // 重新拋出錯誤，讓調用者知道操作失敗
      throw error;
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
        amount: Number(transaction.amount) || 0,
        type: transaction.type,
        description: transaction.description || '',
        category: transaction.category || '',
        account: transaction.account || '',
        from_account: transaction.fromAccount || null,
        to_account: transaction.toAccount || null,
        date: transaction.date || new Date().toISOString().split('T')[0],
        is_recurring: Boolean(transaction.is_recurring),
        recurring_frequency: transaction.recurring_frequency || null,
        max_occurrences: transaction.max_occurrences || null,
        start_date: transaction.start_date || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 執行 upsert 操作
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .upsert(supabaseTransaction, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 交易同步失敗:', error);
        throw error;
      }

      // 驗證數據是否真的插入/更新成功
      const { data: verifyData, error: verifyError } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('id')
        .eq('id', transaction.id)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 交易同步驗證失敗:', verifyError);
        throw new Error('交易同步後驗證失敗');
      }

      console.log('✅ 交易同步驗證成功:', transaction.id);
    }, `交易同步: ${transaction.description}`);
  }

  /**
   * 終極修復：禁用即時同步資產（防止重複上傳）
   */
  async syncAssetInstantly(asset: any): Promise<void> {
    console.log('🚫 終極修復：即時資產同步已禁用，防止重複上傳:', asset.name);
    return; // 終極修復：完全禁用即時同步

    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      const supabaseAsset = {
        id: asset.id,
        user_id: user.id,
        name: asset.name || '未命名資產',
        asset_name: asset.name || '未命名資產', // 備用字段
        type: asset.type || 'bank',
        value: Number(asset.current_value || asset.cost_basis || 0),
        current_value: Number(asset.current_value || asset.cost_basis || 0),
        cost_basis: Number(asset.cost_basis || asset.current_value || 0),
        quantity: Number(asset.quantity || 1),
        stock_code: asset.stock_code || null,
        purchase_price: Number(asset.purchase_price || 0),
        current_price: Number(asset.current_price || 0),
        sort_order: Number(asset.sort_order || 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 執行 upsert 操作
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .upsert(supabaseAsset, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 資產同步失敗:', error);
        throw error;
      }

      // 驗證數據是否真的插入/更新成功
      const { data: verifyData, error: verifyError } = await supabase
        .from(TABLES.ASSETS)
        .select('id')
        .eq('id', asset.id)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 資產同步驗證失敗:', verifyError);
        throw new Error('資產同步後驗證失敗');
      }

      console.log('✅ 資產同步驗證成功:', asset.id);
    }, `資產同步: ${asset.name}`);
  }

  /**
   * 終極修復：禁用即時同步負債（防止重複上傳）
   */
  async syncLiabilityInstantly(liability: any): Promise<void> {
    console.log('🚫 終極修復：即時負債同步已禁用，防止重複上傳:', liability.name);
    return; // 終極修復：完全禁用即時同步

    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      const supabaseLiability = {
        id: liability.id,
        user_id: user.id,
        name: liability.name || '未命名負債',
        type: liability.type || 'credit_card',
        amount: Number(liability.amount || 0),
        current_amount: Number(liability.current_amount || liability.amount || 0),
        interest_rate: Number(liability.interest_rate || 0),
        due_date: liability.due_date || null,
        minimum_payment: Number(liability.minimum_payment || 0),
        description: liability.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 執行 upsert 操作
      const { data, error } = await supabase
        .from('liabilities')
        .upsert(supabaseLiability, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 負債同步失敗:', error);
        throw error;
      }

      // 驗證數據是否真的插入/更新成功
      const { data: verifyData, error: verifyError } = await supabase
        .from('liabilities')
        .select('id')
        .eq('id', liability.id)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 負債同步驗證失敗:', verifyError);
        throw new Error('負債同步後驗證失敗');
      }

      console.log('✅ 負債同步驗證成功:', liability.id);
    }, `負債同步: ${liability.name}`);
  }

  /**
   * 即時刪除同步
   */
  async syncDeleteInstantly(table: string, id: string, description: string): Promise<void> {
    await this.addToSyncQueue(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用戶未登錄');

      // 先檢查記錄是否存在
      const { data: beforeDelete, error: checkError } = await supabase
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ 刪除前檢查失敗:', checkError);
        throw checkError;
      }

      if (!beforeDelete) {
        console.log('⚠️ 記錄不存在，無需刪除:', id);
        return;
      }

      // 執行刪除操作
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 刪除操作失敗:', error);
        throw error;
      }

      // 驗證記錄是否真的被刪除
      const { data: afterDelete, error: verifyError } = await supabase
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (verifyError && verifyError.code === 'PGRST116') {
        // PGRST116 表示沒有找到記錄，這是我們期望的結果
        console.log('✅ 刪除同步驗證成功:', id);
      } else if (afterDelete) {
        console.error('❌ 刪除驗證失敗，記錄仍然存在:', id);
        throw new Error('刪除後驗證失敗，記錄仍然存在');
      }
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
