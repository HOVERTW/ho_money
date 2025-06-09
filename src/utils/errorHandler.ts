/**
 * 全局錯誤處理工具
 * 處理各種運行時錯誤，包括 Chrome 擴展相關錯誤
 */

// 錯誤類型定義
export interface ErrorInfo {
  message: string;
  stack?: string;
  source: string;
  timestamp: number;
  userAgent?: string;
}

class ErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 50;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * 設置全局錯誤處理器
   */
  private setupGlobalErrorHandlers() {
    // 處理未捕獲的 Promise 拒絕
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'unhandledrejection');
        // 防止錯誤顯示在控制台
        event.preventDefault();
      });

      // 處理全局錯誤
      window.addEventListener('error', (event) => {
        this.handleError(event.error || event.message, 'global');
      });

      // 處理 Chrome 擴展相關錯誤
      this.setupChromeExtensionErrorHandler();
    }
  }

  /**
   * 設置 Chrome 擴展錯誤處理
   */
  private setupChromeExtensionErrorHandler() {
    // 攔截 console.error 來捕獲 Chrome 擴展錯誤
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // 檢查是否是 Chrome 擴展相關錯誤
      if (this.isChromeExtensionError(message)) {
        this.handleChromeExtensionError(message);
        return; // 不顯示這些錯誤
      }
      
      // 其他錯誤正常顯示
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * 檢查是否是 Chrome 擴展相關錯誤
   */
  private isChromeExtensionError(message: string): boolean {
    const chromeExtensionPatterns = [
      'runtime.lastError',
      'message port closed',
      'Extension context invalidated',
      'chrome-extension://',
      'Could not establish connection',
      'Receiving end does not exist',
      'The message port closed before a response was received'
    ];

    return chromeExtensionPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * 處理 Chrome 擴展錯誤
   */
  private handleChromeExtensionError(message: string) {
    // 靜默處理，只記錄到內部日誌
    this.logError({
      message: `[Chrome Extension] ${message}`,
      source: 'chrome-extension',
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    // 可選：通知用戶（但通常不需要）
    // console.log('🔧 檢測到瀏覽器擴展相關訊息，已自動處理');
  }

  /**
   * 通用錯誤處理
   */
  public handleError(error: any, source: string = 'unknown') {
    const errorInfo: ErrorInfo = {
      message: this.extractErrorMessage(error),
      stack: error?.stack,
      source,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    // 如果是 Chrome 擴展錯誤，特殊處理
    if (this.isChromeExtensionError(errorInfo.message)) {
      this.handleChromeExtensionError(errorInfo.message);
      return;
    }

    this.logError(errorInfo);
  }

  /**
   * 提取錯誤訊息
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.toString) {
      return error.toString();
    }
    
    return 'Unknown error';
  }

  /**
   * 記錄錯誤到內部隊列
   */
  private logError(errorInfo: ErrorInfo) {
    // 添加到錯誤隊列
    this.errorQueue.push(errorInfo);
    
    // 保持隊列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // 只記錄非 Chrome 擴展錯誤
    if (!this.isChromeExtensionError(errorInfo.message)) {
      console.warn(`🚨 [${errorInfo.source}] ${errorInfo.message}`);
    }
  }

  /**
   * 獲取錯誤統計
   */
  public getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      chromeExtension: 0,
      application: 0,
      recent: this.errorQueue.slice(-5)
    };

    this.errorQueue.forEach(error => {
      if (this.isChromeExtensionError(error.message)) {
        stats.chromeExtension++;
      } else {
        stats.application++;
      }
    });

    return stats;
  }

  /**
   * 清除錯誤隊列
   */
  public clearErrors() {
    this.errorQueue = [];
  }

  /**
   * 安全執行函數，捕獲所有錯誤
   */
  public async safeExecute<T>(
    fn: () => Promise<T> | T,
    fallback?: T,
    context: string = 'unknown'
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context);
      return fallback;
    }
  }

  /**
   * 包裝 AsyncStorage 操作以處理錯誤
   */
  public wrapAsyncStorage() {
    if (typeof window === 'undefined') return;

    // 檢查是否有 AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const originalGetItem = AsyncStorage.getItem;
    const originalSetItem = AsyncStorage.setItem;
    const originalRemoveItem = AsyncStorage.removeItem;

    // 包裝 getItem
    AsyncStorage.getItem = async (key: string) => {
      return this.safeExecute(
        () => originalGetItem.call(AsyncStorage, key),
        null,
        'AsyncStorage.getItem'
      );
    };

    // 包裝 setItem
    AsyncStorage.setItem = async (key: string, value: string) => {
      return this.safeExecute(
        () => originalSetItem.call(AsyncStorage, key, value),
        undefined,
        'AsyncStorage.setItem'
      );
    };

    // 包裝 removeItem
    AsyncStorage.removeItem = async (key: string) => {
      return this.safeExecute(
        () => originalRemoveItem.call(AsyncStorage, key),
        undefined,
        'AsyncStorage.removeItem'
      );
    };
  }
}

// 創建全局實例
export const errorHandler = new ErrorHandler();

// 初始化 AsyncStorage 包裝
if (typeof window !== 'undefined') {
  errorHandler.wrapAsyncStorage();
}

// 導出便捷函數
export const safeExecute = errorHandler.safeExecute.bind(errorHandler);
export const handleError = errorHandler.handleError.bind(errorHandler);
export const getErrorStats = errorHandler.getErrorStats.bind(errorHandler);
