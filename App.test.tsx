import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppTest() {
  console.log('🚀 AppTest: 組件開始渲染');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FinTranzo 測試版本</Text>
      <Text style={styles.subtitle}>如果您看到這個畫面，表示基本渲染正常</Text>
      <Text style={styles.info}>版本: 測試版 1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
