#!/usr/bin/env node

/**
 * 檢查 Supabase 數據庫結構
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 測試用戶
const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

async function checkSupabaseStructure() {
  console.log('🔍 檢查 Supabase 數據庫結構');
  console.log('============================');
  console.log(`開始時間: ${new Date().toLocaleString()}`);
  
  try {
    // 登錄測試用戶
    console.log('\n🔐 登錄測試用戶...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (authError) {
      console.error('❌ 登錄失敗:', authError.message);
      return;
    }

    const userId = authData.user.id;
    console.log('✅ 登錄成功，用戶ID:', userId);

    // 檢查各個表的結構
    const tables = ['transactions', 'assets', 'liabilities', 'accounts', 'categories'];

    for (const tableName of tables) {
      console.log(`\n📋 檢查 ${tableName} 表結構`);
      console.log('='.repeat(30));

      try {
        // 嘗試查詢表結構（通過查詢一條記錄來了解欄位）
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.error(`❌ ${tableName} 表查詢失敗:`, error.message);
          
          // 如果表不存在，嘗試創建
          if (error.message.includes('does not exist') || error.code === 'PGRST106') {
            console.log(`🔧 嘗試創建 ${tableName} 表...`);
            await createTable(tableName);
          }
        } else {
          console.log(`✅ ${tableName} 表存在`);
          
          if (data && data.length > 0) {
            console.log(`📊 ${tableName} 表欄位:`, Object.keys(data[0]));
          } else {
            // 表存在但沒有數據，嘗試插入一條測試記錄來了解結構
            console.log(`📝 ${tableName} 表為空，嘗試了解結構...`);
            await testTableStructure(tableName, userId);
          }
        }
      } catch (tableError) {
        console.error(`❌ ${tableName} 表檢查異常:`, tableError);
      }
    }

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    console.log(`\n結束時間: ${new Date().toLocaleString()}`);
  }
}

async function createTable(tableName) {
  console.log(`🔧 創建 ${tableName} 表...`);
  
  const tableDefinitions = {
    liabilities: `
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
    `,
    accounts: `
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    categories: `
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
    `
  };

  if (tableDefinitions[tableName]) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: tableDefinitions[tableName]
      });

      if (error) {
        console.error(`❌ 創建 ${tableName} 表失敗:`, error);
      } else {
        console.log(`✅ ${tableName} 表創建成功`);
      }
    } catch (createError) {
      console.error(`❌ 創建 ${tableName} 表異常:`, createError);
    }
  } else {
    console.log(`⚠️ 沒有 ${tableName} 表的定義`);
  }
}

async function testTableStructure(tableName, userId) {
  const testData = {
    transactions: {
      id: generateUUID(),
      user_id: userId,
      amount: 1000,
      type: 'expense',
      description: '測試交易',
      category: '測試',
      account: '測試帳戶',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assets: {
      id: generateUUID(),
      user_id: userId,
      name: '測試資產',
      type: 'cash',
      value: 100000,
      current_value: 100000,
      cost_basis: 100000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    liabilities: {
      id: generateUUID(),
      user_id: userId,
      name: '測試負債',
      type: 'credit_card',
      amount: 50000,
      interest_rate: 15.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    accounts: {
      id: generateUUID(),
      user_id: userId,
      name: '測試帳戶',
      type: 'bank',
      balance: 10000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    categories: {
      id: generateUUID(),
      user_id: userId,
      name: '測試分類',
      type: 'expense',
      color: '#FF0000',
      icon: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  if (testData[tableName]) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(testData[tableName])
        .select();

      if (error) {
        console.error(`❌ ${tableName} 測試插入失敗:`, error);
        console.log(`📝 錯誤詳情: ${error.message}`);
        
        // 分析錯誤信息來了解缺少的欄位
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const missingColumn = error.message.match(/"([^"]+)"/)?.[1];
          console.log(`⚠️ 缺少欄位: ${missingColumn}`);
        }
      } else {
        console.log(`✅ ${tableName} 測試插入成功`);
        if (data && data.length > 0) {
          console.log(`📊 ${tableName} 表欄位:`, Object.keys(data[0]));
        }
        
        // 清理測試數據
        await supabase
          .from(tableName)
          .delete()
          .eq('id', testData[tableName].id);
      }
    } catch (testError) {
      console.error(`❌ ${tableName} 測試異常:`, testError);
    }
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 執行檢查
if (require.main === module) {
  checkSupabaseStructure();
}

module.exports = { checkSupabaseStructure };
