import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    console.error('🚨 ErrorBoundary 捕獲到錯誤:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 你同樣可以將錯誤日誌上報給服務器
    console.error('🚨 ErrorBoundary 詳細錯誤信息:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 檢查是否是 getFullYear 錯誤
    if (error.message.includes('getFullYear') || error.message.includes('undefined')) {
      console.error('🚨 檢測到 getFullYear undefined 錯誤!');
      console.error('🚨 錯誤堆疊:', error.stack);
      console.error('🚨 組件堆疊:', errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 你可以自定義降級後的 UI 並渲染
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.title}>應用發生錯誤</Text>
            <Text style={styles.message}>
              {this.state.error?.message || '未知錯誤'}
            </Text>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>調試信息:</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.stack}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    組件堆疊: {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>重試</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  debugInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
