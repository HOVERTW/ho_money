/**
 * 可靠刪除服務 - 全新設計的刪除系統
 * 專注於 100% 可靠性和跨平台兼容性
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { STORAGE_KEYS } from '../utils/storageManager';

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
  details: {
    localStorage: boolean;
    cloudStorage: boolean;
    verification: boolean;
  };
  timestamp: string;
}

export interface DeleteOptions {
  verifyDeletion?: boolean;
  retryCount?: number;
  timeout?: number;
}

export class ReliableDeleteService {
  private static readonly DEFAULT_OPTIONS: DeleteOptions = {
    verifyDeletion: true,
    retryCount: 3,
    timeout: 10000
  };

  /**
   * 刪除單個負債 - 可靠版本
   */
  static async deleteLiability(liabilityId: string, options?: DeleteOptions): Promise<DeleteResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        localStorage: false,
        cloudStorage: false,
        verification: false
      },
      timestamp: new Date().toISOString()
    };

    console.log('🗑️ 可靠刪除：開始刪除負債', { liabilityId, options: opts });

    try {
      // 步驟 1: 本地存儲刪除
      const localResult = await this.deleteFromLocalStorage('liabilities', liabilityId, opts);
      result.details.localStorage = localResult.success;
      result.deletedCount += localResult.deletedCount;
      if (!localResult.success) {
        result.errors.push(...localResult.errors);
      }

      // 步驟 2: 雲端存儲刪除
      const cloudResult = await this.deleteFromCloudStorage('liabilities', liabilityId, opts);
      result.details.cloudStorage = cloudResult.success;
      result.deletedCount += cloudResult.deletedCount;
      if (!cloudResult.success) {
        result.errors.push(...cloudResult.errors);
      }

      // 步驟 3: 驗證刪除結果
      if (opts.verifyDeletion) {
        const verifyResult = await this.verifyDeletion('liabilities', liabilityId);
        result.details.verification = verifyResult.success;
        if (!verifyResult.success) {
          result.errors.push(...verifyResult.errors);
        }
      } else {
        result.details.verification = true;
      }

      // 判斷整體成功
      result.success = result.details.localStorage && result.details.cloudStorage && result.details.verification;

      console.log('🎯 可靠刪除：負債刪除結果', result);
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：負債刪除異常', error);
      result.errors.push(`刪除異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 刪除單個資產 - 可靠版本
   */
  static async deleteAsset(assetId: string, options?: DeleteOptions): Promise<DeleteResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        localStorage: false,
        cloudStorage: false,
        verification: false
      },
      timestamp: new Date().toISOString()
    };

    console.log('🗑️ 可靠刪除：開始刪除資產', { assetId, options: opts });

    try {
      // 步驟 1: 本地存儲刪除
      const localResult = await this.deleteFromLocalStorage('assets', assetId, opts);
      result.details.localStorage = localResult.success;
      result.deletedCount += localResult.deletedCount;
      if (!localResult.success) {
        result.errors.push(...localResult.errors);
      }

      // 步驟 2: 雲端存儲刪除
      const cloudResult = await this.deleteFromCloudStorage('assets', assetId, opts);
      result.details.cloudStorage = cloudResult.success;
      result.deletedCount += cloudResult.deletedCount;
      if (!cloudResult.success) {
        result.errors.push(...cloudResult.errors);
      }

      // 步驟 3: 驗證刪除結果
      if (opts.verifyDeletion) {
        const verifyResult = await this.verifyDeletion('assets', assetId);
        result.details.verification = verifyResult.success;
        if (!verifyResult.success) {
          result.errors.push(...verifyResult.errors);
        }
      } else {
        result.details.verification = true;
      }

      // 判斷整體成功
      result.success = result.details.localStorage && result.details.cloudStorage && result.details.verification;

      console.log('🎯 可靠刪除：資產刪除結果', result);
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：資產刪除異常', error);
      result.errors.push(`刪除異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 刪除單個交易 - 可靠版本
   */
  static async deleteTransaction(transactionId: string, options?: DeleteOptions): Promise<DeleteResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        localStorage: false,
        cloudStorage: false,
        verification: false
      },
      timestamp: new Date().toISOString()
    };

    console.log('🗑️ 可靠刪除：開始刪除交易', { transactionId, options: opts });

    try {
      // 步驟 1: 本地存儲刪除
      const localResult = await this.deleteFromLocalStorage('transactions', transactionId, opts);
      result.details.localStorage = localResult.success;
      result.deletedCount += localResult.deletedCount;
      if (!localResult.success) {
        result.errors.push(...localResult.errors);
      }

      // 步驟 2: 雲端存儲刪除
      const cloudResult = await this.deleteFromCloudStorage('transactions', transactionId, opts);
      result.details.cloudStorage = cloudResult.success;
      result.deletedCount += cloudResult.deletedCount;
      if (!cloudResult.success) {
        result.errors.push(...cloudResult.errors);
      }

      // 步驟 3: 驗證刪除結果
      if (opts.verifyDeletion) {
        const verifyResult = await this.verifyDeletion('transactions', transactionId);
        result.details.verification = verifyResult.success;
        if (!verifyResult.success) {
          result.errors.push(...verifyResult.errors);
        }
      } else {
        result.details.verification = true;
      }

      // 判斷整體成功
      result.success = result.details.localStorage && result.details.cloudStorage && result.details.verification;

      console.log('🎯 可靠刪除：交易刪除結果', result);
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：交易刪除異常', error);
      result.errors.push(`刪除異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 清空所有數據 - 可靠版本
   */
  static async clearAllData(options?: DeleteOptions): Promise<DeleteResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        localStorage: false,
        cloudStorage: false,
        verification: false
      },
      timestamp: new Date().toISOString()
    };

    console.log('🗑️ 可靠刪除：開始清空所有數據', { options: opts });

    try {
      // 步驟 1: 清空本地存儲
      const localResult = await this.clearLocalStorage(opts);
      result.details.localStorage = localResult.success;
      result.deletedCount += localResult.deletedCount;
      if (!localResult.success) {
        result.errors.push(...localResult.errors);
      }

      // 步驟 2: 清空雲端存儲
      const cloudResult = await this.clearCloudStorage(opts);
      result.details.cloudStorage = cloudResult.success;
      result.deletedCount += cloudResult.deletedCount;
      if (!cloudResult.success) {
        result.errors.push(...cloudResult.errors);
      }

      // 步驟 3: 驗證清空結果
      if (opts.verifyDeletion) {
        const verifyResult = await this.verifyClearAll();
        result.details.verification = verifyResult.success;
        if (!verifyResult.success) {
          result.errors.push(...verifyResult.errors);
        }
      } else {
        result.details.verification = true;
      }

      // 判斷整體成功
      result.success = result.details.localStorage && result.details.cloudStorage && result.details.verification;

      console.log('🎯 可靠刪除：清空所有數據結果', result);
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：清空所有數據異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 從本地存儲刪除 - 帶重試機制
   */
  private static async deleteFromLocalStorage(
    dataType: string, 
    itemId: string, 
    options: DeleteOptions
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: false, deletedCount: 0, errors: [] };

    for (let attempt = 1; attempt <= options.retryCount; attempt++) {
      try {
        console.log(`🔄 可靠刪除：本地存儲刪除嘗試 ${attempt}/${options.retryCount}`);

        const storageKey = dataType === 'liabilities' ? STORAGE_KEYS.LIABILITIES :
                          dataType === 'assets' ? STORAGE_KEYS.ASSETS :
                          STORAGE_KEYS.TRANSACTIONS;
        
        // 獲取現有數據
        const existingData = await AsyncStorage.getItem(storageKey);
        if (!existingData) {
          console.log('📝 可靠刪除：本地存儲中沒有數據');
          result.success = true;
          return result;
        }

        const dataArray = JSON.parse(existingData);
        const originalLength = dataArray.length;
        
        // 過濾掉要刪除的項目
        const filteredData = dataArray.filter(item => item.id !== itemId);
        
        if (filteredData.length === originalLength) {
          console.log('⚠️ 可靠刪除：要刪除的項目不存在');
          result.success = true;
          return result;
        }

        // 保存過濾後的數據
        await AsyncStorage.setItem(storageKey, JSON.stringify(filteredData));
        
        result.success = true;
        result.deletedCount = originalLength - filteredData.length;
        console.log(`✅ 可靠刪除：本地存儲刪除成功，刪除 ${result.deletedCount} 項`);
        return result;

      } catch (error) {
        console.error(`❌ 可靠刪除：本地存儲刪除嘗試 ${attempt} 失敗`, error);
        result.errors.push(`嘗試 ${attempt}: ${error.message}`);
        
        if (attempt === options.retryCount) {
          result.success = false;
          return result;
        }
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return result;
  }

  /**
   * 從雲端存儲刪除 - 帶重試機制
   */
  private static async deleteFromCloudStorage(
    dataType: string, 
    itemId: string, 
    options: DeleteOptions
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: false, deletedCount: 0, errors: [] };

    // 檢查用戶登錄狀態
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('📝 可靠刪除：用戶未登錄，跳過雲端刪除');
      result.success = true;
      return result;
    }

    for (let attempt = 1; attempt <= options.retryCount; attempt++) {
      try {
        console.log(`🔄 可靠刪除：雲端存儲刪除嘗試 ${attempt}/${options.retryCount}`);

        const tableName = dataType === 'liabilities' ? 'liabilities' :
                         dataType === 'assets' ? 'assets' :
                         'transactions';
        
        // 先檢查記錄是否存在
        const { data: existingData, error: checkError } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (checkError) {
          throw new Error(`檢查記錄失敗: ${checkError.message}`);
        }

        if (!existingData || existingData.length === 0) {
          console.log('📝 可靠刪除：雲端記錄不存在');
          result.success = true;
          return result;
        }

        // 執行刪除
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (deleteError) {
          throw new Error(`刪除失敗: ${deleteError.message}`);
        }

        result.success = true;
        result.deletedCount = 1;
        console.log('✅ 可靠刪除：雲端存儲刪除成功');
        return result;

      } catch (error) {
        console.error(`❌ 可靠刪除：雲端存儲刪除嘗試 ${attempt} 失敗`, error);
        result.errors.push(`嘗試 ${attempt}: ${error.message}`);
        
        if (attempt === options.retryCount) {
          result.success = false;
          return result;
        }
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    return result;
  }

  /**
   * 驗證刪除結果
   */
  private static async verifyDeletion(
    dataType: string, 
    itemId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: true, errors: [] };

    try {
      console.log('🔍 可靠刪除：驗證刪除結果');

      // 驗證本地存儲
      const storageKey = dataType === 'liabilities' ? STORAGE_KEYS.LIABILITIES : STORAGE_KEYS.TRANSACTIONS;
      const localData = await AsyncStorage.getItem(storageKey);
      
      if (localData) {
        const dataArray = JSON.parse(localData);
        const foundInLocal = dataArray.some(item => item.id === itemId);
        
        if (foundInLocal) {
          result.success = false;
          result.errors.push('本地存儲中仍存在該記錄');
        }
      }

      // 驗證雲端存儲
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tableName = dataType === 'liabilities' ? 'liabilities' :
                         dataType === 'assets' ? 'assets' :
                         'transactions';
        const { data: cloudData, error: cloudError } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (cloudError) {
          result.success = false;
          result.errors.push(`雲端驗證失敗: ${cloudError.message}`);
        } else if (cloudData && cloudData.length > 0) {
          result.success = false;
          result.errors.push('雲端存儲中仍存在該記錄');
        }
      }

      console.log(result.success ? '✅ 可靠刪除：驗證通過' : '❌ 可靠刪除：驗證失敗');
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：驗證異常', error);
      result.success = false;
      result.errors.push(`驗證異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 清空本地存儲
   */
  private static async clearLocalStorage(options: DeleteOptions): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      const keysToDelete = [
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.LIABILITIES,
        STORAGE_KEYS.ASSETS,
        STORAGE_KEYS.ACCOUNTS
      ];

      for (const key of keysToDelete) {
        try {
          const existingData = await AsyncStorage.getItem(key);
          if (existingData) {
            const dataArray = JSON.parse(existingData);
            result.deletedCount += dataArray.length;
          }
          
          await AsyncStorage.removeItem(key);
          console.log(`✅ 可靠刪除：清空本地存儲 ${key}`);
        } catch (error) {
          console.error(`❌ 可靠刪除：清空本地存儲 ${key} 失敗`, error);
          result.errors.push(`清空 ${key} 失敗: ${error.message}`);
          result.success = false;
        }
      }

    } catch (error) {
      console.error('❌ 可靠刪除：清空本地存儲異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * 清空雲端存儲
   */
  private static async clearCloudStorage(options: DeleteOptions): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 可靠刪除：用戶未登錄，跳過雲端清空');
        return result;
      }

      const tablesToClear = ['transactions', 'liabilities', 'assets'];

      for (const table of tablesToClear) {
        try {
          // 先獲取數量
          const { data: countData, error: countError } = await supabase
            .from(table)
            .select('id')
            .eq('user_id', user.id);

          if (countError) {
            console.error(`❌ 可靠刪除：獲取 ${table} 數量失敗`, countError);
            result.errors.push(`獲取 ${table} 數量失敗: ${countError.message}`);
            result.success = false;
            continue;
          }

          const count = countData?.length || 0;
          result.deletedCount += count;

          // 執行刪除
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id);

          if (deleteError) {
            console.error(`❌ 可靠刪除：清空雲端 ${table} 失敗`, deleteError);
            result.errors.push(`清空 ${table} 失敗: ${deleteError.message}`);
            result.success = false;
          } else {
            console.log(`✅ 可靠刪除：清空雲端 ${table}，刪除 ${count} 項`);
          }

        } catch (error) {
          console.error(`❌ 可靠刪除：清空雲端 ${table} 異常`, error);
          result.errors.push(`清空 ${table} 異常: ${error.message}`);
          result.success = false;
        }
      }

    } catch (error) {
      console.error('❌ 可靠刪除：清空雲端數據異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * 驗證清空結果
   */
  private static async verifyClearAll(): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: true, errors: [] };

    try {
      console.log('🔍 可靠刪除：驗證清空結果');

      // 驗證本地存儲
      const keysToCheck = [STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.LIABILITIES, STORAGE_KEYS.ASSETS];
      
      for (const key of keysToCheck) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const dataArray = JSON.parse(data);
          if (dataArray.length > 0) {
            result.success = false;
            result.errors.push(`本地存儲 ${key} 仍有 ${dataArray.length} 筆數據`);
          }
        }
      }

      // 驗證雲端存儲
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tablesToCheck = ['transactions', 'liabilities', 'assets'];
        
        for (const table of tablesToCheck) {
          const { data: cloudData, error: cloudError } = await supabase
            .from(table)
            .select('id')
            .eq('user_id', user.id);

          if (cloudError) {
            result.success = false;
            result.errors.push(`雲端驗證 ${table} 失敗: ${cloudError.message}`);
          } else if (cloudData && cloudData.length > 0) {
            result.success = false;
            result.errors.push(`雲端 ${table} 仍有 ${cloudData.length} 筆數據`);
          }
        }
      }

      console.log(result.success ? '✅ 可靠刪除：清空驗證通過' : '❌ 可靠刪除：清空驗證失敗');
      return result;

    } catch (error) {
      console.error('❌ 可靠刪除：清空驗證異常', error);
      result.success = false;
      result.errors.push(`驗證異常: ${error.message}`);
      return result;
    }
  }
}

export default ReliableDeleteService;
