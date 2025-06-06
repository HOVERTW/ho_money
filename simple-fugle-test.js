/**
 * 簡單的 Fugle API 測試
 */

// 使用內建的 fetch (Node.js 18+) 或 node-fetch
let fetch;
try {
  // 嘗試使用內建 fetch
  fetch = globalThis.fetch;
  if (!fetch) {
    // 如果沒有內建 fetch，使用 node-fetch
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ 無法載入 fetch:', error.message);
  process.exit(1);
}

// Fugle API 配置
const FUGLE_CONFIG = {
  apiKey: 'ODYxNzdjOTAtN2Q0My00OWFlLTg1ZWYtNWVmOTY3MmY4MGI3IGUyZWQxOWNiLTVjZDItNDZkNC1iOWUyLTExZTc2ZGNhZjlhMw==',
  baseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock'
};

/**
 * 測試單一股票
 */
async function testSingleStock() {
  const stockCode = '2330'; // 台積電
  
  try {
    console.log('🧪 簡單 Fugle API 測試');
    console.log('===================');
    console.log(`📊 測試股票: ${stockCode} (台積電)`);
    console.log(`📡 API 端點: ${FUGLE_CONFIG.baseUrl}`);
    console.log(`🔑 API 金鑰: ${FUGLE_CONFIG.apiKey.substring(0, 20)}...`);
    
    const url = `${FUGLE_CONFIG.baseUrl}/intraday/quote/${stockCode}`;
    console.log(`\n🔍 請求 URL: ${url}`);
    
    console.log('📡 發送請求...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`📊 HTTP 狀態: ${response.status} ${response.statusText}`);
    
    // 檢查回應標頭
    console.log('\n📋 回應標頭:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ HTTP 錯誤: ${response.status}`);
      console.error(`❌ 錯誤內容: ${errorText}`);
      
      // 分析常見錯誤
      if (response.status === 401) {
        console.error('🔍 可能原因: API 金鑰無效或已過期');
      } else if (response.status === 403) {
        console.error('🔍 可能原因: API 金鑰權限不足或超過使用限制');
      } else if (response.status === 404) {
        console.error('🔍 可能原因: 股票代碼不存在或 API 端點錯誤');
      } else if (response.status === 429) {
        console.error('🔍 可能原因: 超過速率限制 (60次/分鐘)');
      }
      
      return false;
    }

    const data = await response.json();
    console.log('\n✅ 成功獲取資料！');
    console.log('📋 完整回應資料:');
    console.log(JSON.stringify(data, null, 2));
    
    // 嘗試解析關鍵資料
    console.log('\n🎯 關鍵資料解析:');
    console.log(`  股票代碼: ${data.symbol || '未知'}`);
    console.log(`  股票名稱: ${data.name || '未知'}`);
    console.log(`  收盤價: ${data.closePrice || data.lastPrice || '未知'}`);
    console.log(`  漲跌: ${data.change || '未知'}`);
    console.log(`  漲跌幅: ${data.changePercent || '未知'}%`);
    console.log(`  成交量: ${data.total?.tradeVolume || '未知'}`);
    console.log(`  市場: ${data.market || '未知'}`);
    
    return true;
    
  } catch (error) {
    console.error('\n💥 請求失敗:');
    console.error(`💥 錯誤類型: ${error.name}`);
    console.error(`💥 錯誤訊息: ${error.message}`);
    console.error(`💥 完整錯誤:`, error);
    
    // 分析網路錯誤
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 可能原因: DNS 解析失敗，檢查網路連接');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔍 可能原因: 連接被拒絕，API 服務可能不可用');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔍 可能原因: 請求超時，網路或服務問題');
    }
    
    return false;
  }
}

/**
 * 測試 API 金鑰基本驗證
 */
async function testAPIKeyBasic() {
  try {
    console.log('\n🔑 測試 API 金鑰基本驗證...');
    
    // 使用最簡單的端點
    const url = `${FUGLE_CONFIG.baseUrl}/intraday/quote/2330`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey
      }
    });
    
    console.log(`📊 驗證結果: ${response.status}`);
    
    if (response.status === 401) {
      console.error('❌ API 金鑰無效');
      return false;
    } else if (response.status === 403) {
      console.error('❌ API 金鑰權限不足');
      return false;
    } else if (response.ok) {
      console.log('✅ API 金鑰有效');
      return true;
    } else {
      console.log(`⚠️ 未知狀態: ${response.status}`);
      const text = await response.text();
      console.log(`回應內容: ${text}`);
      return false;
    }
    
  } catch (error) {
    console.error('💥 API 金鑰驗證失敗:', error.message);
    return false;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始 Fugle API 測試\n');
  
  // 測試 1: API 金鑰驗證
  const keyValid = await testAPIKeyBasic();
  
  if (!keyValid) {
    console.log('\n❌ API 金鑰驗證失敗，停止測試');
    console.log('\n🔧 建議檢查項目:');
    console.log('1. API 金鑰是否正確');
    console.log('2. API 金鑰是否已過期');
    console.log('3. 是否有足夠的 API 使用權限');
    console.log('4. 網路連接是否正常');
    return;
  }
  
  // 測試 2: 完整股票資料獲取
  const success = await testSingleStock();
  
  console.log('\n🎯 測試結論:');
  if (success) {
    console.log('✅ Fugle API 工作正常！');
    console.log('✅ 可以整合到主系統中');
    console.log('✅ 建議移除 Yahoo Finance API');
  } else {
    console.log('❌ Fugle API 無法正常工作');
    console.log('❌ 需要進一步調查問題');
  }
}

// 執行測試
main().catch(error => {
  console.error('💥 測試過程發生未預期錯誤:', error);
  process.exit(1);
});
