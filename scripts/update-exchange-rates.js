/**
 * GitHub Actions - 匯率更新腳本（最終版本）
 * 修正 Git 合併衝突，實際寫入 Supabase
 */

require('dotenv').config();

// 添加 fetch polyfill for Node.js
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
}

console.log('💱 GitHub Actions - 匯率更新開始');
console.log('⏰ 執行時間:', new Date().toLocaleString('zh-TW'));

/**
 * 從 ExchangeRate-API 獲取匯率
 */
async function fetchExchangeRateAPI() {
  try {
    console.log('🔄 從 ExchangeRate-API 獲取 USD/TWD 匯率...');
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const twdRate = data.rates.TWD;
    
    if (!twdRate) {
      throw new Error('TWD 匯率不存在');
    }
    
    console.log('✅ 成功獲取 ExchangeRate-API 匯率');
    
    return {
      base_currency: 'USD',
      target_currency: 'TWD',
      rate: parseFloat(twdRate.toFixed(4)),
      spot_buy: parseFloat((twdRate * 0.998).toFixed(4)),
      spot_sell: parseFloat((twdRate * 1.002).toFixed(4)),
      source: 'ExchangeRate-API',
      rate_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ ExchangeRate-API 獲取失敗:', error.message);
    return null;
  }
}

/**
 * 從台灣銀行獲取匯率（備用）
 */
async function fetchTaiwanBankRate() {
  try {
    console.log('🔄 從台灣銀行獲取匯率...');
    
    const response = await fetch('https://rate.bot.com.tw/xrt/flcsv/0/day');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    for (const line of lines) {
      if (line.includes('USD') || line.includes('美元')) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const buyRate = parseFloat(parts[1]);
          const sellRate = parseFloat(parts[2]);
          
          if (!isNaN(buyRate) && !isNaN(sellRate)) {
            const avgRate = (buyRate + sellRate) / 2;
            
            console.log('✅ 成功獲取台灣銀行匯率');
            return {
              base_currency: 'USD',
              target_currency: 'TWD',
              rate: parseFloat(avgRate.toFixed(4)),
              spot_buy: buyRate,
              spot_sell: sellRate,
              source: '台灣銀行',
              rate_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            };
          }
        }
      }
    }
    
    throw new Error('找不到美元匯率資料');
    
  } catch (error) {
    console.error('❌ 台灣銀行匯率獲取失敗:', error.message);
    return null;
  }
}

/**
 * 獲取預設匯率
 */
function getDefaultRate() {
  console.log('🔄 使用預設匯率...');
  
  const defaultRate = 31.5;
  return {
    base_currency: 'USD',
    target_currency: 'TWD',
    rate: defaultRate,
    spot_buy: parseFloat((defaultRate * 0.998).toFixed(4)),
    spot_sell: parseFloat((defaultRate * 1.002).toFixed(4)),
    source: '預設值',
    rate_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };
}

/**
 * 更新到 Supabase
 */
async function updateToSupabase(rate) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase 環境變數未設置，跳過資料庫更新');
      return false;
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('💾 開始更新到 Supabase...');
    
    const updateData = {
      base_currency: rate.base_currency,
      target_currency: rate.target_currency,
      rate: rate.rate,
      spot_buy: rate.spot_buy,
      spot_sell: rate.spot_sell,
      source: rate.source,
      rate_date: rate.rate_date,
      updated_at: rate.updated_at
    };
    
    console.log('📝 準備寫入的資料:', JSON.stringify(updateData, null, 2));
    
    // 先刪除今天的舊資料
    const { error: deleteError } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('base_currency', 'USD')
      .eq('target_currency', 'TWD')
      .eq('rate_date', rate.rate_date);
    
    if (deleteError) {
      console.log('⚠️ 刪除舊資料時發生錯誤（可能沒有舊資料）:', deleteError.message);
    } else {
      console.log('🗑️ 已清除今天的舊匯率資料');
    }
    
    // 插入新資料
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert([updateData])
      .select();
    
    if (error) {
      console.error('❌ 資料庫更新失敗:', error.message);
      console.error('錯誤詳情:', error);
      return false;
    }
    
    console.log('✅ 匯率已成功更新到 Supabase');
    console.log('💾 更新的資料:', data);
    
    return true;
    
  } catch (error) {
    console.error('❌ Supabase 操作失敗:', error.message);
    return false;
  }
}

/**
 * 主要更新函數
 */
async function updateExchangeRates() {
  try {
    console.log('🚀 開始更新匯率...');
    
    let rate = await fetchExchangeRateAPI();
    
    if (!rate) {
      console.log('🔄 嘗試台灣銀行 API...');
      rate = await fetchTaiwanBankRate();
    }
    
    if (!rate) {
      console.log('🔄 使用預設匯率...');
      rate = getDefaultRate();
    }
    
    console.log('\n📊 匯率更新結果:');
    console.log('==================');
    console.log(`💰 ${rate.base_currency}/${rate.target_currency}: ${rate.rate}`);
    console.log(`💵 買入價 (spot_buy): ${rate.spot_buy}`);
    console.log(`💵 賣出價 (spot_sell): ${rate.spot_sell}`);
    console.log(`📅 日期: ${rate.rate_date}`);
    console.log(`🔄 來源: ${rate.source}`);
    console.log(`⏰ 更新時間: ${rate.updated_at}`);
    
    const dbUpdated = await updateToSupabase(rate);
    
    if (dbUpdated) {
      console.log('\n🎉 匯率更新完成！資料已保存到 Supabase');
    } else {
      console.log('\n⚠️ 匯率獲取成功，但資料庫更新失敗');
      console.log('💡 請檢查 Supabase 連線和權限設置');
    }
    
    console.log('💡 匯率功能正常運行');
    
  } catch (error) {
    console.error('\n❌ 匯率更新過程發生錯誤:', error.message);
    console.log('⚠️ 匯率更新失敗');
    process.exit(1);
  }
}

// 執行更新
updateExchangeRates();
