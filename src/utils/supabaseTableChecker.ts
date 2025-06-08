/**
 * Supabase 表結構檢查和設置工具
 */

import { supabase, TABLES } from '../services/supabase';

export class SupabaseTableChecker {
  /**
   * 檢查所有必要的表是否存在
   */
  static async checkAllTables(): Promise<{ [key: string]: boolean }> {
    const tableStatus: { [key: string]: boolean } = {};
    
    console.log('🔍 檢查 Supabase 表結構...');
    
    for (const [key, tableName] of Object.entries(TABLES)) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (error && error.code === '42P01') {
          // 表不存在
          tableStatus[tableName] = false;
          console.log(`❌ ${tableName}: 不存在`);
        } else {
          // 表存在
          tableStatus[tableName] = true;
          console.log(`✅ ${tableName}: 已存在`);
        }
      } catch (err) {
        tableStatus[tableName] = false;
        console.log(`⚠️ ${tableName}: 檢查失敗`, err);
      }
    }
    
    return tableStatus;
  }

  /**
   * 檢查用戶是否有數據
   */
  static async checkUserData(): Promise<{
    profiles: number;
    transactions: number;
    assets: number;
    liabilities: number;
    accounts: number;
    categories: number;
  }> {
    const counts = {
      profiles: 0,
      transactions: 0,
      assets: 0,
      liabilities: 0,
      accounts: 0,
      categories: 0,
    };

    try {
      // 檢查 profiles 表
      const { count: profileCount } = await supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true });
      counts.profiles = profileCount || 0;

      // 檢查 transactions 表
      const { count: transactionCount } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*', { count: 'exact', head: true });
      counts.transactions = transactionCount || 0;

      // 檢查 assets 表
      const { count: assetCount } = await supabase
        .from(TABLES.ASSETS)
        .select('*', { count: 'exact', head: true });
      counts.assets = assetCount || 0;

      // 檢查 liabilities 表
      const { count: liabilityCount } = await supabase
        .from(TABLES.LIABILITIES)
        .select('*', { count: 'exact', head: true });
      counts.liabilities = liabilityCount || 0;

      // 檢查 accounts 表
      const { count: accountCount } = await supabase
        .from(TABLES.ACCOUNTS)
        .select('*', { count: 'exact', head: true });
      counts.accounts = accountCount || 0;

      // 檢查 categories 表
      const { count: categoryCount } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*', { count: 'exact', head: true });
      counts.categories = categoryCount || 0;

    } catch (error) {
      console.error('❌ 檢查用戶數據失敗:', error);
    }

    return counts;
  }

  /**
   * 測試數據插入
   */
  static async testDataInsertion(): Promise<boolean> {
    try {
      console.log('🧪 測試數據插入...');
      
      // 獲取當前用戶
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ 沒有登錄用戶');
        return false;
      }

      // 測試插入一個測試交易
      const testTransaction = {
        user_id: user.id,
        account_id: null, // 可以為空
        amount: 100,
        description: '測試交易',
        category: '測試分類',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .insert(testTransaction)
        .select()
        .single();

      if (error) {
        console.error('❌ 測試插入失敗:', error);
        return false;
      }

      console.log('✅ 測試插入成功:', data);

      // 刪除測試數據
      await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', data.id);

      console.log('✅ 測試數據已清理');
      return true;

    } catch (error) {
      console.error('❌ 測試數據插入異常:', error);
      return false;
    }
  }

  /**
   * 測試資產數據插入
   */
  static async testAssetInsertion(): Promise<boolean> {
    try {
      console.log('🧪 測試資產數據插入...');

      // 獲取當前用戶
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ 沒有登錄用戶');
        return false;
      }

      // 測試插入一個測試資產
      const testAsset = {
        user_id: user.id,
        name: '測試資產',
        type: 'cash',
        value: 1000,
        quantity: 1,
        purchase_price: 1000,
        current_price: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(TABLES.ASSETS)
        .insert(testAsset)
        .select()
        .single();

      if (error) {
        console.error('❌ 測試資產插入失敗:', error);
        return false;
      }

      console.log('✅ 測試資產插入成功:', data);

      // 刪除測試數據
      await supabase
        .from(TABLES.ASSETS)
        .delete()
        .eq('id', data.id);

      console.log('✅ 測試資產數據已清理');
      return true;

    } catch (error) {
      console.error('❌ 測試資產插入異常:', error);
      return false;
    }
  }

  /**
   * 生成表創建 SQL
   */
  static generateCreateTableSQL(): string {
    return `
-- FinTranzo 數據庫表創建腳本
-- 請在 Supabase Dashboard > SQL Editor 中執行

-- 1. 創建用戶資料表
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 創建帳戶表
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 創建交易表
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    category TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 創建資產表
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(15,4),
    purchase_price DECIMAL(15,2),
    current_price DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 創建負債表
CREATE TABLE IF NOT EXISTS liabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 創建分類表
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 啟用 Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 8. 創建 RLS 政策
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own assets" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON assets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own liabilities" ON liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities" ON liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities" ON liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities" ON liabilities FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- 9. 創建索引
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

SELECT 'FinTranzo 數據庫設置完成！🎉' as status;
    `.trim();
  }
}
