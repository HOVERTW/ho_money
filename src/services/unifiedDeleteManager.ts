/**
 * 統一刪除管理器
 * 確保所有儲存方式的刪除都正確執行
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageManager';

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
  details: {
    asyncStorage: boolean;
    localStorage: boolean;
    memory: boolean;
    services: boolean;
  };
}

export interface DeleteOptions {
  includeAsyncStorage?: boolean;
  includeLocalStorage?: boolean;
  includeMemory?: boolean;
  includeServices?: boolean;
  dataTypes?: ('transactions' | 'assets' | 'liabilities' | 'categories' | 'accounts' | 'all')[];
}

class UnifiedDeleteManager {
  private defaultOptions: DeleteOptions = {
    includeAsyncStorage: true,
    includeLocalStorage: true,
    includeMemory: true,
    includeServices: true,
    dataTypes: ['all']
  };

  /**
   * 統一刪除指定類型的數據
   */
  async deleteData(dataType: 'transactions' | 'assets' | 'liabilities' | 'categories' | 'accounts' | 'all', options?: DeleteOptions): Promise<DeleteResult> {
    console.log(`🗑️ 開始統一刪除 ${dataType} 數據...`);
    
    const opts = { ...this.defaultOptions, ...options };
    const result: DeleteResult = {
      success: true,
      deletedCount: 0,
      errors: [],
      details: {
        asyncStorage: false,
        localStorage: false,
        memory: false,
        services: false
      }
    };

    try {
      // 1. AsyncStorage 刪除
      if (opts.includeAsyncStorage) {
        const asyncResult = await this.deleteFromAsyncStorage(dataType);
        result.details.asyncStorage = asyncResult.success;
        result.deletedCount += asyncResult.deletedCount;
        if (!asyncResult.success) {
          result.errors.push(...asyncResult.errors);
        }
      }

      // 2. localStorage 刪除 (Web 環境)
      if (opts.includeLocalStorage && typeof window !== 'undefined') {
        const localResult = await this.deleteFromLocalStorage(dataType);
        result.details.localStorage = localResult.success;
        result.deletedCount += localResult.deletedCount;
        if (!localResult.success) {
          result.errors.push(...localResult.errors);
        }
      }

      // 3. 內存數據刪除
      if (opts.includeMemory) {
        const memoryResult = await this.deleteFromMemory(dataType);
        result.details.memory = memoryResult.success;
        result.deletedCount += memoryResult.deletedCount;
        if (!memoryResult.success) {
          result.errors.push(...memoryResult.errors);
        }
      }

      // 4. 服務層刪除
      if (opts.includeServices) {
        const serviceResult = await this.deleteFromServices(dataType);
        result.details.services = serviceResult.success;
        result.deletedCount += serviceResult.deletedCount;
        if (!serviceResult.success) {
          result.errors.push(...serviceResult.errors);
        }
      }

      result.success = result.errors.length === 0;
      
      if (result.success) {
        console.log(`✅ 統一刪除 ${dataType} 完成，共刪除 ${result.deletedCount} 項`);
      } else {
        console.error(`❌ 統一刪除 ${dataType} 部分失敗:`, result.errors);
      }

      return result;

    } catch (error) {
      console.error(`❌ 統一刪除 ${dataType} 異常:`, error);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 從 AsyncStorage 刪除數據
   */
  private async deleteFromAsyncStorage(dataType: string): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      console.log('🗑️ 從 AsyncStorage 刪除數據...');

      const keysToDelete = this.getStorageKeysForDataType(dataType);
      
      for (const key of keysToDelete) {
        try {
          const existingData = await AsyncStorage.getItem(key);
          if (existingData) {
            await AsyncStorage.removeItem(key);
            result.deletedCount++;
            console.log(`✅ 已從 AsyncStorage 刪除: ${key}`);
          }
        } catch (error) {
          result.errors.push(`AsyncStorage 刪除 ${key} 失敗: ${error.message}`);
          result.success = false;
        }
      }

      // 額外清理：刪除所有相關的鍵
      const allKeys = await AsyncStorage.getAllKeys();
      const relatedKeys = allKeys.filter(key => this.isRelatedKey(key, dataType));
      
      for (const key of relatedKeys) {
        try {
          await AsyncStorage.removeItem(key);
          result.deletedCount++;
          console.log(`✅ 已從 AsyncStorage 清理相關鍵: ${key}`);
        } catch (error) {
          result.errors.push(`AsyncStorage 清理 ${key} 失敗: ${error.message}`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`AsyncStorage 操作失敗: ${error.message}`);
    }

    return result;
  }

  /**
   * 從 localStorage 刪除數據 (Web 環境)
   */
  private async deleteFromLocalStorage(dataType: string): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      console.log('🗑️ 從 localStorage 刪除數據...');

      const webKeys = this.getWebStorageKeysForDataType(dataType);
      
      for (const key of webKeys) {
        try {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            result.deletedCount++;
            console.log(`✅ 已從 localStorage 刪除: ${key}`);
          }
        } catch (error) {
          result.errors.push(`localStorage 刪除 ${key} 失敗: ${error.message}`);
          result.success = false;
        }
      }

      // 額外清理：刪除所有相關的鍵
      const allKeys = Object.keys(localStorage);
      const relatedKeys = allKeys.filter(key => this.isRelatedWebKey(key, dataType));
      
      for (const key of relatedKeys) {
        try {
          localStorage.removeItem(key);
          result.deletedCount++;
          console.log(`✅ 已從 localStorage 清理相關鍵: ${key}`);
        } catch (error) {
          result.errors.push(`localStorage 清理 ${key} 失敗: ${error.message}`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`localStorage 操作失敗: ${error.message}`);
    }

    return result;
  }

  /**
   * 從內存中刪除數據
   */
  private async deleteFromMemory(dataType: string): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      console.log('🗑️ 從內存中清理數據...');

      // 清理各個服務的內存數據
      const services = await this.getServiceInstances();
      
      for (const [serviceName, service] of Object.entries(services)) {
        try {
          if (this.shouldClearServiceMemory(serviceName, dataType)) {
            await this.clearServiceMemory(service, serviceName);
            result.deletedCount++;
            console.log(`✅ 已清理 ${serviceName} 內存數據`);
          }
        } catch (error) {
          result.errors.push(`清理 ${serviceName} 內存失敗: ${error.message}`);
          result.success = false;
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`內存清理失敗: ${error.message}`);
    }

    return result;
  }

  /**
   * 從服務層刪除數據
   */
  private async deleteFromServices(dataType: string): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    const result = { success: true, deletedCount: 0, errors: [] };

    try {
      console.log('🗑️ 從服務層清理數據...');

      // 調用各個服務的清理方法
      const services = await this.getServiceInstances();
      
      for (const [serviceName, service] of Object.entries(services)) {
        try {
          if (this.shouldClearService(serviceName, dataType)) {
            await this.clearService(service, serviceName);
            result.deletedCount++;
            console.log(`✅ 已清理 ${serviceName} 服務數據`);
          }
        } catch (error) {
          result.errors.push(`清理 ${serviceName} 服務失敗: ${error.message}`);
          result.success = false;
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`服務層清理失敗: ${error.message}`);
    }

    return result;
  }

  /**
   * 獲取數據類型對應的儲存鍵
   */
  private getStorageKeysForDataType(dataType: string): string[] {
    const allKeys = Object.values(STORAGE_KEYS);
    
    if (dataType === 'all') {
      return allKeys;
    }

    const keyMap = {
      'transactions': [STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.CATEGORIES, STORAGE_KEYS.ACCOUNTS],
      'assets': [STORAGE_KEYS.ASSETS],
      'liabilities': [STORAGE_KEYS.LIABILITIES],
      'categories': [STORAGE_KEYS.CATEGORIES],
      'accounts': [STORAGE_KEYS.ACCOUNTS]
    };

    return keyMap[dataType] || [];
  }

  /**
   * 獲取 Web 環境的儲存鍵
   */
  private getWebStorageKeysForDataType(dataType: string): string[] {
    const webKeyMap = {
      'all': ['fintranzo_transactions', 'fintranzo_assets', 'fintranzo_liabilities', 'fintranzo_categories', 'fintranzo_user_preferences', 'fintranzo_recurring_transactions'],
      'transactions': ['fintranzo_transactions', 'fintranzo_categories'],
      'assets': ['fintranzo_assets'],
      'liabilities': ['fintranzo_liabilities'],
      'categories': ['fintranzo_categories'],
      'accounts': ['fintranzo_user_preferences']
    };

    return webKeyMap[dataType] || [];
  }

  /**
   * 檢查是否為相關鍵名
   */
  private isRelatedKey(key: string, dataType: string): boolean {
    if (dataType === 'all') {
      return key.startsWith('@FinTranzo:') || 
             key.startsWith('fintranzo_') ||
             key.startsWith('transaction_') ||
             key.startsWith('asset_') ||
             key.startsWith('liability_') ||
             key.includes('financial');
    }

    const patterns = {
      'transactions': ['transaction', 'category', 'account'],
      'assets': ['asset'],
      'liabilities': ['liability', 'debt'],
      'categories': ['category'],
      'accounts': ['account']
    };

    const typePatterns = patterns[dataType] || [];
    return typePatterns.some(pattern => key.toLowerCase().includes(pattern));
  }

  /**
   * 檢查是否為相關的 Web 鍵名
   */
  private isRelatedWebKey(key: string, dataType: string): boolean {
    return this.isRelatedKey(key, dataType);
  }

  /**
   * 獲取服務實例
   */
  private async getServiceInstances(): Promise<{ [key: string]: any }> {
    const services: { [key: string]: any } = {};

    try {
      // 動態導入服務，避免循環依賴
      const { transactionDataService } = await import('./transactionDataService');
      services.transactionDataService = transactionDataService;
    } catch (error) {
      console.warn('無法導入 transactionDataService:', error.message);
    }

    try {
      const { liabilityService } = await import('./liabilityService');
      services.liabilityService = liabilityService;
    } catch (error) {
      console.warn('無法導入 liabilityService:', error.message);
    }

    return services;
  }

  /**
   * 檢查是否應該清理服務內存
   */
  private shouldClearServiceMemory(serviceName: string, dataType: string): boolean {
    if (dataType === 'all') return true;

    const serviceDataMap = {
      'transactionDataService': ['transactions', 'categories', 'accounts'],
      'liabilityService': ['liabilities'],
      'assetService': ['assets']
    };

    const serviceTypes = serviceDataMap[serviceName] || [];
    return serviceTypes.includes(dataType);
  }

  /**
   * 檢查是否應該清理服務
   */
  private shouldClearService(serviceName: string, dataType: string): boolean {
    return this.shouldClearServiceMemory(serviceName, dataType);
  }

  /**
   * 清理服務內存數據
   */
  private async clearServiceMemory(service: any, serviceName: string): Promise<void> {
    if (service && typeof service.clearAllData === 'function') {
      await service.clearAllData();
    } else {
      console.warn(`服務 ${serviceName} 沒有 clearAllData 方法`);
    }
  }

  /**
   * 清理服務數據
   */
  private async clearService(service: any, serviceName: string): Promise<void> {
    await this.clearServiceMemory(service, serviceName);
  }
}

// 創建單例實例
export const unifiedDeleteManager = new UnifiedDeleteManager();
