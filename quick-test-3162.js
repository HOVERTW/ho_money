/**
 * 快速測試 3162 股票
 */

// 使用內建的 fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
  console.error('❌ 無法載入 fetch:', error.message);
  process.exit(1);
}

// Fugle API 配置
const FUGLE_CONFIG = {
  apiKey: 'ODYxNzdjOTAtN2Q0My00OWFlLTg1ZWYtNWVmOTY3MmY4MGI3IGUyZWQxOWNiLTVjZDItNDZkNC1iOWUyLTExZTc2ZGNhZjlhMw==',
  baseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock'
};

async function quickTest() {
  console.log('🔍 快速測試 Fugle API 獲取 3162');
  console.log('==============================');
  
  try {
    const url = `${FUGLE_CONFIG.baseUrl}/intraday/quote/3162`;
    console.log(`📡 請求: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json'
      }
    });

    console.log(`📊 狀態: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 成功獲取 3162 資料！');
      console.log(`📋 股票名稱: ${data.name || '未知'}`);
      console.log(`💰 價格: ${data.closePrice || data.lastPrice || '未知'}`);
      console.log(`📈 漲跌: ${data.change || '未知'}`);
      console.log(`🏢 市場: ${data.market || '未知'}`);
      
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ 失敗: ${response.status}`);
      console.error(`❌ 內容: ${errorText}`);
      
      if (response.status === 404) {
        console.error('🔍 3162 股票可能不存在或已下市');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error(`💥 錯誤: ${error.message}`);
    return false;
  }
}

// 執行測試
quickTest().then(success => {
  if (success) {
    console.log('\n🎉 3162 測試成功！Fugle API 可以正常獲取此股票');
  } else {
    console.log('\n❌ 3162 測試失敗！需要進一步調查');
  }
}).catch(error => {
  console.error('💥 測試錯誤:', error);
});
