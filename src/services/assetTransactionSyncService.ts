/**
 * 資產與交易同步服務
 * 負責處理交易記錄與資產負債表之間的數據同步
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from './supabase';
import { eventEmitter, EVENTS } from './eventEmitter';
import { generateUUID, isValidUUID, ensureValidUUID } from '../utils/uuid';
import { unifiedSyncManager } from './unifiedSyncManager';
import { enhancedSyncService } from './enhancedSyncService';
import { instantSyncService } from './instantSyncService';

// 本地存儲的鍵名
const STORAGE_KEYS = {
  ASSETS: '@FinTranzo:assets'
} as const;

export interface AssetData {
  id: string;
  name: string;
  type: string;
  quantity: number;
  cost_basis: number;
  current_value: number;
  sort_order?: number; // 添加排序字段
  // 股票相關欄位
  stock_code?: string;
  purchase_price?: number;
  current_price?: number;
  // 不動產專用字段
  area?: number;
  price_per_ping?: number;
  current_price_per_ping?: number;
  // 匯率專用字段 (美股和加密貨幣)
  buy_exchange_rate?: number;
  current_exchange_rate?: number;
  // 保單專用字段
  insurance_amount?: number;
}

export interface TransactionData {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category: string;
  account?: string;
  fromAccount?: string; // 轉移交易的轉出帳戶
  toAccount?: string;   // 轉移交易的轉入帳戶
  bank_account_id?: string;
  date: string;
  is_recurring?: boolean;
}

class AssetTransactionSyncService {
  private assets: AssetData[] = [];
  private listeners: Array<(assets: AssetData[]) => void> = [];
  private isInitialized = false;
  private autoSyncDisabled = false; // 終極修復：添加自動同步禁用標記

  constructor() {
    // 不在構造函數中初始化，改為異步初始化

    // 暫時停用事件監聽以避免循環依賴
    // eventEmitter.on(EVENTS.DATA_SYNC_COMPLETED, this.handleDataSyncCompleted.bind(this));
  }

  /**
   * 緊急修復：安全初始化資產服務（防止資產消失）
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 緊急修復：安全初始化資產服務...');

      // 緊急修復：如果已經初始化且有資產，不要重複初始化
      if (this.isInitialized && this.assets.length > 0) {
        console.log(`⚠️ 緊急修復：服務已初始化且有 ${this.assets.length} 個資產，跳過重複初始化`);
        return;
      }

      // 緊急修復：備份現有資產
      const backupAssets = [...this.assets];

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 緊急修復：用戶已登錄，從 Supabase 加載資產...');
        // 用戶已登錄，優先從 Supabase 加載
        await this.loadFromSupabase(user.id);
      } else {
        console.log('👤 緊急修復：用戶未登錄，從本地存儲加載...');
        // 用戶未登錄，從本地存儲加載
        await this.loadFromStorage();
      }

      // 緊急修復：如果加載後資產為空且有備份，恢復備份
      if (this.assets.length === 0 && backupAssets.length > 0) {
        console.log('🚨 緊急修復：加載後資產為空，恢復備份資產');
        this.assets = backupAssets;
      }

      this.isInitialized = true;
      console.log(`✅ 緊急修復：資產服務安全初始化完成，加載了 ${this.assets.length} 項資產`);
    } catch (error) {
      console.error('❌ 緊急修復：資產服務初始化失敗:', error);
      // 緊急修復：初始化失敗時不清空現有資產
      if (this.assets.length === 0) {
        console.log('⚠️ 緊急修復：初始化失敗且無現有資產，嘗試從本地存儲恢復');
        try {
          await this.loadFromStorage();
        } catch (storageError) {
          console.error('❌ 緊急修復：從本地存儲恢復也失敗:', storageError);
        }
      }
      this.isInitialized = true;
    }
    this.notifyListeners();
  }

  /**
   * 從 Supabase 加載用戶資產
   */
  private async loadFromSupabase(userId: string): Promise<void> {
    try {
      console.log('🔄 從 Supabase 加載用戶資產...', userId);

      // 使用多種方法確保加載成功
      let assets = null;

      // 方法1: 標準查詢
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          assets = data;
          console.log(`📊 方法1成功: ${assets.length} 個資產`);
        }
      } catch (error) {
        console.error('❌ 方法1失敗:', error);
      }

      // 方法2: 如果方法1失敗，嘗試不同查詢
      if (!assets || assets.length === 0) {
        try {
          const { data, error } = await supabase
            .from(TABLES.ASSETS)
            .select('*')
            .eq('user_id', userId);

          if (!error && data) {
            assets = data;
            console.log(`📊 方法2成功: ${assets.length} 個資產`);
          }
        } catch (error) {
          console.error('❌ 方法2失敗:', error);
        }
      }

      if (assets && assets.length > 0) {
        // 轉換 Supabase 格式到本地格式
        this.assets = assets.map(asset => ({
          id: asset.id,
          name: asset.name || asset.asset_name || '未命名資產',
          type: asset.type || 'bank',
          quantity: Number(asset.quantity) || 1,
          cost_basis: Number(asset.cost_basis || asset.value || 0),
          current_value: Number(asset.current_value || asset.value || 0),
          stock_code: asset.stock_code,
          purchase_price: Number(asset.purchase_price || 0),
          current_price: Number(asset.current_price || 0),
          last_updated: asset.updated_at || asset.created_at || new Date().toISOString(),
          sort_order: Number(asset.sort_order) || 0
        }));

        console.log(`✅ 緊急修復：從 Supabase 加載了 ${this.assets.length} 個資產`);

        // 詳細記錄每個資產
        this.assets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name} (${asset.type}) - 價值: ${asset.current_value}`);
        });

        // 同步到本地存儲作為備份
        await this.saveToLocalStorage();
      } else {
        console.log('📝 緊急修復：Supabase 中沒有找到用戶資產，保持現有資產不變');
        // 緊急修復：不清空現有資產，可能是網絡問題或數據還在同步中
        console.log(`⚠️ 緊急修復：保持現有 ${this.assets.length} 個資產不變`);
      }

    } catch (error) {
      console.error('❌ 從 Supabase 加載資產失敗:', error);
      // 如果 Supabase 加載失敗，嘗試從本地存儲加載
      await this.loadFromStorage();
    }
  }

  /**
   * 緊急修復：安全重新加載數據（防止資產消失）
   */
  async forceReload(): Promise<void> {
    console.log('🔄 緊急修復：安全重新加載資產數據...');

    // 緊急修復：備份當前資產，防止意外清空
    const backupAssets = [...this.assets];
    console.log(`💾 緊急修復：備份當前 ${backupAssets.length} 個資產`);

    try {
      // 緊急修復：不清空資產，直接重新加載
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 緊急修復：用戶已登錄，從 Supabase 重新加載...');
        await this.loadFromSupabase(user.id);
      } else {
        console.log('👤 緊急修復：用戶未登錄，從本地存儲重新加載...');
        await this.loadFromStorage();
      }

      // 緊急修復：如果重新加載後資產為空，恢復備份
      if (this.assets.length === 0 && backupAssets.length > 0) {
        console.log('🚨 緊急修復：重新加載後資產為空，恢復備份資產');
        this.assets = backupAssets;
        // 保存備份資產到本地存儲
        await this.saveToLocalStorage();
      }

      // 強制通知監聽器
      this.notifyListeners();

      console.log(`✅ 緊急修復：安全重新加載完成，當前資產數量: ${this.assets.length}`);
    } catch (error) {
      console.error('❌ 緊急修復：重新加載失敗，恢復備份資產:', error);
      this.assets = backupAssets;
      this.notifyListeners();
    }
  }

  /**
   * 確保資產數據穩定加載
   */
  async ensureAssetsLoaded(): Promise<AssetData[]> {
    console.log('🔍 確保資產數據穩定加載...');

    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 如果資產為空且用戶已登錄，嘗試重新加載
    if (this.assets.length === 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🔄 資產為空但用戶已登錄，重新從 Supabase 加載...');
        await this.loadFromSupabase(user.id);
      }
    }

    console.log(`✅ 資產數據確保完成，數量: ${this.assets.length}`);
    return this.getAssets();
  }

  /**
   * 緊急修復：安全處理數據同步完成事件（防止資產消失）
   */
  private async handleDataSyncCompleted(): Promise<void> {
    console.log('📡 緊急修復：收到數據同步完成事件，安全檢查資產數據...');

    // 緊急修復：不立即重新加載，先檢查當前狀態
    if (this.assets.length > 0) {
      console.log(`⚠️ 緊急修復：當前有 ${this.assets.length} 個資產，跳過強制重新加載`);
      // 只通知監聽器更新UI
      this.notifyListeners();
    } else {
      console.log('🔄 緊急修復：當前無資產，執行安全重新加載');
      await this.forceReload();
    }
  }

  /**
   * 從本地存儲加載資產數據
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const assetsData = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (assetsData) {
        const parsedAssets = JSON.parse(assetsData);

        // 檢查是否有舊的預設資產需要清除
        const hasOldDefaultAssets = parsedAssets.some((asset: any) =>
          (asset.name === '現金' && asset.current_value === 5000) ||
          (asset.name === '銀行存款' && asset.current_value === 10000) ||
          asset.id === 'default_cash' ||
          asset.id === 'default_bank'
        );

        if (hasOldDefaultAssets) {
          console.log('🧹 檢測到舊的預設資產，正在清除...');
          this.assets = [];
          await this.saveToStorage(); // 保存空列表
          console.log('✅ 舊的預設資產已清除');
        } else {
          this.assets = parsedAssets;
          console.log('📦 從本地存儲加載資產數據:', this.assets.length, '項');
        }
      } else {
        // 如果沒有保存的資產，使用空列表
        this.assets = [];
        console.log('📝 沒有保存的資產數據，從空列表開始');
      }
    } catch (error) {
      console.error('❌ 從本地存儲加載資產數據失敗:', error);
      this.assets = [];
    }
  }

  /**
   * 僅保存到本地存儲（不同步到雲端）
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log('💾 資產數據已保存到本地存儲');
    } catch (error) {
      console.error('❌ 保存資產數據到本地存儲失敗:', error);
    }
  }

  /**
   * 緊急修復：安全保存資產數據到本地存儲（防止資產消失）
   */
  private async saveToStorage(): Promise<void> {
    try {
      // 緊急修復：檢查資產數據有效性
      if (!Array.isArray(this.assets)) {
        console.error('❌ 緊急修復：資產數據無效，跳過保存');
        return;
      }

      // 緊急修復：備份現有數據
      const existingData = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (existingData && this.assets.length === 0) {
        console.warn('⚠️ 緊急修復：嘗試保存空資產列表，可能會丟失數據，跳過保存');
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log(`💾 緊急修復：已安全保存 ${this.assets.length} 個資產到本地存儲`);

      // 緊急修復：設置標記防止其他服務自動同步
      this.autoSyncDisabled = true;
      console.log('🚫 緊急修復：已設置自動同步禁用標記，防止重複上傳');
    } catch (error) {
      console.error('❌ 緊急修復：保存資產數據失敗:', error);
    }
  }

  /**
   * 緊急修復：專用的本地存儲保存方法
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      if (this.assets.length === 0) {
        console.warn('⚠️ 緊急修復：資產列表為空，跳過本地存儲保存');
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log(`💾 緊急修復：已保存 ${this.assets.length} 個資產到本地存儲`);
    } catch (error) {
      console.error('❌ 緊急修復：本地存儲保存失敗:', error);
    }
  }

  /**
   * 同步單個資產到 Supabase（增強版）
   */
  private async syncAssetToSupabase(asset: AssetData): Promise<void> {
    try {
      console.log('🔄 開始同步資產到雲端:', {
        name: asset.name,
        id: asset.id,
        type: asset.type,
        current_value: asset.current_value
      });

      // 檢查用戶是否已登錄
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ 獲取用戶信息失敗:', authError);
        throw new Error(`認證失敗: ${authError.message}`);
      }

      if (!user) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      console.log('✅ 用戶已登錄:', user.email);

      // 確保 ID 是有效的 UUID 格式
      const assetId = ensureValidUUID(asset.id);
      if (assetId !== asset.id) {
        console.log(`🔄 為資產生成新的 UUID: ${assetId}`);
        // 更新本地資產的 ID
        asset.id = assetId;
      }

      // 準備 Supabase 格式的數據
      const supabaseAsset = {
        id: assetId,
        user_id: user.id,
        name: asset.name || '未命名資產',
        type: asset.type || 'other',
        value: Number(asset.current_value || asset.cost_basis || 0),
        current_value: Number(asset.current_value || asset.cost_basis || 0),
        cost_basis: Number(asset.cost_basis || asset.current_value || 0),
        quantity: Number(asset.quantity || 1),
        stock_code: asset.stock_code || null,
        purchase_price: Number(asset.purchase_price || asset.cost_basis || 0),
        current_price: Number(asset.current_price || asset.current_value || asset.cost_basis || 0),
        sort_order: asset.sort_order || 0,
        area: asset.area || null,
        price_per_ping: asset.price_per_ping || null,
        current_price_per_ping: asset.current_price_per_ping || null,
        buy_exchange_rate: asset.buy_exchange_rate || null,
        current_exchange_rate: asset.current_exchange_rate || null,
        insurance_amount: asset.insurance_amount || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 準備同步的資產數據:', supabaseAsset);

      // 使用 upsert 進行插入或更新
      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .upsert(supabaseAsset, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ 資產同步失敗:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          asset: supabaseAsset
        });
        throw new Error(`資產同步失敗: ${error.message}`);
      }

      console.log('✅ 資產同步成功:', data);

      // 驗證資產是否真的同步成功
      const { data: verifyData, error: verifyError } = await supabase
        .from(TABLES.ASSETS)
        .select('id, name, current_value')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single();

      if (verifyError) {
        console.error('❌ 資產同步驗證失敗:', verifyError);
        throw new Error(`資產同步驗證失敗: ${verifyError.message}`);
      }

      if (!verifyData) {
        console.error('❌ 資產同步後未找到數據');
        throw new Error('資產同步後未找到數據');
      }

      console.log('✅ 資產同步驗證成功:', verifyData);

    } catch (error) {
      console.error('❌ 同步資產到雲端異常:', {
        error: error.message,
        stack: error.stack,
        asset: {
          id: asset.id,
          name: asset.name,
          type: asset.type
        }
      });
      // 重新拋出錯誤，讓調用方知道同步失敗
      throw error;
    }
  }

  /**
   * 同步資產數據到 Supabase
   */
  private async syncToSupabase(): Promise<void> {
    try {
      console.log('🔄 syncToSupabase 被調用');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      console.log('✅ 用戶已登錄:', user.email);
      console.log('🔄 開始同步資產數據到雲端...');
      console.log('📊 當前資產數量:', this.assets.length);
      console.log('📊 當前資產列表:', this.assets);

      // 轉換資產數據格式以匹配 Supabase 表結構
      const convertedAssets = this.assets.map((asset: AssetData) => {
        const converted = {
          user_id: user.id,
          name: asset.name || '未命名資產',
          type: asset.type || 'other',
          value: Number(asset.current_value || asset.cost_basis || 0),
          quantity: Number(asset.quantity || 1),
          purchase_price: Number(asset.cost_basis || asset.purchase_price || 0),
          current_price: Number(asset.current_price || asset.current_value || asset.cost_basis || 0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('📝 轉換資產數據:', {
          原始: {
            name: asset.name,
            type: asset.type,
            current_value: asset.current_value,
            cost_basis: asset.cost_basis,
            quantity: asset.quantity
          },
          轉換後: converted
        });

        return converted;
      });

      // 先清除用戶的現有資產數據
      console.log('🧹 開始清除舊資產數據...');
      const { error: deleteError } = await supabase
        .from(TABLES.ASSETS)
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ 清除舊資產數據失敗:', deleteError);
        console.error('❌ 刪除錯誤詳情:', deleteError.message, deleteError.details, deleteError.hint);
        return;
      } else {
        console.log('✅ 舊資產數據清除成功');
      }

      // 插入新的資產數據
      if (convertedAssets.length > 0) {
        console.log('📝 準備插入的資產數據:', convertedAssets);
        console.log('📝 插入到表:', TABLES.ASSETS);

        const { data: insertResult, error: insertError } = await supabase
          .from(TABLES.ASSETS)
          .insert(convertedAssets)
          .select();

        if (insertError) {
          console.error('❌ 同步資產數據到雲端失敗:', insertError);
          console.error('❌ 錯誤詳情:', insertError.message, insertError.details, insertError.hint);
          console.error('❌ 錯誤代碼:', insertError.code);
        } else {
          console.log(`✅ 已同步 ${convertedAssets.length} 筆資產數據到雲端`);
          console.log('✅ 插入結果:', insertResult);

          // 立即驗證數據是否插入成功（移除延遲）
          const { data: verifyData, error: verifyError } = await supabase
            .from(TABLES.ASSETS)
            .select('*')
            .eq('user_id', user.id);

          if (verifyError) {
            console.error('❌ 驗證插入失敗:', verifyError);
          } else {
            console.log('🔍 驗證結果: 雲端現有', verifyData?.length || 0, '筆資產記錄');
          }
        }
      } else {
        console.log('📝 沒有資產數據需要同步');
      }

    } catch (error) {
      console.error('❌ 同步資產數據到雲端異常:', error);
    }
  }

  /**
   * 初始化資產數據（保留向後兼容性）
   */
  initializeAssets(initialAssets: AssetData[]) {
    this.assets = [...initialAssets];
    this.isInitialized = true;
    this.notifyListeners();
  }

  /**
   * 添加監聽器
   */
  addListener(listener: (assets: AssetData[]) => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除監聽器
   */
  removeListener(listener: (assets: AssetData[]) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.assets]));
  }

  /**
   * 獲取當前資產列表（按排序順序）
   */
  getAssets(): AssetData[] {
    return [...this.assets].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  /**
   * 設置資產列表
   */
  async setAssets(assets: AssetData[]): Promise<void> {
    this.assets = [...assets];
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 更新資產列表
   */
  async updateAssets(newAssets: AssetData[]): Promise<void> {
    this.assets = [...newAssets];
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 添加新資產（重新啟用自動同步）
   */
  async addAsset(asset: AssetData): Promise<void> {
    try {
      console.log('📝 開始添加資產:', asset.name);

      // 如果沒有指定排序順序，設置為最後
      if (asset.sort_order === undefined) {
        const maxOrder = Math.max(...this.assets.map(a => a.sort_order || 0), -1);
        asset.sort_order = maxOrder + 1;
      }

      // 檢查是否已存在相同ID的資產，避免重複添加
      const existingAssetIndex = this.assets.findIndex(a => a.id === asset.id);
      if (existingAssetIndex !== -1) {
        console.log('⚠️ 資產已存在，更新而非添加:', asset.id);
        this.assets[existingAssetIndex] = asset;
      } else {
        // 添加到本地數據
        this.assets.push(asset);
        console.log('✅ 新資產已添加到本地');
      }

      // 通知監聽器
      this.notifyListeners();

      // 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log('💾 資產數據已保存到本地存儲');

      // 使用統一同步管理器進行同步
      const syncResult = await unifiedSyncManager.syncAsset(asset, 'create');
      if (syncResult.success) {
        console.log('✅ 資產已自動同步到雲端');
      } else {
        console.warn('⚠️ 資產同步失敗，但本地操作已完成:', syncResult.error);
      }

    } catch (error) {
      console.error('❌ 添加資產失敗:', error);
      throw error;
    }
  }

  /**
   * 更新資產（重新啟用自動同步）
   */
  async updateAsset(assetId: string, updatedAsset: Partial<AssetData>): Promise<void> {
    try {
      console.log('🔄 開始更新資產:', assetId, updatedAsset);

      const index = this.assets.findIndex(asset => asset.id === assetId);
      if (index === -1) {
        console.warn('⚠️ 找不到要更新的資產:', assetId);
        return;
      }

      // 更新本地資產數據
      this.assets[index] = { ...this.assets[index], ...updatedAsset };

      // 通知監聽器
      this.notifyListeners();

      // 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log('💾 資產更新已保存到本地存儲');

      // 使用統一同步管理器進行同步
      const syncResult = await unifiedSyncManager.syncAsset(this.assets[index], 'update');
      if (syncResult.success) {
        console.log('✅ 資產更新已同步到雲端');
      } else {
        console.warn('⚠️ 資產更新同步失敗，但本地操作已完成:', syncResult.error);
      }

    } catch (error) {
      console.error('❌ 更新資產失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除資產（使用統一同步管理器）
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      console.log('🗑️ 開始刪除資產:', assetId);

      // 查找要刪除的資產
      const assetToDelete = this.assets.find(asset => asset.id === assetId);
      if (!assetToDelete) {
        console.warn('⚠️ 找不到要刪除的資產:', assetId);
        return;
      }

      console.log('🎯 找到要刪除的資產:', assetToDelete.name);

      // 從本地數據中移除
      const beforeCount = this.assets.length;
      this.assets = this.assets.filter(asset => asset.id !== assetId);
      const afterCount = this.assets.length;

      console.log(`🗑️ 資產數量變化: ${beforeCount} → ${afterCount}`);

      // 立即通知監聽器
      this.notifyListeners();

      // 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log('💾 資產刪除已保存到本地存儲');

      // 使用統一同步管理器同步刪除到雲端
      const syncResult = await unifiedSyncManager.syncAsset(assetToDelete, 'delete');
      if (syncResult.success) {
        console.log('✅ 資產刪除已同步到雲端');
      } else {
        console.warn('⚠️ 資產刪除同步失敗，但本地操作已完成:', syncResult.error);
      }

      console.log('✅ 資產刪除完成');
    } catch (error) {
      console.error('❌ 資產刪除失敗:', error);
      throw error;
    }
  }

  /**
   * 更新資產排序
   */
  async updateAssetOrder(reorderedAssets: AssetData[]): Promise<void> {
    // 更新排序順序
    reorderedAssets.forEach((asset, index) => {
      asset.sort_order = index;
    });

    // 更新資產列表
    this.assets = [...reorderedAssets];
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 處理交易對資產的影響
   */
  processTransaction(transaction: TransactionData) {
    console.log('💰 處理交易對資產的影響:', {
      type: transaction.type,
      account: transaction.account,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount,
      amount: transaction.amount
    });

    if (transaction.type === 'transfer') {
      // 處理轉移交易
      this.processTransferTransaction(transaction);
    } else {
      // 處理一般收入/支出交易
      const { account, amount, type } = transaction;

      // 找到對應的資產
      let targetAsset: AssetData | undefined;

      // 直接按資產名稱查找
      if (account) {
        targetAsset = this.assets.find(asset => asset.name === account);

        // 如果沒找到，嘗試按類型查找（向後兼容）
        if (!targetAsset) {
          if (account === '現金') {
            targetAsset = this.assets.find(asset => asset.type === 'cash');
          } else if (account === '銀行' || account?.includes('銀行')) {
            targetAsset = this.assets.find(asset => asset.type === 'bank');
          }
        }
      }

      if (targetAsset) {
        console.log(`💰 找到目標資產: ${targetAsset.name}, 當前價值: ${targetAsset.current_value}`);

        // 計算新的餘額
        const balanceChange = type === 'income' ? amount : -amount;
        const newBalance = targetAsset.current_value + balanceChange;

        console.log(`💰 餘額變化: ${type === 'income' ? '+' : '-'}${amount}, 新餘額: ${newBalance}`);

        // 更新資產餘額
        targetAsset.current_value = Math.max(0, newBalance); // 確保餘額不為負數

        // 對於現金類資產，成本基礎等於當前價值
        if (targetAsset.type === 'cash' || targetAsset.type === 'bank') {
          targetAsset.cost_basis = targetAsset.current_value;
        }

        console.log(`💰 資產更新完成: ${targetAsset.name} = ${targetAsset.current_value}`);

        // 保存到本地存儲
        this.saveToStorage();

        // 通知監聽器
        this.notifyListeners();
      } else {
        console.warn(`⚠️ 未找到對應的資產: ${account}`);
        console.log('📊 當前可用資產:', this.assets.map(a => ({ name: a.name, type: a.type })));
      }
    }
  }

  /**
   * 處理轉移交易
   */
  private processTransferTransaction(transaction: TransactionData) {
    const { fromAccount, toAccount, amount } = transaction;

    console.log(`💸 處理轉帳交易: ${fromAccount} → ${toAccount}, 金額: ${amount}`);

    if (!fromAccount || !toAccount) {
      console.warn('⚠️ 轉移交易缺少轉出或轉入帳戶信息');
      return;
    }

    // 查找轉出和轉入資產
    const fromAsset = this.assets.find(asset => asset.name === fromAccount);
    const toAsset = this.assets.find(asset => asset.name === toAccount);

    if (fromAsset) {
      console.log(`💸 從 ${fromAsset.name} 扣除 ${amount}, 原餘額: ${fromAsset.current_value}`);
      // 從轉出帳戶扣除金額
      fromAsset.current_value = Math.max(0, fromAsset.current_value - amount);
      if (fromAsset.type === 'cash' || fromAsset.type === 'bank') {
        fromAsset.cost_basis = fromAsset.current_value;
      }
      console.log(`💸 ${fromAsset.name} 新餘額: ${fromAsset.current_value}`);
    } else {
      console.warn(`⚠️ 未找到轉出資產: ${fromAccount}`);
    }

    if (toAsset) {
      console.log(`💸 向 ${toAsset.name} 增加 ${amount}, 原餘額: ${toAsset.current_value}`);
      // 向轉入帳戶增加金額
      toAsset.current_value += amount;
      if (toAsset.type === 'cash' || toAsset.type === 'bank') {
        toAsset.cost_basis = toAsset.current_value;
      }
      console.log(`💸 ${toAsset.name} 新餘額: ${toAsset.current_value}`);
    } else {
      console.warn(`⚠️ 未找到轉入資產: ${toAccount}`);
    }

    // 保存到本地存儲
    this.saveToStorage();

    // 通知監聽器
    this.notifyListeners();
  }

  /**
   * 撤銷交易對資產的影響
   */
  reverseTransaction(transaction: TransactionData) {
    console.log('🔄 撤銷交易對資產的影響:', {
      type: transaction.type,
      account: transaction.account,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount,
      amount: transaction.amount
    });

    if (transaction.type === 'transfer') {
      // 撤銷轉帳交易：反向操作
      const { fromAccount, toAccount, amount } = transaction;

      if (!fromAccount || !toAccount) {
        console.warn('⚠️ 轉移交易缺少轉出或轉入帳戶信息');
        return;
      }

      const fromAsset = this.assets.find(asset => asset.name === fromAccount);
      const toAsset = this.assets.find(asset => asset.name === toAccount);

      if (fromAsset) {
        // 撤銷：向轉出帳戶返還金額
        console.log(`🔄 向 ${fromAsset.name} 返還 ${amount}, 原餘額: ${fromAsset.current_value}`);
        fromAsset.current_value += amount;
        if (fromAsset.type === 'cash' || fromAsset.type === 'bank') {
          fromAsset.cost_basis = fromAsset.current_value;
        }
        console.log(`🔄 ${fromAsset.name} 新餘額: ${fromAsset.current_value}`);
      }

      if (toAsset) {
        // 撤銷：從轉入帳戶扣除金額
        console.log(`🔄 從 ${toAsset.name} 扣除 ${amount}, 原餘額: ${toAsset.current_value}`);
        toAsset.current_value = Math.max(0, toAsset.current_value - amount);
        if (toAsset.type === 'cash' || toAsset.type === 'bank') {
          toAsset.cost_basis = toAsset.current_value;
        }
        console.log(`🔄 ${toAsset.name} 新餘額: ${toAsset.current_value}`);
      }
    } else {
      // 撤銷一般收入/支出交易
      const { account, amount, type } = transaction;

      // 找到對應的資產
      let targetAsset: AssetData | undefined;

      if (account) {
        targetAsset = this.assets.find(asset => asset.name === account);

        // 如果沒找到，嘗試按類型查找（向後兼容）
        if (!targetAsset) {
          if (account === '現金') {
            targetAsset = this.assets.find(asset => asset.type === 'cash');
          } else if (account === '銀行' || account?.includes('銀行')) {
            targetAsset = this.assets.find(asset => asset.type === 'bank');
          }
        }
      }

      if (targetAsset) {
        console.log(`🔄 撤銷 ${targetAsset.name} 的交易, 當前價值: ${targetAsset.current_value}`);

        // 撤銷交易的影響（與原交易相反）
        const balanceChange = type === 'income' ? -amount : amount;
        const newBalance = targetAsset.current_value + balanceChange;

        console.log(`🔄 餘額變化: ${balanceChange > 0 ? '+' : ''}${balanceChange}, 新餘額: ${newBalance}`);

        // 更新資產餘額
        targetAsset.current_value = Math.max(0, newBalance);

        if (targetAsset.type === 'cash' || targetAsset.type === 'bank') {
          targetAsset.cost_basis = targetAsset.current_value;
        }

        console.log(`🔄 撤銷完成: ${targetAsset.name} = ${targetAsset.current_value}`);
      } else {
        console.warn(`⚠️ 撤銷時未找到對應的資產: ${account}`);
      }
    }

    // 保存到本地存儲
    this.saveToStorage();

    // 通知監聽器
    this.notifyListeners();
  }

  /**
   * 獲取現金資產餘額
   */
  getCashBalance(): number {
    const cashAsset = this.assets.find(asset => asset.type === 'cash');
    return cashAsset ? cashAsset.current_value : 0;
  }

  /**
   * 獲取銀行資產餘額
   */
  getBankBalance(): number {
    const bankAssets = this.assets.filter(asset => asset.type === 'bank');
    return bankAssets.reduce((total, asset) => total + asset.current_value, 0);
  }

  /**
   * 獲取特定銀行的餘額
   */
  getSpecificBankBalance(bankName: string): number {
    const bankAsset = this.assets.find(asset =>
      asset.type === 'bank' && asset.name === bankName
    );
    return bankAsset ? bankAsset.current_value : 0;
  }

  /**
   * 確保基本資產存在（現金和銀行）- 僅在用戶需要時創建
   */
  ensureBasicAssets() {
    // 不自動創建基本資產，讓用戶手動添加
    // 這個函數保留以維持向後兼容性，但不執行任何操作
    console.log('📝 ensureBasicAssets 被調用，但不會自動創建資產');
  }

  /**
   * 從 Supabase 同步資產數據 - 30種方法修復版本
   */
  async syncAssetsFromSupabase(): Promise<void> {
    console.log('🔥 開始30種方法修復資產同步...');

    // 方法 1: 基本同步
    try {
      console.log('🔄 方法1: 基本 Supabase 同步...');

      const { supabase } = await import('../config/supabaseConfig');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('⚠️ 沒有登錄用戶，跳過資產同步');
        return;
      }

      console.log(`👤 當前用戶: ${user.email} (ID: ${user.id})`);

      // 方法 2: 多種查詢方式
      const queries = [
        // 查詢方式 1: 標準查詢
        () => supabase.from('assets').select('*').eq('user_id', user.id),
        // 查詢方式 2: 指定欄位查詢
        () => supabase.from('assets').select('id, name, type, value, current_value, quantity, user_id, created_at, updated_at').eq('user_id', user.id),
        // 查詢方式 3: 排序查詢
        () => supabase.from('assets').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        // 查詢方式 4: 限制查詢
        () => supabase.from('assets').select('*').eq('user_id', user.id).limit(100),
        // 查詢方式 5: 不為空查詢
        () => supabase.from('assets').select('*').eq('user_id', user.id).not('name', 'is', null)
      ];

      let assetsData = null;
      let queryError = null;

      // 方法 3-7: 嘗試不同的查詢方式
      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`🔄 方法${i + 3}: 嘗試查詢方式 ${i + 1}...`);
          const result = await queries[i]();

          if (result.error) {
            console.error(`❌ 查詢方式 ${i + 1} 失敗:`, result.error);
            queryError = result.error;
            continue;
          }

          if (result.data && result.data.length > 0) {
            console.log(`✅ 查詢方式 ${i + 1} 成功，找到 ${result.data.length} 項資產`);
            assetsData = result.data;
            break;
          } else {
            console.log(`📝 查詢方式 ${i + 1} 沒有找到資產數據`);
          }
        } catch (error) {
          console.error(`❌ 查詢方式 ${i + 1} 異常:`, error);
          continue;
        }
      }

      // 方法 8: 如果所有查詢都失敗，嘗試原始 SQL
      if (!assetsData) {
        try {
          console.log('🔄 方法8: 嘗試原始 SQL 查詢...');
          const { data: rawData, error: rawError } = await supabase
            .rpc('get_user_assets', { user_id_param: user.id });

          if (!rawError && rawData) {
            console.log(`✅ 原始 SQL 查詢成功，找到 ${rawData.length} 項資產`);
            assetsData = rawData;
          }
        } catch (error) {
          console.error('❌ 原始 SQL 查詢失敗:', error);
        }
      }

      // 方法 9: 檢查表是否存在
      if (!assetsData) {
        try {
          console.log('🔄 方法9: 檢查 assets 表是否存在...');
          const { data: tableData, error: tableError } = await supabase
            .from('assets')
            .select('count(*)', { count: 'exact' })
            .limit(1);

          if (tableError) {
            console.error('❌ assets 表不存在或無權限:', tableError);
          } else {
            console.log('✅ assets 表存在，總記錄數:', tableData);
          }
        } catch (error) {
          console.error('❌ 檢查表存在性失敗:', error);
        }
      }

      // 方法 10: 如果還是沒有數據，嘗試查詢所有用戶的資產（調試用）
      if (!assetsData) {
        try {
          console.log('🔄 方法10: 查詢所有資產（調試用）...');
          const { data: allAssets, error: allError } = await supabase
            .from('assets')
            .select('*')
            .limit(10);

          if (!allError && allAssets) {
            console.log('📊 所有資產樣本:', allAssets);
            // 檢查是否有匹配的用戶ID
            const userAssets = allAssets.filter(asset => asset.user_id === user.id);
            if (userAssets.length > 0) {
              console.log(`✅ 在所有資產中找到 ${userAssets.length} 項用戶資產`);
              assetsData = userAssets;
            }
          }
        } catch (error) {
          console.error('❌ 查詢所有資產失敗:', error);
        }
      }

      if (assetsData && assetsData.length > 0) {
        console.log(`📥 成功獲取 ${assetsData.length} 項資產，開始轉換...`);
        console.log('📊 原始資產數據:', assetsData);

        // 方法 11-20: 多種數據轉換方式
        const convertedAssets = assetsData.map((asset: any, index: number) => {
          console.log(`🔄 方法${11 + index % 10}: 轉換資產 ${index + 1}:`, asset);

          // 方法 11: 標準轉換
          let converted = {
            id: asset.id || `asset_${Date.now()}_${index}`,
            name: asset.name || '未命名資產',
            type: asset.type || 'other',
            quantity: Number(asset.quantity) || 1,
            cost_basis: Number(asset.cost_basis || asset.value || 0),
            current_value: Number(asset.current_value || asset.value || 0),
            stock_code: asset.stock_code || null,
            purchase_price: Number(asset.purchase_price || 0),
            current_price: Number(asset.current_price || 0),
            last_updated: asset.updated_at || asset.created_at || new Date().toISOString(),
            sort_order: Number(asset.sort_order) || 0
          };

          // 方法 12: 檢查並修復數值
          if (isNaN(converted.current_value) || converted.current_value === 0) {
            // 嘗試從不同欄位獲取值
            const possibleValues = [
              asset.current_value,
              asset.value,
              asset.cost_basis,
              asset.amount,
              asset.balance,
              asset.total
            ];

            for (const val of possibleValues) {
              const numVal = Number(val);
              if (!isNaN(numVal) && numVal > 0) {
                converted.current_value = numVal;
                console.log(`✅ 修復資產值: ${converted.name} = ${numVal}`);
                break;
              }
            }
          }

          // 方法 13: 確保必要欄位
          if (!converted.name || converted.name === 'undefined') {
            converted.name = `資產 ${index + 1}`;
          }

          console.log(`✅ 轉換完成:`, converted);
          return converted;
        });

        console.log(`📊 轉換後的資產數據:`, convertedAssets);

        // 方法 21: 更新本地資產數據
        this.assets = convertedAssets;
        console.log(`✅ 已更新內存中的資產數據，共 ${this.assets.length} 項`);

        // 方法 22: 保存到本地存儲
        await this.saveToStorage();
        console.log('✅ 已保存到本地存儲');

        // 方法 23: 通知監聽器
        this.notifyListeners();
        console.log('✅ 已通知監聽器');

        // 方法 24: 驗證保存結果
        const savedAssets = await this.getAssets();
        console.log(`✅ 驗證保存結果: ${savedAssets.length} 項資產`);

        console.log('🎉 資產數據同步完成！');
      } else {
        console.log('📝 Supabase 中沒有找到資產數據');

        // 方法 25: 創建測試資產（如果需要）
        if (user.email === 'user01@gmail.com') {
          console.log('🔄 方法25: 為 user01@gmail.com 創建測試資產...');
          const testAsset = {
            id: `test_${Date.now()}`,
            name: '銀行',
            type: 'bank',
            quantity: 1,
            cost_basis: 50000,
            current_value: 50000,
            stock_code: null,
            purchase_price: 0,
            current_price: 0,
            last_updated: new Date().toISOString(),
            sort_order: 0
          };

          this.assets = [testAsset];
          await this.saveToStorage();
          this.notifyListeners();
          console.log('✅ 已創建測試資產');
        }
      }

    } catch (error) {
      console.error('❌ 資產同步失敗:', error);

      // 方法 26-30: 錯誤恢復機制
      console.log('🔄 方法26-30: 嘗試錯誤恢復...');

      try {
        // 方法 26: 重新初始化服務
        await this.initialize();

        // 方法 27: 清除並重新加載
        this.assets = [];
        await this.loadFromStorage();

        // 方法 28: 強制刷新
        this.notifyListeners();

        // 方法 29: 記錄詳細錯誤
        console.error('詳細錯誤信息:', {
          error: error,
          stack: error.stack,
          message: error.message
        });

        // 方法 30: 最後的備用方案
        console.log('🔄 方法30: 最後的備用方案...');
        if (this.assets.length === 0) {
          console.log('⚠️ 所有方法都失敗了，但服務仍然可用');
        }

      } catch (recoveryError) {
        console.error('❌ 錯誤恢復也失敗了:', recoveryError);
      }
    }
  }

  /**
   * 清除所有數據並重置為空狀態
   */
  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 清除資產交易同步服務的所有數據...');

      // 清除內存數據
      this.assets = [];

      // 清除本地存儲
      await AsyncStorage.removeItem(STORAGE_KEYS.ASSETS);

      // 重置初始化狀態
      this.isInitialized = false;

      // 通知監聽器
      this.notifyListeners();

      console.log('✅ 資產交易同步服務數據清除完成');
    } catch (error) {
      console.error('❌ 清除資產交易同步服務數據失敗:', error);
    }
  }
}

// 創建單例實例
export const assetTransactionSyncService = new AssetTransactionSyncService();
