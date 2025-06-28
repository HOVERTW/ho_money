/**
 * 交易資料服務 - 管理全局交易資料同步（支援本地存儲）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from './supabase';
import { eventEmitter, EVENTS } from './eventEmitter';
import { enhancedSyncService } from './enhancedSyncService';
import { generateUUID, isValidUUID, ensureValidUUID } from '../utils/uuid';
import { instantSyncService } from './instantSyncService';
import { timestampSyncService } from './timestampSyncService';

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category: string;
  account: string;
  fromAccount?: string; // 轉移交易的轉出帳戶
  toAccount?: string;   // 轉移交易的轉入帳戶
  bank_account_id?: string;
  date: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
  max_occurrences?: number;
  start_date?: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'transfer';
}

export interface Account {
  id: string;
  name: string;
  type: string;
}

// 本地存儲的鍵名
const STORAGE_KEYS = {
  TRANSACTIONS: '@FinTranzo:transactions',
  CATEGORIES: '@FinTranzo:categories',
  ACCOUNTS: '@FinTranzo:accounts',
  INITIALIZED: '@FinTranzo:initialized'
} as const;

class TransactionDataService {
  private transactions: Transaction[] = [];
  private categories: Category[] = [];
  private accounts: Account[] = [];
  private listeners: Array<() => void> = [];
  private isInitialized = false;

  constructor() {
    // 不在構造函數中初始化，改為異步初始化
  }

  /**
   * 異步初始化服務
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 開始初始化交易資料服務...');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 用戶已登錄，從 Supabase 加載數據...');
        // 用戶已登錄，優先從 Supabase 加載數據
        await this.loadFromSupabase(user.id);
        console.log('✅ 從 Supabase 加載數據完成');
      } else {
        console.log('👤 用戶未登錄，使用空數據...');
        // 🔧 用戶未登錄時，始終使用空數據，不顯示任何交易記錄
        this.initializeDefaultData();
        console.log('✅ 未登錄狀態：使用空數據完成');
      }

      // 強制更新類別到最新版本（包含轉移類別）
      await this.forceUpdateCategories();

      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('❌ 初始化交易資料服務失敗:', error);
      // 如果加載失敗，使用空數據
      this.initializeDefaultData();
      this.isInitialized = true;
    }
  }

  /**
   * 初始化空資料
   */
  private initializeDefaultData() {
    this.initializeDefaultCategories();
    this.initializeDefaultAccounts();
    // 初始化時不添加預設交易，讓用戶從空白開始
    this.transactions = [];
  }

  /**
   * 清除所有數據並重置為空狀態（保留類別）
   */
  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 開始清除交易數據（保留類別）...');

      // 清除本地存儲（但保留類別）
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.ACCOUNTS,
        STORAGE_KEYS.INITIALIZED,
      ]);

      // 重置內存中的數據（但保留類別）
      this.transactions = [];
      this.accounts = [];
      this.isInitialized = false;

      // 重新初始化預設類別（確保類別完整）
      this.initializeDefaultCategories();

      // 保存類別到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));

      console.log('✅ 交易數據已清除（類別已保留）');
      console.log(`📊 保留的類別數量: ${this.categories.length}`);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ 清除數據失敗:', error);
      throw error;
    }
  }

  /**
   * 從 Supabase 加載用戶數據
   */
  private async loadFromSupabase(userId: string): Promise<void> {
    try {
      console.log('🔄 從 Supabase 加載用戶數據...', userId);

      // 加載用戶交易記錄
      const { data: transactions, error: transactionsError } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('❌ 加載交易記錄失敗:', transactionsError);
      } else {
        // 轉換 Supabase 格式到本地格式
        this.transactions = (transactions || []).map(t => ({
          id: t.id,
          amount: t.amount || 0,
          type: t.type,
          description: t.description || '',
          category: t.category || '',
          account: t.account || '',
          fromAccount: t.from_account,
          toAccount: t.to_account,
          date: t.date || new Date().toISOString().split('T')[0],
          is_recurring: t.is_recurring || false,
          recurring_frequency: t.recurring_frequency,
          max_occurrences: t.max_occurrences,
          start_date: t.start_date
        }));
        console.log(`✅ 加載了 ${this.transactions.length} 筆交易記錄`);
      }

      // 加載用戶資產（作為帳戶）- 使用多種方法確保成功
      console.log('🔄 開始加載用戶資產...');

      let assets = null;
      let assetsError = null;

      // 方法1: 標準查詢
      try {
        const result = await supabase
          .from(TABLES.ASSETS)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        assets = result.data;
        assetsError = result.error;
        console.log(`📊 方法1 - 標準查詢: ${assets?.length || 0} 個資產`);
      } catch (error) {
        console.error('❌ 方法1失敗:', error);
      }

      // 方法2: 如果方法1失敗，嘗試不同的查詢
      if (!assets || assets.length === 0) {
        try {
          const result = await supabase
            .from('assets')
            .select('*')
            .eq('user_id', userId);

          if (result.data && result.data.length > 0) {
            assets = result.data;
            assetsError = result.error;
            console.log(`📊 方法2 - 直接表名查詢: ${assets?.length || 0} 個資產`);
          }
        } catch (error) {
          console.error('❌ 方法2失敗:', error);
        }
      }

      // 方法3: 如果還是沒有，嘗試查詢所有資產然後過濾
      if (!assets || assets.length === 0) {
        try {
          const result = await supabase
            .from('assets')
            .select('*')
            .limit(100);

          if (result.data) {
            const userAssets = result.data.filter(asset => asset.user_id === userId);
            if (userAssets.length > 0) {
              assets = userAssets;
              console.log(`📊 方法3 - 過濾查詢: ${assets?.length || 0} 個資產`);
            }
          }
        } catch (error) {
          console.error('❌ 方法3失敗:', error);
        }
      }

      if (assetsError) {
        console.error('❌ 加載資產失敗:', assetsError);
        this.initializeDefaultAccounts();
      } else if (assets && assets.length > 0) {
        // 轉換資產為帳戶格式
        this.accounts = assets.map(asset => ({
          id: asset.id,
          name: asset.name || asset.asset_name || '未命名資產',
          type: asset.type || 'asset'
        }));
        console.log(`✅ 成功加載了 ${this.accounts.length} 個資產帳戶`);

        // 詳細記錄每個資產
        assets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name || '未命名'} (${asset.type || 'asset'}) - 價值: ${asset.current_value || asset.value || 0}`);
        });
      } else {
        console.log('📝 沒有找到用戶資產，使用空帳戶列表');
        this.initializeDefaultAccounts();
      }

      // 使用預設類別
      this.initializeDefaultCategories();

      // 同步到本地存儲作為備份
      await this.saveToStorage();

    } catch (error) {
      console.error('❌ 從 Supabase 加載數據失敗:', error);
      // 如果 Supabase 加載失敗，嘗試從本地存儲加載
      await this.loadFromStorage();
    }
  }

  /**
   * 從本地存儲加載數據
   */
  private async loadFromStorage(): Promise<void> {
    try {
      // 加載交易記錄
      const transactionsData = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (transactionsData) {
        this.transactions = JSON.parse(transactionsData);
      }

      // 加載類別
      const categoriesData = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (categoriesData) {
        this.categories = JSON.parse(categoriesData);
      } else {
        // 如果沒有保存的類別，使用預設類別
        this.initializeDefaultCategories();
      }

      // 加載帳戶
      const accountsData = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (accountsData) {
        this.accounts = JSON.parse(accountsData);
      } else {
        // 如果沒有保存的帳戶，使用預設帳戶
        this.initializeDefaultAccounts();
      }
    } catch (error) {
      console.error('❌ 從本地存儲加載數據失敗:', error);
      throw error;
    }
  }

  /**
   * 保存數據到本地存儲
   */
  private async saveToStorage(): Promise<void> {
    try {
      console.log('💾 開始保存數據到本地存儲...');
      console.log(`📊 交易數量: ${this.transactions.length}`);
      console.log(`📊 類別數量: ${this.categories.length}`);
      console.log(`📊 帳戶數量: ${this.accounts.length}`);

      // 分別保存，提供更詳細的錯誤信息
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
        console.log('✅ 交易數據已保存');
      } catch (error) {
        console.error('❌ 保存交易數據失敗:', error);
        throw new Error(`保存交易數據失敗: ${error.message}`);
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
        console.log('✅ 類別數據已保存');
      } catch (error) {
        console.error('❌ 保存類別數據失敗:', error);
        throw new Error(`保存類別數據失敗: ${error.message}`);
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(this.accounts));
        console.log('✅ 帳戶數據已保存');
      } catch (error) {
        console.error('❌ 保存帳戶數據失敗:', error);
        throw new Error(`保存帳戶數據失敗: ${error.message}`);
      }

      console.log('✅ 所有數據已成功保存到本地存儲');
    } catch (error) {
      console.error('❌ 保存數據到本地存儲失敗:', error);
      throw error;
    }
  }

  /**
   * 初始化預設類別
   */
  private initializeDefaultCategories() {
    this.categories = [
      // 支出類別 - 第一行
      { id: '1', name: '餐飲', icon: 'restaurant-outline', color: '#FF6384', type: 'expense' },
      { id: '2', name: '交通', icon: 'car-outline', color: '#36A2EB', type: 'expense' },
      { id: '3', name: '購物', icon: 'bag-outline', color: '#FFCE56', type: 'expense' },
      { id: '4', name: '娛樂', icon: 'game-controller-outline', color: '#4BC0C0', type: 'expense' },
      { id: '5', name: '禮品', icon: 'gift-outline', color: '#9966FF', type: 'expense' },
      // 支出類別 - 第二行
      { id: '6', name: '學習', icon: 'school-outline', color: '#FF9F40', type: 'expense' },
      { id: '7', name: '旅行', icon: 'airplane-outline', color: '#1ABC9C', type: 'expense' },
      { id: '8', name: '醫療', icon: 'medical-outline', color: '#E74C3C', type: 'expense' },
      { id: '9', name: '保險', icon: 'shield-outline', color: '#3498DB', type: 'expense' },
      { id: '10', name: '還款', icon: 'card-outline', color: '#FF6B6B', type: 'expense' },
      // 支出類別 - 第三行
      { id: '11', name: '家居', icon: 'home-outline', color: '#F39C12', type: 'expense' },
      { id: '12', name: '家庭', icon: 'people-outline', color: '#9B59B6', type: 'expense' },
      { id: '13', name: '紅包', icon: 'wallet-outline', color: '#E67E22', type: 'expense' },
      { id: '14', name: '其他', icon: 'ellipsis-horizontal-outline', color: '#95A5A6', type: 'expense' },

      // 收入類別 - 第一行
      { id: '15', name: '薪水', icon: 'card-outline', color: '#2ECC71', type: 'income' },
      { id: '16', name: '獎金', icon: 'trophy-outline', color: '#3498DB', type: 'income' },
      { id: '17', name: '投資', icon: 'trending-up-outline', color: '#E74C3C', type: 'income' },
      { id: '18', name: '副業', icon: 'briefcase-outline', color: '#F39C12', type: 'income' },
      { id: '19', name: '租金', icon: 'business-outline', color: '#9B59B6', type: 'income' },
      // 收入類別 - 第二行
      { id: '20', name: '利息', icon: 'cash-outline', color: '#1ABC9C', type: 'income' },
      { id: '21', name: '中獎', icon: 'gift-outline', color: '#FF6B6B', type: 'income' },
      { id: '22', name: '收款', icon: 'wallet-outline', color: '#FF9F40', type: 'income' },
      { id: '23', name: '販售', icon: 'storefront-outline', color: '#8E44AD', type: 'income' },
      { id: '24', name: '其他', icon: 'ellipsis-horizontal-outline', color: '#95A5A6', type: 'income' },

      // 轉移類別
      { id: '25', name: '轉移', icon: 'swap-horizontal-outline', color: '#6C757D', type: 'transfer' },
    ];
  }

  /**
   * 初始化空的帳戶列表
   */
  private initializeDefaultAccounts() {
    this.accounts = [];
    // 從空列表開始，讓用戶自己添加帳戶
  }

  /**
   * 添加監聽器
   */
  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除監聽器
   */
  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 獲取所有交易
   */
  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  /**
   * 獲取所有類別
   */
  getCategories(): Category[] {
    return [...this.categories];
  }

  /**
   * 獲取所有帳戶
   */
  getAccounts(): Account[] {
    return [...this.accounts];
  }

  /**
   * 設置帳戶列表
   */
  setAccounts(accounts: Account[]): void {
    this.accounts = [...accounts];
    this.notifyListeners();
  }

  /**
   * 設置交易列表
   */
  setTransactions(transactions: Transaction[]): void {
    this.transactions = [...transactions];
    this.notifyListeners();
  }

  /**
   * 緊急修復：用戶登錄後重新加載數據（保護本地數據）
   */
  async reloadUserData(userId: string): Promise<void> {
    try {
      console.log('🔄 緊急修復：用戶登錄，重新加載數據...', userId);

      // 緊急修復：備份當前本地數據，避免丟失
      const backupTransactions = [...this.transactions];
      const backupAccounts = [...this.accounts];

      console.log(`💾 緊急修復：備份本地數據 - 交易: ${backupTransactions.length}, 帳戶: ${backupAccounts.length}`);

      try {
        // 從 Supabase 重新加載用戶數據
        await this.loadFromSupabase(userId);

        // 緊急修復：如果 Supabase 沒有數據，恢復本地備份
        if (this.transactions.length === 0 && backupTransactions.length > 0) {
          console.log('🔄 緊急修復：Supabase 無交易數據，恢復本地備份');
          this.transactions = backupTransactions;

          // 立即保存到本地存儲
          await this.saveToStorage();
        }

        if (this.accounts.length === 0 && backupAccounts.length > 0) {
          console.log('🔄 緊急修復：Supabase 無帳戶數據，恢復本地備份');
          this.accounts = backupAccounts;

          // 立即保存到本地存儲
          await this.saveToStorage();
        }

      } catch (supabaseError) {
        console.error('❌ 緊急修復：Supabase 載入失敗，恢復本地備份:', supabaseError);

        // 緊急修復：如果 Supabase 載入失敗，完全恢復本地備份
        this.transactions = backupTransactions;
        this.accounts = backupAccounts;
      }

      // 通知監聽器更新
      this.notifyListeners();

      console.log('✅ 緊急修復：用戶數據重新加載完成');
      console.log(`📊 緊急修復：最終數據 - 交易: ${this.transactions.length}, 帳戶: ${this.accounts.length}`);
    } catch (error) {
      console.error('❌ 緊急修復：重新加載用戶數據失敗:', error);
      throw error;
    }
  }

  /**
   * 用戶登出後清除數據
   */
  async clearUserData(): Promise<void> {
    try {
      console.log('🔄 用戶登出，清除數據...');

      // 清除用戶相關數據
      this.transactions = [];
      this.accounts = [];

      // 重置為預設數據
      this.initializeDefaultData();

      // 通知監聽器更新
      this.notifyListeners();

      console.log('✅ 用戶數據已清除');
    } catch (error) {
      console.error('❌ 清除用戶數據失敗:', error);
    }
  }

  /**
   * 強制刷新用戶數據（用於調試和修復）
   */
  async forceRefreshUserData(): Promise<void> {
    try {
      console.log('🔄 強制刷新用戶數據...');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 用戶已登錄，強制重新加載數據...', user.email);

        // 清除當前數據
        this.transactions = [];
        this.accounts = [];

        // 重新從 Supabase 加載
        await this.loadFromSupabase(user.id);

        // 通知監聽器更新
        this.notifyListeners();

        console.log('✅ 強制刷新完成');
        console.log(`📊 當前交易數量: ${this.transactions.length}`);
        console.log(`📊 當前帳戶數量: ${this.accounts.length}`);
      } else {
        console.log('👤 用戶未登錄，無法刷新數據');
      }
    } catch (error) {
      console.error('❌ 強制刷新用戶數據失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取數據統計信息（用於調試）
   */
  getDataStats(): { transactions: number; accounts: number; categories: number } {
    return {
      transactions: this.transactions.length,
      accounts: this.accounts.length,
      categories: this.categories.length
    };
  }

  /**
   * 根據類別名稱獲取類別資訊
   */
  getCategoryByName(name: string): Category | undefined {
    return this.categories.find(cat => cat.name === name);
  }

  /**
   * 根據帳戶名稱獲取帳戶資訊
   */
  getAccountByName(name: string): Account | undefined {
    return this.accounts.find(acc => acc.name === name);
  }

  /**
   * 添加交易
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    try {
      console.log('📝 開始添加交易記錄:', transaction.description);
      console.log('📝 交易 ID:', transaction.id);
      console.log('📝 交易詳情:', {
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        account: transaction.account
      });

      // 確保 ID 是有效的 UUID
      const validId = ensureValidUUID(transaction.id);
      if (validId !== transaction.id) {
        console.log(`🔄 修正交易 ID: ${transaction.id} -> ${validId}`);
        transaction.id = validId;
      }

      // 添加到本地數據
      this.transactions.push(transaction);
      console.log('✅ 已添加到本地數據，當前交易數量:', this.transactions.length);

      // 保存到本地存儲
      try {
        await this.saveToStorage();
        console.log('✅ 已保存到本地存儲');
      } catch (storageError) {
        console.error('❌ 保存到本地存儲失敗:', storageError);
        // 即使本地存儲失敗，也繼續雲端同步
      }

      // ⚡ 時間戳記即時同步
      try {
        await timestampSyncService.addToQueue('transaction', transaction, 'create');
        console.log('⚡ 已添加到時間戳記同步隊列:', transaction.description);
      } catch (syncError) {
        console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
      }

      // 通知監聽器
      this.notifyListeners();

      console.log('✅ 交易記錄本地添加完成，ID:', transaction.id);
    } catch (error) {
      console.error('❌ 添加交易記錄失敗:', error);

      // 如果添加失敗，嘗試回滾本地數據
      const index = this.transactions.findIndex(t => t.id === transaction.id);
      if (index !== -1) {
        this.transactions.splice(index, 1);
        console.log('🔄 已回滾本地數據');
      }

      throw error;
    }
  }

  /**
   * 更新交易
   */
  async updateTransaction(id: string, updatedTransaction: Partial<Transaction>): Promise<void> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updatedTransaction };
      await this.saveToStorage();
      this.notifyListeners();

      // ⚡ 時間戳記即時同步
      try {
        await timestampSyncService.addToQueue('transaction', this.transactions[index], 'update');
        console.log('⚡ 交易更新已添加到時間戳記同步隊列:', id);
      } catch (syncError) {
        console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
      }
    }
  }

  /**
   * 深度修復：刪除交易（強化刪除邏輯）
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      console.log('🗑️ 深度修復：開始刪除交易記錄:', id);

      // 深度修復：查找要刪除的交易
      const transactionToDelete = this.transactions.find(t => t.id === id);
      if (!transactionToDelete) {
        console.warn('⚠️ 深度修復：找不到要刪除的交易:', id);
        return;
      }

      console.log('🎯 深度修復：找到要刪除的交易:', transactionToDelete.description);

      // 深度修復：從本地數據中移除
      const beforeCount = this.transactions.length;
      this.transactions = this.transactions.filter(t => t.id !== id);
      const afterCount = this.transactions.length;

      console.log(`🗑️ 深度修復：交易數量變化: ${beforeCount} → ${afterCount}`);

      // 深度修復：強制保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
      console.log('💾 深度修復：交易刪除已強制保存到本地存儲');

      // ⚡ 時間戳記即時同步刪除
      try {
        await timestampSyncService.addToQueue('transaction', { id }, 'delete');
        console.log('⚡ 交易刪除已添加到時間戳記同步隊列:', id);
      } catch (syncError) {
        console.error('⚠️ 時間戳記同步失敗，但本地操作已完成:', syncError);
      }

      // 深度修復：立即通知監聽器
      this.notifyListeners();

      console.log('✅ 深度修復：交易記錄刪除完成，ID:', id);
    } catch (error) {
      console.error('❌ 深度修復：刪除交易記錄失敗:', error);
      throw error;
    }
  }

  /**
   * 同步交易到 Supabase
   */
  private async syncTransactionToSupabase(transaction: Transaction): Promise<void> {
    try {
      console.log('🔄 同步交易到雲端:', transaction.description);

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 用戶未登錄，跳過雲端同步');
        return;
      }

      console.log('✅ 用戶已登錄，開始同步交易記錄到雲端');

      // 確保 ID 是有效的 UUID 格式
      const validId = ensureValidUUID(transaction.id);

      // 如果 ID 被更新，同步更新本地交易記錄
      if (validId !== transaction.id) {
        console.log(`🔄 更新本地交易 ID: ${transaction.id} -> ${validId}`);
        const oldId = transaction.id;
        transaction.id = validId;
        // 更新本地數據中的 ID - 使用舊 ID 查找
        const index = this.transactions.findIndex(t => t.id === oldId);
        if (index !== -1) {
          this.transactions[index].id = validId;
          // 重新保存到本地存儲
          await this.saveToStorage();
        }
      }

      // 準備 Supabase 格式的數據
      const supabaseTransaction = {
        id: validId,
        user_id: user.id,
        account_id: null,
        amount: transaction.amount || 0,
        type: transaction.type,
        description: transaction.description || '',
        category: transaction.category || '',
        account: transaction.account || '',
        from_account: transaction.fromAccount || null,
        to_account: transaction.toAccount || null,
        date: transaction.date || new Date().toISOString().split('T')[0],
        is_recurring: transaction.is_recurring || false,
        recurring_frequency: transaction.recurring_frequency || null,
        max_occurrences: transaction.max_occurrences || null,
        start_date: transaction.start_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 使用 upsert 直接插入或更新，避免額外查詢延遲
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .upsert(supabaseTransaction, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ 同步交易記錄到雲端失敗:', error);
        console.error('❌ 錯誤詳情:', error.message, error.details, error.hint);
      } else {
        // 驗證數據是否真的同步成功
        const { data: verifyData, error: verifyError } = await supabase
          .from(TABLES.TRANSACTIONS)
          .select('id')
          .eq('id', validId)
          .eq('user_id', user.id)
          .single();

        if (verifyError || !verifyData) {
          console.error('❌ 雲端交易記錄同步驗證失敗:', verifyError);
        } else {
          console.log('✅ 雲端交易記錄同步驗證成功:', validId);
        }
      }

    } catch (error) {
      console.error('❌ 同步交易到雲端異常:', error);
    }
  }

  /**
   * 同步刪除到 Supabase
   */
  private async syncDeleteToSupabase(transactionId: string): Promise<void> {
    try {
      console.log('🔄 同步刪除交易到雲端:', transactionId);

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📝 用戶未登錄，跳過雲端刪除同步');
        return;
      }

      console.log('✅ 用戶已登錄，開始刪除雲端交易記錄');

      // 從 Supabase 刪除交易記錄
      const { error: deleteError } = await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ 刪除雲端交易記錄失敗:', deleteError);
        console.error('❌ 錯誤詳情:', deleteError.message, deleteError.details, deleteError.hint);
      } else {
        // 驗證記錄是否真的被刪除
        const { data: verifyData, error: verifyError } = await supabase
          .from(TABLES.TRANSACTIONS)
          .select('id')
          .eq('id', transactionId)
          .eq('user_id', user.id)
          .single();

        if (verifyError && verifyError.code === 'PGRST116') {
          // PGRST116 表示沒有找到記錄，這是我們期望的結果
          console.log('✅ 雲端交易記錄刪除驗證成功:', transactionId);
        } else if (verifyData) {
          console.error('❌ 雲端交易記錄刪除驗證失敗，記錄仍然存在:', transactionId);
        } else {
          console.error('❌ 雲端交易記錄刪除驗證失敗:', verifyError);
        }
      }

    } catch (error) {
      console.error('❌ 同步刪除交易到雲端異常:', error);
    }
  }

  /**
   * 批量設置交易（用於初始化）- 異步版本
   */
  async setTransactionsAsync(transactions: Transaction[]): Promise<void> {
    this.transactions = [...transactions];
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 添加類別
   */
  async addCategory(category: Category): Promise<void> {
    this.categories.push(category);
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 更新類別
   */
  async updateCategory(id: string, updatedCategory: Partial<Category>): Promise<void> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      this.categories[index] = { ...this.categories[index], ...updatedCategory };
      await this.saveToStorage();
      this.notifyListeners();

      // 同步更新到雲端
      await enhancedSyncService.syncCategoryUpdate(id, this.categories[index]);
    }
  }

  /**
   * 刪除類別
   */
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    await this.saveToStorage();
    this.notifyListeners();

    // 同步刪除到雲端
    await enhancedSyncService.syncCategoryDelete(id);
  }

  /**
   * 添加帳戶
   */
  async addAccount(account: Account): Promise<void> {
    this.accounts.push(account);
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 更新帳戶
   */
  async updateAccount(id: string, updatedAccount: Partial<Account>): Promise<void> {
    const index = this.accounts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.accounts[index] = { ...this.accounts[index], ...updatedAccount };
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * 刪除帳戶
   */
  async deleteAccount(id: string): Promise<void> {
    this.accounts = this.accounts.filter(a => a.id !== id);
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 強制更新類別到最新版本
   */
  async forceUpdateCategories(): Promise<void> {
    try {
      console.log('🔄 強制更新類別到最新版本...');

      // 重新初始化預設類別
      this.initializeDefaultCategories();

      // 保存到本地存儲
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));

      // 通知監聽器
      this.notifyListeners();

      console.log('✅ 類別已強制更新到最新版本');
      console.log('📊 新類別數量:', this.categories.length);
      console.log('💰 支出類別:', this.categories.filter(c => c.type === 'expense').map(c => c.name).join(', '));
      console.log('💵 收入類別:', this.categories.filter(c => c.type === 'income').map(c => c.name).join(', '));
      console.log('🔄 轉移類別:', this.categories.filter(c => c.type === 'transfer').map(c => c.name).join(', '));
    } catch (error) {
      console.error('❌ 強制更新類別失敗:', error);
      throw error;
    }
  }

  /**
   * 清除所有數據（重置應用）- 重複函數已移除
   */

  /**
   * 獲取指定時間範圍的交易
   */
  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  /**
   * 獲取指定類型的交易
   */
  getTransactionsByType(type: 'income' | 'expense' | 'transfer'): Transaction[] {
    return this.transactions.filter(transaction => transaction.type === type);
  }

  /**
   * 獲取指定日期的交易
   */
  getTransactionsByDate(date: string): Transaction[] {
    return this.transactions.filter(transaction =>
      transaction.date.split('T')[0] === date
    );
  }

  /**
   * 計算總收入
   */
  getTotalIncome(startDate?: Date, endDate?: Date): number {
    let transactions = this.transactions.filter(t => t.type === 'income');

    if (startDate && endDate) {
      transactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * 計算總支出
   */
  getTotalExpense(startDate?: Date, endDate?: Date): number {
    let transactions = this.transactions.filter(t => t.type === 'expense');

    if (startDate && endDate) {
      transactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * 計算淨現金流
   */
  getNetCashFlow(startDate?: Date, endDate?: Date): number {
    return this.getTotalIncome(startDate, endDate) - this.getTotalExpense(startDate, endDate);
  }

  /**
   * 獲取支出類別統計
   */
  getExpenseByCategory(): { [category: string]: number } {
    const expenseTransactions = this.transactions.filter(t => t.type === 'expense');
    return expenseTransactions.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as { [category: string]: number });
  }

  /**
   * 獲取收入類別統計
   */
  getIncomeByCategory(): { [category: string]: number } {
    const incomeTransactions = this.transactions.filter(t => t.type === 'income');
    return incomeTransactions.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as { [category: string]: number });
  }

  /**
   * 獲取月度趨勢資料
   */
  getMonthlyTrends(months: number = 6): {
    labels: string[],
    income: number[],
    expense: number[]
  } {
    const now = new Date();
    const labels: string[] = [];
    const income: number[] = [];
    const expense: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      labels.push(`${date.getMonth() + 1}月`);

      const monthIncome = this.getTotalIncome(date, nextDate);
      const monthExpense = this.getTotalExpense(date, nextDate);

      income.push(monthIncome);
      expense.push(monthExpense);
    }

    return { labels, income, expense };
  }
}

// 創建單例實例
export const transactionDataService = new TransactionDataService();
