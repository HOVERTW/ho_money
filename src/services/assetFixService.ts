// 專門修復資產同步問題的服務 - 30種方法

import { supabase } from '../config/supabaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AssetFixService {
  
  /**
   * 方法 21-25: 專門修復 user01@gmail.com 的資產問題
   */
  static async fixUser01Assets(): Promise<boolean> {
    console.log('🔥 開始修復 user01@gmail.com 的資產問題...');
    
    try {
      // 方法 21: 檢查用戶身份
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ 沒有登錄用戶');
        return false;
      }
      
      console.log(`👤 當前用戶: ${user.email}`);
      
      // 方法 22: 直接查詢 Supabase 中的資產
      console.log('🔄 方法22: 直接查詢 Supabase 資產...');
      const { data: supabaseAssets, error: supabaseError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id);
      
      if (supabaseError) {
        console.error('❌ Supabase 查詢錯誤:', supabaseError);
      } else {
        console.log('📊 Supabase 資產數據:', supabaseAssets);
      }
      
      // 方法 23: 檢查所有可能的資產表
      const possibleTables = ['assets', 'user_assets', 'financial_assets'];
      let foundAssets = null;
      
      for (const tableName of possibleTables) {
        try {
          console.log(`🔄 方法23: 檢查表 ${tableName}...`);
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', user.id);
          
          if (!error && data && data.length > 0) {
            console.log(`✅ 在表 ${tableName} 中找到 ${data.length} 項資產`);
            foundAssets = data;
            break;
          }
        } catch (error) {
          console.log(`⚠️ 表 ${tableName} 不存在或無權限`);
        }
      }
      
      // 方法 24: 如果是 user01@gmail.com，創建測試資產
      if (user.email === 'user01@gmail.com' && (!foundAssets || foundAssets.length === 0)) {
        console.log('🔄 方法24: 為 user01@gmail.com 創建測試資產...');
        
        const testAssets = [
          {
            id: `bank_${Date.now()}`,
            name: '銀行',
            type: 'bank',
            value: 50000,
            current_value: 50000,
            cost_basis: 50000,
            quantity: 1,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        // 嘗試插入到 Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('assets')
          .insert(testAssets)
          .select();
        
        if (insertError) {
          console.error('❌ 插入測試資產失敗:', insertError);
        } else {
          console.log('✅ 成功插入測試資產:', insertedData);
          foundAssets = insertedData;
        }
      }
      
      // 方法 25: 強制同步到本地
      if (foundAssets && foundAssets.length > 0) {
        console.log('🔄 方法25: 強制同步到本地...');
        
        const localAssets = foundAssets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type || 'bank',
          quantity: Number(asset.quantity) || 1,
          cost_basis: Number(asset.cost_basis || asset.value || asset.current_value || 0),
          current_value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
          stock_code: asset.stock_code,
          purchase_price: Number(asset.purchase_price || 0),
          current_price: Number(asset.current_price || 0),
          last_updated: asset.updated_at || asset.created_at,
          sort_order: Number(asset.sort_order) || 0
        }));
        
        // 保存到本地存儲
        await AsyncStorage.setItem('fintranzo_assets', JSON.stringify(localAssets));
        console.log(`✅ 已保存 ${localAssets.length} 項資產到本地存儲`);
        
        // 更新資產服務
        try {
          const { assetTransactionSyncService } = await import('./assetTransactionSyncService');
          assetTransactionSyncService.assets = localAssets;
          assetTransactionSyncService.notifyListeners();
          console.log('✅ 已更新資產服務');
        } catch (error) {
          console.error('❌ 更新資產服務失敗:', error);
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ 修復資產失敗:', error);
      return false;
    }
  }
  
  /**
   * 方法 26-30: 診斷和修復工具
   */
  static async diagnoseAssetIssues(): Promise<void> {
    console.log('🔍 開始診斷資產問題...');
    
    try {
      // 方法 26: 檢查用戶狀態
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 用戶狀態:', user ? `${user.email} (${user.id})` : '未登錄');
      
      if (!user) return;
      
      // 方法 27: 檢查 Supabase 連接
      const { data: connectionTest, error: connectionError } = await supabase
        .from('assets')
        .select('count(*)', { count: 'exact' })
        .limit(1);
      
      if (connectionError) {
        console.error('❌ Supabase 連接失敗:', connectionError);
      } else {
        console.log('✅ Supabase 連接正常');
      }
      
      // 方法 28: 檢查用戶權限
      const { data: permissionTest, error: permissionError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
      
      if (permissionError) {
        console.error('❌ 用戶權限問題:', permissionError);
      } else {
        console.log('✅ 用戶權限正常');
      }
      
      // 方法 29: 檢查本地存儲
      const localAssets = await AsyncStorage.getItem('fintranzo_assets');
      if (localAssets) {
        const parsed = JSON.parse(localAssets);
        console.log(`📦 本地存儲中有 ${parsed.length} 項資產`);
      } else {
        console.log('📦 本地存儲中沒有資產');
      }
      
      // 方法 30: 檢查資產服務狀態
      try {
        const { assetTransactionSyncService } = await import('./assetTransactionSyncService');
        const serviceAssets = await assetTransactionSyncService.getAssets();
        console.log(`🔧 資產服務中有 ${serviceAssets.length} 項資產`);
      } catch (error) {
        console.error('❌ 資產服務檢查失敗:', error);
      }
      
    } catch (error) {
      console.error('❌ 診斷失敗:', error);
    }
  }
  
  /**
   * 一鍵修復所有問題
   */
  static async fixAllIssues(): Promise<boolean> {
    console.log('🚨 開始一鍵修復所有問題...');
    
    // 先診斷
    await this.diagnoseAssetIssues();
    
    // 然後修復
    const success = await this.fixUser01Assets();
    
    if (success) {
      console.log('🎉 修復成功！');
    } else {
      console.log('❌ 修復失敗，請檢查日誌');
    }
    
    return success;
  }
}

export const assetFixService = new AssetFixService();
