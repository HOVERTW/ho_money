/**
 * 增強的 Supabase 服務
 * 整合連接管理器，解決連接斷開問題
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConnectionManager } from './supabaseConnectionManager';
import { TABLES } from './supabase';

class EnhancedSupabaseService {
  private client: SupabaseClient | null = null;
  private isInitialized = false;

  /**
   * 初始化服務
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 初始化增強 Supabase 服務...');
      
      this.client = await supabaseConnectionManager.initialize();
      this.isInitialized = true;

      // 添加連接狀態監聽器
      supabaseConnectionManager.addConnectionListener((connected) => {
        if (connected) {
          console.log('✅ Supabase 連接已恢復');
        } else {
          console.warn('⚠️ Supabase 連接已斷開');
        }
      });

      console.log('✅ 增強 Supabase 服務初始化完成');
    } catch (error) {
      console.error('❌ 增強 Supabase 服務初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取客戶端實例
   */
  private getClient(): SupabaseClient {
    if (!this.client || !this.isInitialized) {
      throw new Error('Supabase 服務未初始化，請先調用 initialize()');
    }
    return this.client;
  }

  /**
   * 檢查連接狀態
   */
  isConnected(): boolean {
    return supabaseConnectionManager.isConnected();
  }

  /**
   * 強制重連
   */
  async forceReconnect(): Promise<void> {
    await supabaseConnectionManager.forceReconnect();
  }

  /**
   * 安全執行數據庫操作
   */
  private async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 檢查連接狀態
        if (!this.isConnected()) {
          console.warn(`⚠️ ${operationName} - 連接已斷開，嘗試重連...`);
          await this.forceReconnect();
        }

        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ ${operationName} - 重試成功 (第 ${attempt} 次嘗試)`);
        }
        
        return result;
      } catch (error) {
        console.error(`❌ ${operationName} - 第 ${attempt} 次嘗試失敗:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error(`${operationName} - 所有重試都失敗`);
  }

  /**
   * 創建記錄
   */
  async create(table: string, data: any): Promise<{ data: any; error: any }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      const result = await client.from(table).insert(data).select();
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    }, `創建 ${table} 記錄`);
  }

  /**
   * 讀取記錄
   */
  async read(table: string, query?: any): Promise<{ data: any; error: any }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      let queryBuilder = client.from(table).select('*');
      
      if (query) {
        Object.keys(query).forEach(key => {
          queryBuilder = queryBuilder.eq(key, query[key]);
        });
      }
      
      const result = await queryBuilder;
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    }, `讀取 ${table} 記錄`);
  }

  /**
   * 更新記錄
   */
  async update(table: string, id: string, data: any): Promise<{ data: any; error: any }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      const result = await client
        .from(table)
        .update(data)
        .eq('id', id)
        .select();
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    }, `更新 ${table} 記錄`);
  }

  /**
   * 刪除記錄
   */
  async delete(table: string, id: string): Promise<{ data: any; error: any }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      const result = await client
        .from(table)
        .delete()
        .eq('id', id);
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    }, `刪除 ${table} 記錄`);
  }

  /**
   * Upsert 記錄
   */
  async upsert(table: string, data: any): Promise<{ data: any; error: any }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      const result = await client
        .from(table)
        .upsert(data, { onConflict: 'id' })
        .select();
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    }, `Upsert ${table} 記錄`);
  }

  /**
   * 批量操作
   */
  async batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete' | 'upsert';
    table: string;
    data?: any;
    id?: string;
  }>): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            await this.create(operation.table, operation.data);
            break;
          case 'update':
            await this.update(operation.table, operation.id!, operation.data);
            break;
          case 'delete':
            await this.delete(operation.table, operation.id!);
            break;
          case 'upsert':
            await this.upsert(operation.table, operation.data);
            break;
        }
        success++;
      } catch (error) {
        failed++;
        errors.push({
          operation,
          error: error.message
        });
      }
    }

    console.log(`📊 批量操作完成: 成功 ${success}, 失敗 ${failed}`);
    return { success, failed, errors };
  }

  /**
   * 獲取用戶數據
   */
  async getUserData(userId: string): Promise<{
    transactions: any[];
    assets: any[];
    categories: any[];
    accounts: any[];
  }> {
    return this.safeExecute(async () => {
      const client = this.getClient();
      
      const [transactions, assets, categories, accounts] = await Promise.all([
        client.from(TABLES.TRANSACTIONS).select('*').eq('user_id', userId),
        client.from(TABLES.ASSETS).select('*').eq('user_id', userId),
        client.from(TABLES.CATEGORIES).select('*').eq('user_id', userId),
        client.from(TABLES.ACCOUNTS).select('*').eq('user_id', userId),
      ]);

      return {
        transactions: transactions.data || [],
        assets: assets.data || [],
        categories: categories.data || [],
        accounts: accounts.data || [],
      };
    }, '獲取用戶數據');
  }

  /**
   * 同步本地數據到雲端
   */
  async syncLocalDataToCloud(localData: {
    transactions: any[];
    assets: any[];
    categories: any[];
    accounts: any[];
  }, userId: string): Promise<{
    success: boolean;
    synced: { transactions: number; assets: number; categories: number; accounts: number };
    errors: any[];
  }> {
    const synced = { transactions: 0, assets: 0, categories: 0, accounts: 0 };
    const errors: any[] = [];

    try {
      // 同步交易
      for (const transaction of localData.transactions) {
        try {
          await this.upsert(TABLES.TRANSACTIONS, { ...transaction, user_id: userId });
          synced.transactions++;
        } catch (error) {
          errors.push({ type: 'transaction', id: transaction.id, error: error.message });
        }
      }

      // 同步資產
      for (const asset of localData.assets) {
        try {
          await this.upsert(TABLES.ASSETS, { ...asset, user_id: userId });
          synced.assets++;
        } catch (error) {
          errors.push({ type: 'asset', id: asset.id, error: error.message });
        }
      }

      // 同步類別
      for (const category of localData.categories) {
        try {
          await this.upsert(TABLES.CATEGORIES, { ...category, user_id: userId });
          synced.categories++;
        } catch (error) {
          errors.push({ type: 'category', id: category.id, error: error.message });
        }
      }

      // 同步帳戶
      for (const account of localData.accounts) {
        try {
          await this.upsert(TABLES.ACCOUNTS, { ...account, user_id: userId });
          synced.accounts++;
        } catch (error) {
          errors.push({ type: 'account', id: account.id, error: error.message });
        }
      }

      const success = errors.length === 0;
      console.log(`📊 數據同步完成:`, { success, synced, errorCount: errors.length });

      return { success, synced, errors };
    } catch (error) {
      console.error('❌ 數據同步失敗:', error);
      return {
        success: false,
        synced,
        errors: [{ type: 'general', error: error.message }]
      };
    }
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    supabaseConnectionManager.cleanup();
    this.client = null;
    this.isInitialized = false;
  }
}

// 創建單例實例
export const enhancedSupabaseService = new EnhancedSupabaseService();
