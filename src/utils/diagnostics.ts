/**
 * 診斷工具
 * 幫助用戶檢查應用狀態和問題
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { isValidUUID } from './uuid';

export interface DiagnosticResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export class DiagnosticTool {
  private results: DiagnosticResult[] = [];

  /**
   * 運行所有診斷測試
   */
  async runAllTests(): Promise<DiagnosticResult[]> {
    this.results = [];
    
    console.log('🔍 開始運行診斷測試...');
    
    await this.testLocalStorage();
    await this.testSupabaseConnection();
    await this.testUserAuthentication();
    await this.testDataIntegrity();
    
    console.log('✅ 診斷測試完成');
    return this.results;
  }

  /**
   * 測試本地存儲
   */
  private async testLocalStorage(): Promise<void> {
    try {
      // 測試基本讀寫
      const testKey = '@FinTranzo:diagnostic_test';
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (retrieved === testValue) {
        this.addResult('本地存儲', '基本讀寫測試', 'pass', '本地存儲功能正常');
      } else {
        this.addResult('本地存儲', '基本讀寫測試', 'fail', '本地存儲讀寫異常');
      }

      // 檢查現有數據
      const transactions = await AsyncStorage.getItem('@FinTranzo:transactions');
      const categories = await AsyncStorage.getItem('@FinTranzo:categories');
      const assets = await AsyncStorage.getItem('@FinTranzo:assets');

      this.addResult('本地存儲', '交易數據', transactions ? 'pass' : 'warning', 
        transactions ? `發現 ${JSON.parse(transactions).length} 筆交易` : '沒有交易數據');
      
      this.addResult('本地存儲', '類別數據', categories ? 'pass' : 'warning', 
        categories ? `發現 ${JSON.parse(categories).length} 個類別` : '沒有類別數據');
      
      this.addResult('本地存儲', '資產數據', assets ? 'pass' : 'warning', 
        assets ? `發現 ${JSON.parse(assets).length} 筆資產` : '沒有資產數據');

    } catch (error) {
      this.addResult('本地存儲', '存儲測試', 'fail', `本地存儲錯誤: ${error.message}`);
    }
  }

  /**
   * 測試 Supabase 連接
   */
  private async testSupabaseConnection(): Promise<void> {
    try {
      // 測試基本連接
      const { data, error } = await supabase
        .from('transactions')
        .select('count')
        .limit(1);

      if (error) {
        this.addResult('雲端連接', 'Supabase 連接', 'fail', `連接失敗: ${error.message}`);
      } else {
        this.addResult('雲端連接', 'Supabase 連接', 'pass', 'Supabase 連接正常');
      }

    } catch (error) {
      this.addResult('雲端連接', 'Supabase 連接', 'fail', `連接異常: ${error.message}`);
    }
  }

  /**
   * 測試用戶認證
   */
  private async testUserAuthentication(): Promise<void> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        this.addResult('用戶認證', '登錄狀態', 'fail', `認證錯誤: ${error.message}`);
      } else if (user) {
        this.addResult('用戶認證', '登錄狀態', 'pass', `用戶已登錄: ${user.email}`);
        
        // 測試用戶數據訪問
        const { data: userTransactions, error: txError } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', user.id);

        if (txError) {
          this.addResult('用戶認證', '數據訪問', 'fail', `數據訪問失敗: ${txError.message}`);
        } else {
          this.addResult('用戶認證', '數據訪問', 'pass', '用戶數據訪問正常');
        }
      } else {
        this.addResult('用戶認證', '登錄狀態', 'warning', '用戶未登錄');
      }

    } catch (error) {
      this.addResult('用戶認證', '認證測試', 'fail', `認證測試異常: ${error.message}`);
    }
  }

  /**
   * 測試數據完整性
   */
  private async testDataIntegrity(): Promise<void> {
    try {
      // 檢查本地交易數據的 UUID 格式
      const transactionsData = await AsyncStorage.getItem('@FinTranzo:transactions');
      if (transactionsData) {
        const transactions = JSON.parse(transactionsData);
        let validUUIDs = 0;
        let invalidUUIDs = 0;

        transactions.forEach((tx: any) => {
          if (isValidUUID(tx.id)) {
            validUUIDs++;
          } else {
            invalidUUIDs++;
          }
        });

        if (invalidUUIDs === 0) {
          this.addResult('數據完整性', 'UUID 格式', 'pass', `所有 ${validUUIDs} 個交易 ID 格式正確`);
        } else {
          this.addResult('數據完整性', 'UUID 格式', 'fail', 
            `發現 ${invalidUUIDs} 個無效 UUID，${validUUIDs} 個有效 UUID`);
        }
      }

      // 檢查必要字段
      const categoriesData = await AsyncStorage.getItem('@FinTranzo:categories');
      if (categoriesData) {
        const categories = JSON.parse(categoriesData);
        const hasRequiredCategories = categories.some((cat: any) => cat.name === '餐飲');
        
        this.addResult('數據完整性', '必要類別', hasRequiredCategories ? 'pass' : 'warning', 
          hasRequiredCategories ? '發現必要的類別' : '缺少必要的類別');
      }

    } catch (error) {
      this.addResult('數據完整性', '完整性檢查', 'fail', `檢查異常: ${error.message}`);
    }
  }

  /**
   * 添加測試結果
   */
  private addResult(category: string, test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({
      category,
      test,
      status,
      message,
      details
    });
    
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} [${category}] ${test}: ${message}`);
  }

  /**
   * 生成診斷報告
   */
  generateReport(): string {
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    let report = `🔍 診斷報告\n`;
    report += `================================\n`;
    report += `總測試數: ${this.results.length}\n`;
    report += `✅ 通過: ${passCount}\n`;
    report += `❌ 失敗: ${failCount}\n`;
    report += `⚠️ 警告: ${warningCount}\n\n`;

    // 按類別分組
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      report += `📋 ${category}\n`;
      const categoryResults = this.results.filter(r => r.category === category);
      
      categoryResults.forEach(result => {
        const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        report += `  ${emoji} ${result.test}: ${result.message}\n`;
      });
      
      report += '\n';
    });

    // 建議
    if (failCount > 0) {
      report += `🔧 修復建議\n`;
      report += `================================\n`;
      
      const failedResults = this.results.filter(r => r.status === 'fail');
      failedResults.forEach(result => {
        report += `❌ ${result.category} - ${result.test}\n`;
        report += `   問題: ${result.message}\n`;
        
        // 根據問題類型提供建議
        if (result.category === '本地存儲') {
          report += `   建議: 嘗試清除應用數據或重新安裝應用\n`;
        } else if (result.category === '雲端連接') {
          report += `   建議: 檢查網絡連接和 Supabase 配置\n`;
        } else if (result.category === '用戶認證') {
          report += `   建議: 重新登錄或檢查帳號權限\n`;
        } else if (result.category === '數據完整性') {
          report += `   建議: 清除本地數據並重新同步\n`;
        }
        
        report += '\n';
      });
    }

    return report;
  }

  /**
   * 修復常見問題
   */
  async autoFix(): Promise<string[]> {
    const fixes: string[] = [];

    try {
      // 修復 UUID 格式問題
      const transactionsData = await AsyncStorage.getItem('@FinTranzo:transactions');
      if (transactionsData) {
        const transactions = JSON.parse(transactionsData);
        let fixedCount = 0;

        const fixedTransactions = transactions.map((tx: any) => {
          if (!isValidUUID(tx.id)) {
            tx.id = this.generateUUID();
            fixedCount++;
          }
          return tx;
        });

        if (fixedCount > 0) {
          await AsyncStorage.setItem('@FinTranzo:transactions', JSON.stringify(fixedTransactions));
          fixes.push(`修復了 ${fixedCount} 個無效的交易 UUID`);
        }
      }

      // 添加缺少的類別
      const categoriesData = await AsyncStorage.getItem('@FinTranzo:categories');
      if (categoriesData) {
        const categories = JSON.parse(categoriesData);
        const hasRequiredCategories = categories.some((cat: any) => cat.name === '餐飲');
        
        if (!hasRequiredCategories) {
          const defaultCategory = {
            id: this.generateUUID(),
            name: '餐飲',
            icon: 'restaurant-outline',
            color: '#FF6384',
            type: 'expense'
          };
          
          categories.push(defaultCategory);
          await AsyncStorage.setItem('@FinTranzo:categories', JSON.stringify(categories));
          fixes.push('添加了缺少的必要類別');
        }
      }

    } catch (error) {
      fixes.push(`自動修復失敗: ${error.message}`);
    }

    return fixes;
  }

  /**
   * 生成 UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// 創建全局實例
export const diagnosticTool = new DiagnosticTool();
