// 最小化測試版本 - 移除所有可能有問題的導入
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  // 極速啟動 - 避免 iOS Watchdog Timeout
  useEffect(() => {
    console.log('🚀 FinTranzo 極速啟動');
    // 立即設置為已初始化，避免啟動延遲
    setIsInitialized(true);
    console.log('✅ 極速啟動完成');
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

  return <AppNavigator />;
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


