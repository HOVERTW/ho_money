// 最小化測試版本 - 只顯示基本文字，測試 iOS 閃退問題
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  console.log('🚀 最小化測試版本啟動');
  
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>FinTranzo 測試版本</Text>
        <Text style={styles.subtitle}>如果你看到這個畫面，表示應用沒有閃退</Text>
        <Text style={styles.info}>這是最小化測試版本</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#666',
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
  },
});
