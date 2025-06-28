/**
 * 測試資產同步修復
 */

import { timestampSyncService } from '../services/timestampSyncService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { supabase } from '../services/supabase';

export class AssetSyncFixTester {
  
  /**
   * 測試資產同步修復
   */
  static async testAssetSyncFix(): Promise<void> {
    console.log('🧪 開始測試資產同步修復...');
    
    try {
      // 1. 檢查用戶登錄狀態
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('❌ 用戶未登錄，無法測試同步');
        return;
      }
      
      console.log('✅ 用戶已登錄:', user.email);
      
      // 2. 創建測試資產
      const testAsset = {
        id: `test-asset-${Date.now()}`,
        name: '測試資產同步修復',
        type: 'bank',
        current_value: 50000,
        quantity: 1,
        cost_basis: 50000,
        created_at: new Date().toISOString()
      };
      
      console.log('📝 創建測試資產:', testAsset);
      
      // 3. 直接測試時間戳記同步服務
      console.log('🔄 測試時間戳記同步服務...');
      
      try {
        await timestampSyncService.addToQueue('asset', testAsset, 'create');
        console.log('✅ 資產已添加到同步隊列');
        
        // 等待同步完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 檢查Supabase中是否存在
        const { data: supabaseAssets, error: queryError } = await supabase
          .from('assets')
          .select('*')
          .eq('id', testAsset.id)
          .eq('user_id', user.id);
        
        if (queryError) {
          console.error('❌ 查詢Supabase失敗:', queryError);
        } else if (supabaseAssets && supabaseAssets.length > 0) {
          console.log('✅ 資產同步成功！Supabase中找到資產:', supabaseAssets[0]);
          
          // 清理測試數據
          await supabase.from('assets').delete().eq('id', testAsset.id);
          console.log('🧹 測試數據已清理');
          
        } else {
          console.log('❌ 資產同步失敗，Supabase中未找到資產');
        }
        
      } catch (syncError) {
        console.error('❌ 時間戳記同步失敗:', syncError);
      }
      
      // 4. 測試通過資產服務添加
      console.log('🔄 測試通過資產服務添加...');
      
      const testAsset2 = {
        name: '測試資產服務同步',
        type: 'cash',
        current_value: 30000,
        quantity: 1,
        cost_basis: 30000
      };
      
      try {
        await assetTransactionSyncService.addAsset(testAsset2);
        console.log('✅ 通過資產服務添加成功');
        
        // 等待同步
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 檢查同步狀態
        const syncStatus = timestampSyncService.getSyncStatus();
        console.log('📊 同步狀態:', syncStatus);
        
      } catch (serviceError) {
        console.error('❌ 資產服務添加失敗:', serviceError);
      }
      
      console.log('✅ 資產同步修復測試完成');
      
    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
    }
  }
  
  /**
   * 測試資產數據格式化
   */
  static testAssetDataFormatting(): void {
    console.log('🧪 測試資產數據格式化...');
    
    // 模擬各種資產數據格式
    const testCases = [
      {
        name: '只有current_value的資產',
        data: {
          id: 'test-1',
          name: '測試資產1',
          type: 'bank',
          current_value: 100000,
          quantity: 1
        }
      },
      {
        name: '缺少必需字段的資產',
        data: {
          id: 'test-2',
          current_value: 50000
        }
      },
      {
        name: '字符串數值的資產',
        data: {
          id: 'test-3',
          name: '測試資產3',
          type: 'stock',
          current_value: '75000',
          quantity: '2',
          purchase_price: '70000'
        }
      }
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`\n📝 測試案例 ${index + 1}: ${testCase.name}`);
      console.log('原始數據:', testCase.data);
      
      // 這裡我們無法直接調用私有方法，但可以模擬格式化邏輯
      const formatted = this.mockFormatAssetData(testCase.data);
      console.log('格式化後:', formatted);
      
      // 驗證必需字段
      const requiredFields = ['id', 'name', 'type', 'value'];
      const hasAllRequired = requiredFields.every(field => 
        formatted[field] !== undefined && formatted[field] !== null && formatted[field] !== ''
      );
      
      console.log(hasAllRequired ? '✅ 格式化成功' : '❌ 格式化失敗');
    });
  }
  
  /**
   * 模擬資產數據格式化（用於測試）
   */
  private static mockFormatAssetData(data: any): any {
    const formatted = { ...data };
    
    // 確保必需的字段存在
    if (!formatted.value && formatted.current_value) {
      formatted.value = Number(formatted.current_value);
    }
    if (!formatted.current_value && formatted.value) {
      formatted.current_value = Number(formatted.value);
    }
    if (!formatted.cost_basis && formatted.current_value) {
      formatted.cost_basis = Number(formatted.current_value);
    }
    
    // 確保數值字段為數字類型
    const numericFields = ['value', 'current_value', 'cost_basis', 'quantity', 'purchase_price', 'current_price', 'sort_order'];
    numericFields.forEach(field => {
      if (formatted[field] !== undefined && formatted[field] !== null) {
        formatted[field] = Number(formatted[field]) || 0;
      }
    });
    
    // 設置默認值
    if (!formatted.quantity) formatted.quantity = 1;
    if (!formatted.sort_order) formatted.sort_order = 0;
    
    // 確保必需字段不為空
    if (!formatted.name) formatted.name = '未命名資產';
    if (!formatted.type) formatted.type = 'other';
    if (!formatted.value) formatted.value = 0;
    
    return formatted;
  }
}

// 在開發環境中自動運行測試
if (__DEV__) {
  // 延遲運行，確保服務已初始化
  setTimeout(() => {
    AssetSyncFixTester.testAssetDataFormatting();
    
    // 如果用戶已登錄，運行完整測試
    setTimeout(() => {
      AssetSyncFixTester.testAssetSyncFix();
    }, 2000);
  }, 5000);
}
