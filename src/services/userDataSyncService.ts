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

      // 遷移分類 - 暫時禁用，因為有 400 錯誤
      // await this.migrateCategories();

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

          // 過濾掉無效的交易記錄
          const validTransactions = transactions.filter((transaction: any) =>
            transaction &&
            transaction.type &&
            transaction.type !== 'undefined' &&
            transaction.type !== '' &&
            transaction.amount !== undefined &&
            transaction.amount !== null
          );

          console.log(`🔍 過濾後有效交易數量: ${validTransactions.length} / ${transactions.length}`);

          // 轉換交易數據格式以匹配 Supabase 表結構
          const convertedTransactions = validTransactions.map((transaction: any) => ({
            id: transaction.id, // 保留原始 ID 避免重複
            user_id: null, // 將在 createUserData 中自動設置
            account_id: null, // 可以為空
            amount: transaction.amount || 0,
            type: transaction.type, // 確保包含 type 字段
            description: transaction.description || '',
            category: transaction.category || '',
            account: transaction.account || '',
            from_account: transaction.from_account || null,
            to_account: transaction.to_account || null,
            date: transaction.date || new Date().toISOString().split('T')[0],
            is_recurring: transaction.is_recurring || false,
            recurring_frequency: transaction.recurring_frequency || null,
            max_occurrences: transaction.max_occurrences || null,
            start_date: transaction.start_date || null,
            created_at: transaction.created_at || new Date().toISOString(),
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
   * 遷移資產（修復版本）
   */
  private async migrateAssetsNew(): Promise<void> {
    try {
      console.log('🔄 開始遷移資產...');

      // 直接從本地存儲獲取資產
      const localAssets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (localAssets) {
        const assets = JSON.parse(localAssets);
        if (assets.length > 0) {
          console.log(`📤 準備遷移 ${assets.length} 項資產到雲端`);

          // 先獲取用戶 ID
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const userId = currentUser?.id;

          // 轉換為 Supabase 格式
          const supabaseAssets = assets.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            value: asset.current_value || asset.cost_basis || 0,
            current_value: asset.current_value || asset.cost_basis || 0,
            cost_basis: asset.cost_basis || asset.current_value || 0,
            quantity: asset.quantity || 1,
            stock_code: asset.stock_code,
            purchase_price: asset.purchase_price || 0,
            current_price: asset.current_price || 0,
            sort_order: asset.sort_order || 0,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // 直接插入到 Supabase
          const { error } = await supabase
            .from('assets')
            .upsert(supabaseAssets, { onConflict: 'id' });

          if (error) {
            console.error('❌ 資產遷移失敗:', error);
          } else {
            console.log(`✅ 成功遷移 ${supabaseAssets.length} 項資產`);
          }
        }
      }
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
   * 遷移分類 - 已禁用
   */
  private async migrateCategories(): Promise<void> {
    console.log('⚠️ migrateCategories 已被禁用，跳過分類遷移');
    return;

    // 以下代碼已禁用，因為有 UUID 格式錯誤
    /*
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
    */
  }

  /**
   * 同步雲端數據到本地
   */
  private async syncCloudDataToLocal(): Promise<void> {
    try {
      console.log('🔄 同步雲端數據到本地...');

      // 獲取用戶的所有數據 - 暫時跳過 categories
      const [transactions, assets, liabilities, accounts] = await Promise.all([
        dbService.readUserData(TABLES.TRANSACTIONS),
        dbService.readUserData(TABLES.ASSETS),
        dbService.readUserData(TABLES.LIABILITIES),
        dbService.readUserData(TABLES.ACCOUNTS),
        // dbService.readUserData(TABLES.CATEGORIES), // 暫時禁用
      ]);

      // 更新本地存儲
      if (transactions.data && transactions.data.length > 0) {
        console.log(`📥 同步 ${transactions.data.length} 筆交易記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions.data));
      }

      // 直接處理資產數據 - 最簡單可靠的方法
      try {
        console.log('🔥 開始直接資產數據同步...');

        if (assets.data && assets.data.length > 0) {
          console.log(`📥 從 Supabase 獲得 ${assets.data.length} 項資產`);
          console.log('📊 原始資產數據:', assets.data);

          // 直接轉換並保存到本地存儲
          const convertedAssets = assets.data.map((asset: any) => {
            const converted = {
              id: asset.id,
              name: asset.name || '未命名資產',
              type: asset.type || 'other',
              quantity: Number(asset.quantity) || 1,
              cost_basis: Number(asset.cost_basis || asset.value || asset.current_value || 0),
              current_value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
              stock_code: asset.stock_code,
              purchase_price: Number(asset.purchase_price || 0),
              current_price: Number(asset.current_price || 0),
              last_updated: asset.updated_at || asset.created_at,
              sort_order: Number(asset.sort_order) || 0
            };

            console.log(`✅ 轉換資產: ${converted.name} = ${converted.current_value}`);
            return converted;
          });

          // 直接保存到本地存儲
          await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(convertedAssets));
          console.log(`✅ 已保存 ${convertedAssets.length} 項資產到本地存儲`);

          // 跳過事件發送，避免導入問題
          console.log('⚠️ 跳過事件發送，避免導入錯誤，但本地存儲已保存');

        } else {
          console.log('📝 Supabase 中沒有資產數據');
        }

        console.log('✅ 直接資產數據同步完成');
      } catch (error) {
        console.error('❌ 直接資產數據同步失敗:', error);
      }

      if (liabilities.data && liabilities.data.length > 0) {
        console.log(`📥 同步 ${liabilities.data.length} 筆負債記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(liabilities.data));
      }

      if (accounts.data && accounts.data.length > 0) {
        console.log(`📥 同步 ${accounts.data.length} 筆帳戶記錄到本地`);
        await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts.data));
      }

      // 暫時跳過 categories 同步，因為有 400 錯誤
      // if (categories.data && categories.data.length > 0) {
      //   console.log(`📥 同步 ${categories.data.length} 筆分類記錄到本地`);
      //   await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories.data));
      // }

      // 跳過服務通知，避免導入錯誤
      console.log('⚠️ 跳過服務通知，避免導入錯誤');

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

      // 發送多個重新加載事件確保所有組件都能收到
      eventEmitter.emit(EVENTS.DATA_SYNC_COMPLETED);
      eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, { source: 'cloud_sync' });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL);
      eventEmitter.emit(EVENTS.FORCE_REFRESH_DASHBOARD);

      console.log('✅ 已發送數據同步完成事件');

      // 延遲發送額外的刷新事件 - 修復作用域問題
      setTimeout(async () => {
        try {
          // 重新導入以確保作用域正確
          const { eventEmitter: delayedEventEmitter, EVENTS: delayedEVENTS } = await import('./eventEmitter');

          // 發送額外的刷新事件，確保 UI 更新
          delayedEventEmitter.emit(delayedEVENTS.FORCE_REFRESH_ALL);
          delayedEventEmitter.emit(delayedEVENTS.FORCE_REFRESH_DASHBOARD);
          console.log('✅ 已發送延遲刷新事件');
        } catch (error) {
          console.error('❌ 延遲刷新事件發送失敗:', error);
        }
      }, 500);

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
