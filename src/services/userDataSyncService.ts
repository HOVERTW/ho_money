/**
 * 用戶數據同步服務
 * 處理用戶登錄後的數據同步和遷移
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, dbService, TABLES } from './supabase';
import { STORAGE_KEYS } from '../utils/storageManager';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

class UserDataSyncService {
  /**
   * 用戶首次登錄時的初始化
   */
  async initializeUserData(user: User): Promise<void> {
    try {
      console.log('🔄 初始化用戶數據...', user.email);

      // 1. 創建或更新用戶資料
      await this.createOrUpdateUserProfile(user);

      // 2. 遷移本地數據到雲端
      await this.migrateLocalDataToCloud();

      // 3. 同步雲端數據到本地
      await this.syncCloudDataToLocal();

      console.log('✅ 用戶數據初始化完成');
    } catch (error) {
      console.error('❌ 用戶數據初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 創建或更新用戶資料
   */
  private async createOrUpdateUserProfile(user: User): Promise<void> {
    try {
      const profileData = {
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '用戶',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider || 'email',
        updated_at: new Date().toISOString(),
      };

      // 檢查用戶資料是否已存在
      const { data: existingProfile } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        // 更新現有資料
        await supabase
          .from(TABLES.PROFILES)
          .update(profileData)
          .eq('user_id', user.id);
        
        console.log('✅ 用戶資料已更新');
      } else {
        // 創建新資料
        await supabase
          .from(TABLES.PROFILES)
          .insert({
            ...profileData,
            created_at: new Date().toISOString(),
          });
        
        console.log('✅ 用戶資料已創建');
      }
    } catch (error) {
      console.error('❌ 創建/更新用戶資料失敗:', error);
      throw error;
    }
  }

  /**
   * 遷移本地數據到雲端
   */
  private async migrateLocalDataToCloud(): Promise<void> {
    try {
      console.log('🔄 遷移本地數據到雲端...');

      // 遷移交易記錄
      await this.migrateTransactions();

      // 遷移資產（使用新的同步服務）
      await this.migrateAssetsNew();

      // 遷移負債
      await this.migrateLiabilities();

      // 遷移帳戶
      await this.migrateAccounts();

      // 遷移分類
      await this.migrateCategories();

      console.log('✅ 本地數據遷移完成');
    } catch (error) {
      console.error('❌ 本地數據遷移失敗:', error);
      // 不拋出錯誤，允許繼續使用應用
    }
  }

  /**
   * 遷移交易記錄
   */
  private async migrateTransactions(): Promise<void> {
    try {
      const localTransactions = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (localTransactions) {
        const transactions = JSON.parse(localTransactions);
        if (transactions.length > 0) {
          console.log(`🔄 準備遷移 ${transactions.length} 筆交易記錄...`);

          // 轉換交易數據格式以匹配 Supabase 表結構
          const convertedTransactions = transactions.map((transaction: any) => ({
            user_id: null, // 將在 createUserData 中自動設置
            account_id: null, // 可以為空
            amount: transaction.amount || 0,
            description: transaction.description || '',
            category: transaction.category || '',
            date: transaction.date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          console.log('📝 轉換後的交易數據示例:', convertedTransactions[0]);

          const { error } = await dbService.createUserData(TABLES.TRANSACTIONS, convertedTransactions);
          if (error) {
            console.error('❌ 交易記錄遷移錯誤:', error);
          } else {
            console.log(`✅ 已遷移 ${convertedTransactions.length} 筆交易記錄`);
          }
        }
      } else {
        console.log('📝 沒有本地交易數據需要遷移');
      }
    } catch (error) {
      console.error('❌ 遷移交易記錄失敗:', error);
    }
  }

  /**
   * 遷移資產（新版本）
   */
  private async migrateAssetsNew(): Promise<void> {
    try {
      // 使用新的資產同步服務
      const { assetSyncService } = await import('./assetSyncService');
      await assetSyncService.syncToCloud();
      console.log('✅ 資產遷移完成（使用新同步服務）');
    } catch (error) {
      console.error('❌ 遷移資產失敗:', error);
    }
  }

  /**
   * 遷移資產（舊版本，保留作為備用）
   */
  private async migrateAssets(): Promise<void> {
    try {
      const localAssets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (localAssets) {
        const assets = JSON.parse(localAssets);
        if (assets.length > 0) {
          console.log(`🔄 準備遷移 ${assets.length} 筆資產記錄...`);

          // 轉換資產數據格式以匹配 Supabase 表結構
          const convertedAssets = assets.map((asset: any) => ({
            user_id: null, // 將在 createUserData 中自動設置
            name: asset.name,
            type: asset.type,
            value: asset.current_value || asset.cost_basis || 0,
            quantity: asset.quantity || 1,
            purchase_price: asset.cost_basis || asset.purchase_price || 0,
            current_price: asset.current_price || asset.current_value || asset.cost_basis || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          console.log('📝 轉換後的資產數據示例:', convertedAssets[0]);

          const { error } = await dbService.createUserData(TABLES.ASSETS, convertedAssets);
          if (error) {
            console.error('❌ 資產遷移錯誤:', error);
          } else {
            console.log(`✅ 已遷移 ${convertedAssets.length} 筆資產記錄`);
          }
        }
      } else {
        console.log('📝 沒有本地資產數據需要遷移');
      }
    } catch (error) {
      console.error('❌ 遷移資產失敗:', error);
    }
  }

  /**
   * 遷移負債
   */
  private async migrateLiabilities(): Promise<void> {
    try {
      const localLiabilities = await AsyncStorage.getItem(STORAGE_KEYS.LIABILITIES);
      if (localLiabilities) {
        const liabilities = JSON.parse(localLiabilities);
        if (liabilities.length > 0) {
          const { error } = await dbService.createUserData(TABLES.LIABILITIES, liabilities);
          if (!error) {
            console.log(`✅ 已遷移 ${liabilities.length} 筆負債記錄`);
          }
        }
      }
    } catch (error) {
      console.error('❌ 遷移負債失敗:', error);
    }
  }

  /**
   * 遷移帳戶
   */
  private async migrateAccounts(): Promise<void> {
    try {
      const localAccounts = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (localAccounts) {
        const accounts = JSON.parse(localAccounts);
        if (accounts.length > 0) {
          const { error } = await dbService.createUserData(TABLES.ACCOUNTS, accounts);
          if (!error) {
            console.log(`✅ 已遷移 ${accounts.length} 筆帳戶記錄`);
          }
        }
      }
    } catch (error) {
      console.error('❌ 遷移帳戶失敗:', error);
    }
  }

  /**
   * 遷移分類
   */
  private async migrateCategories(): Promise<void> {
    try {
      const localCategories = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (localCategories) {
        const categories = JSON.parse(localCategories);
        if (categories.length > 0) {
          const { error } = await dbService.createUserData(TABLES.CATEGORIES, categories);
          if (!error) {
            console.log(`✅ 已遷移 ${categories.length} 筆分類記錄`);
          }
        }
      }
    } catch (error) {
      console.error('❌ 遷移分類失敗:', error);
    }
  }

  /**
   * 同步雲端數據到本地
   */
  private async syncCloudDataToLocal(): Promise<void> {
    try {
      console.log('🔄 同步雲端數據到本地...');

      // 獲取用戶的所有數據
      const [transactions, assets, liabilities, accounts, categories] = await Promise.all([
        dbService.readUserData(TABLES.TRANSACTIONS),
        dbService.readUserData(TABLES.ASSETS),
        dbService.readUserData(TABLES.LIABILITIES),
        dbService.readUserData(TABLES.ACCOUNTS),
        dbService.readUserData(TABLES.CATEGORIES),
      ]);

      // 更新本地存儲
      if (transactions.data && transactions.data.length > 0) {
        console.log(`📥 同步 ${transactions.data.length} 筆交易記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions.data));
      }

      // 使用新的資產同步服務處理資產數據
      try {
        const { assetSyncService } = await import('./assetSyncService');
        await assetSyncService.syncFromCloud();
        console.log('✅ 資產數據同步完成（使用新同步服務）');
      } catch (error) {
        console.error('❌ 資產數據同步失敗:', error);
      }

      if (liabilities.data && liabilities.data.length > 0) {
        console.log(`📥 同步 ${liabilities.data.length} 筆負債記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(liabilities.data));
      }

      if (accounts.data && accounts.data.length > 0) {
        console.log(`📥 同步 ${accounts.data.length} 筆帳戶記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts.data));
      }

      if (categories.data && categories.data.length > 0) {
        console.log(`📥 同步 ${categories.data.length} 筆分類記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories.data));
      }

      // 通知服務重新加載數據 (暫時停用以避免循環依賴)
      // await this.notifyServicesToReload();

      console.log('✅ 雲端數據同步完成');
    } catch (error) {
      console.error('❌ 雲端數據同步失敗:', error);
    }
  }

  /**
   * 通知各個服務重新加載數據
   */
  private async notifyServicesToReload(): Promise<void> {
    try {
      console.log('🔄 通知服務重新加載數據...');

      // 使用事件系統通知服務重新加載，避免循環依賴
      const { eventEmitter, EVENTS } = await import('./eventEmitter');

      // 發送重新加載事件
      eventEmitter.emit(EVENTS.DATA_SYNC_COMPLETED);
      console.log('✅ 已發送數據同步完成事件');

    } catch (error) {
      console.error('❌ 通知服務重新加載失敗:', error);
    }
  }

  /**
   * 獲取用戶資料
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('❌ 獲取用戶資料失敗:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('❌ 獲取用戶資料異常:', error);
      return null;
    }
  }

  /**
   * 更新用戶資料
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ 更新用戶資料失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ 更新用戶資料異常:', error);
      return false;
    }
  }
}

export const userDataSyncService = new UserDataSyncService();
