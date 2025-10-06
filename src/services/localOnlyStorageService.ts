/**
 * 本地存儲服務 - iOS 本地版本
 * 只使用 AsyncStorage，無雲端同步功能
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 存儲鍵名前綴
const STORAGE_PREFIX = '@HoMoney:';

// 存儲鍵定義
export const STORAGE_KEYS = {
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  ASSETS: `${STORAGE_PREFIX}assets`,
  LIABILITIES: `${STORAGE_PREFIX}liabilities`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  ACCOUNTS: `${STORAGE_PREFIX}accounts`,
  RECURRING_TRANSACTIONS: `${STORAGE_PREFIX}recurring_transactions`,
  USER_PREFERENCES: `${STORAGE_PREFIX}user_preferences`,
  INITIALIZED: `${STORAGE_PREFIX}initialized`,
} as const;

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 本地存儲服務類
 */
class LocalOnlyStorageService {
  /**
   * 保存數據
   */
  async save<T>(key: string, data: T): Promise<StorageResult<T>> {
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonData);
      console.log(`✅ 本地保存成功: ${key}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ 本地保存失敗: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失敗'
      };
    }
  }

  /**
   * 讀取數據
   */
  async load<T>(key: string, defaultValue?: T): Promise<StorageResult<T>> {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      
      if (jsonData === null) {
        console.log(`📝 本地數據不存在: ${key}，使用默認值`);
        return { success: true, data: defaultValue };
      }

      const data = JSON.parse(jsonData) as T;
      console.log(`✅ 本地讀取成功: ${key}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ 本地讀取失敗: ${key}`, error);
      return {
        success: false,
        data: defaultValue,
        error: error instanceof Error ? error.message : '讀取失敗'
      };
    }
  }

  /**
   * 刪除數據
   */
  async remove(key: string): Promise<StorageResult<void>> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`✅ 本地刪除成功: ${key}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ 本地刪除失敗: ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '刪除失敗'
      };
    }
  }

  /**
   * 清除所有數據
   */
  async clearAll(): Promise<StorageResult<void>> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('✅ 本地數據全部清除');
      return { success: true };
    } catch (error) {
      console.error('❌ 清除本地數據失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清除失敗'
      };
    }
  }

  /**
   * 獲取所有鍵
   */
  async getAllKeys(): Promise<StorageResult<string[]>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      console.log(`✅ 獲取所有鍵: ${appKeys.length} 個`);
      return { success: true, data: appKeys };
    } catch (error) {
      console.error('❌ 獲取鍵失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '獲取失敗'
      };
    }
  }

  /**
   * 導出所有數據（用於備份）
   */
  async exportAllData(): Promise<StorageResult<Record<string, any>>> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const exportData: Record<string, any> = {};

      for (const key of keys) {
        const result = await this.load(key);
        if (result.success && result.data !== undefined) {
          exportData[key] = result.data;
        }
      }

      console.log('✅ 數據導出成功');
      return { success: true, data: exportData };
    } catch (error) {
      console.error('❌ 數據導出失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '導出失敗'
      };
    }
  }

  /**
   * 導入數據（用於還原）
   */
  async importAllData(data: Record<string, any>): Promise<StorageResult<void>> {
    try {
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(STORAGE_PREFIX)) {
          await this.save(key, value);
        }
      }

      console.log('✅ 數據導入成功');
      return { success: true };
    } catch (error) {
      console.error('❌ 數據導入失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '導入失敗'
      };
    }
  }

  /**
   * 獲取存儲使用情況
   */
  async getStorageInfo(): Promise<StorageResult<{
    totalKeys: number;
    estimatedSize: number;
  }>> {
    try {
      const keysResult = await this.getAllKeys();
      if (!keysResult.success || !keysResult.data) {
        throw new Error('無法獲取鍵列表');
      }

      let estimatedSize = 0;
      for (const key of keysResult.data) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          estimatedSize += value.length;
        }
      }

      const info = {
        totalKeys: keysResult.data.length,
        estimatedSize: estimatedSize
      };

      console.log('✅ 存儲信息:', info);
      return { success: true, data: info };
    } catch (error) {
      console.error('❌ 獲取存儲信息失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '獲取失敗'
      };
    }
  }

  /**
   * 檢查是否已初始化
   */
  async isInitialized(): Promise<boolean> {
    const result = await this.load<boolean>(STORAGE_KEYS.INITIALIZED, false);
    return result.data || false;
  }

  /**
   * 標記為已初始化
   */
  async setInitialized(value: boolean = true): Promise<StorageResult<void>> {
    return this.save(STORAGE_KEYS.INITIALIZED, value);
  }

  /**
   * 批量保存
   */
  async saveBatch(items: Array<{ key: string; value: any }>): Promise<StorageResult<void>> {
    try {
      const pairs: [string, string][] = items.map(item => [
        item.key,
        JSON.stringify(item.value)
      ]);

      await AsyncStorage.multiSet(pairs);
      console.log(`✅ 批量保存成功: ${items.length} 項`);
      return { success: true };
    } catch (error) {
      console.error('❌ 批量保存失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量保存失敗'
      };
    }
  }

  /**
   * 批量讀取
   */
  async loadBatch<T>(keys: string[]): Promise<StorageResult<Record<string, T>>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, T> = {};

      for (const [key, value] of pairs) {
        if (value !== null) {
          result[key] = JSON.parse(value) as T;
        }
      }

      console.log(`✅ 批量讀取成功: ${Object.keys(result).length} 項`);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ 批量讀取失敗', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量讀取失敗'
      };
    }
  }
}

// 導出單例
export const localOnlyStorageService = new LocalOnlyStorageService();

