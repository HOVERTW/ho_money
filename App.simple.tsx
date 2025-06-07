import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function SimpleApp() {
  useEffect(() => {
    console.log('🚀 SimpleApp: 組件已載入');
    console.log('📱 平台:', require('react-native').Platform.OS);
    console.log('🌐 環境變量檢查:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ 已設置' : '❌ 未設置');
    console.log('- EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已設置' : '❌ 未設置');
  }, []);

  const testAlert = () => {
    Alert.alert('測試', '如果您看到這個彈窗，表示基本功能正常');
  };

  const testConsole = () => {
    console.log('🧪 測試按鈕被點擊');
    console.log('⏰ 當前時間:', new Date().toISOString());
  };

  const testSupabase = async () => {
    try {
      console.log('🔗 測試 Supabase 連接...');
      
      // 動態導入 Supabase
      const { supabase } = await import('./src/services/supabase');
      
      console.log('📦 Supabase 客戶端已載入');
      
      // 測試基本查詢
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase 測試失敗:', error.message);
        Alert.alert('Supabase 測試', `失敗: ${error.message}`);
      } else {
        console.log('✅ Supabase 測試成功');
        Alert.alert('Supabase 測試', '連接成功！');
      }
    } catch (error) {
      console.error('💥 Supabase 測試異常:', error);
      Alert.alert('Supabase 測試', `異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FinTranzo 簡單測試版</Text>
      <Text style={styles.subtitle}>用於診斷基本功能</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testAlert}>
          <Text style={styles.buttonText}>測試彈窗</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testConsole}>
          <Text style={styles.buttonText}>測試控制台</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testSupabase}>
          <Text style={styles.buttonText}>測試 Supabase</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.info}>請檢查控制台輸出</Text>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginTop: 32,
    textAlign: 'center',
  },
});
