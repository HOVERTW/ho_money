/**
 * iOS 環境檢查工具
 * 檢測並處理 iOS 特定的環境問題
 */

export class IOSEnvironmentCheck {
  /**
   * 檢查是否為 iOS 環境
   */
  static isIOS(): boolean {
    try {
      // 檢查 React Native 環境
      if (typeof navigator !== 'undefined') {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
      }
      
      // 檢查 Platform API
      const Platform = require('react-native').Platform;
      return Platform.OS === 'ios';
    } catch (error) {
      console.log('⚠️ 無法檢測平台，假設為非 iOS 環境');
      return false;
    }
  }

  /**
   * 檢查環境變量是否正確設置
   */
  static checkEnvironmentVariables(): { isValid: boolean; missing: string[] } {
    const requiredVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missing: string[] = [];
    
    for (const varName of requiredVars) {
      try {
        const value = process.env[varName];
        if (!value || value.trim() === '') {
          missing.push(varName);
        }
      } catch (error) {
        missing.push(varName);
      }
    }

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * 檢查網絡連接
   */
  static async checkNetworkConnection(): Promise<boolean> {
    try {
      // 嘗試連接到 Supabase
      const response = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.log('⚠️ 網絡連接檢查失敗:', error);
      return false;
    }
  }

  /**
   * 執行完整的 iOS 環境檢查
   */
  static async performFullCheck(): Promise<{
    isIOS: boolean;
    environmentValid: boolean;
    networkConnected: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // 檢查是否為 iOS
    const isIOS = this.isIOS();
    if (isIOS) {
      console.log('📱 檢測到 iOS 環境');
    }

    // 檢查環境變量
    const envCheck = this.checkEnvironmentVariables();
    if (!envCheck.isValid) {
      issues.push(`缺少環境變量: ${envCheck.missing.join(', ')}`);
    }

    // 檢查網絡連接
    const networkConnected = await this.checkNetworkConnection();
    if (!networkConnected) {
      issues.push('網絡連接失敗');
    }

    return {
      isIOS,
      environmentValid: envCheck.isValid,
      networkConnected,
      issues
    };
  }

  /**
   * 獲取 iOS 安全配置
   */
  static getIOSSafeConfig() {
    return {
      // 減少並發請求
      maxConcurrentRequests: 3,
      // 增加超時時間
      requestTimeout: 10000,
      // 啟用重試機制
      enableRetry: true,
      maxRetries: 3,
      // 禁用某些可能導致問題的功能
      disableBackgroundSync: true,
      disableAutoUpdates: true
    };
  }
}
