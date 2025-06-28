/**
 * 時間戳記即時同步功能測試
 */

import { timestampSyncService } from '../services/timestampSyncService';
import { transactionDataService } from '../services/transactionDataService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { liabilityService } from '../services/liabilityService';
import { supabase } from '../services/supabase';

export class TimestampSyncTester {
  
  /**
   * 運行完整的同步測試
   */
  static async runFullTest(): Promise<void> {
    console.log('🧪 開始時間戳記即時同步測試...');
    
    try {
      // 1. 檢查服務初始化狀態
      await this.testServiceInitialization();
      
      // 2. 檢查用戶登錄狀態
      await this.testUserAuthentication();
      
      // 3. 測試同步狀態
      await this.testSyncStatus();
      
      // 4. 測試交易同步
      await this.testTransactionSync();
      
      // 5. 測試資產同步
      await this.testAssetSync();
      
      // 6. 測試負債同步
      await this.testLiabilitySync();
      
      console.log('✅ 時間戳記即時同步測試完成');
      
    } catch (error) {
      console.error('❌ 時間戳記即時同步測試失敗:', error);
    }
  }
  
  /**
   * 測試服務初始化
   */
  private static async testServiceInitialization(): Promise<void> {
    console.log('🔍 測試1: 檢查服務初始化狀態...');
    
    const syncStatus = timestampSyncService.getSyncStatus();
    console.log('📊 同步狀態:', {
      isEnabled: syncStatus.isEnabled,
      pendingItems: syncStatus.pendingItems,
      lastSyncTime: syncStatus.lastSyncTime,
      isOnline: syncStatus.isOnline
    });
    
    if (syncStatus.isEnabled) {
      console.log('✅ 時間戳記同步服務已啟用');
    } else {
      console.log('⚠️ 時間戳記同步服務未啟用（可能用戶未登錄）');
    }
  }
  
  /**
   * 測試用戶認證狀態
   */
  private static async testUserAuthentication(): Promise<void> {
    console.log('🔍 測試2: 檢查用戶認證狀態...');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ 獲取用戶狀態失敗:', error);
      return;
    }
    
    if (user) {
      console.log('✅ 用戶已登錄:', user.email);
      console.log('👤 用戶ID:', user.id);
    } else {
      console.log('⚠️ 用戶未登錄，即時同步將不會工作');
    }
  }
  
  /**
   * 測試同步狀態
   */
  private static async testSyncStatus(): Promise<void> {
    console.log('🔍 測試3: 檢查同步隊列狀態...');
    
    const syncStatus = timestampSyncService.getSyncStatus();
    
    if (syncStatus.pendingItems > 0) {
      console.log(`📋 同步隊列中有 ${syncStatus.pendingItems} 個待處理項目`);
      
      // 手動觸發同步
      console.log('🔄 手動觸發同步處理...');
      await timestampSyncService.triggerSync();
      
      // 檢查同步後的狀態
      const newStatus = timestampSyncService.getSyncStatus();
      console.log(`📋 同步後隊列項目數: ${newStatus.pendingItems}`);
    } else {
      console.log('✅ 同步隊列為空，沒有待處理項目');
    }
  }
  
  /**
   * 測試交易同步（模擬）
   */
  private static async testTransactionSync(): Promise<void> {
    console.log('🔍 測試4: 測試交易同步機制...');
    
    // 獲取當前交易數量
    const transactions = transactionDataService.getTransactions();
    console.log(`📊 當前本地交易數量: ${transactions.length}`);
    
    // 檢查最近的交易是否有時間戳記
    if (transactions.length > 0) {
      const latestTransaction = transactions[transactions.length - 1];
      console.log('📝 最新交易:', {
        id: latestTransaction.id,
        description: latestTransaction.description,
        amount: latestTransaction.amount,
        created_at: latestTransaction.created_at
      });
    }
    
    console.log('✅ 交易同步機制檢查完成');
  }
  
  /**
   * 測試資產同步（模擬）
   */
  private static async testAssetSync(): Promise<void> {
    console.log('🔍 測試5: 測試資產同步機制...');
    
    // 獲取當前資產數量
    const assets = assetTransactionSyncService.getAssets();
    console.log(`📊 當前本地資產數量: ${assets.length}`);
    
    // 檢查資產數據結構
    if (assets.length > 0) {
      const firstAsset = assets[0];
      console.log('📝 第一個資產:', {
        id: firstAsset.id,
        name: firstAsset.name,
        type: firstAsset.type,
        current_value: firstAsset.current_value
      });
    }
    
    console.log('✅ 資產同步機制檢查完成');
  }
  
  /**
   * 測試負債同步（模擬）
   */
  private static async testLiabilitySync(): Promise<void> {
    console.log('🔍 測試6: 測試負債同步機制...');
    
    // 獲取當前負債數量
    const liabilities = liabilityService.getLiabilities();
    console.log(`📊 當前本地負債數量: ${liabilities.length}`);
    
    // 檢查負債數據結構
    if (liabilities.length > 0) {
      const firstLiability = liabilities[0];
      console.log('📝 第一個負債:', {
        id: firstLiability.id,
        name: firstLiability.name,
        balance: firstLiability.balance,
        type: firstLiability.type
      });
    }
    
    console.log('✅ 負債同步機制檢查完成');
  }
  
  /**
   * 測試創建新交易的同步
   */
  static async testCreateTransaction(): Promise<void> {
    console.log('🧪 測試創建新交易的即時同步...');
    
    try {
      const testTransaction = {
        amount: 100,
        type: 'expense' as const,
        description: '測試即時同步交易',
        category: '測試',
        account: '現金',
        date: new Date().toISOString()
      };
      
      console.log('📝 創建測試交易:', testTransaction);
      
      // 創建交易（這應該會觸發即時同步）
      await transactionDataService.addTransaction(testTransaction);
      
      console.log('✅ 測試交易已創建，檢查同步狀態...');
      
      // 檢查同步狀態
      const syncStatus = timestampSyncService.getSyncStatus();
      console.log('📊 同步狀態:', syncStatus);
      
    } catch (error) {
      console.error('❌ 測試創建交易失敗:', error);
    }
  }
}

// 在開發環境中自動運行測試
if (__DEV__) {
  // 延遲運行測試，確保服務已初始化
  setTimeout(() => {
    TimestampSyncTester.runFullTest();
  }, 5000);
}
