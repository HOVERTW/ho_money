#!/usr/bin/env node

/**
 * 檢查負債表的實際結構
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function checkLiabilitiesTable() {
  console.log('🔍 檢查負債表的實際結構');
  console.log('========================');
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

    // 嘗試不同的欄位組合來了解負債表結構
    const possibleFields = [
      'id',
      'user_id', 
      'name',
      'type',
      'amount',
      'balance',
      'value',
      'debt_amount',
      'outstanding_balance',
      'principal',
      'interest_rate',
      'monthly_payment',
      'due_date',
      'created_at',
      'updated_at'
    ];

    console.log('\n📋 測試負債表欄位...');
    const existingFields = [];

    for (const field of possibleFields) {
      try {
        const { data, error } = await supabase
          .from('liabilities')
          .select(field)
          .limit(1);

        if (!error) {
          existingFields.push(field);
          console.log(`✅ ${field} - 存在`);
        } else {
          console.log(`❌ ${field} - 不存在`);
        }
      } catch (fieldError) {
        console.log(`❌ ${field} - 錯誤: ${fieldError.message}`);
      }
    }

    console.log('\n📊 負債表實際欄位:');
    console.log(existingFields);

    // 嘗試插入一條最小的測試記錄
    console.log('\n🧪 嘗試插入最小測試記錄...');
    
    const minimalData = {
      id: generateUUID(),
      user_id: userId,
      name: '最小測試負債',
      type: 'credit_card'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('liabilities')
      .insert(minimalData)
      .select();

    if (insertError) {
      console.error('❌ 最小記錄插入失敗:', insertError);
      
      // 嘗試添加更多必需欄位
      console.log('\n🔧 嘗試添加更多欄位...');
      
      const extendedData = {
        ...minimalData,
        balance: 50000,
        interest_rate: 15.5,
        monthly_payment: 3000
      };

      const { data: extendedInsertData, error: extendedInsertError } = await supabase
        .from('liabilities')
        .insert(extendedData)
        .select();

      if (extendedInsertError) {
        console.error('❌ 擴展記錄插入失敗:', extendedInsertError);
      } else {
        console.log('✅ 擴展記錄插入成功');
        console.log('📊 成功插入的數據結構:', Object.keys(extendedInsertData[0]));
        
        // 清理測試數據
        await supabase
          .from('liabilities')
          .delete()
          .eq('id', extendedData.id);
      }
    } else {
      console.log('✅ 最小記錄插入成功');
      console.log('📊 成功插入的數據結構:', Object.keys(insertData[0]));
      
      // 清理測試數據
      await supabase
        .from('liabilities')
        .delete()
        .eq('id', minimalData.id);
    }

    // 檢查是否有現有數據
    console.log('\n📋 檢查現有負債數據...');
    const { data: existingData, error: queryError } = await supabase
      .from('liabilities')
      .select('*')
      .limit(5);

    if (queryError) {
      console.error('❌ 查詢現有數據失敗:', queryError);
    } else {
      console.log(`📊 現有負債記錄數量: ${existingData?.length || 0}`);
      if (existingData && existingData.length > 0) {
        console.log('📊 現有數據結構:', Object.keys(existingData[0]));
        console.log('📊 第一條記錄:', existingData[0]);
      }
    }

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    console.log(`\n結束時間: ${new Date().toLocaleString()}`);
  }
}

// 執行檢查
if (require.main === module) {
  checkLiabilitiesTable();
}

module.exports = { checkLiabilitiesTable };
