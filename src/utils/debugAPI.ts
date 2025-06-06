/**
 * 調試 Alpha Vantage API
 * 檢查 API 回應和問題
 */

export const debugAlphaVantageAPI = async () => {
  const API_KEY = 'QJTK95T7SA1661WM';
  const BASE_URL = 'https://www.alphavantage.co/query';
  
  console.log('🔍 開始調試 Alpha Vantage API...');
  console.log(`🔑 API Key: ${API_KEY}`);
  
  try {
    // 測試 1: 基本 API 連接
    console.log('\n1️⃣ 測試基本 API 連接...');
    
    const params = new URLSearchParams({
      function: 'GLOBAL_QUOTE',
      symbol: 'AAPL',
      apikey: API_KEY,
    });
    
    const url = `${BASE_URL}?${params}`;
    console.log(`📡 請求 URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`📊 HTTP 狀態: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📋 完整 API 回應:');
    console.log(JSON.stringify(data, null, 2));
    
    // 檢查回應內容
    if (data['Error Message']) {
      console.error('❌ API 錯誤:', data['Error Message']);
      return false;
    }
    
    if (data['Note']) {
      console.warn('⚠️ API 限制:', data['Note']);
      return false;
    }
    
    if (data['Information']) {
      console.warn('ℹ️ API 資訊:', data['Information']);
      return false;
    }
    
    if (data['Global Quote']) {
      console.log('✅ 成功獲取股票資料');
      const quote = data['Global Quote'];
      console.log(`📊 AAPL 價格: $${quote['05. price']}`);
      return true;
    } else {
      console.error('❌ 沒有找到 Global Quote 資料');
      return false;
    }
    
  } catch (error) {
    console.error('❌ API 調試失敗:', error);
    return false;
  }
};

export const testDifferentAPIEndpoints = async () => {
  const API_KEY = 'QJTK95T7SA1661WM';
  const BASE_URL = 'https://www.alphavantage.co/query';
  
  console.log('🧪 測試不同的 API 端點...');
  
  // 測試不同的函數
  const testCases = [
    {
      name: 'GLOBAL_QUOTE',
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'AAPL',
        apikey: API_KEY
      }
    },
    {
      name: 'TIME_SERIES_INTRADAY',
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol: 'AAPL',
        interval: '5min',
        apikey: API_KEY
      }
    },
    {
      name: 'TIME_SERIES_DAILY',
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: 'AAPL',
        apikey: API_KEY
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 測試 ${testCase.name}...`);
      
      const params = new URLSearchParams(testCase.params);
      const response = await fetch(`${BASE_URL}?${params}`);
      const data = await response.json();
      
      console.log(`📊 ${testCase.name} 回應:`, Object.keys(data));
      
      if (data['Error Message']) {
        console.error(`❌ ${testCase.name} 錯誤:`, data['Error Message']);
      } else if (data['Note']) {
        console.warn(`⚠️ ${testCase.name} 限制:`, data['Note']);
      } else {
        console.log(`✅ ${testCase.name} 成功`);
      }
      
      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 12000));
      
    } catch (error) {
      console.error(`❌ ${testCase.name} 失敗:`, error);
    }
  }
};

// 立即執行調試
console.log('🚀 啟動 API 調試...');
setTimeout(() => {
  debugAlphaVantageAPI().then(success => {
    if (!success) {
      console.log('🔄 嘗試其他 API 端點...');
      testDifferentAPIEndpoints();
    }
  });
}, 1000);
