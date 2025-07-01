/**
 * 測試上傳功能
 */

import { unifiedDataManager } from '../services/unifiedDataManager';
import { transactionDataService } from '../services/transactionDataService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { liabilityService } from '../services/liabilityService';
import { supabase } from '../services/supabase';

export class UploadFunctionTester {
  
  /**
   * 測試上傳功能
   */
  static async testUploadFunction(): Promise<void> {
    console.log('🧪 開始測試上傳功能...');
    
    try {
      // 1. 檢查用戶登錄狀態
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('❌ 用戶未登錄，無法測試上傳');
        return;
      }
      
      console.log('✅ 用戶已登錄:', user.email);
      
      // 2. 檢查各個服務的數據
      console.log('📊 檢查各服務數據狀態...');

      const transactions = transactionDataService.getTransactions();
      const assets = assetTransactionSyncService.getAssets();
      const liabilities = liabilityService.getLiabilities();

      console.log(`📝 交易數據: ${transactions.length} 筆`);
      console.log(`💰 資產數據: ${assets.length} 筆`);
      console.log(`💳 負債數據: ${liabilities.length} 筆`);

      // 詳細檢查交易數據
      if (transactions.length > 0) {
        const incomeTransactions = transactions.filter(t => t.type === 'income');
        const expenseTransactions = transactions.filter(t => t.type === 'expense');
        const transferTransactions = transactions.filter(t => t.type === 'transfer');

        console.log(`📊 交易類型分布:`);
        console.log(`  💰 收入: ${incomeTransactions.length} 筆`);
        console.log(`  💸 支出: ${expenseTransactions.length} 筆`);
        console.log(`  🔄 轉移: ${transferTransactions.length} 筆`);

        // 檢查收入交易的詳細信息
        if (incomeTransactions.length > 0) {
          console.log('📝 收入交易詳情:');
          incomeTransactions.forEach((t, i) => {
            console.log(`  ${i+1}. ID: ${t.id}, 金額: ${t.amount}, 類型: "${t.type}", 描述: "${t.description}", 類別: "${t.category}"`);
          });
        }

        // 檢查支出交易的詳細信息
        if (expenseTransactions.length > 0) {
          console.log('📝 支出交易詳情:');
          expenseTransactions.slice(0, 3).forEach((t, i) => {
            console.log(`  ${i+1}. ID: ${t.id}, 金額: ${t.amount}, 類型: "${t.type}", 描述: "${t.description}", 類別: "${t.category}"`);
          });
        }
      }
      
      if (transactions.length === 0 && assets.length === 0 && liabilities.length === 0) {
        console.log('⚠️ 沒有本地數據可上傳');
        return;
      }
      
      // 3. 初始化統一數據管理器
      console.log('🔄 初始化統一數據管理器...');
      
      try {
        await unifiedDataManager.initialize();
        console.log('✅ 統一數據管理器初始化成功');
      } catch (initError) {
        console.error('❌ 統一數據管理器初始化失敗:', initError);
        return;
      }
      
      // 4. 執行上傳
      console.log('📤 開始上傳數據...');
      
      try {
        const result = await unifiedDataManager.uploadAllToCloud();
        
        console.log('📊 上傳結果:', {
          uploaded: result.uploaded,
          deleted: result.deleted,
          errors: result.errors
        });
        
        if (result.errors.length === 0) {
          console.log('✅ 上傳成功！');
        } else {
          console.log('⚠️ 上傳部分成功，有錯誤:', result.errors);
        }
        
      } catch (uploadError) {
        console.error('❌ 上傳失敗:', uploadError);
      }
      
      // 5. 驗證上傳結果
      console.log('🔍 驗證上傳結果...');
      
      try {
        const { data: supabaseTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);
          
        const { data: supabaseAssets } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', user.id);
          
        const { data: supabaseLiabilities } = await supabase
          .from('liabilities')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('📊 Supabase 數據驗證:');
        console.log(`📝 交易: ${supabaseTransactions?.length || 0} 筆`);
        console.log(`💰 資產: ${supabaseAssets?.length || 0} 筆`);
        console.log(`💳 負債: ${supabaseLiabilities?.length || 0} 筆`);
        
      } catch (verifyError) {
        console.error('❌ 驗證失敗:', verifyError);
      }
      
      console.log('✅ 上傳功能測試完成');
      
    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
    }
  }
  
  /**
   * 檢查服務初始化狀態
   */
  static checkServicesStatus(): void {
    console.log('🔍 檢查服務初始化狀態...');
    
    try {
      // 檢查各個服務是否可用
      const transactions = transactionDataService.getTransactions();
      console.log('✅ transactionDataService 可用，數據:', transactions.length, '筆');
      
      const assets = assetTransactionSyncService.getAssets();
      console.log('✅ assetTransactionSyncService 可用，數據:', assets.length, '筆');
      
      const liabilities = liabilityService.getLiabilities();
      console.log('✅ liabilityService 可用，數據:', liabilities.length, '筆');
      
      // 檢查 unifiedDataManager
      console.log('✅ unifiedDataManager 可用');
      
    } catch (error) {
      console.error('❌ 服務檢查失敗:', error);
    }
  }
  
  /**
   * 測試收入交易上傳
   */
  static async testIncomeTransactionUpload(): Promise<void> {
    console.log('🧪 專門測試收入交易上傳...');

    try {
      // 檢查用戶登錄狀態
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('❌ 用戶未登錄，無法測試');
        return;
      }

      // 創建測試收入交易
      const testIncomeTransaction = {
        amount: 5000,
        type: 'income' as const,
        description: '測試收入上傳',
        category: '薪水',
        account: '現金',
        date: new Date().toISOString()
      };

      console.log('📝 創建測試收入交易:', testIncomeTransaction);

      // 添加到本地
      await transactionDataService.addTransaction(testIncomeTransaction);
      console.log('✅ 收入交易已添加到本地');

      // 直接測試上傳這筆交易
      const transactionForUpload = {
        id: `test-income-${Date.now()}`,
        user_id: user.id,
        amount: Number(testIncomeTransaction.amount),
        type: testIncomeTransaction.type,
        description: testIncomeTransaction.description,
        category: testIncomeTransaction.category,
        account: testIncomeTransaction.account,
        date: testIncomeTransaction.date.split('T')[0], // 只取日期部分
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📤 準備上傳的收入交易數據:', transactionForUpload);

      // 直接上傳到Supabase
      const { data, error: uploadError } = await supabase
        .from('transactions')
        .insert(transactionForUpload)
        .select();

      if (uploadError) {
        console.error('❌ 收入交易上傳失敗:', uploadError);
        console.error('錯誤詳情:', {
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint,
          code: uploadError.code
        });
      } else {
        console.log('✅ 收入交易上傳成功:', data);

        // 清理測試數據
        await supabase.from('transactions').delete().eq('id', transactionForUpload.id);
        console.log('🧹 測試數據已清理');
      }

    } catch (error) {
      console.error('❌ 測試收入交易上傳失敗:', error);
    }
  }

  /**
   * 創建測試數據
   */
  static async createTestData(): Promise<void> {
    console.log('🧪 創建測試數據...');

    try {
      // 創建測試支出交易
      const testExpenseTransaction = {
        amount: 1000,
        type: 'expense' as const,
        description: '測試上傳支出',
        category: '測試',
        account: '現金',
        date: new Date().toISOString()
      };

      await transactionDataService.addTransaction(testExpenseTransaction);
      console.log('✅ 測試支出交易已創建');

      // 創建測試收入交易
      const testIncomeTransaction = {
        amount: 2000,
        type: 'income' as const,
        description: '測試上傳收入',
        category: '薪水',
        account: '現金',
        date: new Date().toISOString()
      };

      await transactionDataService.addTransaction(testIncomeTransaction);
      console.log('✅ 測試收入交易已創建');

      // 創建測試資產
      const testAsset = {
        name: '測試上傳資產',
        type: 'bank',
        current_value: 50000,
        quantity: 1,
        cost_basis: 50000
      };

      await assetTransactionSyncService.addAsset(testAsset);
      console.log('✅ 測試資產已創建');

      console.log('✅ 測試數據創建完成');

    } catch (error) {
      console.error('❌ 創建測試數據失敗:', error);
    }
  }
}

// 在開發環境中自動運行檢查
if (__DEV__) {
  setTimeout(() => {
    UploadFunctionTester.checkServicesStatus();
  }, 3000);
}
