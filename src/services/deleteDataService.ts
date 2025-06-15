/**
 * 刪除數據服務
 * 處理所有數據的安全刪除和同步
 */

import { supabase } from './supabase';
import { enhancedSupabaseService } from './enhancedSupabaseService';
import { supabaseConnectionManager } from './supabaseConnectionManager';
import { UUIDService } from './uuidService';

export interface DeleteResult {
  success: boolean;
  deletedId: string;
  affectedRecords: number;
  syncedToCloud: boolean;
  error?: string;
}

export interface BulkDeleteResult {
  success: boolean;
  totalRequested: number;
  successfulDeletes: number;
  failedDeletes: number;
  deletedIds: string[];
  errors: Array<{ id: string; error: string }>;
}

class DeleteDataService {
  
  /**
   * 刪除單筆交易
   */
  async deleteTransaction(transactionId: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ 刪除交易: ${transactionId}`);

      // 檢查連接狀態
      if (!supabaseConnectionManager.isConnected()) {
        console.warn('⚠️ Supabase 連接斷開，嘗試重連...');
        await supabaseConnectionManager.forceReconnect();
      }

      // 使用增強服務進行刪除
      const result = await enhancedSupabaseService.delete('transactions', transactionId);

      if (result.error) {
        console.error(`❌ 刪除交易失敗: ${result.error.message}`);
        return {
          success: false,
          deletedId: transactionId,
          affectedRecords: 0,
          syncedToCloud: false,
          error: result.error.message
        };
      }

      console.log(`✅ 交易刪除成功: ${transactionId}`);
      
      return {
        success: true,
        deletedId: transactionId,
        affectedRecords: 1,
        syncedToCloud: true
      };

    } catch (error) {
      console.error(`❌ 刪除交易異常: ${error.message}`);
      return {
        success: false,
        deletedId: transactionId,
        affectedRecords: 0,
        syncedToCloud: false,
        error: error.message
      };
    }
  }

  /**
   * 刪除單個資產
   */
  async deleteAsset(assetId: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ 刪除資產: ${assetId}`);

      // 檢查連接狀態
      if (!supabaseConnectionManager.isConnected()) {
        await supabaseConnectionManager.forceReconnect();
      }

      // 使用增強服務進行刪除
      const result = await enhancedSupabaseService.delete('assets', assetId);

      if (result.error) {
        console.error(`❌ 刪除資產失敗: ${result.error.message}`);
        return {
          success: false,
          deletedId: assetId,
          affectedRecords: 0,
          syncedToCloud: false,
          error: result.error.message
        };
      }

      console.log(`✅ 資產刪除成功: ${assetId}`);
      
      return {
        success: true,
        deletedId: assetId,
        affectedRecords: 1,
        syncedToCloud: true
      };

    } catch (error) {
      console.error(`❌ 刪除資產異常: ${error.message}`);
      return {
        success: false,
        deletedId: assetId,
        affectedRecords: 0,
        syncedToCloud: false,
        error: error.message
      };
    }
  }

  /**
   * 批量刪除交易
   */
  async bulkDeleteTransactions(transactionIds: string[]): Promise<BulkDeleteResult> {
    try {
      console.log(`🗑️ 批量刪除交易: ${transactionIds.length} 筆`);

      const deletedIds: string[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const transactionId of transactionIds) {
        const result = await this.deleteTransaction(transactionId);
        
        if (result.success) {
          deletedIds.push(transactionId);
        } else {
          errors.push({
            id: transactionId,
            error: result.error || '未知錯誤'
          });
        }
      }

      const successfulDeletes = deletedIds.length;
      const failedDeletes = errors.length;
      const success = failedDeletes === 0;

      console.log(`📊 批量刪除結果: 成功 ${successfulDeletes}, 失敗 ${failedDeletes}`);

      return {
        success,
        totalRequested: transactionIds.length,
        successfulDeletes,
        failedDeletes,
        deletedIds,
        errors
      };

    } catch (error) {
      console.error(`❌ 批量刪除交易異常: ${error.message}`);
      return {
        success: false,
        totalRequested: transactionIds.length,
        successfulDeletes: 0,
        failedDeletes: transactionIds.length,
        deletedIds: [],
        errors: transactionIds.map(id => ({ id, error: error.message }))
      };
    }
  }

  /**
   * 安全刪除（移到垃圾桶）
   */
  async safeDeleteTransaction(transactionId: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ 安全刪除交易（移到垃圾桶）: ${transactionId}`);

      // 標記為已刪除而不是真正刪除
      const updateData = {
        deleted_at: new Date().toISOString(),
        is_deleted: true,
        updated_at: new Date().toISOString()
      };

      const result = await enhancedSupabaseService.update('transactions', transactionId, updateData);

      if (result.error) {
        console.error(`❌ 安全刪除失敗: ${result.error.message}`);
        return {
          success: false,
          deletedId: transactionId,
          affectedRecords: 0,
          syncedToCloud: false,
          error: result.error.message
        };
      }

      console.log(`✅ 交易已移到垃圾桶: ${transactionId}`);
      
      return {
        success: true,
        deletedId: transactionId,
        affectedRecords: 1,
        syncedToCloud: true
      };

    } catch (error) {
      console.error(`❌ 安全刪除異常: ${error.message}`);
      return {
        success: false,
        deletedId: transactionId,
        affectedRecords: 0,
        syncedToCloud: false,
        error: error.message
      };
    }
  }

  /**
   * 恢復已刪除的交易
   */
  async restoreTransaction(transactionId: string): Promise<DeleteResult> {
    try {
      console.log(`♻️ 恢復交易: ${transactionId}`);

      const updateData = {
        deleted_at: null,
        is_deleted: false,
        updated_at: new Date().toISOString()
      };

      const result = await enhancedSupabaseService.update('transactions', transactionId, updateData);

      if (result.error) {
        console.error(`❌ 恢復交易失敗: ${result.error.message}`);
        return {
          success: false,
          deletedId: transactionId,
          affectedRecords: 0,
          syncedToCloud: false,
          error: result.error.message
        };
      }

      console.log(`✅ 交易已恢復: ${transactionId}`);
      
      return {
        success: true,
        deletedId: transactionId,
        affectedRecords: 1,
        syncedToCloud: true
      };

    } catch (error) {
      console.error(`❌ 恢復交易異常: ${error.message}`);
      return {
        success: false,
        deletedId: transactionId,
        affectedRecords: 0,
        syncedToCloud: false,
        error: error.message
      };
    }
  }

  /**
   * 永久刪除垃圾桶中的交易
   */
  async permanentDeleteTransaction(transactionId: string): Promise<DeleteResult> {
    try {
      console.log(`🔥 永久刪除交易: ${transactionId}`);

      // 真正從數據庫中刪除
      const result = await this.deleteTransaction(transactionId);

      if (result.success) {
        console.log(`✅ 交易已永久刪除: ${transactionId}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ 永久刪除異常: ${error.message}`);
      return {
        success: false,
        deletedId: transactionId,
        affectedRecords: 0,
        syncedToCloud: false,
        error: error.message
      };
    }
  }

  /**
   * 清空垃圾桶
   */
  async emptyTrash(userId: string): Promise<BulkDeleteResult> {
    try {
      console.log(`🗑️ 清空用戶垃圾桶: ${userId}`);

      // 獲取垃圾桶中的所有交易
      const { data: trashedTransactions, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_deleted', true);

      if (error) {
        throw new Error(error.message);
      }

      if (!trashedTransactions || trashedTransactions.length === 0) {
        console.log('📭 垃圾桶為空');
        return {
          success: true,
          totalRequested: 0,
          successfulDeletes: 0,
          failedDeletes: 0,
          deletedIds: [],
          errors: []
        };
      }

      const transactionIds = trashedTransactions.map(t => t.id);
      
      // 批量永久刪除
      const result = await this.bulkDeleteTransactions(transactionIds);

      console.log(`✅ 垃圾桶已清空: ${result.successfulDeletes} 筆交易永久刪除`);

      return result;

    } catch (error) {
      console.error(`❌ 清空垃圾桶異常: ${error.message}`);
      return {
        success: false,
        totalRequested: 0,
        successfulDeletes: 0,
        failedDeletes: 0,
        deletedIds: [],
        errors: [{ id: 'trash', error: error.message }]
      };
    }
  }

  /**
   * 獲取垃圾桶中的交易
   */
  async getTrashTransactions(userId: string): Promise<any[]> {
    try {
      console.log(`📋 獲取垃圾桶交易: ${userId}`);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error(`❌ 獲取垃圾桶交易失敗: ${error.message}`);
        return [];
      }

      console.log(`📊 垃圾桶交易數量: ${data?.length || 0}`);
      return data || [];

    } catch (error) {
      console.error(`❌ 獲取垃圾桶交易異常: ${error.message}`);
      return [];
    }
  }
}

// 創建單例實例
export const deleteDataService = new DeleteDataService();
