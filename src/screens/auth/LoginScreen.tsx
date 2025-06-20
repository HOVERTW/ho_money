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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { SupabaseConnectionTest } from '../../utils/supabaseTest';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {
    signIn,
    signInWithGoogle,
    signUp,
    loading,
    error,
    clearError
  } = useAuthStore();

  const handleLogin = async () => {
    console.log('🔐 LoginScreen: handleLogin 被觸發');
    console.log('📧 輸入的電子郵件:', email);
    console.log('🔑 密碼長度:', password.length);

    if (!email.trim() || !password.trim()) {
      console.log('❌ 輸入驗證失敗：電子郵件或密碼為空');
      Alert.alert('錯誤', '請輸入電子郵件和密碼');
      return;
    }

    console.log('🔐 LoginScreen: 開始登錄流程');
    console.log('🔗 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('🔑 Supabase Key 存在:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

    clearError();

    try {
      console.log('🚀 調用 signIn 方法...');
      await signIn(email.trim().toLowerCase(), password);
      console.log('✅ signIn 方法調用完成');

      // 檢查登錄結果
      const currentState = useAuthStore.getState();
      console.log('📝 登錄後狀態:', {
        hasUser: !!currentState.user,
        userEmail: currentState.user?.email,
        hasError: !!currentState.error,
        errorMessage: currentState.error,
        loading: currentState.loading
      });

      if (currentState.error) {
        console.error('❌ LoginScreen: 登錄失敗:', currentState.error);
        Alert.alert('登錄失敗', currentState.error);
      } else if (currentState.user) {
        console.log('✅ LoginScreen: 登錄成功:', currentState.user.email);
      } else {
        console.log('⚠️ LoginScreen: 登錄狀態不明確');
      }
    } catch (error) {
      console.error('💥 LoginScreen: 登錄異常:', error);
      Alert.alert('登錄失敗', '登錄過程中發生錯誤，請稍後再試');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleGoogleLogin = async () => {
    clearError();
    console.log('🔐 開始 Google 登錄流程...');
    console.log('🌐 當前 URL:', window.location.href);

    try {
      await signInWithGoogle();

      // 檢查最新狀態
      const currentState = useAuthStore.getState();
      console.log('📝 Google 登錄後狀態:', {
        user: currentState.user?.email,
        error: currentState.error,
        loading: currentState.loading
      });

      if (currentState.error) {
        console.error('❌ Google 登錄失敗:', currentState.error);
        Alert.alert('Google 登錄失敗', currentState.error);
      } else if (currentState.user) {
        console.log('✅ Google 登錄成功:', currentState.user.email);
      }
    } catch (err) {
      console.error('💥 Google 登錄異常:', err);
      Alert.alert('Google 登錄失敗', '請稍後再試');
    }
  };

  // 開發環境測試功能
  const handleCreateTestUser = async () => {
    const testEmail = 'test@example.com';
    const testPassword = 'test123456';

    console.log('🧪 創建測試用戶:', testEmail);
    clearError();

    try {
      await signUp(testEmail, testPassword);

      // 等待一下再嘗試登錄
      setTimeout(async () => {
        console.log('🔐 嘗試登錄測試用戶...');
        setEmail(testEmail);
        setPassword(testPassword);
        await signIn(testEmail, testPassword);
      }, 1000);

    } catch (err) {
      console.error('💥 測試用戶創建失敗:', err);
      Alert.alert('測試用戶創建失敗', '請檢查控制台日誌');
    }
  };

  // Supabase 連接測試
  const handleSupabaseTest = async () => {
    console.log('🧪 手動運行 Supabase 測試...');
    await SupabaseConnectionTest.runFullTest();
    Alert.alert('測試完成', '請檢查控制台日誌查看詳細結果');
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
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>FinTranzo</Text>
          <Text style={styles.subtitle}>個人財務管理專家</Text>
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
              placeholder="請輸入您的密碼"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '登錄中...' : '登錄'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={navigateToForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>忘記密碼？</Text>
          </TouchableOpacity>

          {/* 分隔線 */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.divider} />
          </View>

          {/* 社交登錄按鈕 */}
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.socialButtonText}>使用 Google 登錄</Text>
          </TouchableOpacity>

          {/* 開發環境測試按鈕 */}
          {__DEV__ && (
            <>
              <TouchableOpacity
                style={[styles.socialButton, styles.testButton]}
                onPress={handleCreateTestUser}
                disabled={loading}
              >
                <Ionicons name="flask" size={20} color="#fff" />
                <Text style={styles.socialButtonText}>創建測試用戶</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.diagnosticButton]}
                onPress={handleSupabaseTest}
                disabled={loading}
              >
                <Ionicons name="bug" size={20} color="#fff" />
                <Text style={styles.socialButtonText}>Supabase 連接測試</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>還沒有帳號？</Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={styles.registerText}>立即註冊</Text>
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
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
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
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
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
  registerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  diagnosticButton: {
    backgroundColor: '#5856D6',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
