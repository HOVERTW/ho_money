import { supabase } from '../services/supabase';

export class SupabaseConnectionTest {
  static async runFullTest(): Promise<void> {
    console.log('🧪 === SUPABASE 連接測試開始 ===');
    
    // 1. 檢查環境變數
    console.log('🔍 1. 檢查環境變數...');
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Supabase Key 存在:', !!supabaseKey);
    console.log('🔑 Supabase Key 長度:', supabaseKey?.length || 0);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ 環境變數缺失！');
      return;
    }
    
    // 2. 測試基本連接
    console.log('🔍 2. 測試基本連接...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.log('⚠️ 基本連接測試結果:', error.message);
      } else {
        console.log('✅ 基本連接成功');
      }
    } catch (error) {
      console.error('❌ 基本連接失敗:', error);
    }
    
    // 3. 測試認證狀態
    console.log('🔍 3. 檢查當前認證狀態...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('👤 當前用戶:', user?.email || '未登錄');
      if (error) {
        console.log('⚠️ 認證狀態檢查錯誤:', error.message);
      }
    } catch (error) {
      console.error('❌ 認證狀態檢查失敗:', error);
    }
    
    // 4. 測試註冊功能
    console.log('🔍 4. 測試註冊功能...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      if (error) {
        console.log('⚠️ 註冊測試結果:', error.message);
      } else {
        console.log('✅ 註冊功能正常，用戶:', data.user?.email);
        console.log('📧 需要郵件確認:', !data.session);
      }
    } catch (error) {
      console.error('❌ 註冊測試失敗:', error);
    }
    
    // 5. 測試登錄功能（使用已知帳號）
    console.log('🔍 5. 測試登錄功能...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'user01@gmail.com',
        password: 'user01',
      });
      
      if (error) {
        console.log('⚠️ 登錄測試結果:', error.message);
      } else {
        console.log('✅ 登錄功能正常，用戶:', data.user?.email);
        
        // 登錄成功後立即登出
        await supabase.auth.signOut();
        console.log('👋 測試完成，已登出');
      }
    } catch (error) {
      console.error('❌ 登錄測試失敗:', error);
    }
    
    console.log('🧪 === SUPABASE 連接測試完成 ===');
  }
  
  static async testGoogleOAuth(): Promise<void> {
    console.log('🔍 測試 Google OAuth 配置...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        console.log('⚠️ Google OAuth 錯誤:', error.message);
      } else {
        console.log('✅ Google OAuth 重定向已觸發');
      }
    } catch (error) {
      console.error('❌ Google OAuth 測試失敗:', error);
    }
  }
  
  static async quickHealthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

// 在開發環境中自動運行測試
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // 延遲運行，確保應用已初始化
  setTimeout(() => {
    SupabaseConnectionTest.runFullTest();
  }, 3000);
}
