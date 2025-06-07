/**
 * 測試 Fugle API 獲取 3162 股票
 */

// 使用內建的 fetch 或 node-fetch
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

/**
 * 測試 Fugle API 獲取 3162
 */
async function testFugle3162() {
  const stockCode = '3162';
  
  try {
    console.log('🧪 測試 Fugle API 獲取 3162');
    console.log('============================');
    console.log(`📊 股票代碼: ${stockCode}`);
    console.log(`📡 API 端點: ${FUGLE_CONFIG.baseUrl}`);
    console.log(`🔑 API 金鑰: ${FUGLE_CONFIG.apiKey.substring(0, 20)}...`);
    
    const url = `${FUGLE_CONFIG.baseUrl}/intraday/quote/${stockCode}`;
    console.log(`\n🔍 請求 URL: ${url}`);
    
    console.log('\n📡 發送請求...');
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': FUGLE_CONFIG.apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`📊 HTTP 狀態: ${response.status} ${response.statusText}`);
    console.log(`⏱️ 回應時間: ${responseTime}ms`);
    
    // 檢查回應標頭
    console.log('\n📋 回應標頭:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ HTTP 錯誤: ${response.status}`);
      console.error(`❌ 錯誤內容: ${errorText}`);
      
      // 分析錯誤原因
      if (response.status === 401) {
        console.error('🔍 可能原因: API 金鑰無效或已過期');
      } else if (response.status === 403) {
        console.error('🔍 可能原因: API 金鑰權限不足或超過使用限制');
      } else if (response.status === 404) {
        console.error('🔍 可能原因: 股票代碼 3162 不存在或已下市');
      } else if (response.status === 429) {
        console.error('🔍 可能原因: 超過速率限制 (60次/分鐘)');
      }
      
      return false;
    }

    const data = await response.json();
    console.log('\n✅ 成功獲取資料！');
    console.log('📋 完整回應資料:');
    console.log(JSON.stringify(data, null, 2));
    
    // 解析關鍵資料
    console.log('\n🎯 關鍵資料解析:');
    console.log(`  股票代碼: ${data.symbol || stockCode}`);
    console.log(`  股票名稱: ${data.name || '未知'}`);
    console.log(`  市場別: ${data.market || '未知'}`);
    console.log(`  收盤價: ${data.closePrice || '未知'}`);
    console.log(`  最後成交價: ${data.lastPrice || '未知'}`);
    console.log(`  漲跌: ${data.change || '未知'}`);
    console.log(`  漲跌幅: ${data.changePercent || '未知'}%`);
    console.log(`  成交量: ${data.total?.tradeVolume || '未知'}`);
    console.log(`  成交值: ${data.total?.tradeValue || '未知'}`);
    console.log(`  開盤價: ${data.openPrice || '未知'}`);
    console.log(`  最高價: ${data.highPrice || '未知'}`);
    console.log(`  最低價: ${data.lowPrice || '未知'}`);
    
    // 檢查是否有價格資料
    const price = data.closePrice || data.lastPrice;
    if (price) {
      console.log('\n✅ 價格資料完整');
      
      // 轉換為系統格式
      const result = {
        code: stockCode,
        name: data.name || stockCode,
        market_type: data.market === 'TSE' ? 'TSE' : (data.market === 'OTC' ? 'OTC' : (stockCode.startsWith('00') ? 'ETF' : 'TSE')),
        closing_price: parseFloat(price),
        change_amount: parseFloat(data.change || 0),
        change_percent: parseFloat(data.changePercent || 0),
        volume: parseInt(data.total?.tradeVolume || 0),
        price_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        source: 'Fugle'
      };
      
      console.log('\n🔄 轉換為系統格式:');
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    } else {
      console.error('\n❌ 缺少價格資料');
      console.error('🔍 可能原因: 股票暫停交易或資料不完整');
      return null;
    }
    
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
    
    return null;
  }
}

/**
 * 檢查 3162 股票基本資訊
 */
async function check3162Info() {
  console.log('\n📋 3162 股票基本資訊查詢');
  console.log('========================');
  
  try {
    // 嘗試使用不同的端點獲取股票資訊
    const endpoints = [
      '/intraday/quote/3162',
      '/intraday/tickers/3162',
      '/historical/stock/3162'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 測試端點: ${endpoint}`);
      
      try {
        const response = await fetch(`${FUGLE_CONFIG.baseUrl}${endpoint}`, {
          headers: {
            'X-API-KEY': FUGLE_CONFIG.apiKey,
            'Accept': 'application/json'
          }
        });
        
        console.log(`📊 狀態: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ 成功: ${endpoint}`);
          console.log(`📋 資料: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
        } else {
          console.log(`❌ 失敗: ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        console.log(`💥 錯誤: ${error.message}`);
      }
      
      // 等待避免速率限制
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    
  } catch (error) {
    console.error('💥 檢查過程發生錯誤:', error.message);
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始測試 Fugle API 獲取 3162\n');
  
  // 測試 1: 標準 quote 端點
  const result = await testFugle3162();
  
  if (result) {
    console.log('\n🎉 測試成功！');
    console.log('✅ 3162 股票資料獲取正常');
    console.log('✅ Fugle API 可以正常處理 3162');
    console.log('✅ 資料格式轉換成功');
  } else {
    console.log('\n⚠️ 標準測試失敗，嘗試其他端點...');
    
    // 測試 2: 其他端點
    await check3162Info();
  }
  
  console.log('\n🎯 測試結論:');
  if (result) {
    console.log('✅ 3162 可以通過 Fugle API 正常獲取');
    console.log('✅ 建議在主系統中使用 Fugle API 作為 3162 的資料來源');
  } else {
    console.log('❌ 3162 無法通過 Fugle API 獲取');
    console.log('🔍 可能原因:');
    console.log('  1. 股票代碼 3162 不存在');
    console.log('  2. 股票已下市或暫停交易');
    console.log('  3. API 權限不包含此股票');
    console.log('  4. 網路或服務問題');
  }
}

// 執行測試
main().catch(error => {
  console.error('💥 測試過程發生未預期錯誤:', error);
  process.exit(1);
});
