/**
 * 瀏覽器真實環境調試腳本
 * 直接在 https://19930913.xyz/ 的控制台中運行
 * 
 * 使用方法：
 * 1. 打開 https://19930913.xyz/
 * 2. 按 F12 打開開發者工具
 * 3. 在 Console 中貼上這個腳本並執行
 */

console.log('🔍 開始真實瀏覽器環境調試');
console.log('================================');

// 調試函數1：檢查服務是否存在
function debugCheckServices() {
  console.log('\n📋 檢查服務是否存在...');
  
  // 檢查全局變量
  const checks = [
    { name: 'window', exists: typeof window !== 'undefined' },
    { name: 'localStorage', exists: typeof localStorage !== 'undefined' },
    { name: 'React', exists: typeof window.React !== 'undefined' },
    { name: 'ReactDOM', exists: typeof window.ReactDOM !== 'undefined' }
  ];
  
  checks.forEach(check => {
    console.log(`${check.exists ? '✅' : '❌'} ${check.name}: ${check.exists ? '存在' : '不存在'}`);
  });
  
  // 檢查 localStorage 中的數據
  console.log('\n📊 檢查 localStorage 數據...');
  const storageKeys = [
    '@FinTranzo:transactions',
    '@FinTranzo:assets', 
    '@FinTranzo:categories',
    '@FinTranzo:accounts',
    '@FinTranzo:initialized'
  ];
  
  storageKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`✅ ${key}: ${Array.isArray(parsed) ? parsed.length + ' 項' : '存在'}`);
      } catch (e) {
        console.log(`⚠️ ${key}: 存在但無法解析`);
      }
    } else {
      console.log(`❌ ${key}: 不存在`);
    }
  });
}

// 調試函數2：測試新增交易
function debugAddTransaction() {
  console.log('\n🔍 測試新增交易功能...');
  
  try {
    // 檢查是否有交易相關的全局變量或函數
    const possibleGlobals = [
      'transactionDataService',
      'addTransaction',
      'handleAddTransaction'
    ];
    
    possibleGlobals.forEach(name => {
      if (window[name]) {
        console.log(`✅ 找到全局變量: ${name}`);
      } else {
        console.log(`❌ 未找到全局變量: ${name}`);
      }
    });
    
    // 嘗試創建一個測試交易
    const testTransaction = {
      id: 'test-' + Date.now(),
      amount: 100,
      type: 'expense',
      description: '瀏覽器調試測試',
      category: '測試',
      account: '現金',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 測試交易對象:', testTransaction);
    
    // 嘗試直接操作 localStorage
    const currentTransactions = localStorage.getItem('@FinTranzo:transactions');
    let transactions = [];
    
    if (currentTransactions) {
      transactions = JSON.parse(currentTransactions);
    }
    
    console.log(`📊 當前交易數量: ${transactions.length}`);
    
    // 添加測試交易
    transactions.push(testTransaction);
    localStorage.setItem('@FinTranzo:transactions', JSON.stringify(transactions));
    
    console.log(`📊 添加後交易數量: ${transactions.length}`);
    console.log('✅ 直接 localStorage 操作成功');
    
    // 清理測試數據
    const cleanedTransactions = transactions.filter(t => t.id !== testTransaction.id);
    localStorage.setItem('@FinTranzo:transactions', JSON.stringify(cleanedTransactions));
    console.log('🧹 已清理測試數據');
    
  } catch (error) {
    console.error('❌ 新增交易測試失敗:', error);
  }
}

// 調試函數3：檢查 React 組件狀態
function debugReactComponents() {
  console.log('\n🔍 檢查 React 組件狀態...');
  
  try {
    // 查找可能的 React 根元素
    const rootElements = [
      document.getElementById('root'),
      document.getElementById('__next'),
      document.querySelector('[data-reactroot]'),
      document.querySelector('#expo-root')
    ].filter(Boolean);
    
    console.log(`📱 找到 ${rootElements.length} 個可能的 React 根元素`);
    
    rootElements.forEach((element, index) => {
      console.log(`📱 根元素 ${index + 1}:`, element.id || element.className || 'unnamed');
      
      // 嘗試獲取 React Fiber
      const fiberKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'));
      if (fiberKey) {
        console.log(`✅ 找到 React Fiber: ${fiberKey}`);
      }
    });
    
    // 檢查是否有 React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ React DevTools 可用');
    } else {
      console.log('❌ React DevTools 不可用');
    }
    
  } catch (error) {
    console.error('❌ React 組件檢查失敗:', error);
  }
}

// 調試函數4：檢查網絡請求
function debugNetworkRequests() {
  console.log('\n🔍 檢查網絡請求...');
  
  // 監聽 fetch 請求
  const originalFetch = window.fetch;
  let requestCount = 0;
  
  window.fetch = function(...args) {
    requestCount++;
    console.log(`🌐 網絡請求 ${requestCount}:`, args[0]);
    return originalFetch.apply(this, arguments)
      .then(response => {
        console.log(`✅ 請求 ${requestCount} 成功:`, response.status);
        return response;
      })
      .catch(error => {
        console.error(`❌ 請求 ${requestCount} 失敗:`, error);
        throw error;
      });
  };
  
  console.log('✅ 網絡請求監聽已啟動');
  
  // 5秒後恢復原始 fetch
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('🔄 網絡請求監聽已停止');
  }, 5000);
}

// 調試函數5：檢查錯誤
function debugErrors() {
  console.log('\n🔍 檢查錯誤...');
  
  // 監聽全局錯誤
  const errorHandler = (event) => {
    console.error('❌ 全局錯誤:', event.error || event.message);
    console.error('📍 錯誤位置:', event.filename, event.lineno, event.colno);
  };
  
  const unhandledRejectionHandler = (event) => {
    console.error('❌ 未處理的 Promise 拒絕:', event.reason);
  };
  
  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  
  console.log('✅ 錯誤監聽已啟動');
  
  // 5秒後移除監聽器
  setTimeout(() => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    console.log('🔄 錯誤監聽已停止');
  }, 5000);
}

// 調試函數6：嘗試觸發 UI 更新
function debugUIUpdate() {
  console.log('\n🔍 嘗試觸發 UI 更新...');
  
  try {
    // 嘗試觸發各種可能的事件
    const events = ['storage', 'popstate', 'hashchange', 'focus', 'blur'];
    
    events.forEach(eventType => {
      try {
        window.dispatchEvent(new Event(eventType));
        console.log(`✅ 觸發事件: ${eventType}`);
      } catch (error) {
        console.log(`❌ 觸發事件失敗: ${eventType}`, error.message);
      }
    });
    
    // 嘗試觸發 storage 事件（模擬數據變化）
    localStorage.setItem('debug-trigger', Date.now().toString());
    localStorage.removeItem('debug-trigger');
    
    console.log('✅ 嘗試觸發 UI 更新完成');
    
  } catch (error) {
    console.error('❌ UI 更新觸發失敗:', error);
  }
}

// 主調試函數
function runBrowserDebug() {
  console.log('🚀 開始完整的瀏覽器調試...');
  
  debugCheckServices();
  
  setTimeout(() => {
    debugAddTransaction();
  }, 1000);
  
  setTimeout(() => {
    debugReactComponents();
  }, 2000);
  
  setTimeout(() => {
    debugNetworkRequests();
  }, 3000);
  
  setTimeout(() => {
    debugErrors();
  }, 4000);
  
  setTimeout(() => {
    debugUIUpdate();
  }, 5000);
  
  setTimeout(() => {
    console.log('\n🎯 瀏覽器調試完成');
    console.log('請檢查上面的輸出，找出問題所在');
  }, 6000);
}

// 導出調試函數，可以在控制台中單獨調用
window.debugBrowser = {
  runAll: runBrowserDebug,
  checkServices: debugCheckServices,
  addTransaction: debugAddTransaction,
  reactComponents: debugReactComponents,
  networkRequests: debugNetworkRequests,
  errors: debugErrors,
  uiUpdate: debugUIUpdate
};

console.log('✅ 瀏覽器調試腳本已載入');
console.log('💡 使用方法:');
console.log('  - debugBrowser.runAll() - 運行所有調試');
console.log('  - debugBrowser.checkServices() - 檢查服務');
console.log('  - debugBrowser.addTransaction() - 測試新增交易');
console.log('  - debugBrowser.reactComponents() - 檢查 React 組件');
console.log('');
console.log('🚀 現在運行完整調試...');
runBrowserDebug();
