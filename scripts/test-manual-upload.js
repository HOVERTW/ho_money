/**
 * 測試手動上傳功能
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
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ 表 ${table} 查詢失敗:`, error.message);
        } else {
          console.log(`✅ 表 ${table} 結構正常`);
        }
      } catch (err) {
        console.error(`❌ 表 ${table} 測試異常:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 表結構檢查失敗:', error.message);
  }
}

async function testInsertData() {
  try {
    console.log('🧪 測試數據插入...');
    
    // 測試插入一筆交易記錄
    const testTransaction = {
      id: `test_${Date.now()}`,
      user_id: 'test_user',
      amount: 100,
      type: 'income',
      description: '測試交易',
      category: '測試分類',
      account: '測試帳戶',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select();
    
    if (error) {
      console.error('❌ 測試數據插入失敗:', error.message);
      console.error('❌ 錯誤詳情:', error);
    } else {
      console.log('✅ 測試數據插入成功');
      console.log('📝 插入的數據:', data);
      
      // 清理測試數據
      await supabase
        .from('transactions')
        .delete()
        .eq('id', testTransaction.id);
      
      console.log('🧹 測試數據已清理');
    }
    
  } catch (error) {
    console.error('❌ 數據插入測試異常:', error.message);
  }
}

async function main() {
  console.log('🚀 開始測試手動上傳功能...');
  console.log('================================');
  
  // 1. 測試連接
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.log('❌ 連接測試失敗，停止後續測試');
    return;
  }
  
  console.log('');
  
  // 2. 測試表結構
  await testTableStructure();
  
  console.log('');
  
  // 3. 測試數據插入
  await testInsertData();
  
  console.log('');
  console.log('🎯 測試完成！');
  console.log('================================');
  console.log('✅ 如果所有測試都通過，手動上傳功能應該可以正常工作');
  console.log('📱 請在應用中登錄後點擊上傳按鈕測試實際功能');
}

main().catch(console.error);
