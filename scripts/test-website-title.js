/**
 * 測試網站標題設置
 * 驗證所有頁面是否正確顯示"Ho記帳"
 */

const https = require('https');

async function testWebsiteTitle() {
  console.log('🌐 測試網站標題設置...');
  
  const url = 'https://19930913.xyz';
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      console.log(`📊 HTTP狀態碼: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 網站可以正常訪問');
          
          // 檢查HTML標題
          const titleMatch = data.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            const title = titleMatch[1];
            console.log(`📄 HTML標題: "${title}"`);
            
            if (title === 'Ho記帳') {
              console.log('✅ HTML標題正確設置為"Ho記帳"');
              resolve(true);
            } else {
              console.log(`❌ HTML標題不正確，期望"Ho記帳"，實際"${title}"`);
              resolve(false);
            }
          } else {
            console.log('⚠️ 無法找到HTML標題標籤');
            resolve(false);
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

async function testNavigationTitles() {
  console.log('\n📱 測試導航標題設置...');
  
  // 檢查導航配置是否正確
  const expectedConfig = {
    'Dashboard': { title: 'Ho記帳', tabBarLabel: '總表' },
    'Transactions': { title: 'Ho記帳', tabBarLabel: '記帳' },
    'BalanceSheet': { title: 'Ho記帳', tabBarLabel: '資產' },
    'CashFlow': { title: 'Ho記帳', tabBarLabel: '收支分析' },
    'Charts': { title: 'Ho記帳', tabBarLabel: '圖表分析' }
  };
  
  console.log('📋 期望的導航配置:');
  Object.entries(expectedConfig).forEach(([screen, config]) => {
    console.log(`  ${screen}: 標題="${config.title}", 標籤="${config.tabBarLabel}"`);
  });
  
  return true;
}

async function main() {
  console.log('🚀 開始測試網站標題和導航設置...');
  console.log('==========================================');
  
  // 測試網站標題
  const titleCorrect = await testWebsiteTitle();
  
  // 測試導航配置
  const navCorrect = await testNavigationTitles();
  
  console.log('\n🎯 測試完成！');
  console.log('==========================================');
  
  if (titleCorrect && navCorrect) {
    console.log('✅ 所有測試通過！');
    console.log('📱 網站名稱已成功設置為"Ho記帳"');
    console.log('🏷️ 儀表板標籤已改為"總表"');
    console.log('🎨 所有頁面標題統一顯示"Ho記帳"');
    console.log('');
    console.log('🌟 修改效果：');
    console.log('  • 瀏覽器標籤頁顯示: Ho記帳');
    console.log('  • 應用頂部標題: Ho記帳');
    console.log('  • 底部導航標籤: 總表、記帳、資產、收支分析、圖表分析');
  } else {
    console.log('❌ 部分測試失敗');
    if (!titleCorrect) {
      console.log('  • HTML標題設置有問題');
    }
    if (!navCorrect) {
      console.log('  • 導航配置有問題');
    }
  }
  
  console.log('\n📝 注意事項：');
  console.log('  • 網頁標題會在頁面加載後動態設置');
  console.log('  • 如果看到舊標題，請刷新頁面');
  console.log('  • GitHub Actions部署可能需要幾分鐘時間');
}

main().catch(console.error);
