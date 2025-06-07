import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function GoogleOAuthTest() {
  const { signInWithGoogle, loading, error, user } = useAuthStore();

  const handleGoogleSignIn = async () => {
    console.log('🔐 開始 Google OAuth 測試...');
    console.log('📱 平台:', Platform.OS);

    try {
      await signInWithGoogle();

      // 檢查是否有錯誤
      const currentState = useAuthStore.getState();
      if (currentState.error) {
        console.error('❌ Google OAuth 失敗:', currentState.error);
        Alert.alert('Google 登錄失敗', currentState.error);
      } else if (currentState.user) {
        console.log('✅ Google OAuth 成功:', currentState.user.email);
        Alert.alert('成功', `Google 登錄成功！\n歡迎 ${currentState.user.email}`);
      }
    } catch (err) {
      console.error('💥 Google OAuth 異常:', err);
      Alert.alert('錯誤', err instanceof Error ? err.message : '未知錯誤');
    }
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 測試 Supabase 連接...');
      
      // 動態導入 Supabase
      const { supabase } = await import('../../services/supabase');
      
      // 測試基本查詢
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase 連接失敗:', error.message);
        Alert.alert('Supabase 測試', `連接失敗: ${error.message}`);
      } else {
        console.log('✅ Supabase 連接成功');
        Alert.alert('Supabase 測試', '連接成功！');
      }
    } catch (error) {
      console.error('💥 Supabase 測試異常:', error);
      Alert.alert('Supabase 測試', `異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google OAuth 測試</Text>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.disabledButton]} 
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '登錄中...' : '使用 Google 登錄'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={testSupabaseConnection}
      >
        <Text style={styles.buttonText}>測試 Supabase 連接</Text>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>錯誤: {error}</Text>
      )}

      <Text style={styles.infoText}>
        請檢查控制台輸出以查看詳細日誌
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff0000',
    marginTop: 15,
    textAlign: 'center',
  },
  infoText: {
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 14,
  },
});
