/**
 * 真實日誌服務
 * 確保所有成功日誌都經過實際驗證
 */

import { supabase, TABLES } from './supabase';

export interface VerificationResult {
  success: boolean;
  message: string;
  details?: any;
}

class TruthfulLoggingService {
  
  /**
   * 驗證交易是否真的存在於雲端
   */
  async verifyTransactionExists(transactionId: string, userId: string): Promise<VerificationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('id, description, amount, type')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: `交易記錄不存在於雲端: ${transactionId}`,
            details: { error: error.code }
          };
        }
        return {
          success: false,
          message: `驗證交易記錄失敗: ${error.message}`,
          details: { error }
        };
      }

      if (!data) {
        return {
          success: false,
          message: `交易記錄不存在於雲端: ${transactionId}`,
          details: null
        };
      }

      return {
        success: true,
        message: `交易記錄確實存在於雲端: ${transactionId}`,
        details: data
      };
    } catch (error) {
      return {
        success: false,
        message: `驗證交易記錄異常: ${error.message}`,
        details: { error }
      };
    }
  }

  /**
   * 驗證交易是否真的從雲端刪除
   */
  async verifyTransactionDeleted(transactionId: string, userId: string): Promise<VerificationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('id')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // PGRST116 表示沒有找到記錄，這是我們期望的結果
        return {
          success: true,
          message: `交易記錄確實已從雲端刪除: ${transactionId}`,
          details: null
        };
      }

      if (data) {
        return {
          success: false,
          message: `交易記錄仍然存在於雲端，刪除失敗: ${transactionId}`,
          details: data
        };
      }

      return {
        success: false,
        message: `驗證交易刪除時發生未知錯誤: ${error?.message}`,
        details: { error }
      };
    } catch (error) {
      return {
        success: false,
        message: `驗證交易刪除異常: ${error.message}`,
        details: { error }
      };
    }
  }

  /**
   * 驗證資產是否真的存在於雲端
   */
  async verifyAssetExists(assetId: string, userId: string): Promise<VerificationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .select('id, name, type, current_value')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: `資產記錄不存在於雲端: ${assetId}`,
            details: { error: error.code }
          };
        }
        return {
          success: false,
          message: `驗證資產記錄失敗: ${error.message}`,
          details: { error }
        };
      }

      if (!data) {
        return {
          success: false,
          message: `資產記錄不存在於雲端: ${assetId}`,
          details: null
        };
      }

      return {
        success: true,
        message: `資產記錄確實存在於雲端: ${assetId}`,
        details: data
      };
    } catch (error) {
      return {
        success: false,
        message: `驗證資產記錄異常: ${error.message}`,
        details: { error }
      };
    }
  }

  /**
   * 驗證資產是否真的從雲端刪除
   */
  async verifyAssetDeleted(assetId: string, userId: string): Promise<VerificationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .select('id')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        return {
          success: true,
          message: `資產記錄確實已從雲端刪除: ${assetId}`,
          details: null
        };
      }

      if (data) {
        return {
          success: false,
          message: `資產記錄仍然存在於雲端，刪除失敗: ${assetId}`,
          details: data
        };
      }

      return {
        success: false,
        message: `驗證資產刪除時發生未知錯誤: ${error?.message}`,
        details: { error }
      };
    } catch (error) {
      return {
        success: false,
        message: `驗證資產刪除異常: ${error.message}`,
        details: { error }
      };
    }
  }

  /**
   * 記錄經過驗證的成功日誌
   */
  logVerifiedSuccess(operation: string, result: VerificationResult): void {
    if (result.success) {
      console.log(`✅ [已驗證] ${result.message}`);
      if (result.details) {
        console.log(`📝 [驗證詳情]`, result.details);
      }
    } else {
      console.error(`❌ [驗證失敗] ${result.message}`);
      if (result.details) {
        console.error(`📝 [失敗詳情]`, result.details);
      }
    }
  }

  /**
   * 記錄經過驗證的失敗日誌
   */
  logVerifiedFailure(operation: string, result: VerificationResult): void {
    if (result.success) {
      console.error(`⚠️ [意外成功] 操作 ${operation} 預期失敗但實際成功: ${result.message}`);
    } else {
      console.log(`✅ [已驗證失敗] ${result.message}`);
      if (result.details) {
        console.log(`📝 [失敗詳情]`, result.details);
      }
    }
  }

  /**
   * 批量驗證多個操作
   */
  async batchVerify(verifications: Array<{
    operation: string;
    verify: () => Promise<VerificationResult>;
  }>): Promise<{ successful: number; failed: number; results: VerificationResult[] }> {
    const results: VerificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const { operation, verify } of verifications) {
      try {
        const result = await verify();
        results.push(result);
        
        if (result.success) {
          successful++;
          this.logVerifiedSuccess(operation, result);
        } else {
          failed++;
          this.logVerifiedFailure(operation, result);
        }
      } catch (error) {
        const errorResult: VerificationResult = {
          success: false,
          message: `驗證操作 ${operation} 時發生異常: ${error.message}`,
          details: { error }
        };
        results.push(errorResult);
        failed++;
        this.logVerifiedFailure(operation, errorResult);
      }
    }

    console.log(`📊 [批量驗證結果] 成功: ${successful}, 失敗: ${failed}`);
    return { successful, failed, results };
  }
}

// 創建單例實例
export const truthfulLoggingService = new TruthfulLoggingService();
