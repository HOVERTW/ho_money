/**
 * 類別數據服務
 * 管理交易類別，確保刪除交易時類別不受影響
 */

import { supabase } from './supabase';
import { enhancedSupabaseService } from './enhancedSupabaseService';
import { supabaseConnectionManager } from './supabaseConnectionManager';
import { UUIDService } from './uuidService';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  user_id: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryUsage {
  categoryId: string;
  categoryName: string;
  usageCount: number;
  lastUsed: string;
}

class CategoryDataService {

  /**
   * 獲取所有類別
   */
  async getAllCategories(userId?: string): Promise<Category[]> {
    try {
      console.log('📋 獲取所有類別...');

      let query = supabase.from('categories').select('*');
      
      if (userId) {
        query = query.or(`user_id.eq.${userId},is_default.eq.true`);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error(`❌ 獲取類別失敗: ${error.message}`);
        return [];
      }

      console.log(`✅ 獲取到 ${data?.length || 0} 個類別`);
      return data || [];

    } catch (error) {
      console.error(`❌ 獲取類別異常: ${error.message}`);
      return [];
    }
  }

  /**
   * 獲取收入類別
   */
  async getIncomeCategories(userId?: string): Promise<Category[]> {
    try {
      const allCategories = await this.getAllCategories(userId);
      return allCategories.filter(cat => cat.type === 'income');
    } catch (error) {
      console.error(`❌ 獲取收入類別異常: ${error.message}`);
      return [];
    }
  }

  /**
   * 獲取支出類別
   */
  async getExpenseCategories(userId?: string): Promise<Category[]> {
    try {
      const allCategories = await this.getAllCategories(userId);
      return allCategories.filter(cat => cat.type === 'expense');
    } catch (error) {
      console.error(`❌ 獲取支出類別異常: ${error.message}`);
      return [];
    }
  }

  /**
   * 創建新類別
   */
  async createCategory(categoryData: Partial<Category>): Promise<Category | null> {
    try {
      console.log(`📝 創建新類別: ${categoryData.name}`);

      // 檢查連接狀態
      if (!supabaseConnectionManager.isConnected()) {
        await supabaseConnectionManager.forceReconnect();
      }

      const newCategory = {
        id: UUIDService.generateCategoryId(),
        name: categoryData.name,
        type: categoryData.type || 'expense',
        color: categoryData.color || '#6366f1',
        icon: categoryData.icon || '📝',
        user_id: categoryData.user_id,
        is_default: categoryData.is_default || false,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await enhancedSupabaseService.create('categories', newCategory);

      if (result.error) {
        console.error(`❌ 創建類別失敗: ${result.error.message}`);
        return null;
      }

      console.log(`✅ 類別創建成功: ${newCategory.name}`);
      return result.data[0];

    } catch (error) {
      console.error(`❌ 創建類別異常: ${error.message}`);
      return null;
    }
  }

  /**
   * 更新類別
   */
  async updateCategory(categoryId: string, updateData: Partial<Category>): Promise<Category | null> {
    try {
      console.log(`📝 更新類別: ${categoryId}`);

      const updatedData = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await enhancedSupabaseService.update('categories', categoryId, updatedData);

      if (result.error) {
        console.error(`❌ 更新類別失敗: ${result.error.message}`);
        return null;
      }

      console.log(`✅ 類別更新成功: ${categoryId}`);
      return result.data[0];

    } catch (error) {
      console.error(`❌ 更新類別異常: ${error.message}`);
      return null;
    }
  }

  /**
   * 刪除類別（安全刪除，檢查使用情況）
   */
  async deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️ 刪除類別: ${categoryId}`);

      // 檢查類別是否被使用
      const usageCount = await this.getCategoryUsageCount(categoryId);
      
      if (usageCount > 0) {
        const errorMsg = `類別正在被 ${usageCount} 筆交易使用，無法刪除`;
        console.warn(`⚠️ ${errorMsg}`);
        return {
          success: false,
          error: errorMsg
        };
      }

      // 檢查是否為默認類別
      const category = await this.getCategoryById(categoryId);
      if (category?.is_default) {
        const errorMsg = '無法刪除默認類別';
        console.warn(`⚠️ ${errorMsg}`);
        return {
          success: false,
          error: errorMsg
        };
      }

      const result = await enhancedSupabaseService.delete('categories', categoryId);

      if (result.error) {
        console.error(`❌ 刪除類別失敗: ${result.error.message}`);
        return {
          success: false,
          error: result.error.message
        };
      }

      console.log(`✅ 類別刪除成功: ${categoryId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ 刪除類別異常: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 獲取類別使用次數
   */
  async getCategoryUsageCount(categoryId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('category', categoryId)
        .neq('is_deleted', true); // 排除已刪除的交易

      if (error) {
        console.error(`❌ 獲取類別使用次數失敗: ${error.message}`);
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      console.error(`❌ 獲取類別使用次數異常: ${error.message}`);
      return 0;
    }
  }

  /**
   * 獲取單個類別
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error(`❌ 獲取類別失敗: ${error.message}`);
        return null;
      }

      return data;

    } catch (error) {
      console.error(`❌ 獲取類別異常: ${error.message}`);
      return null;
    }
  }

  /**
   * 更新類別使用次數
   */
  async incrementCategoryUsage(categoryId: string): Promise<void> {
    try {
      console.log(`📊 增加類別使用次數: ${categoryId}`);

      const category = await this.getCategoryById(categoryId);
      if (!category) {
        console.warn(`⚠️ 類別不存在: ${categoryId}`);
        return;
      }

      const newUsageCount = (category.usage_count || 0) + 1;

      await this.updateCategory(categoryId, {
        usage_count: newUsageCount,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ 類別使用次數已更新: ${categoryId} -> ${newUsageCount}`);

    } catch (error) {
      console.error(`❌ 更新類別使用次數異常: ${error.message}`);
    }
  }

  /**
   * 減少類別使用次數
   */
  async decrementCategoryUsage(categoryId: string): Promise<void> {
    try {
      console.log(`📊 減少類別使用次數: ${categoryId}`);

      const category = await this.getCategoryById(categoryId);
      if (!category) {
        console.warn(`⚠️ 類別不存在: ${categoryId}`);
        return;
      }

      const newUsageCount = Math.max(0, (category.usage_count || 0) - 1);

      await this.updateCategory(categoryId, {
        usage_count: newUsageCount,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ 類別使用次數已更新: ${categoryId} -> ${newUsageCount}`);

    } catch (error) {
      console.error(`❌ 更新類別使用次數異常: ${error.message}`);
    }
  }

  /**
   * 獲取類別使用統計
   */
  async getCategoryUsageStats(userId: string): Promise<CategoryUsage[]> {
    try {
      console.log(`📊 獲取類別使用統計: ${userId}`);

      const { data, error } = await supabase
        .from('transactions')
        .select('category, created_at')
        .eq('user_id', userId)
        .neq('is_deleted', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`❌ 獲取類別使用統計失敗: ${error.message}`);
        return [];
      }

      // 統計每個類別的使用情況
      const categoryStats = new Map<string, CategoryUsage>();

      for (const transaction of data || []) {
        const categoryId = transaction.category;
        if (!categoryId) continue;

        if (categoryStats.has(categoryId)) {
          const stats = categoryStats.get(categoryId)!;
          stats.usageCount++;
          if (transaction.created_at > stats.lastUsed) {
            stats.lastUsed = transaction.created_at;
          }
        } else {
          categoryStats.set(categoryId, {
            categoryId,
            categoryName: categoryId, // 這裡可以後續優化為實際類別名稱
            usageCount: 1,
            lastUsed: transaction.created_at
          });
        }
      }

      const result = Array.from(categoryStats.values())
        .sort((a, b) => b.usageCount - a.usageCount);

      console.log(`✅ 獲取到 ${result.length} 個類別的使用統計`);
      return result;

    } catch (error) {
      console.error(`❌ 獲取類別使用統計異常: ${error.message}`);
      return [];
    }
  }

  /**
   * 初始化默認類別
   */
  async initializeDefaultCategories(userId: string): Promise<void> {
    try {
      console.log(`🏗️ 初始化默認類別: ${userId}`);

      const defaultCategories = [
        // 收入類別
        { name: '薪資', type: 'income', icon: '💰', color: '#10b981' },
        { name: '獎金', type: 'income', icon: '🎁', color: '#059669' },
        { name: '投資收益', type: 'income', icon: '📈', color: '#047857' },
        { name: '其他收入', type: 'income', icon: '💵', color: '#065f46' },
        
        // 支出類別
        { name: '餐飲', type: 'expense', icon: '🍽️', color: '#ef4444' },
        { name: '交通', type: 'expense', icon: '🚗', color: '#dc2626' },
        { name: '購物', type: 'expense', icon: '🛒', color: '#b91c1c' },
        { name: '娛樂', type: 'expense', icon: '🎬', color: '#991b1b' },
        { name: '醫療', type: 'expense', icon: '🏥', color: '#7f1d1d' },
        { name: '教育', type: 'expense', icon: '📚', color: '#6366f1' },
        { name: '居住', type: 'expense', icon: '🏠', color: '#4f46e5' },
        { name: '其他支出', type: 'expense', icon: '📝', color: '#4338ca' }
      ];

      for (const categoryData of defaultCategories) {
        await this.createCategory({
          ...categoryData,
          user_id: userId,
          is_default: true
        });
      }

      console.log(`✅ 默認類別初始化完成: ${defaultCategories.length} 個類別`);

    } catch (error) {
      console.error(`❌ 初始化默認類別異常: ${error.message}`);
    }
  }

  /**
   * 生成類別 ID（使用 UUID）
   */
  private generateCategoryId(): string {
    return UUIDService.generateCategoryId();
  }

  /**
   * 確保類別完整性（垃圾桶刪除不影響類別）
   */
  async ensureCategoryIntegrity(): Promise<void> {
    try {
      console.log('🔍 檢查類別完整性...');

      // 獲取所有類別
      const categories = await this.getAllCategories();
      
      // 更新每個類別的實際使用次數
      for (const category of categories) {
        const actualUsageCount = await this.getCategoryUsageCount(category.id);
        
        if (category.usage_count !== actualUsageCount) {
          console.log(`🔧 修正類別使用次數: ${category.name} ${category.usage_count} -> ${actualUsageCount}`);
          
          await this.updateCategory(category.id, {
            usage_count: actualUsageCount
          });
        }
      }

      console.log('✅ 類別完整性檢查完成');

    } catch (error) {
      console.error(`❌ 類別完整性檢查異常: ${error.message}`);
    }
  }
}

// 創建單例實例
export const categoryDataService = new CategoryDataService();
