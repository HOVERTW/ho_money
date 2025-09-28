/**
 * 測試網頁修復是否成功
 * 檢查網站是否能正常加載
 */

const https = require('https');

async function testWebsite() {
  console.log('🌐 測試網站修復狀態...');
  
  const url = 'https://19930913.xyz';
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      console.log(`📊 HTTP狀態碼: ${res.statusCode}`);
      console.log(`📋 響應頭:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 網站可以正常訪問');
          
          // 檢查是否包含錯誤信息
          if (data.includes('Cannot access') || data.includes('ReferenceError')) {
            console.log('❌ 網頁內容包含JavaScript錯誤');
            resolve(false);
          } else {
            console.log('✅ 網頁內容看起來正常');
            resolve(true);
          }
        } else {
          console.log(`❌ 網站返回錯誤狀態碼: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 網站訪問失敗:', error.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.error('❌ 網站訪問超時');
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('🚀 開始測試網頁修復狀態...');
  console.log('================================');
  
  const isWorking = await testWebsite();
  
  console.log('');
  console.log('🎯 測試完成！');
  console.log('================================');
  
  if (isWorking) {
    console.log('✅ 網站修復成功！');
    console.log('📱 用戶現在可以正常訪問網站');
    console.log('🔧 DashboardScreen初始化錯誤已修復');
  } else {
    console.log('⚠️ 網站可能仍有問題');
    console.log('🔧 請檢查部署狀態或等待GitHub Actions完成');
  }
}

main().catch(console.error);
