/**
 * 時間戳記即時同步服務
 * 基於時間戳記的自動同步機制，登錄後自動啟用
 */

import { supabase, TABLES } from './supabase';
import { eventEmitter, EVENTS } from './eventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncItem {
  id: string;
  type: 'transaction' | 'asset' | 'liability' | 'account';
  data: any;
  timestamp: number;
  operation: 'create' | 'update' | 'delete';
}

interface SyncStatus {
  isEnabled: boolean;
  lastSyncTime: Date | null;
  pendingItems: number;
  isOnline: boolean;
}

class TimestampSyncService {
  private isEnabled = false;
  private userId: string | null = null;
  private syncQueue: SyncItem[] = [];
  private isProcessing = false;
  private syncStatus: SyncStatus = {
    isEnabled: false,
    lastSyncTime: null,
    pendingItems: 0,
    isOnline: true
  };

  private readonly SYNC_QUEUE_KEY = 'timestamp_sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';

  /**
   * 初始化服務
   */
  async initialize(): Promise<void> {
    try {
      console.log('🕐 初始化時間戳記同步服務...');
      
      // 檢查用戶登錄狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.enableSync(user.id);
      } else {
        console.log('📝 用戶未登錄，時間戳記同步服務待機');
      }

      // 監聽認證狀態變化
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.enableSync(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          await this.disableSync();
        }
      });

      console.log('✅ 時間戳記同步服務初始化完成');
    } catch (error) {
      console.error('❌ 時間戳記同步服務初始化失敗:', error);
    }
  }

  /**
   * 啟用同步
   */
  private async enableSync(userId: string): Promise<void> {
    try {
      console.log('🟢 啟用時間戳記即時同步，用戶ID:', userId);
      
      this.userId = userId;
      this.isEnabled = true;
      this.syncStatus.isEnabled = true;

      // 載入待同步隊列
      await this.loadSyncQueue();

      // 開始處理隊列
      this.startProcessing();

      // 通知狀態變化
      this.notifyStatusChange();

      console.log('✅ 時間戳記即時同步已啟用');
    } catch (error) {
      console.error('❌ 啟用時間戳記同步失敗:', error);
    }
  }

  /**
   * 禁用同步
   */
  private async disableSync(): Promise<void> {
    console.log('🔴 禁用時間戳記即時同步');
    
    this.isEnabled = false;
    this.userId = null;
    this.syncStatus.isEnabled = false;
    this.syncStatus.pendingItems = 0;

    // 保存待同步隊列
    await this.saveSyncQueue();

    // 通知狀態變化
    this.notifyStatusChange();
  }

  /**
   * 添加項目到同步隊列
   */
  async addToQueue(
    type: SyncItem['type'],
    data: any,
    operation: SyncItem['operation']
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('⚠️ 時間戳記同步未啟用，項目將在登錄後同步');
      return;
    }

    const syncItem: SyncItem = {
      id: data.id || `${type}_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      operation
    };

    this.syncQueue.push(syncItem);
    this.syncStatus.pendingItems = this.syncQueue.length;

    console.log(`⚡ 添加到同步隊列: ${operation} ${type} - ${syncItem.id}`);

    // 立即處理（如果沒有正在處理）
    if (!this.isProcessing) {
      this.startProcessing();
    }

    // 通知狀態變化
    this.notifyStatusChange();
  }

  /**
   * 開始處理同步隊列
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing || !this.isEnabled || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 開始處理同步隊列，共 ${this.syncQueue.length} 個項目`);

    while (this.syncQueue.length > 0 && this.isEnabled) {
      const item = this.syncQueue.shift();
      if (item) {
        await this.processSyncItem(item);
        this.syncStatus.pendingItems = this.syncQueue.length;
        this.notifyStatusChange();
      }
    }

    this.isProcessing = false;
    this.syncStatus.lastSyncTime = new Date();
    
    // 保存隊列狀態
    await this.saveSyncQueue();
    
    console.log('✅ 同步隊列處理完成');
  }

  /**
   * 處理單個同步項目
   */
  private async processSyncItem(item: SyncItem): Promise<void> {
    try {
      console.log(`🔄 處理同步項目: ${item.operation} ${item.type} - ${item.id}`);

      if (!this.userId) {
        throw new Error('用戶未登錄');
      }

      // 準備數據並格式化
      let dataWithUser = {
        ...item.data,
        user_id: this.userId,
        updated_at: new Date().toISOString()
      };

      // 特殊處理資產數據格式
      if (item.type === 'asset') {
        dataWithUser = this.formatAssetData(dataWithUser);
      }

      // 根據操作類型執行同步
      switch (item.operation) {
        case 'create':
        case 'update':
          await this.upsertItem(item.type, dataWithUser);
          break;
        case 'delete':
          await this.deleteItem(item.type, item.data.id);
          break;
      }

      console.log(`✅ 同步成功: ${item.operation} ${item.type} - ${item.id}`);
      
      // 發送成功事件
      eventEmitter.emit(EVENTS.SYNC_SUCCESS, {
        operation: `${item.operation} ${item.type}`,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ 同步失敗: ${item.operation} ${item.type} - ${item.id}`, error);
      
      // 發送錯誤事件
      eventEmitter.emit(EVENTS.SYNC_ERROR, {
        operation: `${item.operation} ${item.type}`,
        error,
        timestamp: new Date()
      });

      // 重新加入隊列（最多重試3次）
      if (!item.data._retryCount || item.data._retryCount < 3) {
        item.data._retryCount = (item.data._retryCount || 0) + 1;
        this.syncQueue.push(item);
        console.log(`🔄 重新加入隊列，重試次數: ${item.data._retryCount}`);
      }
    }
  }

  /**
   * 格式化資產數據以符合Supabase表結構
   */
  private formatAssetData(data: any): any {
    const formatted = { ...data };

    // 確保必需的字段存在
    if (!formatted.value && formatted.current_value) {
      formatted.value = Number(formatted.current_value);
    }
    if (!formatted.current_value && formatted.value) {
      formatted.current_value = Number(formatted.value);
    }
    if (!formatted.cost_basis && formatted.current_value) {
      formatted.cost_basis = Number(formatted.current_value);
    }

    // 確保數值字段為數字類型
    const numericFields = ['value', 'current_value', 'cost_basis', 'quantity', 'purchase_price', 'current_price', 'sort_order'];
    numericFields.forEach(field => {
      if (formatted[field] !== undefined && formatted[field] !== null) {
        formatted[field] = Number(formatted[field]) || 0;
      }
    });

    // 設置默認值
    if (!formatted.quantity) formatted.quantity = 1;
    if (!formatted.sort_order) formatted.sort_order = 0;

    // 確保必需字段不為空
    if (!formatted.name) formatted.name = '未命名資產';
    if (!formatted.type) formatted.type = 'other';
    if (!formatted.value) formatted.value = 0;

    console.log('🔧 資產數據格式化完成:', {
      id: formatted.id,
      name: formatted.name,
      type: formatted.type,
      value: formatted.value,
      current_value: formatted.current_value
    });

    return formatted;
  }

  /**
   * 插入或更新項目
   */
  private async upsertItem(type: SyncItem['type'], data: any): Promise<void> {
    const tableName = this.getTableName(type);

    const { error } = await supabase
      .from(tableName)
      .upsert(data, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  /**
   * 刪除項目
   */
  private async deleteItem(type: SyncItem['type'], id: string): Promise<void> {
    const tableName = this.getTableName(type);
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      throw error;
    }
  }

  /**
   * 獲取表名
   */
  private getTableName(type: SyncItem['type']): string {
    switch (type) {
      case 'transaction':
        return TABLES.TRANSACTIONS;
      case 'asset':
        return TABLES.ASSETS;
      case 'liability':
        return TABLES.LIABILITIES;
      case 'account':
        return TABLES.ACCOUNTS;
      default:
        throw new Error(`未知的同步類型: ${type}`);
    }
  }

  /**
   * 載入同步隊列
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        this.syncStatus.pendingItems = this.syncQueue.length;
        console.log(`📥 載入同步隊列，共 ${this.syncQueue.length} 個項目`);
      }
    } catch (error) {
      console.error('❌ 載入同步隊列失敗:', error);
    }
  }

  /**
   * 保存同步隊列
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ 保存同步隊列失敗:', error);
    }
  }

  /**
   * 通知狀態變化
   */
  private notifyStatusChange(): void {
    eventEmitter.emit(EVENTS.SYNC_STATUS_CHANGED, this.syncStatus);
  }

  /**
   * 獲取同步狀態
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 手動觸發同步
   */
  async triggerSync(): Promise<void> {
    if (!this.isEnabled) {
      console.log('⚠️ 時間戳記同步未啟用');
      return;
    }

    console.log('🔄 手動觸發同步...');
    await this.startProcessing();
  }

  /**
   * 清空同步隊列
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    this.syncStatus.pendingItems = 0;
    await this.saveSyncQueue();
    this.notifyStatusChange();
    console.log('🗑️ 同步隊列已清空');
  }
}

// 創建單例實例
export const timestampSyncService = new TimestampSyncService();
