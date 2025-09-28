import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { View, Text, Platform, ActivityIndicator } from 'react-native';

// 錯誤邊界組件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CalendarErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('📅 Calendar 組件錯誤:', error);
    console.log('錯誤詳情:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          margin: 16,
        }}>
          <Text style={{ color: '#666', textAlign: 'center' }}>
            📅 月曆組件暫時無法使用
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            請使用自定義月曆功能
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// 懶加載的 Calendar 組件
interface SafeCalendarProps {
  onDayPress?: (day: any) => void;
  markedDates?: any;
  theme?: any;
  [key: string]: any;
}

const SafeCalendar: React.FC<SafeCalendarProps> = (props) => {
  const [CalendarComponent, setCalendarComponent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // 延遲載入 Calendar 組件
    const loadCalendar = async () => {
      try {
        // 在 Web 環境中不載入
        if (Platform.OS === 'web') {
          setLoadError('Web 環境不支援原生月曆');
          setIsLoading(false);
          return;
        }

        // 延遲 2 秒載入，確保應用已完全啟動
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 暫時禁用原生月曆，避免 iOS 閃退問題
        throw new Error('原生月曆已暫時禁用以修復 iOS 閃退問題');
      } catch (error) {
        console.log('❌ Calendar 組件載入失敗:', error);
        setLoadError('月曆組件載入失敗');
        setIsLoading(false);
      }
    };

    loadCalendar();
  }, []);

  if (isLoading) {
    return (
      <View style={{
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        margin: 16,
      }}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={{ color: '#666', marginTop: 8 }}>
          載入月曆中...
        </Text>
      </View>
    );
  }

  if (loadError || !CalendarComponent) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        margin: 16,
      }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>
          📅 原生月曆暫時無法使用
        </Text>
        <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
          {loadError || '請使用自定義月曆功能'}
        </Text>
      </View>
    );
  }

  return (
    <CalendarErrorBoundary>
      <CalendarComponent {...props} />
    </CalendarErrorBoundary>
  );
};

export default SafeCalendar;
