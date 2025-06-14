/**
 * 增強同步服務 - 支持刪除和更新操作的雲端同步
 */

import { supabase, TABLES } from './supabase';

// UUID 生成和驗證函數
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

class EnhancedSyncService {
  /**
   * 檢查用戶是否已登錄
   */
  private async checkUserAuth(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('❌ 檢查用戶認證失敗:', error);
      return null;
    }
  }

  /**
   * 同步資產更新到雲端
   */
  async syncAssetUpdate(assetId: string, updatedAsset: any): Promise<void> {
    try {
      console.log('🔄 同步資產更新到雲端:', assetId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      // 確保 ID 是有效的 UUID 格式
      let finalAssetId = assetId;
      if (!isValidUUID(assetId)) {
        finalAssetId = generateUUID();
        console.log(`🔄 為資產生成新的 UUID: ${finalAssetId}`);
      }

      // 準備更新數據
      const updateData = {
        id: finalAssetId,
        user_id: userId,
        name: updatedAsset.name,
        type: updatedAsset.type,
        value: updatedAsset.current_value || updatedAsset.cost_basis || 0,
        current_value: updatedAsset.current_value || updatedAsset.cost_basis || 0,
        cost_basis: updatedAsset.cost_basis || updatedAsset.current_value || 0,
        quantity: updatedAsset.quantity || 1,
        stock_code: updatedAsset.stock_code,
        purchase_price: updatedAsset.purchase_price || 0,
        current_price: updatedAsset.current_price || 0,
        sort_order: updatedAsset.sort_order || 0,
        updated_at: new Date().toISOString()
      };

      // 使用 upsert 更新或插入
      const { error } = await supabase
        .from(TABLES.ASSETS)
        .upsert(updateData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ 同步資產更新失敗:', error);
      } else {
        console.log('✅ 資產更新同步成功:', finalAssetId);
      }

    } catch (error) {
      console.error('❌ 同步資產更新異常:', error);
    }
  }

  /**
   * 同步資產刪除到雲端
   */
  async syncAssetDelete(assetId: string): Promise<void> {
    try {
      console.log('🗑️ 同步資產刪除到雲端:', assetId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端刪除同步');
        return;
      }

      // 從 Supabase 刪除資產記錄
      const { error } = await supabase
        .from(TABLES.ASSETS)
        .delete()
        .eq('id', assetId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 刪除雲端資產記錄失敗:', error);
      } else {
        console.log('✅ 雲端資產記錄刪除成功:', assetId);
      }

    } catch (error) {
      console.error('❌ 同步資產刪除異常:', error);
    }
  }

  /**
   * 同步負債更新到雲端
   */
  async syncLiabilityUpdate(liabilityId: string, updatedLiability: any): Promise<void> {
    try {
      console.log('🔄 同步負債更新到雲端:', liabilityId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      // 確保 ID 是有效的 UUID 格式
      let finalLiabilityId = liabilityId;
      if (!isValidUUID(liabilityId)) {
        finalLiabilityId = generateUUID();
        console.log(`🔄 為負債生成新的 UUID: ${finalLiabilityId}`);
      }

      // 準備更新數據
      const updateData = {
        id: finalLiabilityId,
        user_id: userId,
        name: updatedLiability.name,
        type: updatedLiability.type,
        balance: updatedLiability.balance,
        interest_rate: updatedLiability.interest_rate || 0,
        monthly_payment: updatedLiability.monthly_payment || 0,
        updated_at: new Date().toISOString()
      };

      // 使用 upsert 更新或插入
      const { error } = await supabase
        .from(TABLES.LIABILITIES)
        .upsert(updateData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ 同步負債更新失敗:', error);
      } else {
        console.log('✅ 負債更新同步成功:', finalLiabilityId);
      }

    } catch (error) {
      console.error('❌ 同步負債更新異常:', error);
    }
  }

  /**
   * 同步負債刪除到雲端
   */
  async syncLiabilityDelete(liabilityId: string): Promise<void> {
    try {
      console.log('🗑️ 同步負債刪除到雲端:', liabilityId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端刪除同步');
        return;
      }

      // 從 Supabase 刪除負債記錄
      const { error } = await supabase
        .from(TABLES.LIABILITIES)
        .delete()
        .eq('id', liabilityId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 刪除雲端負債記錄失敗:', error);
      } else {
        console.log('✅ 雲端負債記錄刪除成功:', liabilityId);
      }

    } catch (error) {
      console.error('❌ 同步負債刪除異常:', error);
    }
  }

  /**
   * 同步交易更新到雲端
   */
  async syncTransactionUpdate(transactionId: string, updatedTransaction: any): Promise<void> {
    try {
      console.log('🔄 同步交易更新到雲端:', transactionId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      // 確保 ID 是有效的 UUID 格式
      let finalTransactionId = transactionId;
      if (!isValidUUID(transactionId)) {
        finalTransactionId = generateUUID();
        console.log(`🔄 為交易生成新的 UUID: ${finalTransactionId}`);
      }

      // 準備更新數據
      const updateData = {
        id: finalTransactionId,
        user_id: userId,
        account_id: null,
        amount: updatedTransaction.amount || 0,
        type: updatedTransaction.type,
        description: updatedTransaction.description || '',
        category: updatedTransaction.category || '',
        account: updatedTransaction.account || '',
        from_account: updatedTransaction.fromAccount || updatedTransaction.from_account || null,
        to_account: updatedTransaction.toAccount || updatedTransaction.to_account || null,
        date: updatedTransaction.date || new Date().toISOString().split('T')[0],
        is_recurring: updatedTransaction.is_recurring || false,
        recurring_frequency: updatedTransaction.recurring_frequency || null,
        max_occurrences: updatedTransaction.max_occurrences || null,
        start_date: updatedTransaction.start_date || null,
        updated_at: new Date().toISOString()
      };

      // 使用 upsert 更新或插入
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .upsert(updateData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ 同步交易更新失敗:', error);
      } else {
        console.log('✅ 交易更新同步成功:', finalTransactionId);
      }

    } catch (error) {
      console.error('❌ 同步交易更新異常:', error);
    }
  }

  /**
   * 同步交易刪除到雲端
   */
  async syncTransactionDelete(transactionId: string): Promise<void> {
    try {
      console.log('🗑️ 增強同步 - 同步交易刪除到雲端:', transactionId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端刪除同步');
        return;
      }

      // 從 Supabase 刪除交易記錄
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 增強同步 - 刪除雲端交易記錄失敗:', error);
      } else {
        console.log('✅ 增強同步 - 雲端交易記錄刪除成功:', transactionId);
      }

    } catch (error) {
      console.error('❌ 增強同步 - 同步交易刪除異常:', error);
    }
  }

  /**
   * 同步類別更新到雲端
   */
  async syncCategoryUpdate(categoryId: string, updatedCategory: any): Promise<void> {
    try {
      console.log('🔄 同步類別更新到雲端:', categoryId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      // 確保 ID 是有效的 UUID 格式
      let finalCategoryId = categoryId;
      if (!isValidUUID(categoryId)) {
        finalCategoryId = generateUUID();
        console.log(`🔄 為類別生成新的 UUID: ${finalCategoryId}`);
      }

      // 準備更新數據
      const updateData = {
        id: finalCategoryId,
        user_id: userId,
        name: updatedCategory.name,
        icon: updatedCategory.icon,
        color: updatedCategory.color,
        type: updatedCategory.type,
        updated_at: new Date().toISOString()
      };

      // 先檢查類別是否存在，然後決定插入或更新
      const { data: existingCategory } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id')
        .eq('id', finalCategoryId)
        .eq('user_id', userId)
        .single();

      let error;
      if (existingCategory) {
        // 更新現有類別
        const { error: updateError } = await supabase
          .from(TABLES.CATEGORIES)
          .update({
            name: updateData.name,
            icon: updateData.icon,
            color: updateData.color,
            type: updateData.type,
            updated_at: updateData.updated_at
          })
          .eq('id', finalCategoryId)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // 插入新類別
        const { error: insertError } = await supabase
          .from(TABLES.CATEGORIES)
          .insert(updateData);
        error = insertError;
      }

      if (error) {
        console.error('❌ 同步類別更新失敗:', error);
      } else {
        console.log('✅ 類別更新同步成功:', finalCategoryId);
      }

    } catch (error) {
      console.error('❌ 同步類別更新異常:', error);
    }
  }

  /**
   * 同步類別刪除到雲端
   */
  async syncCategoryDelete(categoryId: string): Promise<void> {
    try {
      console.log('🗑️ 同步類別刪除到雲端:', categoryId);

      const userId = await this.checkUserAuth();
      if (!userId) {
        console.log('📝 用戶未登錄，跳過雲端刪除同步');
        return;
      }

      // 從 Supabase 刪除類別記錄
      const { error } = await supabase
        .from(TABLES.CATEGORIES)
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 刪除雲端類別記錄失敗:', error);
      } else {
        console.log('✅ 雲端類別記錄刪除成功:', categoryId);
      }

    } catch (error) {
      console.error('❌ 同步類別刪除異常:', error);
    }
  }
}

export const enhancedSyncService = new EnhancedSyncService();
