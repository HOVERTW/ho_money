/**
 * 本地存儲管理工具
 * 提供清理和檢查本地存儲的功能
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 所有存儲鍵名
export const STORAGE_KEYS = {
  // 交易相關
  TRANSACTIONS: '@FinTranzo:transactions',
  CATEGORIES: '@FinTranzo:categories',
  ACCOUNTS: '@FinTranzo:accounts',
  INITIALIZED: '@FinTranzo:initialized',
  
  // 資產負債相關
  ASSETS: '@FinTranzo:assets',
  LIABILITIES: '@FinTranzo:liabilities',
  
  // 用戶資料
  USER_PROFILE: '@FinTranzo:userProfile',
  
  // 循環交易
  RECURRING_TRANSACTIONS: '@FinTranzo:recurringTransactions',
  
  // 其他可能的存儲項目
  SETTINGS: '@FinTranzo:settings',
  CACHE: '@FinTranzo:cache'
} as const;

export interface StorageStatus {
  [key: string]: boolean;
}

/**
 * 清除所有本地存儲數據
 */
export async function clearAllStorage(): Promise<boolean> {
  try {
    console.log('🧹 開始清除所有本地存儲數據...');
    
    const keysToRemove = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keysToRemove);
    
    console.log('✅ 所有本地存儲數據已清除');
    console.log(`📊 清除了 ${keysToRemove.length} 個存儲項目`);
    
    return true;
  } catch (error) {
    console.error('❌ 清除本地存儲失敗:', error);
    return false;
  }
}

/**
 * 清除特定類型的數據
 */
export async function clearSpecificData(dataType: 'transactions' | 'assets' | 'user' | 'recurring'): Promise<boolean> {
  try {
    console.log(`🧹 開始清除 ${dataType} 數據...`);
    
    let keysToRemove: string[] = [];
    
    switch (dataType) {
      case 'transactions':
        keysToRemove = [
          STORAGE_KEYS.TRANSACTIONS,
          STORAGE_KEYS.CATEGORIES,
          STORAGE_KEYS.ACCOUNTS,
          STORAGE_KEYS.INITIALIZED
        ];
        break;
      case 'assets':
        keysToRemove = [STORAGE_KEYS.ASSETS, STORAGE_KEYS.LIABILITIES];
        break;
      case 'user':
        keysToRemove = [STORAGE_KEYS.USER_PROFILE];
        break;
      case 'recurring':
        keysToRemove = [STORAGE_KEYS.RECURRING_TRANSACTIONS];
        break;
      default:
        console.log('❌ 未知的數據類型:', dataType);
        return false;
    }
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log(`✅ ${dataType} 數據已清除`);
    return true;
  } catch (error) {
    console.error(`❌ 清除 ${dataType} 數據失敗:`, error);
    return false;
  }
}

/**
 * 檢查當前存儲狀態
 */
export async function checkStorageStatus(): Promise<StorageStatus | null> {
  try {
    console.log('🔍 檢查當前存儲狀態...');
    
    const results: StorageStatus = {};
    
    // 檢查所有存儲項目
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      const data = await AsyncStorage.getItem(storageKey);
      results[key] = data !== null;
    }
    
    console.log('📊 存儲狀態:');
    console.log('  🔄 交易相關:');
    console.log('    - 交易記錄:', results.TRANSACTIONS ? '存在' : '不存在');
    console.log('    - 類別設定:', results.CATEGORIES ? '存在' : '不存在');
    console.log('    - 帳戶設定:', results.ACCOUNTS ? '存在' : '不存在');
    console.log('    - 初始化標記:', results.INITIALIZED ? '已初始化' : '未初始化');
    
    console.log('  💰 資產負債:');
    console.log('    - 資產數據:', results.ASSETS ? '存在' : '不存在');
    console.log('    - 負債數據:', results.LIABILITIES ? '存在' : '不存在');
    
    console.log('  👤 用戶資料:');
    console.log('    - 用戶檔案:', results.USER_PROFILE ? '存在' : '不存在');
    
    console.log('  🔄 其他:');
    console.log('    - 循環交易:', results.RECURRING_TRANSACTIONS ? '存在' : '不存在');
    console.log('    - 設定:', results.SETTINGS ? '存在' : '不存在');
    console.log('    - 快取:', results.CACHE ? '存在' : '不存在');
    
    return results;
  } catch (error) {
    console.error('❌ 檢查存儲狀態失敗:', error);
    return null;
  }
}

/**
 * 獲取所有 FinTranzo 相關的存儲鍵名
 */
export async function getAllFinTranzoKeys(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const finTranzoKeys = allKeys.filter(key => key.startsWith('@FinTranzo:'));
    
    console.log('🔍 所有 FinTranzo 存儲鍵名:');
    finTranzoKeys.forEach(key => {
      console.log(`  - ${key}`);
    });
    
    return finTranzoKeys;
  } catch (error) {
    console.error('❌ 獲取存儲鍵名失敗:', error);
    return [];
  }
}

/**
 * 獲取存儲數據的大小（估算）
 */
export async function getStorageSize(): Promise<{ [key: string]: number }> {
  try {
    const sizes: { [key: string]: number } = {};
    
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      const data = await AsyncStorage.getItem(storageKey);
      if (data) {
        sizes[key] = new Blob([data]).size;
      } else {
        sizes[key] = 0;
      }
    }
    
    console.log('📊 存儲大小 (bytes):');
    Object.entries(sizes).forEach(([key, size]) => {
      console.log(`  - ${key}: ${size} bytes`);
    });
    
    return sizes;
  } catch (error) {
    console.error('❌ 獲取存儲大小失敗:', error);
    return {};
  }
}

/**
 * 備份所有數據到 JSON 字符串
 */
export async function backupAllData(): Promise<string | null> {
  try {
    console.log('💾 開始備份所有數據...');
    
    const backup: { [key: string]: any } = {};
    
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      const data = await AsyncStorage.getItem(storageKey);
      if (data) {
        try {
          backup[key] = JSON.parse(data);
        } catch {
          backup[key] = data; // 如果不是 JSON，直接保存字符串
        }
      }
    }
    
    const backupString = JSON.stringify(backup, null, 2);
    console.log('✅ 數據備份完成');
    
    return backupString;
  } catch (error) {
    console.error('❌ 備份數據失敗:', error);
    return null;
  }
}

/**
 * 從備份恢復數據
 */
export async function restoreFromBackup(backupString: string): Promise<boolean> {
  try {
    console.log('🔄 開始從備份恢復數據...');
    
    const backup = JSON.parse(backupString);
    
    for (const [key, data] of Object.entries(backup)) {
      const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
      if (storageKey && data) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        await AsyncStorage.setItem(storageKey, dataString);
      }
    }
    
    console.log('✅ 數據恢復完成');
    return true;
  } catch (error) {
    console.error('❌ 恢復數據失敗:', error);
    return false;
  }
}
