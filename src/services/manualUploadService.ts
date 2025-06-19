/**
 * 手動上傳服務 - 專門處理本地數據到 Supabase 的上傳
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from './supabase';
import { transactionDataService } from './transactionDataService';
import { assetTransactionSyncService } from './assetTransactionSyncService';
import { liabilityService } from './liabilityService';

// UUID 生成函數
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// UUID 驗證函數
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 本地存儲的鍵名
const STORAGE_KEYS = {
  TRANSACTIONS: '@FinTranzo:transactions',
  ASSETS: '@FinTranzo:assets',
  LIABILITIES: '@FinTranzo:liabilities',
  ACCOUNTS: '@FinTranzo:accounts',
  CATEGORIES: '@FinTranzo:categories'
} as const;

export interface UploadResult {
  success: boolean;
  message: string;
  details: {
    transactions: number;
    assets: number;
    liabilities: number;
    accounts: number;
    categories: number;
  };
  errors: string[];
}

class ManualUploadService {
  /**
   * 手動上傳所有本地數據到 Supabase
   */
  async uploadAllLocalData(): Promise<UploadResult> {
    const result: UploadResult = {
      success: false,
      message: '',
      details: {
        transactions: 0,
        assets: 0,
        liabilities: 0,
        accounts: 0,
        categories: 0
      },
      errors: []
    };

    try {
      console.log('🚀 開始手動上傳所有本地數據到 Supabase...');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('用戶未登錄，無法上傳數據');
      }

      console.log('✅ 用戶已登錄:', user.email);

      // 1. 上傳交易數據
      try {
        const transactionCount = await this.uploadTransactions(user.id);
        result.details.transactions = transactionCount;
        console.log(`✅ 交易數據上傳完成: ${transactionCount} 筆`);
      } catch (error) {
        const errorMsg = `交易數據上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // 2. 上傳資產數據
      try {
        const assetCount = await this.uploadAssets(user.id);
        result.details.assets = assetCount;
        console.log(`✅ 資產數據上傳完成: ${assetCount} 筆`);
      } catch (error) {
        const errorMsg = `資產數據上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // 3. 上傳負債數據
      try {
        const liabilityCount = await this.uploadLiabilities(user.id);
        result.details.liabilities = liabilityCount;
        console.log(`✅ 負債數據上傳完成: ${liabilityCount} 筆`);
      } catch (error) {
        const errorMsg = `負債數據上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // 4. 上傳帳戶數據
      try {
        const accountCount = await this.uploadAccounts(user.id);
        result.details.accounts = accountCount;
        console.log(`✅ 帳戶數據上傳完成: ${accountCount} 筆`);
      } catch (error) {
        const errorMsg = `帳戶數據上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // 5. 上傳類別數據
      try {
        const categoryCount = await this.uploadCategories(user.id);
        result.details.categories = categoryCount;
        console.log(`✅ 類別數據上傳完成: ${categoryCount} 筆`);
      } catch (error) {
        const errorMsg = `類別數據上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // 判斷整體結果
      const totalUploaded = Object.values(result.details).reduce((sum, count) => sum + count, 0);
      
      if (result.errors.length === 0) {
        result.success = true;
        result.message = `上傳成功！共上傳 ${totalUploaded} 筆數據`;
      } else if (totalUploaded > 0) {
        result.success = true;
        result.message = `部分上傳成功！共上傳 ${totalUploaded} 筆數據，${result.errors.length} 個錯誤`;
      } else {
        result.success = false;
        result.message = `上傳失敗！${result.errors.length} 個錯誤`;
      }

      console.log('🎯 上傳結果:', result);
      return result;

    } catch (error) {
      console.error('❌ 手動上傳過程中發生異常:', error);
      result.success = false;
      result.message = `上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
      result.errors.push(result.message);
      return result;
    }
  }

  /**
   * 修復上傳：上傳交易數據
   */
  private async uploadTransactions(userId: string): Promise<number> {
    console.log('🔄 修復上傳：開始上傳交易數據...');

    // 從服務獲取交易數據
    const transactions = transactionDataService.getTransactions();

    if (!transactions || transactions.length === 0) {
      console.log('📝 修復上傳：沒有交易數據需要上傳');
      return 0;
    }

    console.log(`📊 修復上傳：找到 ${transactions.length} 筆交易數據`);

    // 修復：更寬鬆的過濾條件，確保有效數據能通過
    const validTransactions = transactions.filter((transaction: any) => {
      if (!transaction) return false;
      if (!transaction.type || transaction.type === 'undefined' || transaction.type === '') return false;
      if (transaction.amount === undefined || transaction.amount === null) return false;
      if (!transaction.description) return false;
      return true;
    });

    console.log(`🔍 修復上傳：過濾後有效交易數量: ${validTransactions.length} / ${transactions.length}`);

    if (validTransactions.length === 0) {
      console.log('📝 修復上傳：沒有有效的交易數據需要上傳');
      return 0;
    }

    // 轉換交易數據格式以匹配 Supabase 表結構
    const convertedTransactions = validTransactions.map((transaction: any) => {
      // 確保 ID 是有效的 UUID 格式
      let transactionId = transaction.id;
      if (!transactionId || !isValidUUID(transactionId)) {
        transactionId = generateUUID();
        console.log(`🔄 為交易生成新的 UUID: ${transactionId}`);
      }

      // 修復：確保所有必要字段都有正確的值
      return {
        id: transactionId,
        user_id: userId,
        account_id: null,
        amount: Number(transaction.amount) || 0,
        type: transaction.type,
        description: transaction.description || '無描述',
        category: transaction.category || '其他',
        account: transaction.account || '現金',
        from_account: transaction.fromAccount || transaction.from_account || null,
        to_account: transaction.toAccount || transaction.to_account || null,
        date: transaction.date || new Date().toISOString().split('T')[0],
        is_recurring: Boolean(transaction.is_recurring),
        recurring_frequency: transaction.recurring_frequency || null,
        max_occurrences: transaction.max_occurrences || null,
        start_date: transaction.start_date || null,
        created_at: transaction.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log('📝 轉換後的交易數據示例:', convertedTransactions[0]);

    // 使用 upsert 避免重複資料
    const { data, error } = await supabase
      .from(TABLES.TRANSACTIONS)
      .upsert(convertedTransactions, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ 交易記錄上傳錯誤:', error);
      throw new Error(`交易記錄上傳失敗: ${error.message}`);
    }

    // 驗證交易記錄是否真的上傳成功
    const { data: verifyData, error: verifyError } = await supabase
      .from(TABLES.TRANSACTIONS)
      .select('id')
      .eq('user_id', userId);

    if (verifyError) {
      console.error('❌ 交易記錄上傳驗證失敗:', verifyError);
      throw new Error(`交易記錄上傳驗證失敗: ${verifyError.message}`);
    }

    const actualCount = verifyData?.length || 0;
    console.log(`✅ 交易記錄上傳驗證成功: 雲端實際有 ${actualCount} 筆記錄`);
    return actualCount;
  }

  /**
   * 上傳資產數據
   */
  private async uploadAssets(userId: string): Promise<number> {
    console.log('🔄 開始上傳資產數據...');

    // 從服務獲取資產數據
    const assets = assetTransactionSyncService.getAssets();
    
    if (assets.length === 0) {
      console.log('📝 沒有資產數據需要上傳');
      return 0;
    }

    // 轉換為 Supabase 格式
    const supabaseAssets = assets.map((asset: any) => {
      // 確保 ID 是有效的 UUID 格式
      let assetId = asset.id;
      if (!assetId || !isValidUUID(assetId)) {
        assetId = generateUUID();
        console.log(`🔄 為資產生成新的 UUID: ${assetId}`);
      }

      // 修復上傳：確保所有必要欄位都有值
      return {
        id: assetId,
        user_id: userId,
        name: asset.name || '未命名資產',
        type: asset.type || 'other',
        value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
        current_value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
        cost_basis: Number(asset.cost_basis || asset.current_value || asset.value || 0),
        quantity: Number(asset.quantity) || 1,
        stock_code: asset.stock_code || null,
        purchase_price: Number(asset.purchase_price) || 0,
        current_price: Number(asset.current_price) || 0,
        sort_order: Number(asset.sort_order) || 0,
        created_at: asset.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log('📝 轉換後的資產數據示例:', supabaseAssets[0]);

    // 使用 upsert 避免重複資料
    const { data, error } = await supabase
      .from(TABLES.ASSETS)
      .upsert(supabaseAssets, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ 資產數據上傳錯誤:', error);
      throw new Error(`資產數據上傳失敗: ${error.message}`);
    }

    // 驗證資產數據是否真的上傳成功
    const { data: verifyData, error: verifyError } = await supabase
      .from(TABLES.ASSETS)
      .select('id')
      .eq('user_id', userId);

    if (verifyError) {
      console.error('❌ 資產數據上傳驗證失敗:', verifyError);
      throw new Error(`資產數據上傳驗證失敗: ${verifyError.message}`);
    }

    const actualCount = verifyData?.length || 0;
    console.log(`✅ 資產數據上傳驗證成功: 雲端實際有 ${actualCount} 筆記錄`);
    return actualCount;
  }

  /**
   * 上傳負債數據
   */
  private async uploadLiabilities(userId: string): Promise<number> {
    console.log('🔄 開始上傳負債數據...');

    // 從服務獲取負債數據
    const liabilities = liabilityService.getLiabilities();
    
    if (liabilities.length === 0) {
      console.log('📝 沒有負債數據需要上傳');
      return 0;
    }

    // 轉換負債數據格式以匹配 Supabase 表結構
    const convertedLiabilities = liabilities.map((liability: any) => {
      // 確保 ID 是有效的 UUID 格式
      let liabilityId = liability.id;
      if (!liabilityId || !isValidUUID(liabilityId)) {
        liabilityId = generateUUID();
        console.log(`🔄 為負債生成新的 UUID: ${liabilityId}`);
      }

      return {
        id: liabilityId,
        user_id: userId,
        name: liability.name,
        type: liability.type,
        balance: liability.balance,
        interest_rate: liability.interest_rate || 0,
        monthly_payment: liability.monthly_payment || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log('📝 轉換後的負債數據示例:', convertedLiabilities[0]);

    // 使用 upsert 避免重複資料
    const { data, error } = await supabase
      .from(TABLES.LIABILITIES)
      .upsert(convertedLiabilities, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ 負債數據上傳錯誤:', error);
      throw new Error(`負債數據上傳失敗: ${error.message}`);
    }

    console.log(`✅ 已上傳 ${convertedLiabilities.length} 筆負債記錄`);
    return convertedLiabilities.length;
  }

  /**
   * 上傳帳戶數據
   */
  private async uploadAccounts(userId: string): Promise<number> {
    console.log('🔄 開始上傳帳戶數據...');

    // 從服務獲取帳戶數據
    const accounts = transactionDataService.getAccounts();
    
    if (accounts.length === 0) {
      console.log('📝 沒有帳戶數據需要上傳');
      return 0;
    }

    // 轉換帳戶數據格式以匹配 Supabase 表結構
    const convertedAccounts = accounts.map((account: any) => {
      // 確保 ID 是有效的 UUID 格式
      let accountId = account.id;
      if (!accountId || !isValidUUID(accountId)) {
        accountId = generateUUID();
        console.log(`🔄 為帳戶生成新的 UUID: ${accountId}`);
      }

      return {
        id: accountId,
        user_id: userId,
        name: account.name,
        type: account.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log('📝 轉換後的帳戶數據示例:', convertedAccounts[0]);

    // 使用 upsert 避免重複資料
    const { data, error } = await supabase
      .from(TABLES.ACCOUNTS)
      .upsert(convertedAccounts, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ 帳戶數據上傳錯誤:', error);
      throw new Error(`帳戶數據上傳失敗: ${error.message}`);
    }

    console.log(`✅ 已上傳 ${convertedAccounts.length} 筆帳戶記錄`);
    return convertedAccounts.length;
  }

  /**
   * 上傳類別數據
   */
  private async uploadCategories(userId: string): Promise<number> {
    console.log('🔄 開始上傳類別數據...');

    // 從服務獲取類別數據
    const categories = transactionDataService.getCategories();

    if (categories.length === 0) {
      console.log('📝 沒有類別數據需要上傳');
      return 0;
    }

    // 轉換類別數據格式以匹配 Supabase 表結構
    const convertedCategories = categories.map((category: any) => {
      // 確保 ID 是有效的 UUID 格式
      let categoryId = category.id;
      if (!categoryId || !isValidUUID(categoryId)) {
        categoryId = generateUUID();
        console.log(`🔄 為類別生成新的 UUID: ${categoryId}`);
      }

      return {
        id: categoryId,
        user_id: userId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    console.log('📝 轉換後的類別數據示例:', convertedCategories[0]);

    // 先清除用戶的現有類別數據，然後插入新數據
    console.log('🧹 清除用戶現有類別數據...');
    const { error: deleteError } = await supabase
      .from(TABLES.CATEGORIES)
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ 清除現有類別數據失敗:', deleteError);
      throw new Error(`清除現有類別數據失敗: ${deleteError.message}`);
    }

    // 插入新的類別數據
    const { data, error } = await supabase
      .from(TABLES.CATEGORIES)
      .insert(convertedCategories)
      .select();

    if (error) {
      console.error('❌ 類別數據上傳錯誤:', error);
      throw new Error(`類別數據上傳失敗: ${error.message}`);
    }

    console.log(`✅ 已上傳 ${convertedCategories.length} 筆類別記錄`);
    return convertedCategories.length;
  }
}

export const manualUploadService = new ManualUploadService();
