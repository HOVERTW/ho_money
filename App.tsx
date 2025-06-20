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

// 在開發環境中導入通知測試工具
if (__DEV__) {
  import('./src/utils/testNotifications');
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

    // 在 iOS 上，如果是按 r 導致的錯誤，嘗試重新載入
    if (Platform.OS === 'ios' && error.message.includes('reload')) {
      console.log('🔄 檢測到 iOS 重新載入錯誤，嘗試恢復...');
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
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

        console.log('🚀 開始初始化應用服務...');

        // 添加超時保護，但縮短時間
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始化超時')), 10000);
        });

        const initPromise = appInitializationService.initializeApp();

        await Promise.race([initPromise, timeoutPromise]);

        console.log('✅ 應用初始化完成');

        // 🧪 在開發環境中運行 Supabase 連接測試
        if (__DEV__) {
          console.log('🧪 開發環境：運行 Supabase 連接測試...');
          setTimeout(() => {
            SupabaseConnectionTest.runFullTest();
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


