import { supabase } from '../services/supabase';

export const supabaseDiagnostics = {
  // 檢查 Supabase 連接
  async checkConnection() {
    console.log('🔍 開始 Supabase 診斷...');
    
    try {
      // 1. 檢查基本連接
      console.log('1️⃣ 檢查基本連接...');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        console.error('❌ 基本連接失敗:', error.message);
        return false;
      } else {
        console.log('✅ 基本連接成功');
      }

      // 2. 檢查認證設定
      console.log('2️⃣ 檢查認證設定...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ 認證設定錯誤:', sessionError.message);
      } else {
        console.log('✅ 認證設定正常');
        console.log('📝 當前 session:', session ? '存在' : '不存在');
      }

      // 3. 檢查環境變量
      console.log('3️⃣ 檢查環境變量...');
      console.log('- SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅' : '❌');
      console.log('- SUPABASE_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
      console.log('- REDIRECT_URL:', process.env.EXPO_PUBLIC_REDIRECT_URL || '未設置');

      return true;
    } catch (error) {
      console.error('💥 診斷過程中發生錯誤:', error);
      return false;
    }
  },

  // 測試註冊功能
  async testRegistration(email: string, password: string) {
    console.log('🧪 測試註冊功能...');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.EXPO_PUBLIC_REDIRECT_URL || 'https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback'
        }
      });

      console.log('📝 註冊測試結果:');
      console.log('- 用戶:', data.user ? '✅ 已創建' : '❌ 未創建');
      console.log('- Session:', data.session ? '✅ 已創建' : '❌ 未創建');
      console.log('- 錯誤:', error ? `❌ ${error.message}` : '✅ 無錯誤');

      if (data.user) {
        console.log('👤 用戶詳情:');
        console.log('- ID:', data.user.id);
        console.log('- Email:', data.user.email);
        console.log('- 確認狀態:', data.user.email_confirmed_at ? '已確認' : '未確認');
        console.log('- 創建時間:', data.user.created_at);
      }

      return { data, error };
    } catch (error) {
      console.error('💥 註冊測試失敗:', error);
      return { data: null, error };
    }
  },

  // 測試登錄功能
  async testLogin(email: string, password: string) {
    console.log('🧪 測試登錄功能...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('📝 登錄測試結果:');
      console.log('- 用戶:', data.user ? '✅ 已登錄' : '❌ 未登錄');
      console.log('- Session:', data.session ? '✅ 已創建' : '❌ 未創建');
      console.log('- 錯誤:', error ? `❌ ${error.message}` : '✅ 無錯誤');

      return { data, error };
    } catch (error) {
      console.error('💥 登錄測試失敗:', error);
      return { data: null, error };
    }
  }
};
