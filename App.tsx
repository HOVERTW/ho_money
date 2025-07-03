import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { appInitializationService } from './src/services/appInitializationService';
import AppNavigator from './src/navigation/AppNavigator';
import { errorHandler } from './src/utils/errorHandler';
import { SupabaseConnectionTest } from './src/utils/supabaseTest';
import { NotificationManager } from './src/components/NotificationManager';
import { IOSEnvironmentCheck } from './src/utils/iOSEnvironmentCheck';

// 在開發環境中導入測試工具 - 使用安全的動態導入
if (__DEV__) {
  try {
    import('./src/utils/testNotifications').catch(() => {});
    import('./src/utils/testRegistration').catch(() => {});
    import('./src/utils/devUserConfirm').catch(() => {});
  } catch (error) {
    console.log('⚠️ 開發工具導入失敗，但不影響應用運行');
  }
}
// import { DiagnosticsService } from './src/utils/diagnostics';

// 錯誤邊界組件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ 應用錯誤邊界捕獲錯誤:', error, errorInfo);

    // 在 iOS 上，提供更好的錯誤恢復機制
    if (Platform.OS === 'ios') {
      console.log('🔄 iOS 錯誤恢復機制啟動...');

      // 對於常見的 iOS 錯誤，嘗試自動恢復
      const isRecoverableError =
        error.message.includes('reload') ||
        error.message.includes('Network') ||
        error.message.includes('timeout') ||
        error.message.includes('initialization');

      if (isRecoverableError) {
        setTimeout(() => {
          console.log('🔄 嘗試自動恢復...');
          this.setState({ hasError: false, error: undefined });
        }, 2000);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.errorContainer}>
          <Text style={errorStyles.errorTitle}>應用發生錯誤</Text>
          <Text style={errorStyles.errorMessage}>
            {this.state.error?.message || '未知錯誤'}
          </Text>
          <Text style={errorStyles.errorHint}>
            {Platform.OS === 'ios' ? '請重新啟動應用程式或等待自動恢復' : '請重新啟動應用程式'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // 初始化應用服務
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FinTranzo 應用啟動');
        console.log('================================');
        console.log('📱 平台:', require('react-native').Platform.OS);
        console.log('🌐 環境變量檢查:');
        console.log('- SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ 已設置' : '❌ 未設置');
        console.log('- SUPABASE_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已設置' : '❌ 未設置');

        // 初始化錯誤處理器
        console.log('🛡️ 初始化全局錯誤處理器...');
        // errorHandler 已經在 import 時自動初始化

        // iOS 環境檢查
        if (Platform.OS === 'ios') {
          console.log('📱 執行 iOS 環境檢查...');
          try {
            const envCheck = await IOSEnvironmentCheck.performFullCheck();

            if (envCheck.issues.length > 0) {
              console.log('⚠️ iOS 環境問題:', envCheck.issues);
              // 不阻止應用啟動，但記錄問題
            } else {
              console.log('✅ iOS 環境檢查通過');
            }
          } catch (error) {
            console.log('⚠️ iOS 環境檢查失敗，但繼續啟動:', error);
          }
        }

        console.log('🚀 開始初始化應用服務...');

        // 添加超時保護，但縮短時間
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始化超時')), 10000);
        });

        const initPromise = appInitializationService.initializeApp();

        await Promise.race([initPromise, timeoutPromise]);

        console.log('✅ 應用初始化完成');

        // 🧪 在開發環境中運行 Supabase 連接測試 - 僅在非iOS生產環境
        if (__DEV__ && Platform.OS !== 'ios') {
          console.log('🧪 開發環境：運行 Supabase 連接測試...');
          setTimeout(() => {
            try {
              SupabaseConnectionTest.runFullTest();
            } catch (error) {
              console.log('⚠️ Supabase 測試失敗，但不影響應用運行');
            }
          }, 2000);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        console.log('⚠️ 使用安全模式啟動應用');
        // 即使初始化失敗，也啟動應用避免空白畫面
        setIsInitialized(true);
        setInitError(error instanceof Error ? error.message : '初始化失敗');
      }
    };

    initializeApp();
  }, []);

  // 顯示載入畫面
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {initError ? `初始化失敗: ${initError}` : '正在載入 FinTranzo...'}
        </Text>
      </View>
    );
  }

  return (
    <NotificationManager>
      <AppNavigator />
    </NotificationManager>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
});

const errorStyles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}


