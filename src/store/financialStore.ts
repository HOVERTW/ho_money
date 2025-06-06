import { create } from 'zustand';
import { 
  Account, 
  Transaction, 
  Asset, 
  Liability, 
  Category, 
  FinancialSummary 
} from '../types';
import { dbService, TABLES } from '../services/supabase';

interface FinancialState {
  // Data
  accounts: Account[];
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  categories: Category[];
  summary: FinancialSummary | null;
  
  // Loading states
  loading: boolean;
  accountsLoading: boolean;
  transactionsLoading: boolean;
  assetsLoading: boolean;
  liabilitiesLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  fetchAccounts: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchAssets: () => Promise<void>;
  fetchLiabilities: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  calculateSummary: () => void;
  
  // CRUD operations
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  addLiability: (liability: Omit<Liability, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLiability: (id: string, updates: Partial<Liability>) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useFinancialStore = create<FinancialState>((set, get) => ({
  // Initial state
  accounts: [],
  transactions: [],
  assets: [],
  liabilities: [],
  categories: [],
  summary: null,
  loading: false,
  accountsLoading: false,
  transactionsLoading: false,
  assetsLoading: false,
  liabilitiesLoading: false,
  error: null,

  // Fetch operations
  fetchAccounts: async () => {
    set({ accountsLoading: true, error: null });
    try {
      const { data, error } = await dbService.read(TABLES.ACCOUNTS);
      if (error) throw error;
      set({ accounts: data || [], accountsLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
        accountsLoading: false 
      });
    }
  },

  fetchTransactions: async () => {
    set({ transactionsLoading: true, error: null });
    try {
      const { data, error } = await dbService.read(TABLES.TRANSACTIONS);
      if (error) throw error;
      set({ transactions: data || [], transactionsLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        transactionsLoading: false 
      });
    }
  },

  fetchAssets: async () => {
    set({ assetsLoading: true, error: null });
    try {
      const { data, error } = await dbService.read(TABLES.ASSETS);
      if (error) throw error;
      set({ assets: data || [], assetsLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch assets',
        assetsLoading: false 
      });
    }
  },

  fetchLiabilities: async () => {
    set({ liabilitiesLoading: true, error: null });
    try {
      const { data, error } = await dbService.read(TABLES.LIABILITIES);
      if (error) throw error;
      set({ liabilities: data || [], liabilitiesLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch liabilities',
        liabilitiesLoading: false 
      });
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await dbService.read(TABLES.CATEGORIES);
      if (error) throw error;
      set({ categories: data || [] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      });
    }
  },

  calculateSummary: () => {
    const { accounts, assets, liabilities, transactions } = get();
    
    const totalAssets = accounts.reduce((sum, account) => sum + account.balance, 0) +
                       assets.reduce((sum, asset) => sum + asset.current_value, 0);
    
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    
    const netWorth = totalAssets - totalLiabilities;
    
    // Calculate monthly income and expenses from recent transactions
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const recentTransactions = transactions.filter(t => {
      // 確保交易有有效的日期
      if (!t || !t.date) return false;

      const tDate = new Date(t.date);
      // 檢查日期是否有效
      if (isNaN(tDate.getTime())) return false;

      return tDate >= oneMonthAgo;
    });
    
    const monthlyIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savingsRate = monthlyIncome > 0 ? 
      ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    
    const summary: FinancialSummary = {
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      savings_rate: savingsRate,
    };
    
    set({ summary });
  },

  // CRUD operations for accounts
  addAccount: async (accountData) => {
    try {
      const { data, error } = await dbService.create(TABLES.ACCOUNTS, accountData);
      if (error) throw error;
      
      const { accounts } = get();
      set({ accounts: [...accounts, data] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add account'
      });
    }
  },

  updateAccount: async (id, updates) => {
    try {
      const { data, error } = await dbService.update(TABLES.ACCOUNTS, id, updates);
      if (error) throw error;
      
      const { accounts } = get();
      set({ 
        accounts: accounts.map(account => 
          account.id === id ? { ...account, ...data } : account
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update account'
      });
    }
  },

  deleteAccount: async (id) => {
    try {
      const { error } = await dbService.delete(TABLES.ACCOUNTS, id);
      if (error) throw error;
      
      const { accounts } = get();
      set({ accounts: accounts.filter(account => account.id !== id) });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete account'
      });
    }
  },

  // Similar CRUD operations for other entities would be implemented here...
  addTransaction: async (transactionData) => {
    try {
      const { data, error } = await dbService.create(TABLES.TRANSACTIONS, transactionData);
      if (error) throw error;
      
      const { transactions } = get();
      set({ transactions: [...transactions, data] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add transaction'
      });
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const { data, error } = await dbService.update(TABLES.TRANSACTIONS, id, updates);
      if (error) throw error;
      
      const { transactions } = get();
      set({ 
        transactions: transactions.map(transaction => 
          transaction.id === id ? { ...transaction, ...data } : transaction
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction'
      });
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await dbService.delete(TABLES.TRANSACTIONS, id);
      if (error) throw error;
      
      const { transactions } = get();
      set({ transactions: transactions.filter(transaction => transaction.id !== id) });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete transaction'
      });
    }
  },

  // Asset CRUD operations
  addAsset: async (assetData) => {
    try {
      const { data, error } = await dbService.create(TABLES.ASSETS, assetData);
      if (error) throw error;
      
      const { assets } = get();
      set({ assets: [...assets, data] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add asset'
      });
    }
  },

  updateAsset: async (id, updates) => {
    try {
      const { data, error } = await dbService.update(TABLES.ASSETS, id, updates);
      if (error) throw error;
      
      const { assets } = get();
      set({ 
        assets: assets.map(asset => 
          asset.id === id ? { ...asset, ...data } : asset
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update asset'
      });
    }
  },

  deleteAsset: async (id) => {
    try {
      const { error } = await dbService.delete(TABLES.ASSETS, id);
      if (error) throw error;
      
      const { assets } = get();
      set({ assets: assets.filter(asset => asset.id !== id) });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete asset'
      });
    }
  },

  // Liability CRUD operations
  addLiability: async (liabilityData) => {
    try {
      const { data, error } = await dbService.create(TABLES.LIABILITIES, liabilityData);
      if (error) throw error;
      
      const { liabilities } = get();
      set({ liabilities: [...liabilities, data] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add liability'
      });
    }
  },

  updateLiability: async (id, updates) => {
    try {
      const { data, error } = await dbService.update(TABLES.LIABILITIES, id, updates);
      if (error) throw error;
      
      const { liabilities } = get();
      set({ 
        liabilities: liabilities.map(liability => 
          liability.id === id ? { ...liability, ...data } : liability
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update liability'
      });
    }
  },

  deleteLiability: async (id) => {
    try {
      const { error } = await dbService.delete(TABLES.LIABILITIES, id);
      if (error) throw error;
      
      const { liabilities } = get();
      set({ liabilities: liabilities.filter(liability => liability.id !== id) });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete liability'
      });
    }
  },

  // Utility actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
