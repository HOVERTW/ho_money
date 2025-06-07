import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../../store/authStore';
import { supabaseDiagnostics } from '../../utils/supabaseDiagnostics';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, loading, error, registrationSuccess, clearError, clearRegistrationSuccess } = useAuthStore();

  const handleRegister = async () => {
    console.log('🔐 開始註冊流程...');

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('錯誤', '請填寫所有欄位');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('錯誤', '密碼確認不一致');
      return;
    }

    if (password.length < 6) {
      Alert.alert('錯誤', '密碼長度至少需要6個字符');
      return;
    }

    console.log('📧 註冊電子郵件:', email.trim());
    console.log('🔑 密碼長度:', password.length);

    // 運行 Supabase 診斷
    console.log('🔍 運行 Supabase 診斷...');
    const diagnosticResult = await supabaseDiagnostics.checkConnection();

    if (!diagnosticResult) {
      Alert.alert('連接錯誤', '無法連接到 Supabase 服務器，請稍後再試');
      return;
    }

    clearError();

    try {
      console.log('🚀 調用 signUp...');
      await signUp(email.trim(), password);

      console.log('📝 註冊完成，檢查錯誤狀態...');

      // 使用 setTimeout 來確保狀態已更新
      setTimeout(() => {
        const { error: currentError, loading: currentLoading, registrationSuccess: currentSuccess } = useAuthStore.getState();
        console.log('❓ 當前狀態:', {
          error: currentError,
          loading: currentLoading,
          registrationSuccess: currentSuccess
        });

        if (currentError) {
          console.error('❌ 註冊失敗:', currentError);
          Alert.alert('註冊失敗', currentError);
        } else if (!currentLoading && currentSuccess) {
          console.log('✅ 註冊成功');
          Alert.alert(
            '註冊成功！',
            '我們已經發送確認郵件到您的信箱。請點擊郵件中的確認連結來啟用您的帳號，然後返回此處登錄。',
            [{
              text: '確定',
              onPress: () => {
                clearRegistrationSuccess();
                navigation.navigate('Login');
              }
            }]
          );
        } else if (!currentLoading) {
          console.log('✅ 註冊完成（無明確成功狀態）');
          Alert.alert(
            '註冊完成',
            '請檢查您的電子郵件以驗證帳號，然後返回登錄',
            [{ text: '確定', onPress: () => navigation.navigate('Login') }]
          );
        } else {
          console.log('⏳ 仍在處理中...');
        }
      }, 2000);

    } catch (error) {
      console.error('💥 註冊異常:', error);
      Alert.alert('註冊失敗', error instanceof Error ? error.message : '未知錯誤');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>建立帳號</Text>
          <Text style={styles.subtitle}>開始您的財務管理之旅</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>電子郵件</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="請輸入您的電子郵件"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>密碼</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="請輸入密碼（至少6個字符）"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>確認密碼</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="請再次輸入密碼"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? '註冊中...' : '註冊'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>已經有帳號了？</Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginText}>立即登錄</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  loginText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
