import { Platform } from 'react-native';

/**
 * 應用啟動安全檢查工具
 * 確保所有關鍵組件都能安全載入，避免 iOS 閃退
 */
export class AppStartupSafety {
  private static instance: AppStartupSafety;
  private isInitialized = false;
  private safetyChecks: { [key: string]: boolean } = {};

  static getInstance(): AppStartupSafety {
    if (!AppStartupSafety.instance) {
      AppStartupSafety.instance = new AppStartupSafety();
    }
    return AppStartupSafety.instance;
  }

  /**
   * 初始化安全檢查
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🛡️ 開始應用啟動安全檢查...');

    try {
      // 檢查平台兼容性
      await this.checkPlatformCompatibility();
      
      // 檢查關鍵模組
      await this.checkCriticalModules();
      
      // 檢查存儲服務
      await this.checkStorageServices();
      
      this.isInitialized = true;
      console.log('✅ 應用啟動安全檢查完成');
    } catch (error) {
      console.log('⚠️ 應用啟動安全檢查失敗:', error);
      // 不拋出錯誤，讓應用繼續運行
    }
  }

  /**
   * 檢查平台兼容性
   */
  private async checkPlatformCompatibility(): Promise<void> {
    try {
      console.log('📱 檢查平台兼容性...');
      
      const platformInfo = {
        OS: Platform.OS,
        Version: Platform.Version,
        isTV: Platform.isTV,
        isTesting: Platform.isTesting,
      };
      
      console.log('平台信息:', platformInfo);
      this.safetyChecks.platform = true;
    } catch (error) {
      console.log('❌ 平台兼容性檢查失敗:', error);
      this.safetyChecks.platform = false;
    }
  }

  /**
   * 檢查關鍵模組
   */
  private async checkCriticalModules(): Promise<void> {
    console.log('🔧 檢查關鍵模組...');

    const modules = [
      { name: 'React Navigation', check: () => require('@react-navigation/native') },
      { name: 'Expo Status Bar', check: () => require('expo-status-bar') },
      { name: 'Vector Icons', check: () => require('@expo/vector-icons') },
      { name: 'Safe Area Context', check: () => require('react-native-safe-area-context') },
    ];

    for (const module of modules) {
      try {
        module.check();
        console.log(`✅ ${module.name} 模組正常`);
        this.safetyChecks[module.name] = true;
      } catch (error) {
        console.log(`❌ ${module.name} 模組失敗:`, error);
        this.safetyChecks[module.name] = false;
      }
    }
  }

  /**
   * 檢查存儲服務
   */
  private async checkStorageServices(): Promise<void> {
    console.log('💾 檢查存儲服務...');

    try {
      // 檢查 AsyncStorage
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('startup_test', 'test');
        const testValue = await AsyncStorage.getItem('startup_test');
        await AsyncStorage.removeItem('startup_test');
        
        if (testValue === 'test') {
          console.log('✅ AsyncStorage 正常');
          this.safetyChecks.asyncStorage = true;
        } else {
          throw new Error('AsyncStorage 測試失敗');
        }
      } else {
        // Web 環境檢查 localStorage
        localStorage.setItem('startup_test', 'test');
        const testValue = localStorage.getItem('startup_test');
        localStorage.removeItem('startup_test');
        
        if (testValue === 'test') {
          console.log('✅ localStorage 正常');
          this.safetyChecks.localStorage = true;
        } else {
          throw new Error('localStorage 測試失敗');
        }
      }
    } catch (error) {
      console.log('❌ 存儲服務檢查失敗:', error);
      this.safetyChecks.storage = false;
    }
  }

  /**
   * 安全載入模組
   */
  async safeLoadModule<T>(
    moduleName: string,
    loader: () => T,
    fallback?: T,
    delay: number = 0
  ): Promise<T | null> {
    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const module = loader();
      console.log(`✅ 安全載入模組: ${moduleName}`);
      return module;
    } catch (error) {
      console.log(`⚠️ 模組載入失敗 ${moduleName}:`, error);
      return fallback || null;
    }
  }

  /**
   * 獲取安全檢查結果
   */
  getSafetyReport(): { [key: string]: boolean } {
    return { ...this.safetyChecks };
  }

  /**
   * 檢查是否所有關鍵檢查都通過
   */
  isAllCriticalChecksPassed(): boolean {
    const criticalChecks = ['platform', 'React Navigation', 'Expo Status Bar'];
    return criticalChecks.every(check => this.safetyChecks[check] === true);
  }
}

// 創建全局實例
export const appStartupSafety = AppStartupSafety.getInstance();
