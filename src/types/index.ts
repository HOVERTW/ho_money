// User and Authentication Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

// Account Types
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum AccountType {
  CASH = 'cash',
  BANK = 'bank',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  OTHER = 'other'
}

// Transaction Types
export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  date: string;
  tags?: string[];
  // 循環交易相關欄位
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  recurring_end_date?: string;
  parent_recurring_id?: string; // 指向原始循環交易的ID
  created_at: string;
  updated_at: string;
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

// 循環頻率枚舉
export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

// 循環交易模板
export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  next_execution_date: string;
  is_active: boolean;
  max_occurrences?: number; // 最大重複次數，undefined 表示無限重複
  current_occurrences: number; // 當前已執行次數
  original_target_day: number; // 原始目標日期（1-31），用於月末調整
  created_at: string;
  updated_at: string;
}

// Category Types
export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Asset Types
export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  quantity: number;
  cost_basis: number;
  current_value: number;
  symbol?: string; // For stocks
  bank_account_id?: string; // For bank assets
  last_updated: string;
  created_at: string;
  updated_at: string;
}

// Bank Account Types
export interface BankAccount {
  id: string;
  user_id: string;
  name: string; // 例如: "台新銀行", "中國信託"
  account_number?: string;
  account_type: BankAccountType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum BankAccountType {
  CHECKING = 'checking', // 支票帳戶
  SAVINGS = 'savings',   // 儲蓄帳戶
  CREDIT = 'credit',     // 信用卡
  OTHER = 'other'        // 其他
}

export enum AssetType {
  CASH = 'cash',
  BANK = 'bank',
  TW_STOCK = 'tw_stock',
  US_STOCK = 'us_stock',
  MUTUAL_FUND = 'mutual_fund',
  CRYPTOCURRENCY = 'cryptocurrency',
  REAL_ESTATE = 'real_estate',
  VEHICLE = 'vehicle',
  INSURANCE = 'insurance',
  PRECIOUS_METAL = 'precious_metal',
  OTHER = 'other'
}

// Liability Types
export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: LiabilityType;
  balance: number;
  interest_rate?: number;
  monthly_payment?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export enum LiabilityType {
  CREDIT_CARD = 'credit_card',
  PERSONAL_LOAN = 'personal_loan',
  MORTGAGE = 'mortgage',
  CAR_LOAN = 'car_loan',
  OTHER_LOAN = 'other_loan'
}

// API Response Types
export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  last_updated: string;
}

// Chart Data Types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

// Financial Summary Types
export interface FinancialSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  BalanceSheet: undefined;
  CashFlow: undefined;
  Charts: undefined;
  // CategoryTest: undefined;
  // StockManagement: undefined; // 已移除
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};
