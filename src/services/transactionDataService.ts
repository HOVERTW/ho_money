/**
 * 交易資料服務 - 管理全局交易資料同步（支援本地存儲）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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

      // 檢查是否已經初始化過
      const hasInitialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);

      if (hasInitialized) {
        // 從本地存儲加載數據
        await this.loadFromStorage();
        console.log('✅ 從本地存儲加載數據完成');

        // 強制更新類別到最新版本（包含轉移類別）
        await this.forceUpdateCategories();
      } else {
        // 首次使用，初始化空數據
        this.initializeDefaultData();
        await this.saveToStorage();
        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        console.log('✅ 首次初始化空數據完成');
      }

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
   * 清除所有數據並重置為空狀態
   */
  async clearAllData(): Promise<void> {
    try {
      // 清除本地存儲
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.CATEGORIES,
        STORAGE_KEYS.ACCOUNTS,
        STORAGE_KEYS.INITIALIZED,
      ]);

      // 重置內存中的數據
      this.transactions = [];
      this.categories = [];
      this.accounts = [];
      this.isInitialized = false;

      console.log('✅ 所有交易數據已清除');
      this.notifyListeners();
    } catch (error) {
      console.error('❌ 清除數據失敗:', error);
      throw error;
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
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions)),
        AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories)),
        AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(this.accounts))
      ]);
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
    this.transactions.push(transaction);
    await this.saveToStorage();
    this.notifyListeners();
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
    }
  }

  /**
   * 刪除交易
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      console.log('🗑️ 開始刪除交易記錄:', id);

      // 從本地數據中移除
      this.transactions = this.transactions.filter(t => t.id !== id);

      // 保存到本地存儲
      await this.saveToStorage();

      // 同步刪除到 Supabase
      await this.syncDeleteToSupabase(id);

      // 通知監聽器
      this.notifyListeners();

      console.log('✅ 交易記錄刪除成功');
    } catch (error) {
      console.error('❌ 刪除交易記錄失敗:', error);
      throw error;
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
        console.log('✅ 雲端交易記錄刪除成功:', transactionId);
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
    }
  }

  /**
   * 刪除類別
   */
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    await this.saveToStorage();
    this.notifyListeners();
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
