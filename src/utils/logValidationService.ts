/**
 * 日誌驗證服務
 * 檢測和防止虛假成功日誌
 */

import { supabase, TABLES } from '../services/supabase';

export interface LogValidationResult {
  isValid: boolean;
  actualResult: any;
  message: string;
  timestamp: Date;
}

class LogValidationService {
  
  /**
   * 驗證交易操作的真實性
   */
  async validateTransactionOperation(
    operation: 'create' | 'update' | 'delete',
    transactionId: string,
    userId: string,
    expectedData?: any
  ): Promise<LogValidationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      switch (operation) {
        case 'create':
        case 'update':
          if (error && error.code === 'PGRST116') {
            return {
              isValid: false,
              actualResult: null,
              message: `交易 ${operation} 失敗: 記錄不存在於雲端`,
              timestamp: new Date()
            };
          }
          
          if (error) {
            return {
              isValid: false,
              actualResult: error,
              message: `交易 ${operation} 驗證失敗: ${error.message}`,
              timestamp: new Date()
            };
          }

          return {
            isValid: true,
            actualResult: data,
            message: `交易 ${operation} 驗證成功`,
            timestamp: new Date()
          };

        case 'delete':
          if (error && error.code === 'PGRST116') {
            return {
              isValid: true,
              actualResult: null,
              message: `交易刪除驗證成功: 記錄已從雲端移除`,
              timestamp: new Date()
            };
          }

          if (data) {
            return {
              isValid: false,
              actualResult: data,
              message: `交易刪除失敗: 記錄仍然存在於雲端`,
              timestamp: new Date()
            };
          }

          return {
            isValid: false,
            actualResult: error,
            message: `交易刪除驗證失敗: ${error?.message}`,
            timestamp: new Date()
          };

        default:
          return {
            isValid: false,
            actualResult: null,
            message: `未知操作類型: ${operation}`,
            timestamp: new Date()
          };
      }
    } catch (error) {
      return {
        isValid: false,
        actualResult: error,
        message: `驗證交易操作異常: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 驗證資產操作的真實性
   */
  async validateAssetOperation(
    operation: 'create' | 'update' | 'delete',
    assetId: string,
    userId: string
  ): Promise<LogValidationResult> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .select('*')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      switch (operation) {
        case 'create':
        case 'update':
          if (error && error.code === 'PGRST116') {
            return {
              isValid: false,
              actualResult: null,
              message: `資產 ${operation} 失敗: 記錄不存在於雲端`,
              timestamp: new Date()
            };
          }
          
          if (error) {
            return {
              isValid: false,
              actualResult: error,
              message: `資產 ${operation} 驗證失敗: ${error.message}`,
              timestamp: new Date()
            };
          }

          return {
            isValid: true,
            actualResult: data,
            message: `資產 ${operation} 驗證成功`,
            timestamp: new Date()
          };

        case 'delete':
          if (error && error.code === 'PGRST116') {
            return {
              isValid: true,
              actualResult: null,
              message: `資產刪除驗證成功: 記錄已從雲端移除`,
              timestamp: new Date()
            };
          }

          if (data) {
            return {
              isValid: false,
              actualResult: data,
              message: `資產刪除失敗: 記錄仍然存在於雲端`,
              timestamp: new Date()
            };
          }

          return {
            isValid: false,
            actualResult: error,
            message: `資產刪除驗證失敗: ${error?.message}`,
            timestamp: new Date()
          };

        default:
          return {
            isValid: false,
            actualResult: null,
            message: `未知操作類型: ${operation}`,
            timestamp: new Date()
          };
      }
    } catch (error) {
      return {
        isValid: false,
        actualResult: error,
        message: `驗證資產操作異常: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 驗證批量上傳操作的真實性
   */
  async validateBatchUpload(
    table: string,
    userId: string,
    expectedCount: number
  ): Promise<LogValidationResult> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', userId);

      if (error) {
        return {
          isValid: false,
          actualResult: error,
          message: `批量上傳驗證失敗: ${error.message}`,
          timestamp: new Date()
        };
      }

      const actualCount = data?.length || 0;
      const isValid = actualCount >= expectedCount;

      return {
        isValid,
        actualResult: { expectedCount, actualCount },
        message: isValid 
          ? `批量上傳驗證成功: 期望 ${expectedCount} 筆，實際 ${actualCount} 筆`
          : `批量上傳驗證失敗: 期望 ${expectedCount} 筆，實際只有 ${actualCount} 筆`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        isValid: false,
        actualResult: error,
        message: `驗證批量上傳異常: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 記錄經過驗證的日誌
   */
  logValidatedResult(operation: string, result: LogValidationResult): void {
    const prefix = result.isValid ? '✅ [已驗證]' : '❌ [驗證失敗]';
    const logMethod = result.isValid ? console.log : console.error;
    
    logMethod(`${prefix} ${operation}: ${result.message}`);
    
    if (result.actualResult && typeof result.actualResult === 'object') {
      logMethod(`📝 [驗證詳情]`, result.actualResult);
    }
    
    logMethod(`⏰ [驗證時間]`, result.timestamp.toISOString());
  }

  /**
   * 替換虛假成功日誌的安全日誌方法
   */
  safeSuccessLog(operation: string, validationPromise: Promise<LogValidationResult>): void {
    validationPromise
      .then(result => {
        this.logValidatedResult(operation, result);
      })
      .catch(error => {
        console.error(`❌ [驗證異常] ${operation}:`, error);
      });
  }

  /**
   * 檢查系統中的虛假日誌模式
   */
  detectFakeLogPatterns(): string[] {
    const fakePatterns = [
      '沒有實際驗證就記錄成功',
      '只檢查 error 為空就認為成功',
      '沒有查詢雲端數據就聲稱同步成功',
      '沒有驗證本地存儲就聲稱保存成功',
      '批量操作沒有檢查實際影響行數',
      '刪除操作沒有驗證記錄是否真的被刪除'
    ];

    console.warn('⚠️ 常見虛假日誌模式:');
    fakePatterns.forEach((pattern, index) => {
      console.warn(`  ${index + 1}. ${pattern}`);
    });

    return fakePatterns;
  }
}

// 創建單例實例
export const logValidationService = new LogValidationService();
