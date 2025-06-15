/**
 * 實時同步服務 - 完全重寫版本
 * 解決所有同步問題的最終方案
 */

import { supabase } from './supabase';

interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

class RealTimeSyncService {
  private isInitialized = false;
  private userId: string | null = null;

  /**
   * 初始化服務
   */
  async initialize(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
        this.isInitialized = true;
        console.log('✅ 實時同步服務已初始化，用戶ID:', this.userId);
      } else {
        console.log('⚠️ 用戶未登錄，實時同步服務未初始化');
      }
    } catch (error) {
      console.error('❌ 實時同步服務初始化失敗:', error);
    }
  }

  /**
   * 檢查服務是否可用
   */
  private checkAvailable(): boolean {
    if (!this.isInitialized || !this.userId) {
      console.log('⚠️ 實時同步服務不可用，用戶未登錄');
      return false;
    }
    return true;
  }

  /**
   * 同步交易到 Supabase
   */
  async syncTransaction(transaction: any): Promise<SyncResult> {
    if (!this.checkAvailable()) {
      return { success: false, error: '服務不可用' };
    }

    try {
      console.log('🔄 開始同步交易:', transaction.description);

      // 準備數據
      const transactionData = {
        id: transaction.id,
        user_id: this.userId,
        type: transaction.type,
        amount: Number(transaction.amount) || 0,
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

      console.log('📊 準備同步的交易數據:', transactionData);

      // 使用 upsert 確保數據同步
      const { data, error } = await supabase
        .from('transactions')
        .upsert(transactionData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 交易同步失敗:', error);
        return { success: false, error: error.message };
      }

      // 驗證同步結果
      const { data: verifyData, error: verifyError } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', transaction.id)
        .eq('user_id', this.userId)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 交易同步驗證失敗:', verifyError);
        return { success: false, error: '同步驗證失敗' };
      }

      console.log('✅ 交易同步成功:', transaction.description);
      return { success: true, data };

    } catch (error) {
      console.error('❌ 交易同步異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 同步資產到 Supabase
   */
  async syncAsset(asset: any): Promise<SyncResult> {
    if (!this.checkAvailable()) {
      return { success: false, error: '服務不可用' };
    }

    try {
      console.log('🔄 開始同步資產:', asset.name);

      // 準備數據
      const assetData = {
        id: asset.id,
        user_id: this.userId,
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

      console.log('📊 準備同步的資產數據:', assetData);

      // 使用 upsert 確保數據同步
      const { data, error } = await supabase
        .from('assets')
        .upsert(assetData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 資產同步失敗:', error);
        return { success: false, error: error.message };
      }

      // 驗證同步結果
      const { data: verifyData, error: verifyError } = await supabase
        .from('assets')
        .select('id')
        .eq('id', asset.id)
        .eq('user_id', this.userId)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 資產同步驗證失敗:', verifyError);
        return { success: false, error: '同步驗證失敗' };
      }

      console.log('✅ 資產同步成功:', asset.name);
      return { success: true, data };

    } catch (error) {
      console.error('❌ 資產同步異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 同步負債到 Supabase
   */
  async syncLiability(liability: any): Promise<SyncResult> {
    if (!this.checkAvailable()) {
      return { success: false, error: '服務不可用' };
    }

    try {
      console.log('🔄 開始同步負債:', liability.name);

      // 準備數據
      const liabilityData = {
        id: liability.id,
        user_id: this.userId,
        name: liability.name || '未命名負債',
        type: liability.type || 'credit_card',
        amount: Number(liability.amount || liability.balance || 0),
        current_amount: Number(liability.current_amount || liability.balance || 0),
        interest_rate: Number(liability.interest_rate || 0),
        due_date: liability.due_date || null,
        minimum_payment: Number(liability.minimum_payment || 0),
        description: liability.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📊 準備同步的負債數據:', liabilityData);

      // 使用 upsert 確保數據同步
      const { data, error } = await supabase
        .from('liabilities')
        .upsert(liabilityData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 負債同步失敗:', error);
        return { success: false, error: error.message };
      }

      // 驗證同步結果
      const { data: verifyData, error: verifyError } = await supabase
        .from('liabilities')
        .select('id')
        .eq('id', liability.id)
        .eq('user_id', this.userId)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ 負債同步驗證失敗:', verifyError);
        return { success: false, error: '同步驗證失敗' };
      }

      console.log('✅ 負債同步成功:', liability.name);
      return { success: true, data };

    } catch (error) {
      console.error('❌ 負債同步異常:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 刪除數據
   */
  async deleteData(table: string, id: string): Promise<SyncResult> {
    if (!this.checkAvailable()) {
      return { success: false, error: '服務不可用' };
    }

    try {
      console.log(`🔄 開始刪除 ${table} 數據:`, id);

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error(`❌ ${table} 刪除失敗:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ ${table} 刪除成功:`, id);
      return { success: true };

    } catch (error) {
      console.error(`❌ ${table} 刪除異常:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量同步所有數據
   */
  async syncAllData(data: {
    transactions?: any[];
    assets?: any[];
    liabilities?: any[];
  }): Promise<{
    transactions: SyncResult;
    assets: SyncResult;
    liabilities: SyncResult;
  }> {
    console.log('🔄 開始批量同步所有數據...');

    const results = {
      transactions: { success: true } as SyncResult,
      assets: { success: true } as SyncResult,
      liabilities: { success: true } as SyncResult
    };

    // 同步交易
    if (data.transactions && data.transactions.length > 0) {
      console.log(`🔄 同步 ${data.transactions.length} 筆交易...`);
      for (const transaction of data.transactions) {
        const result = await this.syncTransaction(transaction);
        if (!result.success) {
          results.transactions = result;
          break;
        }
      }
    }

    // 同步資產
    if (data.assets && data.assets.length > 0) {
      console.log(`🔄 同步 ${data.assets.length} 個資產...`);
      for (const asset of data.assets) {
        const result = await this.syncAsset(asset);
        if (!result.success) {
          results.assets = result;
          break;
        }
      }
    }

    // 同步負債
    if (data.liabilities && data.liabilities.length > 0) {
      console.log(`🔄 同步 ${data.liabilities.length} 個負債...`);
      for (const liability of data.liabilities) {
        const result = await this.syncLiability(liability);
        if (!result.success) {
          results.liabilities = result;
          break;
        }
      }
    }

    console.log('✅ 批量同步完成');
    return results;
  }
}

export const realTimeSyncService = new RealTimeSyncService();
