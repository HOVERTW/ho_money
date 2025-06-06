/**
 * 美股資料庫診斷工具
 * 檢查資料庫狀態和資料完整性
 */

import { supabaseConfig } from '../services/supabase';

export const diagnoseUSStockDatabase = async () => {
  console.log('🔍 開始診斷美股資料庫...');
  
  try {
    // 1. 檢查表格是否存在
    console.log('1️⃣ 檢查 us_stocks 表格是否存在...');
    
    try {
      const tableCheck = await supabaseConfig.request('us_stocks?select=count&limit=1');
      console.log('✅ us_stocks 表格存在');
    } catch (error) {
      console.error('❌ us_stocks 表格不存在或無法訪問:', error);
      return {
        tableExists: false,
        error: error.message
      };
    }
    
    // 2. 檢查資料數量
    console.log('2️⃣ 檢查資料數量...');
    
    try {
      const countResult = await supabaseConfig.request('us_stocks?select=count');
      const totalCount = countResult.length;
      console.log(`📊 總共有 ${totalCount} 筆美股資料`);
      
      if (totalCount === 0) {
        console.warn('⚠️ 資料庫中沒有美股資料，需要先同步');
        return {
          tableExists: true,
          dataCount: 0,
          needsSync: true
        };
      }
    } catch (error) {
      console.error('❌ 無法查詢資料數量:', error);
    }
    
    // 3. 檢查 S&P 500 資料
    console.log('3️⃣ 檢查 S&P 500 資料...');
    
    try {
      const sp500Result = await supabaseConfig.request('us_stocks?select=count&is_sp500=eq.true');
      const sp500Count = sp500Result.length;
      console.log(`📈 S&P 500 股票數量: ${sp500Count}`);
    } catch (error) {
      console.error('❌ 無法查詢 S&P 500 資料:', error);
    }
    
    // 4. 檢查熱門股票是否存在
    console.log('4️⃣ 檢查熱門股票...');
    
    const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const foundStocks = [];
    
    for (const symbol of popularSymbols) {
      try {
        const result = await supabaseConfig.request(`us_stocks?select=symbol,name,price&symbol=eq.${symbol}`);
        if (result.length > 0) {
          foundStocks.push(result[0]);
          console.log(`✅ 找到 ${symbol}: ${result[0].name}`);
        } else {
          console.log(`❌ 未找到 ${symbol}`);
        }
      } catch (error) {
        console.log(`❌ 查詢 ${symbol} 時出錯:`, error);
      }
    }
    
    // 5. 測試搜尋功能
    console.log('5️⃣ 測試搜尋功能...');
    
    try {
      // 測試代號搜尋
      const symbolSearch = await supabaseConfig.request('us_stocks?select=symbol,name,price&symbol=ilike.*AAPL*&limit=5');
      console.log('代號搜尋結果 (AAPL):', symbolSearch);
      
      // 測試名稱搜尋
      const nameSearch = await supabaseConfig.request('us_stocks?select=symbol,name,price&name=ilike.*Apple*&limit=5');
      console.log('名稱搜尋結果 (Apple):', nameSearch);
      
    } catch (error) {
      console.error('❌ 搜尋測試失敗:', error);
    }
    
    // 6. 檢查 RPC 函數
    console.log('6️⃣ 檢查 RPC 函數...');
    
    try {
      const rpcTest = await supabaseConfig.request('rpc/search_us_stocks', {
        method: 'POST',
        body: JSON.stringify({
          search_term: 'AAPL',
          sp500_only: true,
          limit_count: 5
        }),
      });
      console.log('RPC 搜尋測試結果:', rpcTest);
    } catch (error) {
      console.error('❌ RPC 函數測試失敗:', error);
      console.log('這可能表示 RPC 函數尚未建立，需要執行 SQL 設定腳本');
    }
    
    console.log('🎉 美股資料庫診斷完成！');
    
    return {
      tableExists: true,
      dataCount: foundStocks.length,
      foundStocks,
      needsSync: foundStocks.length === 0
    };
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error);
    return {
      error: error.message,
      needsSetup: true
    };
  }
};

export const insertSampleUSStocks = async () => {
  console.log('📝 插入範例美股資料...');
  
  const sampleStocks = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      price: 150.25,
      open_price: 149.80,
      high_price: 151.50,
      low_price: 149.20,
      volume: 50000000,
      change_amount: 2.15,
      change_percent: 1.45,
      previous_close: 148.10,
      market_cap: 2500000000000,
      is_sp500: true
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      price: 280.50,
      open_price: 279.00,
      high_price: 282.00,
      low_price: 278.50,
      volume: 30000000,
      change_amount: 3.25,
      change_percent: 1.17,
      previous_close: 277.25,
      market_cap: 2100000000000,
      is_sp500: true
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      sector: 'Communication Services',
      industry: 'Internet Content & Information',
      price: 2650.75,
      open_price: 2640.00,
      high_price: 2665.00,
      low_price: 2635.00,
      volume: 1500000,
      change_amount: -12.50,
      change_percent: -0.47,
      previous_close: 2663.25,
      market_cap: 1800000000000,
      is_sp500: true
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Internet & Direct Marketing Retail',
      price: 3200.00,
      open_price: 3180.00,
      high_price: 3220.00,
      low_price: 3175.00,
      volume: 2000000,
      change_amount: 25.50,
      change_percent: 0.80,
      previous_close: 3174.50,
      market_cap: 1600000000000,
      is_sp500: true
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Auto Manufacturers',
      price: 800.25,
      open_price: 795.00,
      high_price: 810.00,
      low_price: 790.00,
      volume: 25000000,
      change_amount: 15.75,
      change_percent: 2.01,
      previous_close: 784.50,
      market_cap: 800000000000,
      is_sp500: true
    }
  ];
  
  try {
    let successCount = 0;
    
    for (const stock of sampleStocks) {
      try {
        await supabaseConfig.request('us_stocks', {
          method: 'POST',
          body: JSON.stringify(stock),
        });
        console.log(`✅ 插入 ${stock.symbol} 成功`);
        successCount++;
      } catch (error) {
        console.error(`❌ 插入 ${stock.symbol} 失敗:`, error);
      }
    }
    
    console.log(`🎉 範例資料插入完成！成功: ${successCount}/${sampleStocks.length}`);
    return successCount;
    
  } catch (error) {
    console.error('❌ 插入範例資料失敗:', error);
    return 0;
  }
};

export const quickSetupUSStocks = async () => {
  console.log('🚀 快速設定美股資料...');
  
  // 1. 診斷資料庫
  const diagnosis = await diagnoseUSStockDatabase();
  
  if (diagnosis.needsSetup) {
    console.error('❌ 資料庫需要先執行 SQL 設定腳本');
    return false;
  }
  
  if (diagnosis.needsSync || diagnosis.dataCount === 0) {
    console.log('📝 資料庫為空，插入範例資料...');
    const insertedCount = await insertSampleUSStocks();
    
    if (insertedCount > 0) {
      console.log('✅ 範例資料插入成功，重新測試搜尋...');
      
      // 測試搜尋
      try {
        const testResult = await supabaseConfig.request('us_stocks?select=symbol,name,price&symbol=eq.AAPL');
        console.log('🔍 搜尋測試結果:', testResult);
        return testResult.length > 0;
      } catch (error) {
        console.error('❌ 搜尋測試失敗:', error);
        return false;
      }
    }
  }
  
  return true;
};

// 開發模式下自動執行診斷
export const autoRunDiagnosis = async () => {
  if (__DEV__) {
    console.log('🧪 開發模式：自動執行美股資料庫診斷...');
    await diagnoseUSStockDatabase();
  }
};
