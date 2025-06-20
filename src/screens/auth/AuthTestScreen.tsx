import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../../store/authStore';

export default function AuthTestScreen() {
  const [email, setEmail] = useState('user01@gmail.com');
  const [password, setPassword] = useState('user01');
  const [testResults, setTestResults] = useState<string[]>([]);

  const {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError
  } = useAuthStore();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
    clearError();
  };

  const testEmailLogin = async () => {
    addTestResult('🔐 開始測試信箱登錄...');
    clearError();
    
    try {
      await signIn(email, password);
      
      setTimeout(() => {
        const currentState = useAuthStore.getState();
        if (currentState.user) {
          addTestResult(`✅ 信箱登錄成功: ${currentState.user.email}`);
        } else if (currentState.error) {
          addTestResult(`❌ 信箱登錄失敗: ${currentState.error}`);
        }
      }, 1000);
    } catch (error) {
      addTestResult(`💥 信箱登錄異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const testEmailRegister = async () => {
    addTestResult('📝 開始測試信箱註冊...');
    clearError();
    
    try {
      await signUp(email, password);
      
      setTimeout(() => {
        const currentState = useAuthStore.getState();
        if (currentState.registrationSuccess) {
          addTestResult('✅ 信箱註冊成功，請檢查電子郵件確認');
        } else if (currentState.error) {
          addTestResult(`❌ 信箱註冊失敗: ${currentState.error}`);
        }
      }, 1000);
    } catch (error) {
      addTestResult(`💥 信箱註冊異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const testGoogleLogin = async () => {
    addTestResult('🔐 開始測試 Google 登錄...');
    addTestResult(`📱 當前平台: ${Platform.OS}`);
    clearError();
    
    try {
      await signInWithGoogle();
      
      setTimeout(() => {
        const currentState = useAuthStore.getState();
        if (currentState.user) {
          addTestResult(`✅ Google 登錄成功: ${currentState.user.email}`);
        } else if (currentState.error) {
          addTestResult(`❌ Google 登錄失敗: ${currentState.error}`);
        }
      }, 2000);
    } catch (error) {
      addTestResult(`💥 Google 登錄異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const testLogout = async () => {
    addTestResult('👋 開始測試登出...');
    
    try {
      await signOut();
      addTestResult('✅ 登出成功');
    } catch (error) {
      addTestResult(`❌ 登出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />
      
      <Text style={styles.title}>認證功能測試</Text>
      
      {/* 當前狀態 */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>當前狀態</Text>
        <Text style={styles.statusText}>
          用戶: {user ? user.email : '未登錄'}
        </Text>
        <Text style={styles.statusText}>
          載入中: {loading ? '是' : '否'}
        </Text>
        {error && (
          <Text style={styles.errorText}>
            錯誤: {error}
          </Text>
        )}
      </View>

      {/* 測試帳號輸入 */}
      <View style={styles.inputCard}>
        <Text style={styles.inputTitle}>測試帳號</Text>
        <TextInput
          style={styles.input}
          placeholder="電子郵件"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="密碼"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {/* 測試按鈕 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={testEmailLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>測試信箱登錄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={testEmailRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>測試信箱註冊</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={testGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>測試 Google 登錄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={testLogout}
          disabled={loading || !user}
        >
          <Text style={styles.buttonText}>測試登出</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>清除結果</Text>
        </TouchableOpacity>
      </View>

      {/* 測試結果 */}
      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>測試結果</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
  },
  registerButton: {
    backgroundColor: '#34C759',
  },
  googleButton: {
    backgroundColor: '#FF3B30',
  },
  logoutButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
