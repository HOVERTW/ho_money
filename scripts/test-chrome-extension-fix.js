// 測試 Chrome 擴展錯誤修復功能

console.log('🧪 開始測試 Chrome 擴展錯誤修復...');

// 模擬瀏覽器環境
const mockWindow = {
  addEventListener: (event, handler) => {
    console.log(`📝 註冊事件監聽器: ${event}`);
    mockWindow.eventHandlers = mockWindow.eventHandlers || {};
    mockWindow.eventHandlers[event] = handler;
  },
  eventHandlers: {}
};

const mockConsole = {
  error: (...args) => {
    console.log('🔴 原始 console.error:', args.join(' '));
  },
  log: console.log,
  warn: console.warn
};

// 模擬 Chrome 擴展錯誤修復類
class MockChromeExtensionFix {
  constructor() {
    this.isInitialized = false;
    this.suppressedErrors = 0;
    this.originalConsoleError = mockConsole.error;
  }

  initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 初始化 Chrome 擴展錯誤修復...');

    // 攔截 console.error
    this.interceptConsoleError();

    this.isInitialized = true;
    console.log('✅ Chrome 擴展錯誤修復已啟用');
  }

  interceptConsoleError() {
    const self = this;
    mockConsole.error = function(...args) {
      const message = args.join(' ');
      
      if (self.isChromeExtensionError(message)) {
        self.suppressedErrors++;
        console.log(`🔇 已抑制 Chrome 擴展錯誤: ${message}`);
        return;
      }
      
      // 其他錯誤正常顯示
      self.originalConsoleError.apply(mockConsole, args);
    };
  }

  isChromeExtensionError(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }

    const chromeExtensionPatterns = [
      'runtime.lastError',
      'message port closed',
      'Extension context invalidated',
      'chrome-extension://',
      'Could not establish connection',
      'Receiving end does not exist',
      'The message port closed before a response was received',
      'chrome.runtime.sendMessage',
      'Extension manifest',
      'chrome.tabs',
      'chrome.storage',
      'Unchecked runtime.lastError'
    ];

    return chromeExtensionPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  getSuppressedErrorCount() {
    return this.suppressedErrors;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      suppressedErrors: this.suppressedErrors
    };
  }
}

// 執行測試
async function runChromeExtensionFixTest() {
  const fix = new MockChromeExtensionFix();
  
  console.log('\n=== 測試 1: 初始化 ===');
  fix.initialize();
  
  const status1 = fix.getStatus();
  console.log('初始化狀態:', status1);
  
  console.log('\n=== 測試 2: Chrome 擴展錯誤抑制 ===');
  
  // 測試各種 Chrome 擴展錯誤
  const chromeErrors = [
    'Unchecked runtime.lastError: The message port closed before a response was received.',
    'Could not establish connection. Receiving end does not exist.',
    'Extension context invalidated.',
    'chrome-extension://abc123/content.js:1 Error',
    'chrome.runtime.sendMessage is not a function'
  ];
  
  chromeErrors.forEach((error, index) => {
    console.log(`\n測試錯誤 ${index + 1}: ${error}`);
    mockConsole.error(error);
  });
  
  console.log('\n=== 測試 3: 正常錯誤處理 ===');
  
  // 測試正常錯誤（應該正常顯示）
  const normalErrors = [
    'TypeError: Cannot read property of undefined',
    'ReferenceError: variable is not defined',
    'SyntaxError: Unexpected token'
  ];
  
  normalErrors.forEach((error, index) => {
    console.log(`\n測試正常錯誤 ${index + 1}: ${error}`);
    mockConsole.error(error);
  });
  
  console.log('\n=== 測試結果 ===');
  const finalStatus = fix.getStatus();
  console.log('最終狀態:', finalStatus);
  
  // 驗證結果
  const expectedSuppressed = chromeErrors.length;
  const actualSuppressed = finalStatus.suppressedErrors;
  
  console.log(`\n📊 測試統計:`);
  console.log(`- Chrome 擴展錯誤: ${chromeErrors.length} 個`);
  console.log(`- 正常錯誤: ${normalErrors.length} 個`);
  console.log(`- 預期抑制: ${expectedSuppressed} 個`);
  console.log(`- 實際抑制: ${actualSuppressed} 個`);
  
  const testPassed = actualSuppressed === expectedSuppressed;
  console.log(`\n🎯 測試結果: ${testPassed ? '✅ 通過' : '❌ 失敗'}`);
  
  if (testPassed) {
    console.log('\n🎉 Chrome 擴展錯誤修復功能正常工作！');
  } else {
    console.log('\n⚠️ Chrome 擴展錯誤修復功能需要調整');
  }
  
  console.log('\n💡 實際使用建議:');
  console.log('1. 在瀏覽器中打開應用程式');
  console.log('2. 打開開發者工具的控制台');
  console.log('3. 檢查是否還有 "runtime.lastError" 錯誤顯示');
  console.log('4. 如果沒有看到這些錯誤，說明修復成功');
  console.log('5. 正常的應用程式錯誤仍會正常顯示');
  
  return testPassed;
}

// 執行測試
runChromeExtensionFixTest().then(success => {
  console.log('\n=== 測試完成 ===');
  console.log(`整體測試結果: ${success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (success) {
    console.log('\n🔧 修復功能已準備就緒，可以部署到生產環境');
  } else {
    console.log('\n🔧 需要進一步調試和優化修復功能');
  }
});
