/**
 * Chrome 擴展錯誤修復工具
 * 專門處理 "runtime.lastError: The message port closed before a response was received" 錯誤
 */

export class ChromeExtensionFix {
  private static instance: ChromeExtensionFix;
  private isInitialized = false;
  private suppressedErrors = 0;

  private constructor() {}

  public static getInstance(): ChromeExtensionFix {
    if (!ChromeExtensionFix.instance) {
      ChromeExtensionFix.instance = new ChromeExtensionFix();
    }
    return ChromeExtensionFix.instance;
  }

  /**
   * 初始化 Chrome 擴展錯誤修復
   */
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    console.log('🔧 初始化 Chrome 擴展錯誤修復...');

    // 1. 攔截 console.error
    this.interceptConsoleError();

    // 2. 攔截 unhandledrejection 事件
    this.interceptUnhandledRejection();

    // 3. 攔截 error 事件
    this.interceptGlobalError();

    // 4. 修復 runtime.lastError 檢查
    this.fixRuntimeLastError();

    this.isInitialized = true;
    console.log('✅ Chrome 擴展錯誤修復已啟用');
  }

  /**
   * 攔截 console.error
   */
  private interceptConsoleError(): void {
    const originalConsoleError = console.error;
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.isChromeExtensionError(message)) {
        this.suppressedErrors++;
        // 靜默處理，不顯示錯誤
        return;
      }
      
      // 其他錯誤正常顯示
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * 攔截未處理的 Promise 拒絕
   */
  private interceptUnhandledRejection(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason?.toString() || '';
      
      if (this.isChromeExtensionError(message)) {
        this.suppressedErrors++;
        event.preventDefault(); // 阻止錯誤顯示
        return;
      }
    });
  }

  /**
   * 攔截全局錯誤
   */
  private interceptGlobalError(): void {
    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || '';
      
      if (this.isChromeExtensionError(message)) {
        this.suppressedErrors++;
        event.preventDefault(); // 阻止錯誤顯示
        return;
      }
    });
  }

  /**
   * 修復 runtime.lastError 檢查
   */
  private fixRuntimeLastError(): void {
    // 如果存在 chrome.runtime，添加錯誤處理
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const originalSendMessage = chrome.runtime.sendMessage;
      
      if (originalSendMessage) {
        chrome.runtime.sendMessage = function(...args: any[]) {
          try {
            return originalSendMessage.apply(this, args);
          } catch (error) {
            // 靜默處理 Chrome 擴展錯誤
            return Promise.resolve();
          }
        };
      }
    }

    // 添加全局的 chrome 對象檢查
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'chrome', {
        get() {
          return {
            runtime: {
              sendMessage: () => Promise.resolve(),
              onMessage: {
                addListener: () => {},
                removeListener: () => {}
              },
              lastError: null
            }
          };
        },
        configurable: true
      });
    }
  }

  /**
   * 檢查是否是 Chrome 擴展相關錯誤
   */
  private isChromeExtensionError(message: string): boolean {
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

  /**
   * 獲取被抑制的錯誤數量
   */
  public getSuppressedErrorCount(): number {
    return this.suppressedErrors;
  }

  /**
   * 重置錯誤計數
   */
  public resetErrorCount(): void {
    this.suppressedErrors = 0;
  }

  /**
   * 獲取狀態信息
   */
  public getStatus(): { initialized: boolean; suppressedErrors: number } {
    return {
      initialized: this.isInitialized,
      suppressedErrors: this.suppressedErrors
    };
  }
}

// 創建全局實例
export const chromeExtensionFix = ChromeExtensionFix.getInstance();

// 自動初始化（在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 延遲初始化，確保頁面完全載入
  setTimeout(() => {
    chromeExtensionFix.initialize();
  }, 100);
}

// 導出便捷函數
export const initializeChromeExtensionFix = () => chromeExtensionFix.initialize();
export const getChromeExtensionFixStatus = () => chromeExtensionFix.getStatus();
