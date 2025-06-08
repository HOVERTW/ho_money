/**
 * 資產與交易同步服務
 * 負責處理交易記錄與資產負債表之間的數據同步
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from './supabase';
import { eventEmitter, EVENTS } from './eventEmitter';

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

  constructor() {
    // 不在構造函數中初始化，改為異步初始化

    // 暫時停用事件監聽以避免循環依賴
    // eventEmitter.on(EVENTS.DATA_SYNC_COMPLETED, this.handleDataSyncCompleted.bind(this));
  }

  /**
   * 異步初始化資產服務
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.isInitialized = true;
      console.log(`✅ 資產服務已初始化，加載了 ${this.assets.length} 項資產`);
    } catch (error) {
      console.error('❌ 資產服務初始化失敗:', error);
      // 如果加載失敗，使用空列表
      this.assets = [];
      this.isInitialized = true;
    }
    this.notifyListeners();
  }

  /**
   * 強制重新加載數據（用於雲端同步後）
   */
  async forceReload(): Promise<void> {
    console.log('🔄 強制重新加載資產數據...');
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * 處理數據同步完成事件
   */
  private async handleDataSyncCompleted(): Promise<void> {
    console.log('📡 收到數據同步完成事件，重新加載資產數據...');
    await this.forceReload();
  }

  /**
   * 從本地存儲加載資產數據
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const assetsData = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      if (assetsData) {
        this.assets = JSON.parse(assetsData);
        console.log('📦 從本地存儲加載資產數據:', this.assets.length, '項');
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
   * 保存資產數據到本地存儲和雲端
   */
  private async saveToStorage(): Promise<void> {
    try {
      // 1. 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
      console.log('💾 資產數據已保存到本地存儲');

      // 2. 如果用戶已登錄，同時保存到雲端
      await this.syncToSupabase();
    } catch (error) {
      console.error('❌ 保存資產數據失敗:', error);
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

          // 立即驗證數據是否真的插入了
          setTimeout(async () => {
            const { data: verifyData, error: verifyError } = await supabase
              .from(TABLES.ASSETS)
              .select('*')
              .eq('user_id', user.id);

            if (verifyError) {
              console.error('❌ 驗證插入失敗:', verifyError);
            } else {
              console.log('🔍 驗證結果: 雲端現有', verifyData?.length || 0, '筆資產記錄');
            }
          }, 1000);
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
   * 添加新資產
   */
  async addAsset(asset: AssetData): Promise<void> {
    // 如果沒有指定排序順序，設置為最後
    if (asset.sort_order === undefined) {
      const maxOrder = Math.max(...this.assets.map(a => a.sort_order || 0), -1);
      asset.sort_order = maxOrder + 1;
    }
    this.assets.push(asset);
    this.notifyListeners();
    await this.saveToStorage();
  }

  /**
   * 更新資產
   */
  async updateAsset(assetId: string, updatedAsset: Partial<AssetData>): Promise<void> {
    const index = this.assets.findIndex(asset => asset.id === assetId);
    if (index !== -1) {
      this.assets[index] = { ...this.assets[index], ...updatedAsset };
      this.notifyListeners();
      await this.saveToStorage();
    }
  }

  /**
   * 刪除資產
   */
  async deleteAsset(assetId: string): Promise<void> {
    this.assets = this.assets.filter(asset => asset.id !== assetId);
    this.notifyListeners();
    await this.saveToStorage();
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
    if (transaction.type === 'transfer') {
      // 處理轉移交易
      this.processTransferTransaction(transaction);
    } else {
      // 處理一般收入/支出交易
      const { account, amount, type } = transaction;

      // 找到對應的資產
      let targetAsset: AssetData | undefined;

      if (account === '現金') {
        targetAsset = this.assets.find(asset => asset.type === 'cash');
      } else if (account === '銀行' || account?.includes('銀行')) {
        // 如果是具體的銀行名稱，找到對應的銀行資產
        targetAsset = this.assets.find(asset =>
          asset.type === 'bank' && (asset.name === account || asset.name === '銀行')
        );
      } else if (account) {
        // 查找其他資產類型
        targetAsset = this.assets.find(asset => asset.name === account);
      }

      if (targetAsset) {
        // 計算新的餘額
        const balanceChange = type === 'income' ? amount : -amount;
        const newBalance = targetAsset.current_value + balanceChange;

        // 更新資產餘額
        targetAsset.current_value = Math.max(0, newBalance); // 確保餘額不為負數
        targetAsset.cost_basis = targetAsset.current_value; // 對於現金和銀行，成本基礎等於當前價值

        this.notifyListeners();
      }
    }
  }

  /**
   * 處理轉移交易
   */
  private processTransferTransaction(transaction: TransactionData) {
    const { fromAccount, toAccount, amount } = transaction;

    if (!fromAccount || !toAccount) {
      console.warn('轉移交易缺少轉出或轉入帳戶信息');
      return;
    }

    // 查找轉出和轉入資產
    const fromAsset = this.assets.find(asset => asset.name === fromAccount);
    const toAsset = this.assets.find(asset => asset.name === toAccount);

    if (fromAsset) {
      // 從轉出帳戶扣除金額
      fromAsset.current_value = Math.max(0, fromAsset.current_value - amount);
      fromAsset.cost_basis = fromAsset.current_value;
    }

    if (toAsset) {
      // 向轉入帳戶增加金額
      toAsset.current_value += amount;
      toAsset.cost_basis = toAsset.current_value;
    }

    this.notifyListeners();
  }

  /**
   * 撤銷交易對資產的影響
   */
  reverseTransaction(transaction: TransactionData) {
    const { account, amount, type } = transaction;

    // 找到對應的資產
    let targetAsset: AssetData | undefined;

    if (account === '現金') {
      targetAsset = this.assets.find(asset => asset.type === 'cash');
    } else if (account === '銀行' || (account && account.includes('銀行'))) {
      targetAsset = this.assets.find(asset =>
        asset.type === 'bank' && (asset.name === account || asset.name === '銀行')
      );
    }

    if (targetAsset) {
      // 撤銷交易的影響（與原交易相反）
      const balanceChange = type === 'income' ? -amount : amount;
      const newBalance = targetAsset.current_value + balanceChange;

      // 更新資產餘額
      targetAsset.current_value = Math.max(0, newBalance);
      targetAsset.cost_basis = targetAsset.current_value;

      this.notifyListeners();
    }
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
}

// 創建單例實例
export const assetTransactionSyncService = new AssetTransactionSyncService();
