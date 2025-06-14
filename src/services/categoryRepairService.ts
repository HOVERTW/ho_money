/**
 * 類別修復服務 - 自動修復缺失的交易類別
 */

import { supabase, TABLES } from './supabase';
import { transactionDataService } from './transactionDataService';

// UUID 生成函數
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 預設類別配置
const DEFAULT_CATEGORY_CONFIGS = {
  // 收入類別
  '薪水': { icon: 'card-outline', color: '#2ECC71', type: 'income' },
  '獎金': { icon: 'gift-outline', color: '#2ECC71', type: 'income' },
  '投資收益': { icon: 'trending-up-outline', color: '#2ECC71', type: 'income' },
  '利息': { icon: 'cash-outline', color: '#2ECC71', type: 'income' },
  '其他收入': { icon: 'add-circle-outline', color: '#2ECC71', type: 'income' },
  
  // 支出類別
  '餐飲': { icon: 'restaurant-outline', color: '#FF6384', type: 'expense' },
  '交通': { icon: 'car-outline', color: '#FF6384', type: 'expense' },
  '購物': { icon: 'bag-outline', color: '#FF6384', type: 'expense' },
  '娛樂': { icon: 'game-controller-outline', color: '#FF6384', type: 'expense' },
  '醫療': { icon: 'medical-outline', color: '#FF6384', type: 'expense' },
  '教育': { icon: 'school-outline', color: '#FF6384', type: 'expense' },
  '房租': { icon: 'home-outline', color: '#FF6384', type: 'expense' },
  '水電': { icon: 'flash-outline', color: '#FF6384', type: 'expense' },
  '保險': { icon: 'shield-outline', color: '#FF6384', type: 'expense' },
  '還款': { icon: 'card-outline', color: '#FF6384', type: 'expense' },
  '其他支出': { icon: 'remove-circle-outline', color: '#FF6384', type: 'expense' },
  
  // 轉移類別
  '轉移': { icon: 'swap-horizontal-outline', color: '#6C757D', type: 'transfer' },
  '轉帳': { icon: 'swap-horizontal-outline', color: '#6C757D', type: 'transfer' },
} as const;

export interface CategoryRepairResult {
  success: boolean;
  message: string;
  createdCategories: string[];
  errors: string[];
}

class CategoryRepairService {
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
   * 自動修復缺失的類別
   */
  async repairMissingCategories(): Promise<CategoryRepairResult> {
    const result: CategoryRepairResult = {
      success: false,
      message: '',
      createdCategories: [],
      errors: []
    };

    try {
      console.log('🔧 開始自動修復缺失的類別...');

      // 檢查用戶是否已登錄
      const userId = await this.checkUserAuth();
      if (!userId) {
        result.errors.push('用戶未登錄，無法修復類別');
        result.message = '修復失敗：用戶未登錄';
        return result;
      }

      // 獲取用戶的所有交易和現有類別
      const [transactionsResult, categoriesResult] = await Promise.all([
        supabase.from(TABLES.TRANSACTIONS).select('category').eq('user_id', userId),
        supabase.from(TABLES.CATEGORIES).select('name').eq('user_id', userId)
      ]);

      if (transactionsResult.error) {
        result.errors.push(`查詢交易失敗: ${transactionsResult.error.message}`);
        result.message = '修復失敗：無法查詢交易記錄';
        return result;
      }

      if (categoriesResult.error) {
        result.errors.push(`查詢類別失敗: ${categoriesResult.error.message}`);
        result.message = '修復失敗：無法查詢類別記錄';
        return result;
      }

      const transactions = transactionsResult.data;
      const existingCategories = categoriesResult.data.map(cat => cat.name);

      console.log(`📊 找到 ${transactions.length} 筆交易，${existingCategories.length} 個現有類別`);

      // 找出缺失的類別
      const usedCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
      const missingCategories = usedCategories.filter(category => !existingCategories.includes(category));

      console.log(`🔍 發現 ${missingCategories.length} 個缺失的類別:`, missingCategories);

      if (missingCategories.length === 0) {
        result.success = true;
        result.message = '所有類別都已存在，無需修復';
        return result;
      }

      // 創建缺失的類別
      const categoriesToCreate = missingCategories.map(categoryName => {
        const config = DEFAULT_CATEGORY_CONFIGS[categoryName as keyof typeof DEFAULT_CATEGORY_CONFIGS];
        
        return {
          id: generateUUID(),
          user_id: userId,
          name: categoryName,
          icon: config?.icon || 'help-outline',
          color: config?.color || '#007AFF',
          type: config?.type || 'expense',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      console.log('📝 準備創建類別:', categoriesToCreate.map(cat => `${cat.name} (${cat.type})`));

      // 批量插入類別
      const { data: insertedCategories, error: insertError } = await supabase
        .from(TABLES.CATEGORIES)
        .insert(categoriesToCreate)
        .select();

      if (insertError) {
        result.errors.push(`創建類別失敗: ${insertError.message}`);
        result.message = '修復失敗：無法創建類別';
        return result;
      }

      result.createdCategories = categoriesToCreate.map(cat => cat.name);
      result.success = true;
      result.message = `成功創建 ${result.createdCategories.length} 個缺失的類別`;

      console.log(`✅ 類別修復完成，創建了 ${result.createdCategories.length} 個類別`);

      // 更新本地類別數據
      await this.updateLocalCategories(userId);

      return result;

    } catch (error) {
      console.error('❌ 類別修復過程中發生異常:', error);
      result.errors.push(`修復異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
      result.message = '修復失敗：發生異常';
      return result;
    }
  }

  /**
   * 更新本地類別數據
   */
  private async updateLocalCategories(userId: string): Promise<void> {
    try {
      console.log('🔄 更新本地類別數據...');

      const { data: categories, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 查詢類別失敗:', error.message);
        return;
      }

      // 更新 transactionDataService 中的類別數據
      const localCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type
      }));

      // 使用 transactionDataService 的內部方法更新類別
      (transactionDataService as any).categories = localCategories;
      await (transactionDataService as any).saveToStorage();

      console.log(`✅ 本地類別數據已更新，共 ${localCategories.length} 個類別`);

    } catch (error) {
      console.error('❌ 更新本地類別數據失敗:', error);
    }
  }

  /**
   * 檢查並修復類別完整性
   */
  async checkAndRepairCategories(): Promise<CategoryRepairResult> {
    console.log('🔍 檢查類別完整性...');
    
    const result = await this.repairMissingCategories();
    
    if (result.success && result.createdCategories.length > 0) {
      console.log('🎉 類別修復完成！創建的類別:', result.createdCategories);
    } else if (result.success) {
      console.log('✅ 類別完整性檢查通過，無需修復');
    } else {
      console.error('❌ 類別修復失敗:', result.message);
    }
    
    return result;
  }

  /**
   * 創建預設類別集合
   */
  async createDefaultCategories(): Promise<CategoryRepairResult> {
    const result: CategoryRepairResult = {
      success: false,
      message: '',
      createdCategories: [],
      errors: []
    };

    try {
      console.log('🎨 創建預設類別集合...');

      const userId = await this.checkUserAuth();
      if (!userId) {
        result.errors.push('用戶未登錄，無法創建預設類別');
        result.message = '創建失敗：用戶未登錄';
        return result;
      }

      // 檢查是否已有類別
      const { data: existingCategories, error: queryError } = await supabase
        .from(TABLES.CATEGORIES)
        .select('name')
        .eq('user_id', userId);

      if (queryError) {
        result.errors.push(`查詢現有類別失敗: ${queryError.message}`);
        result.message = '創建失敗：無法查詢現有類別';
        return result;
      }

      const existingNames = existingCategories.map(cat => cat.name);

      // 創建不存在的預設類別
      const defaultCategoriesToCreate = Object.entries(DEFAULT_CATEGORY_CONFIGS)
        .filter(([name]) => !existingNames.includes(name))
        .map(([name, config]) => ({
          id: generateUUID(),
          user_id: userId,
          name,
          icon: config.icon,
          color: config.color,
          type: config.type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (defaultCategoriesToCreate.length === 0) {
        result.success = true;
        result.message = '所有預設類別都已存在';
        return result;
      }

      const { error: insertError } = await supabase
        .from(TABLES.CATEGORIES)
        .insert(defaultCategoriesToCreate);

      if (insertError) {
        result.errors.push(`創建預設類別失敗: ${insertError.message}`);
        result.message = '創建失敗：無法插入類別';
        return result;
      }

      result.createdCategories = defaultCategoriesToCreate.map(cat => cat.name);
      result.success = true;
      result.message = `成功創建 ${result.createdCategories.length} 個預設類別`;

      // 更新本地類別數據
      await this.updateLocalCategories(userId);

      console.log(`✅ 預設類別創建完成，創建了 ${result.createdCategories.length} 個類別`);

      return result;

    } catch (error) {
      console.error('❌ 創建預設類別過程中發生異常:', error);
      result.errors.push(`創建異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
      result.message = '創建失敗：發生異常';
      return result;
    }
  }
}

export const categoryRepairService = new CategoryRepairService();
