// Ho記帳 - iOS 本地版本
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LocalOnlyAppNavigator from './src/navigation/LocalOnlyAppNavigator';

// iOS 安全錯誤邊界
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 ErrorBoundary 捕獲錯誤:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary 詳細錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>應用程式發生錯誤</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || '未知錯誤'}
          </Text>
          <Text style={styles.errorHint}>請重新啟動應用程式</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // iOS 本地版本啟動流程
  useEffect(() => {
    console.log('🚀 Ho記帳 iOS 本地版本啟動');

    const initializeApp = async () => {
      try {
        // 延遲初始化，避免 iOS Watchdog Timeout
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('✅ 本地版本初始化完成');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        setInitError(error instanceof Error ? error.message : '初始化失敗');
        // 即使失敗也設置為已初始化，讓應用可以啟動
        setIsInitialized(true);
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
          {initError ? `初始化失敗: ${initError}` : '正在載入 Ho記帳...'}
        </Text>
      </View>
    );
  }

  return <LocalOnlyAppNavigator />;
}

export default function App() {
  console.log('🚀 Ho記帳 iOS 本地版本啟動');

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
