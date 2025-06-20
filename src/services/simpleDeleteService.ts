/**
 * 簡單刪除服務 - 重新設計的刪除功能
 * 專注於可靠性和簡單性
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { STORAGE_KEYS } from '../constants/storage';

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
  details: {
    local: boolean;
    cloud: boolean;
  };
}

export class SimpleDeleteService {
  /**
   * 刪除單個負債
   */
  static async deleteLiability(liabilityId: string): Promise<DeleteResult> {
    console.log('🗑️ 簡單刪除：開始刪除負債', liabilityId);
    
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        local: false,
        cloud: false
      }
    };

    try {
      // 1. 從本地存儲刪除
      const localResult = await this.deleteFromLocalStorage('liabilities', liabilityId);
      result.details.local = localResult;
      if (localResult) {
        result.deletedCount++;
        console.log('✅ 簡單刪除：本地刪除成功');
      } else {
        result.errors.push('本地刪除失敗');
        console.log('❌ 簡單刪除：本地刪除失敗');
      }

      // 2. 從雲端刪除（如果用戶已登錄）
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cloudResult = await this.deleteFromCloud('liabilities', liabilityId, user.id);
        result.details.cloud = cloudResult;
        if (cloudResult) {
          result.deletedCount++;
          console.log('✅ 簡單刪除：雲端刪除成功');
        } else {
          result.errors.push('雲端刪除失敗');
          console.log('❌ 簡單刪除：雲端刪除失敗');
        }
      } else {
        console.log('📝 簡單刪除：用戶未登錄，跳過雲端刪除');
        result.details.cloud = true; // 未登錄時視為成功
      }

      // 3. 判斷整體成功
      result.success = result.details.local && result.details.cloud;
      
      console.log('🎯 簡單刪除：負債刪除結果', result);
      return result;

    } catch (error) {
      console.error('❌ 簡單刪除：負債刪除異常', error);
      result.errors.push(`刪除異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 刪除單個交易
   */
  static async deleteTransaction(transactionId: string): Promise<DeleteResult> {
    console.log('🗑️ 簡單刪除：開始刪除交易', transactionId);
    
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        local: false,
        cloud: false
      }
    };

    try {
      // 1. 從本地存儲刪除
      const localResult = await this.deleteFromLocalStorage('transactions', transactionId);
      result.details.local = localResult;
      if (localResult) {
        result.deletedCount++;
        console.log('✅ 簡單刪除：本地刪除成功');
      } else {
        result.errors.push('本地刪除失敗');
        console.log('❌ 簡單刪除：本地刪除失敗');
      }

      // 2. 從雲端刪除（如果用戶已登錄）
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cloudResult = await this.deleteFromCloud('transactions', transactionId, user.id);
        result.details.cloud = cloudResult;
        if (cloudResult) {
          result.deletedCount++;
          console.log('✅ 簡單刪除：雲端刪除成功');
        } else {
          result.errors.push('雲端刪除失敗');
          console.log('❌ 簡單刪除：雲端刪除失敗');
        }
      } else {
        console.log('📝 簡單刪除：用戶未登錄，跳過雲端刪除');
        result.details.cloud = true; // 未登錄時視為成功
      }

      // 3. 判斷整體成功
      result.success = result.details.local && result.details.cloud;
      
      console.log('🎯 簡單刪除：交易刪除結果', result);
      return result;

    } catch (error) {
      console.error('❌ 簡單刪除：交易刪除異常', error);
      result.errors.push(`刪除異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 清空所有數據
   */
  static async clearAllData(): Promise<DeleteResult> {
    console.log('🗑️ 簡單刪除：開始清空所有數據');
    
    const result: DeleteResult = {
      success: false,
      deletedCount: 0,
      errors: [],
      details: {
        local: false,
        cloud: false
      }
    };

    try {
      // 1. 清空本地存儲
      const localResult = await this.clearLocalStorage();
      result.details.local = localResult.success;
      result.deletedCount += localResult.deletedCount;
      if (!localResult.success) {
        result.errors.push(...localResult.errors);
      }

      // 2. 清空雲端數據（如果用戶已登錄）
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cloudResult = await this.clearCloudData(user.id);
        result.details.cloud = cloudResult.success;
        result.deletedCount += cloudResult.deletedCount;
        if (!cloudResult.success) {
          result.errors.push(...cloudResult.errors);
        }
      } else {
        console.log('📝 簡單刪除：用戶未登錄，跳過雲端清空');
        result.details.cloud = true; // 未登錄時視為成功
      }

      // 3. 判斷整體成功
      result.success = result.details.local && result.details.cloud;
      
      console.log('🎯 簡單刪除：清空所有數據結果', result);
      return result;

    } catch (error) {
      console.error('❌ 簡單刪除：清空所有數據異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      return result;
    }
  }

  /**
   * 從本地存儲刪除指定項目
   */
  private static async deleteFromLocalStorage(dataType: string, itemId: string): Promise<boolean> {
    try {
      const storageKey = dataType === 'liabilities' ? STORAGE_KEYS.LIABILITIES : STORAGE_KEYS.TRANSACTIONS;
      
      // 獲取現有數據
      const existingData = await AsyncStorage.getItem(storageKey);
      if (!existingData) {
        console.log('📝 簡單刪除：本地存儲中沒有數據');
        return true; // 沒有數據也算成功
      }

      const dataArray = JSON.parse(existingData);
      const originalLength = dataArray.length;
      
      // 過濾掉要刪除的項目
      const filteredData = dataArray.filter(item => item.id !== itemId);
      
      if (filteredData.length === originalLength) {
        console.log('⚠️ 簡單刪除：要刪除的項目不存在');
        return true; // 項目不存在也算成功
      }

      // 保存過濾後的數據
      await AsyncStorage.setItem(storageKey, JSON.stringify(filteredData));
      
      console.log(`✅ 簡單刪除：從本地存儲刪除成功，剩餘 ${filteredData.length} 項`);
      return true;

    } catch (error) {
      console.error('❌ 簡單刪除：本地存儲刪除失敗', error);
      return false;
    }
  }

  /**
   * 從雲端刪除指定項目
   */
  private static async deleteFromCloud(dataType: string, itemId: string, userId: string): Promise<boolean> {
    try {
      const tableName = dataType === 'liabilities' ? 'liabilities' : 'transactions';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 簡單刪除：雲端刪除失敗', error);
        return false;
      }

      console.log('✅ 簡單刪除：雲端刪除成功');
      return true;

    } catch (error) {
      console.error('❌ 簡單刪除：雲端刪除異常', error);
      return false;
    }
  }

  /**
   * 清空本地存儲
   */
  private static async clearLocalStorage(): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
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
          console.log(`✅ 簡單刪除：清空本地存儲 ${key}`);
        } catch (error) {
          console.error(`❌ 簡單刪除：清空本地存儲 ${key} 失敗`, error);
          result.errors.push(`清空 ${key} 失敗`);
          result.success = false;
        }
      }

    } catch (error) {
      console.error('❌ 簡單刪除：清空本地存儲異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * 清空雲端數據
   */
  private static async clearCloudData(userId: string): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      const tablesToClear = ['transactions', 'liabilities', 'assets'];

      for (const table of tablesToClear) {
        try {
          // 先獲取數量
          const { data: countData, error: countError } = await supabase
            .from(table)
            .select('id')
            .eq('user_id', userId);

          if (countError) {
            console.error(`❌ 簡單刪除：獲取 ${table} 數量失敗`, countError);
            result.errors.push(`獲取 ${table} 數量失敗`);
            result.success = false;
            continue;
          }

          const count = countData?.length || 0;
          result.deletedCount += count;

          // 執行刪除
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('user_id', userId);

          if (deleteError) {
            console.error(`❌ 簡單刪除：清空雲端 ${table} 失敗`, deleteError);
            result.errors.push(`清空 ${table} 失敗`);
            result.success = false;
          } else {
            console.log(`✅ 簡單刪除：清空雲端 ${table}，刪除 ${count} 項`);
          }

        } catch (error) {
          console.error(`❌ 簡單刪除：清空雲端 ${table} 異常`, error);
          result.errors.push(`清空 ${table} 異常`);
          result.success = false;
        }
      }

    } catch (error) {
      console.error('❌ 簡單刪除：清空雲端數據異常', error);
      result.errors.push(`清空異常: ${error.message}`);
      result.success = false;
    }

    return result;
  }
}

export default SimpleDeleteService;
