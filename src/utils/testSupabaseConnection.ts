/**
 * 測試 Supabase 連接和匯率資料
 */

import { supabaseConfig, exchangeRateService } from '../services/supabase';

export const testSupabaseConnection = async () => {
  console.log('🧪 開始測試 Supabase 連接...');

  try {
    // 測試基本連接
    console.log('1️⃣ 測試基本連接...');
    const isConnected = await exchangeRateService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Supabase 連接失敗');
      return false;
    }

    // 測試獲取最新匯率
    console.log('2️⃣ 測試獲取最新匯率...');
    const latestRate = await exchangeRateService.getLatestRate('USD');
    
    if (latestRate) {
      console.log('✅ 成功獲取最新匯率:', {
        date: latestRate.date,
        spot_buy: latestRate.spot_buy,
        spot_sell: latestRate.spot_sell,
        mid_rate: (parseFloat(latestRate.spot_buy) + parseFloat(latestRate.spot_sell)) / 2
      });
    } else {
      console.warn('⚠️ 沒有找到匯率資料');
    }

    // 測試獲取指定日期匯率
    console.log('3️⃣ 測試獲取 2025-06-01 匯率...');
    const specificRate = await exchangeRateService.getRateByDate('2025-06-01', 'USD');
    
    if (specificRate) {
      console.log('✅ 成功獲取 2025-06-01 匯率:', {
        date: specificRate.date,
        spot_buy: specificRate.spot_buy,
        spot_sell: specificRate.spot_sell,
        mid_rate: (parseFloat(specificRate.spot_buy) + parseFloat(specificRate.spot_sell)) / 2
      });
    } else {
      console.warn('⚠️ 沒有找到 2025-06-01 的匯率資料');
    }

    console.log('🎉 Supabase 連接測試完成');
    return true;

  } catch (error) {
    console.error('❌ Supabase 連接測試失敗:', error);
    return false;
  }
};

// 測試環境變數
export const testEnvironmentVariables = () => {
  console.log('🔍 檢查環境變數...');
  
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl ? '✅ 已設定' : '❌ 未設定');
  console.log('Supabase Key:', supabaseKey ? '✅ 已設定' : '❌ 未設定');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境變數未正確設定');
    return false;
  }
  
  return true;
};
