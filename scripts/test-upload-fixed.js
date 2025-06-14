/**
 * 測試修復後的手動上傳功能
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// UUID 生成函數
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testSupabaseConnection() {
  try {
    console.log('🔗 測試 Supabase 連接...');
    
    // 測試基本連接
    const { data, error } = await supabase
      .from('transactions')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase 連接失敗:', error.message);
      return false;
    }
    
    console.log('✅ Supabase 連接成功');
    console.log(`📊 transactions 表記錄數: ${data || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ 連接測試異常:', error.message);
    return false;
  }
}

async function testTableStructure() {
  try {
    console.log('🔍 檢查表結構...');
    
    const tables = ['transactions', 'assets', 'liabilities', 'accounts'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ 表 ${table} 查詢失敗:`, error.message);
          results[table] = false;
        } else {
          console.log(`✅ 表 ${table} 結構正常`);
          results[table] = true;
        }
      } catch (err) {
        console.error(`❌ 表 ${table} 測試異常:`, err.message);
        results[table] = false;
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ 表結構檢查失敗:', error.message);
    return {};
  }
}

async function testInsertWithValidUUID() {
  try {
    console.log('🧪 測試使用有效 UUID 插入數據...');
    
    // 測試插入一筆交易記錄（使用有效的 UUID）
    const testTransaction = {
      id: generateUUID(), // 使用有效的 UUID
      user_id: generateUUID(), // 使用有效的 UUID
      amount: 100,
      type: 'income',
      description: '測試交易',
      category: '測試分類',
      account: '測試帳戶',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 準備插入的測試數據:', {
      id: testTransaction.id,
      user_id: testTransaction.user_id,
      amount: testTransaction.amount,
      type: testTransaction.type
    });
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();
    
    if (error) {
      console.error('❌ 測試數據插入失敗:', error.message);
      console.error('❌ 錯誤詳情:', error);
      return false;
    } else {
      console.log('✅ 測試數據插入成功');
      console.log('📝 插入的數據 ID:', data[0]?.id);
      
      // 清理測試數據
      await supabase
        .from('transactions')
        .delete()
        .eq('id', testTransaction.id);
      
      console.log('🧹 測試數據已清理');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 數據插入測試異常:', error.message);
    return false;
  }
}

async function testAssetInsert() {
  try {
    console.log('🧪 測試資產數據插入...');
    
    const testAsset = {
      id: generateUUID(),
      user_id: generateUUID(),
      name: '測試資產',
      type: '現金',
      value: 1000,
      current_value: 1000,
      cost_basis: 1000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
    
    if (error) {
      console.error('❌ 資產數據插入失敗:', error.message);
      return false;
    } else {
      console.log('✅ 資產數據插入成功');
      
      // 清理測試數據
      await supabase
        .from('assets')
        .delete()
        .eq('id', testAsset.id);
      
      console.log('🧹 資產測試數據已清理');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 資產數據插入測試異常:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 開始測試修復後的手動上傳功能...');
  console.log('================================');
  
  // 1. 測試連接
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.log('❌ 連接測試失敗，停止後續測試');
    return;
  }
  
  console.log('');
  
  // 2. 測試表結構
  const tableResults = await testTableStructure();
  
  console.log('');
  
  // 3. 測試數據插入（使用有效 UUID）
  const insertOk = await testInsertWithValidUUID();
  
  console.log('');
  
  // 4. 測試資產數據插入
  const assetInsertOk = await testAssetInsert();
  
  console.log('');
  console.log('🎯 測試完成！');
  console.log('================================');
  
  // 總結結果
  const allTablesOk = Object.values(tableResults).every(result => result === true);
  
  if (connectionOk && allTablesOk && insertOk && assetInsertOk) {
    console.log('✅ 所有測試都通過！手動上傳功能應該可以正常工作');
    console.log('📱 請在應用中登錄後點擊上傳按鈕測試實際功能');
  } else {
    console.log('⚠️ 部分測試失敗，請檢查以下問題：');
    if (!connectionOk) console.log('  - Supabase 連接問題');
    if (!allTablesOk) console.log('  - 表結構問題');
    if (!insertOk) console.log('  - 交易數據插入問題');
    if (!assetInsertOk) console.log('  - 資產數據插入問題');
  }
}

main().catch(console.error);
