/**
 * 統一數據管理服務 - 全新思路解決上傳和刪除問題
 * 
 * 設計原則：
 * 1. 單一職責：一個服務處理所有數據操作
 * 2. 原子性：確保本地和雲端操作同步
 * 3. 簡單直接：不使用複雜的服務層包裝
 * 4. 錯誤透明：直接暴露真實錯誤信息
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

interface DataResult {
  success: boolean;
  data?: any;
  error?: string;
  details?: any;
}

interface SyncResult {
  uploaded: number;
  deleted: number;
  errors: string[];
}

class UnifiedDataManager {
  private static instance: UnifiedDataManager;
  
  // 本地數據緩存
  private transactions: any[] = [];
  private assets: any[] = [];
  private liabilities: any[] = [];
  
  // 監聽器
  private listeners: Array<() => void> = [];

  static getInstance(): UnifiedDataManager {
    if (!UnifiedDataManager.instance) {
      UnifiedDataManager.instance = new UnifiedDataManager();
    }
    return UnifiedDataManager.instance;
  }

  /**
   * 初始化服務
   */
  async initialize(): Promise<void> {
    console.log('🚀 統一數據管理器初始化...');
    
    try {
      // 從本地存儲載入數據
      await this.loadFromLocalStorage();
      
      // 檢查用戶登錄狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ 用戶已登錄，準備同步數據');
        // 不自動同步，等待手動觸發
      } else {
        console.log('📝 用戶未登錄，僅使用本地數據');
      }
      
      console.log('✅ 統一數據管理器初始化完成');
    } catch (error) {
      console.error('❌ 統一數據管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 從本地存儲載入數據
   */
  private async loadFromLocalStorage(): Promise<void> {
    try {
      // 🔧 修復：從各個服務加載最新數據，而不是直接從 AsyncStorage
      const { transactionDataService } = await import('./transactionDataService');
      const { assetTransactionSyncService } = await import('./assetTransactionSyncService');
      const { liabilityService } = await import('./liabilityService');

      // 確保服務已初始化
      await transactionDataService.ensureInitialized();

      // 從服務獲取最新數據
      this.transactions = transactionDataService.getTransactions();
      this.assets = assetTransactionSyncService.getAssets();
      this.liabilities = liabilityService.getLiabilities();

      console.log(`📱 本地數據載入完成: 交易${this.transactions.length}筆, 資產${this.assets.length}筆, 負債${this.liabilities.length}筆`);

      // 🔧 修復：顯示負債循環交易的詳細信息
      const debtPaymentTransactions = this.transactions.filter(t => t.category === '還款');
      console.log(`💳 負債循環交易: ${debtPaymentTransactions.length}筆`);
      debtPaymentTransactions.forEach(t => {
        console.log(`  - ${t.description}: ${t.amount} (${t.account})`);
      });

    } catch (error) {
      console.error('❌ 本地數據載入失敗:', error);
      // 初始化為空數組
      this.transactions = [];
      this.assets = [];
      this.liabilities = [];
    }
  }

  /**
   * 保存到本地存儲
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(this.transactions)),
        AsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(this.assets)),
        AsyncStorage.setItem('@FinTranzo:liabilities', JSON.stringify(this.liabilities))
      ]);
      
      // 通知監聽器
      this.notifyListeners();
    } catch (error) {
      console.error('❌ 本地數據保存失敗:', error);
      throw error;
    }
  }

  /**
   * 添加監聽器
   */
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除監聽器
   */
  removeListener(listener: () => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('❌ 監聽器執行失敗:', error);
      }
    });
  }

  // ==================== 數據獲取方法 ====================

  getTransactions(): any[] {
    return [...this.transactions];
  }

  getAssets(): any[] {
    return [...this.assets];
  }

  getLiabilities(): any[] {
    return [...this.liabilities];
  }

  // ==================== 交易操作 ====================

  /**
   * 添加交易
   */
  async addTransaction(transaction: any): Promise<DataResult> {
    try {
      console.log('➕ 添加交易:', transaction.description);

      // 確保有有效的 ID
      if (!transaction.id) {
        transaction.id = uuidv4();
      }

      // 添加時間戳
      const now = new Date().toISOString();
      transaction.created_at = transaction.created_at || now;
      transaction.updated_at = now;

      // 添加到本地數據
      this.transactions.push(transaction);
      
      // 保存到本地存儲
      await this.saveToLocalStorage();

      console.log('✅ 交易添加成功（本地）');
      
      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      console.error('❌ 添加交易失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 刪除交易
   */
  async deleteTransaction(transactionId: string): Promise<DataResult> {
    try {
      console.log('🗑️ 刪除交易:', transactionId);

      // 從本地數據中移除
      const originalLength = this.transactions.length;
      this.transactions = this.transactions.filter(t => t.id !== transactionId);
      
      if (this.transactions.length === originalLength) {
        return {
          success: false,
          error: '交易不存在'
        };
      }

      // 保存到本地存儲
      await this.saveToLocalStorage();

      console.log('✅ 交易刪除成功（本地）');
      
      return {
        success: true,
        data: { deletedId: transactionId }
      };
    } catch (error) {
      console.error('❌ 刪除交易失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== 資產操作 ====================

  /**
   * 添加資產
   */
  async addAsset(asset: any): Promise<DataResult> {
    try {
      console.log('➕ 添加資產:', asset.name);

      // 確保有有效的 ID
      if (!asset.id) {
        asset.id = uuidv4();
      }

      // 標準化資產數據
      const standardizedAsset = {
        id: asset.id,
        name: asset.name || '未命名資產',
        type: asset.type || 'other',
        current_value: Number(asset.current_value || asset.value || 0),
        cost_basis: Number(asset.cost_basis || asset.current_value || asset.value || 0),
        quantity: Number(asset.quantity || 1),
        stock_code: asset.stock_code || null,
        purchase_price: Number(asset.purchase_price || 0),
        current_price: Number(asset.current_price || 0),
        sort_order: asset.sort_order || 0,
        created_at: asset.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 添加到本地數據
      this.assets.push(standardizedAsset);
      
      // 保存到本地存儲
      await this.saveToLocalStorage();

      console.log('✅ 資產添加成功（本地）');
      
      return {
        success: true,
        data: standardizedAsset
      };
    } catch (error) {
      console.error('❌ 添加資產失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 刪除資產
   */
  async deleteAsset(assetId: string): Promise<DataResult> {
    try {
      console.log('🗑️ 刪除資產:', assetId);

      // 從本地數據中移除
      const originalLength = this.assets.length;
      this.assets = this.assets.filter(a => a.id !== assetId);

      if (this.assets.length === originalLength) {
        return {
          success: false,
          error: '資產不存在'
        };
      }

      // 保存到本地存儲
      await this.saveToLocalStorage();

      console.log('✅ 資產刪除成功（本地）');

      return {
        success: true,
        data: { deletedId: assetId }
      };
    } catch (error) {
      console.error('❌ 刪除資產失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== 雲端同步操作 ====================

  /**
   * 上傳所有本地數據到 Supabase
   */
  async uploadAllToCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      deleted: 0,
      errors: []
    };

    try {
      console.log('☁️ 開始上傳所有本地數據到雲端...');

      // 檢查用戶登錄狀態
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('用戶未登錄或認證失敗');
      }

      console.log('✅ 用戶認證成功，開始上傳數據');

      // 上傳交易數據
      if (this.transactions.length > 0) {
        console.log(`📤 上傳 ${this.transactions.length} 筆交易記錄...`);

        const transactionsForUpload = this.transactions.map(transaction => ({
          id: transaction.id,
          user_id: user.id,
          amount: Number(transaction.amount || 0),
          type: transaction.type || 'expense',
          description: transaction.description || '',
          category: transaction.category || '其他',
          account: transaction.account || '現金',
          date: transaction.date || new Date().toISOString(),
          created_at: transaction.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .upsert(transactionsForUpload, { onConflict: 'id' })
          .select();

        if (transactionError) {
          console.error('❌ 交易數據上傳失敗:', transactionError);
          result.errors.push(`交易上傳失敗: ${transactionError.message}`);
        } else {
          result.uploaded += transactionData?.length || 0;
          console.log(`✅ ${transactionData?.length || 0} 筆交易記錄上傳成功`);
        }
      }

      // 上傳資產數據
      if (this.assets.length > 0) {
        console.log(`📤 上傳 ${this.assets.length} 筆資產記錄...`);

        const assetsForUpload = this.assets.map(asset => ({
          id: asset.id,
          user_id: user.id,
          name: asset.name || '未命名資產',
          type: asset.type || 'other',
          value: Number(asset.current_value || asset.value || 0), // 統一使用 value 欄位
          current_value: Number(asset.current_value || asset.value || 0),
          cost_basis: Number(asset.cost_basis || asset.current_value || asset.value || 0),
          quantity: Number(asset.quantity || 1),
          stock_code: asset.stock_code || null,
          purchase_price: Number(asset.purchase_price || 0),
          current_price: Number(asset.current_price || 0),
          sort_order: asset.sort_order || 0,
          created_at: asset.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .upsert(assetsForUpload, { onConflict: 'id' })
          .select();

        if (assetError) {
          console.error('❌ 資產數據上傳失敗:', assetError);
          result.errors.push(`資產上傳失敗: ${assetError.message}`);
        } else {
          result.uploaded += assetData?.length || 0;
          console.log(`✅ ${assetData?.length || 0} 筆資產記錄上傳成功`);
        }
      }

      // 上傳負債數據
      if (this.liabilities.length > 0) {
        console.log(`📤 上傳 ${this.liabilities.length} 筆負債記錄...`);

        const liabilitiesForUpload = this.liabilities.map(liability => ({
          id: liability.id,
          user_id: user.id,
          name: liability.name || '未命名負債',
          balance: Number(liability.balance || 0), // 🔧 修復：使用 balance 而不是 amount
          type: liability.type || 'other',
          interest_rate: Number(liability.interest_rate || 0),
          monthly_payment: Number(liability.monthly_payment || 0),
          created_at: liability.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data: liabilityData, error: liabilityError } = await supabase
          .from('liabilities')
          .upsert(liabilitiesForUpload, { onConflict: 'id' })
          .select();

        if (liabilityError) {
          console.error('❌ 負債數據上傳失敗:', liabilityError);
          result.errors.push(`負債上傳失敗: ${liabilityError.message}`);
        } else {
          result.uploaded += liabilityData?.length || 0;
          console.log(`✅ ${liabilityData?.length || 0} 筆負債記錄上傳成功`);
        }
      }

      console.log(`🎉 數據上傳完成！成功: ${result.uploaded}筆, 錯誤: ${result.errors.length}個`);

      return result;
    } catch (error) {
      console.error('❌ 雲端上傳失敗:', error);
      result.errors.push(`上傳失敗: ${error.message}`);
      return result;
    }
  }

  /**
   * 從雲端刪除單個交易
   */
  async deleteTransactionFromCloud(transactionId: string): Promise<DataResult> {
    try {
      console.log('☁️ 從雲端刪除交易:', transactionId);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('用戶未登錄');
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 雲端交易刪除失敗:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ 雲端交易刪除成功');
      return { success: true };
    } catch (error) {
      console.error('❌ 雲端交易刪除異常:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 從雲端刪除單個資產
   */
  async deleteAssetFromCloud(assetId: string): Promise<DataResult> {
    try {
      console.log('☁️ 從雲端刪除資產:', assetId);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('用戶未登錄');
      }

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 雲端資產刪除失敗:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ 雲端資產刪除成功');
      return { success: true };
    } catch (error) {
      console.error('❌ 雲端資產刪除異常:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 一鍵清除所有數據（本地+雲端）
   */
  async clearAllData(): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      deleted: 0,
      errors: []
    };

    try {
      console.log('🗑️ 開始一鍵清除所有數據...');

      // 檢查用戶登錄狀態
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('📝 用戶未登錄，僅清除本地數據');
      } else {
        console.log('☁️ 用戶已登錄，清除雲端數據...');

        // 清除雲端數據
        const tables = ['transactions', 'assets', 'liabilities'];

        for (const table of tables) {
          try {
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('user_id', user.id);

            if (error) {
              console.error(`❌ 雲端 ${table} 清除失敗:`, error);
              result.errors.push(`雲端${table}清除失敗: ${error.message}`);
            } else {
              console.log(`✅ 雲端 ${table} 清除成功`);
              result.deleted += 1;
            }
          } catch (error) {
            console.error(`❌ 雲端 ${table} 清除異常:`, error);
            result.errors.push(`雲端${table}清除異常: ${error.message}`);
          }
        }
      }

      // 清除本地數據
      console.log('📱 清除本地數據...');

      const localCounts = {
        transactions: this.transactions.length,
        assets: this.assets.length,
        liabilities: this.liabilities.length
      };

      this.transactions = [];
      this.assets = [];
      this.liabilities = [];

      // 清除本地存儲
      await Promise.all([
        AsyncStorage.removeItem('@FinTranzo:transactions'),
        AsyncStorage.removeItem('@FinTranzo:assets'),
        AsyncStorage.removeItem('@FinTranzo:liabilities')
      ]);

      // 通知監聽器
      this.notifyListeners();

      console.log(`✅ 本地數據清除完成: 交易${localCounts.transactions}筆, 資產${localCounts.assets}筆, 負債${localCounts.liabilities}筆`);

      result.deleted += localCounts.transactions + localCounts.assets + localCounts.liabilities;

      console.log(`🎉 一鍵清除完成！刪除: ${result.deleted}筆, 錯誤: ${result.errors.length}個`);

      return result;
    } catch (error) {
      console.error('❌ 一鍵清除失敗:', error);
      result.errors.push(`清除失敗: ${error.message}`);
      return result;
    }
  }
}

// 導出單例實例
export const unifiedDataManager = UnifiedDataManager.getInstance();
