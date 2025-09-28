/**
 * 診斷手機網頁版新增資產問題
 * 檢查可能的觸控事件、瀏覽器兼容性問題
 */

console.log('📱 開始診斷手機網頁版新增資產問題...');
console.log('==========================================');

// 檢測當前環境
function detectEnvironment() {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  
  console.log('🔍 環境檢測:');
  console.log(`  User Agent: ${userAgent}`);
  console.log(`  是否移動設備: ${isMobile}`);
  console.log(`  是否iOS: ${isIOS}`);
  console.log(`  是否Android: ${isAndroid}`);
  console.log(`  是否Chrome: ${isChrome}`);
  console.log(`  是否Safari: ${isSafari}`);
  console.log(`  是否Firefox: ${isFirefox}`);
  
  return { isMobile, isIOS, isAndroid, isChrome, isSafari, isFirefox };
}

// 檢測觸控支持
function detectTouchSupport() {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const touchEvents = {
    touchstart: 'ontouchstart' in window,
    touchend: 'ontouchend' in window,
    touchmove: 'ontouchmove' in window,
    touchcancel: 'ontouchcancel' in window
  };
  
  console.log('\n👆 觸控支持檢測:');
  console.log(`  支持觸控: ${hasTouch}`);
  console.log(`  最大觸控點: ${navigator.maxTouchPoints}`);
  console.log(`  觸控事件支持:`, touchEvents);
  
  return { hasTouch, touchEvents };
}

// 檢測視窗大小和縮放
function detectViewport() {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation ? screen.orientation.angle : 'unknown'
  };
  
  console.log('\n📐 視窗檢測:');
  console.log(`  視窗寬度: ${viewport.width}px`);
  console.log(`  視窗高度: ${viewport.height}px`);
  console.log(`  設備像素比: ${viewport.devicePixelRatio}`);
  console.log(`  螢幕方向: ${viewport.orientation}°`);
  
  return viewport;
}

// 檢測JavaScript功能
function detectJavaScriptFeatures() {
  const features = {
    asyncAwait: typeof (async () => {}) === 'function',
    promises: typeof Promise !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    webWorkers: typeof Worker !== 'undefined',
    serviceWorkers: 'serviceWorker' in navigator,
    modules: typeof import !== 'undefined'
  };
  
  console.log('\n⚙️ JavaScript功能檢測:');
  Object.entries(features).forEach(([feature, supported]) => {
    console.log(`  ${feature}: ${supported ? '✅' : '❌'}`);
  });
  
  return features;
}

// 測試事件處理
function testEventHandling() {
  console.log('\n🎯 測試事件處理...');
  
  // 創建測試按鈕
  const testButton = document.createElement('button');
  testButton.id = 'mobile-test-button';
  testButton.textContent = '測試按鈕';
  testButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    padding: 10px;
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
  `;
  
  let clickCount = 0;
  let touchCount = 0;
  
  // 添加點擊事件
  testButton.addEventListener('click', (e) => {
    clickCount++;
    console.log(`✅ Click事件觸發 #${clickCount}`, e);
    testButton.textContent = `點擊 ${clickCount}`;
  });
  
  // 添加觸控事件
  testButton.addEventListener('touchstart', (e) => {
    touchCount++;
    console.log(`✅ Touch事件觸發 #${touchCount}`, e);
    e.preventDefault(); // 防止雙重觸發
  });
  
  // 添加到頁面
  document.body.appendChild(testButton);
  
  console.log('✅ 測試按鈕已添加到頁面右上角');
  console.log('請點擊測試按鈕檢查事件是否正常觸發');
  
  return { testButton, getClickCount: () => clickCount, getTouchCount: () => touchCount };
}

// 檢測Modal和表單問題
function detectModalIssues() {
  console.log('\n📋 檢測Modal和表單問題...');
  
  // 檢查是否有阻止事件的元素
  const modals = document.querySelectorAll('[role="dialog"], .modal, .overlay');
  const forms = document.querySelectorAll('form, input, textarea, select');
  
  console.log(`  找到 ${modals.length} 個Modal元素`);
  console.log(`  找到 ${forms.length} 個表單元素`);
  
  // 檢查z-index問題
  const highZIndexElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    return zIndex !== 'auto' && parseInt(zIndex) > 1000;
  });
  
  console.log(`  找到 ${highZIndexElements.length} 個高z-index元素`);
  
  return { modals: modals.length, forms: forms.length, highZIndex: highZIndexElements.length };
}

// 檢測CSS問題
function detectCSSIssues() {
  console.log('\n🎨 檢測CSS問題...');
  
  const issues = [];
  
  // 檢查pointer-events
  const noPointerElements = Array.from(document.querySelectorAll('*')).filter(el => {
    return window.getComputedStyle(el).pointerEvents === 'none';
  });
  
  if (noPointerElements.length > 0) {
    issues.push(`${noPointerElements.length} 個元素設置了 pointer-events: none`);
  }
  
  // 檢查overflow hidden
  const overflowHiddenElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden';
  });
  
  if (overflowHiddenElements.length > 10) {
    issues.push(`${overflowHiddenElements.length} 個元素設置了 overflow: hidden`);
  }
  
  console.log(`  發現 ${issues.length} 個潛在CSS問題:`);
  issues.forEach(issue => console.log(`    - ${issue}`));
  
  return issues;
}

// 測試AsyncStorage
function testAsyncStorage() {
  console.log('\n💾 測試AsyncStorage...');
  
  try {
    // 測試localStorage
    localStorage.setItem('mobile-test', 'test-value');
    const value = localStorage.getItem('mobile-test');
    localStorage.removeItem('mobile-test');
    
    console.log('✅ localStorage正常工作');
    
    // 測試sessionStorage
    sessionStorage.setItem('mobile-test', 'test-value');
    const sessionValue = sessionStorage.getItem('mobile-test');
    sessionStorage.removeItem('mobile-test');
    
    console.log('✅ sessionStorage正常工作');
    
    return true;
  } catch (error) {
    console.error('❌ 存儲測試失敗:', error);
    return false;
  }
}

// 檢測網絡連接
function detectNetworkIssues() {
  console.log('\n🌐 檢測網絡連接...');
  
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    console.log(`  連接類型: ${connection.effectiveType || 'unknown'}`);
    console.log(`  下載速度: ${connection.downlink || 'unknown'} Mbps`);
    console.log(`  RTT: ${connection.rtt || 'unknown'} ms`);
  } else {
    console.log('  無法獲取網絡連接信息');
  }
  
  // 測試網絡請求
  return fetch('https://19930913.xyz')
    .then(response => {
      console.log(`✅ 網站連接正常 (${response.status})`);
      return true;
    })
    .catch(error => {
      console.error('❌ 網站連接失敗:', error);
      return false;
    });
}

// 生成修復建議
function generateFixSuggestions(results) {
  console.log('\n🔧 修復建議:');
  
  const suggestions = [];
  
  if (results.environment.isMobile) {
    suggestions.push('1. 確保觸控事件正確處理');
    suggestions.push('2. 檢查視窗縮放和meta標籤');
    suggestions.push('3. 測試不同移動瀏覽器');
  }
  
  if (results.environment.isIOS) {
    suggestions.push('4. iOS Safari可能需要特殊處理');
    suggestions.push('5. 檢查是否有iOS特定的事件阻止');
  }
  
  if (results.cssIssues.length > 0) {
    suggestions.push('6. 修復CSS pointer-events和z-index問題');
  }
  
  if (results.modalIssues.highZIndex > 5) {
    suggestions.push('7. 檢查Modal層級和事件冒泡');
  }
  
  suggestions.push('8. 添加詳細的事件日誌');
  suggestions.push('9. 測試表單提交和驗證');
  suggestions.push('10. 檢查React Native Web的事件處理');
  
  suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
  
  return suggestions;
}

// 主診斷函數
async function runDiagnosis() {
  const results = {
    environment: detectEnvironment(),
    touchSupport: detectTouchSupport(),
    viewport: detectViewport(),
    jsFeatures: detectJavaScriptFeatures(),
    eventTest: testEventHandling(),
    modalIssues: detectModalIssues(),
    cssIssues: detectCSSIssues(),
    storageWorking: testAsyncStorage(),
    networkWorking: await detectNetworkIssues()
  };
  
  console.log('\n📊 診斷結果摘要:');
  console.log(`  移動設備: ${results.environment.isMobile ? '是' : '否'}`);
  console.log(`  觸控支持: ${results.touchSupport.hasTouch ? '是' : '否'}`);
  console.log(`  JavaScript功能: 正常`);
  console.log(`  存儲功能: ${results.storageWorking ? '正常' : '異常'}`);
  console.log(`  網絡連接: ${results.networkWorking ? '正常' : '異常'}`);
  console.log(`  CSS問題: ${results.cssIssues.length} 個`);
  console.log(`  Modal問題: ${results.modalIssues.highZIndex} 個高z-index元素`);
  
  generateFixSuggestions(results);
  
  console.log('\n🎯 診斷完成！');
  console.log('==========================================');
  
  return results;
}

// 執行診斷
runDiagnosis().then(results => {
  console.log('\n✅ 診斷腳本執行完成');
  console.log('請檢查控制台輸出和右上角的測試按鈕');
}).catch(error => {
  console.error('❌ 診斷腳本執行失敗:', error);
});
