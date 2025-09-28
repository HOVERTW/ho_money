/**
 * 統一同步管理器
 * 整合所有分散的同步服務，提供統一的同步接口
 */

import { supabase, TABLES } from './supabase';
import { generateUUID, isValidUUID, ensureValidUUID } from '../utils/uuid';
import { eventEmitter, EVENTS } from './eventEmitter';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AssetData {
  id: string;
  name: string;
  type: string;
  quantity: number;
  cost_basis: number;
  current_value: number;
  sort_order?: number;
  stock_code?: string;
  purchase_price?: number;
  current_price?: number;
  area?: number;
  price_per_ping?: number;
  current_price_per_ping?: number;
  buy_exchange_rate?: number;
  current_exchange_rate?: number;
  insurance_amount?: number;
}

class UnifiedSyncManager {
  private isInitialized = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔄 初始化統一同步管理器...');
    this.isInitialized = true;
    console.log('✅ 統一同步管理器初始化完成');
  }

  /**
   * 檢查用戶認證狀態
   */
  private async checkUserAuth(): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ 獲取用戶信息失敗:', error);
        return null;
      }
      return user?.id || null;
    } catch (error) {
      console.error('❌ 檢查用戶認證失敗:', error);
      return null;
    }
  }

  /**
   * 同步資產到Supabase（統一方法）
   */
  async syncAsset(asset: AssetData, operation: 'create' | 'update' | 'delete' = 'update'): Promise<SyncResult> {
    try {
      console.log(`🔄 統一同步管理器：${operation} 資產`, {
        name: asset.name,
        id: asset.id,
        type: asset.type
      });

      // 檢查用戶認證
      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return { success: true, message: '用戶未登錄，跳過同步' };
      }

      // 確保ID有效
      const assetId = ensureValidUUID(asset.id);
      if (assetId !== asset.id) {
        console.log(`🔄 為資產生成新的 UUID: ${assetId}`);
        asset.id = assetId;
      }

      if (operation === 'delete') {
        return await this.deleteAssetFromSupabase(assetId, userId);
      }

      // 準備Supabase格式的數據
      const supabaseAsset = {
        id: assetId,
        user_id: userId,
        name: asset.name || '未命名資產',
        type: asset.type || 'other',
        value: Number(asset.current_value || asset.cost_basis || 0),
        current_value: Number(asset.current_value || asset.cost_basis || 0),
        cost_basis: Number(asset.cost_basis || asset.current_value || 0),
        quantity: Number(asset.quantity || 1),
        stock_code: asset.stock_code || null,
        purchase_price: Number(asset.purchase_price || asset.cost_basis || 0),
        current_price: Number(asset.current_price || asset.current_value || asset.cost_basis || 0),
        sort_order: asset.sort_order || 0,
        area: asset.area || null,
        price_per_ping: asset.price_per_ping || null,
        current_price_per_ping: asset.current_price_per_ping || null,
        buy_exchange_rate: asset.buy_exchange_rate || null,
        current_exchange_rate: asset.current_exchange_rate || null,
        insurance_amount: asset.insurance_amount || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 準備同步的資產數據:', supabaseAsset);

      // 使用upsert進行插入或更新
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .upsert(supabaseAsset, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 資產同步失敗:', error);
        throw new Error(`資產同步失敗: ${error.message}`);
      }

      // 驗證同步結果
      const verifyResult = await this.verifyAssetSync(assetId, userId);
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || '資產同步驗證失敗');
      }

      console.log('✅ 資產同步成功:', data);
      
      // 發送同步成功事件
      eventEmitter.emit(EVENTS.SYNC_SUCCESS, {
        type: 'asset',
        operation,
        id: assetId,
        timestamp: new Date()
      });

      return {
        success: true,
        message: `資產${operation}同步成功`,
        data: data
      };

    } catch (error) {
      console.error(`❌ 資產${operation}同步失敗:`, error);
      
      // 發送同步失敗事件
      eventEmitter.emit(EVENTS.SYNC_ERROR, {
        type: 'asset',
        operation,
        error: error.message,
        timestamp: new Date()
      });

      return {
        success: false,
        message: `資產${operation}同步失敗`,
        error: error.message
      };
    }
  }

  /**
   * 從Supabase刪除資產
   */
  private async deleteAssetFromSupabase(assetId: string, userId: string): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from(TABLES.ASSETS)
        .delete()
        .eq('id', assetId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`刪除資產失敗: ${error.message}`);
      }

      console.log('✅ 資產已從雲端刪除:', assetId);
      return {
        success: true,
        message: '資產刪除同步成功'
      };

    } catch (error) {
      console.error('❌ 刪除資產失敗:', error);
      return {
        success: false,
        message: '資產刪除同步失敗',
        error: error.message
      };
    }
  }

  /**
   * 驗證資產同步結果
   */
  private async verifyAssetSync(assetId: string, userId: string): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .select('id, name, current_value')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: `驗證失敗: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: '同步後未找到資產數據'
        };
      }

      console.log('✅ 資產同步驗證成功:', data);
      return {
        success: true,
        message: '驗證成功',
        data
      };

    } catch (error) {
      return {
        success: false,
        error: `驗證異常: ${error.message}`
      };
    }
  }

  /**
   * 批量同步資產
   */
  async syncMultipleAssets(assets: AssetData[], operation: 'create' | 'update' = 'update'): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`🔄 批量同步 ${assets.length} 個資產...`);
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const asset of assets) {
      try {
        const result = await this.syncAsset(asset, operation);
        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(`${asset.name}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${asset.name}: ${error.message}`);
      }
    }

    console.log(`📊 批量同步完成: 成功 ${success}, 失敗 ${failed}`);
    return { success, failed, errors };
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.isInitialized = false;
    this.syncQueue = [];
    this.isProcessingQueue = false;
    console.log('🧹 統一同步管理器已清理');
  }
}

// 創建單例實例
export const unifiedSyncManager = new UnifiedSyncManager();
