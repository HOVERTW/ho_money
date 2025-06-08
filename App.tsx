import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { appInitializationService } from './src/services/appInitializationService';
import AppNavigator from './src/navigation/AppNavigator';
// import { DiagnosticsService } from './src/utils/diagnostics';

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

        console.log('🚀 開始初始化應用服務...');

        // 添加超時保護，但縮短時間
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始化超時')), 10000);
        });

        const initPromise = appInitializationService.initializeApp();

        await Promise.race([initPromise, timeoutPromise]);

        console.log('✅ 應用初始化完成');
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


