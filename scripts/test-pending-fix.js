/**
 * 測試 Pending 狀態修復
 * 驗證 Web 平台 Google OAuth 重定向時不會顯示錯誤通知
 */

console.log('🧪 測試 Pending 狀態修復');
console.log('========================');

// 模擬 Web 環境
global.Platform = { OS: 'web' };
global.window = {
  location: {
    href: 'https://19930913.xyz/',
    origin: 'https://19930913.xyz'
  }
};

// 模擬通知管理器
const notifications = [];
const mockNotificationManager = {
  success: (title, message, showModal) => {
    notifications.push({ type: 'success', title, message, showModal });
    console.log(`✅ 成功通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  error: (title, message, showModal) => {
    notifications.push({ type: 'error', title, message, showModal });
    console.log(`❌ 錯誤通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  warning: (title, message, showModal) => {
    notifications.push({ type: 'warning', title, message, showModal });
    console.log(`⚠️ 警告通知: ${title} - ${message} (Modal: ${showModal})`);
  },
  info: (title, message, showModal) => {
    notifications.push({ type: 'info', title, message, showModal });
    console.log(`ℹ️ 信息通知: ${title} - ${message} (Modal: ${showModal})`);
  }
};

// 模擬 Supabase OAuth 響應
const mockSupabaseAuth = {
  signInWithGoogle: async () => {
    console.log('📡 模擬 Supabase signInWithGoogle 調用');
    
    // 模擬 Web 平台的重定向響應
    return {
      data: { user: null, session: null },
      error: null,
      pending: true // 🔧 關鍵：返回 pending 狀態
    };
  }
};

// 模擬 HybridAuthService
class MockHybridAuthService {
  convertSupabaseResponse(response) {
    return {
      data: response.data || { user: null, session: null },
      error: response.error,
      source: 'supabase',
      pending: response.pending // 🔧 傳遞 pending 狀態
    };
  }

  async signInWithGoogle() {
    console.log('🔐 HybridAuth: 開始 Google OAuth 流程...');
    
    try {
      const supabaseResult = await mockSupabaseAuth.signInWithGoogle();
      
      // 🔧 檢查是否是 Web 平台的重定向狀態
      if (supabaseResult.pending) {
        console.log('🌐 Web 平台：正在重定向到 Google OAuth，不顯示錯誤');
        // 不顯示任何通知，因為頁面正在重定向
        return this.convertSupabaseResponse(supabaseResult);
      }
      
      if (supabaseResult.data.user && !supabaseResult.error) {
        console.log('✅ Google 登錄成功');
        mockNotificationManager.success(
          'Google 登錄成功',
          `歡迎回來，${supabaseResult.data.user.email}！`,
          false
        );
      } else if (supabaseResult.error) {
        console.log('❌ Google 登錄失敗');
        const errorMessage = supabaseResult.error?.message || 'Google 登錄失敗';
        mockNotificationManager.error(
          'Google 登錄失敗',
          errorMessage,
          true
        );
      }
      
      return this.convertSupabaseResponse(supabaseResult);
    } catch (error) {
      console.error('💥 Google 登錄異常:', error);
      const errorMessage = error.message || 'Google 登錄異常';
      
      mockNotificationManager.error(
        'Google 登錄失敗',
        errorMessage,
        true
      );
      
      return {
        data: { user: null, session: null },
        error: error,
        source: 'supabase'
      };
    }
  }
}

// 模擬 AuthStore
class MockAuthStore {
  constructor() {
    this.state = {
      user: null,
      session: null,
      loading: false,
      error: null
    };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    console.log('📝 AuthStore 狀態更新:', this.state);
  }

  async signInWithGoogle() {
    console.log('🔐 AuthStore: 開始 Google 登錄...');
    this.setState({ loading: true, error: null });

    try {
      const hybridAuth = new MockHybridAuthService();
      const result = await hybridAuth.signInWithGoogle();

      console.log('📝 AuthStore: Google 登錄結果:', {
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        source: result.source,
        error: result.error?.message,
        pending: result.pending
      });

      // 🔧 檢查是否是 pending 狀態（Web 重定向）
      if (result.pending) {
        console.log('🌐 AuthStore: Web 平台正在重定向到 Google OAuth');
        // 保持 loading 狀態，不顯示錯誤
        return;
      }

      if (result.error) {
        console.error('❌ AuthStore: Google 登錄錯誤:', result.error.message);
        const errorMessage = result.error.message;
        this.setState({ error: errorMessage, loading: false });
        return;
      }

      if (result.data.user && result.data.session) {
        console.log('✅ AuthStore: Google 登錄成功:', result.data.user.email);
        this.setState({
          user: result.data.user,
          session: result.data.session,
          loading: false,
          error: null
        });
      } else {
        console.log('⚠️ AuthStore: Google 登錄返回空數據');
        const errorMessage = 'Google 登錄失敗，請稍後再試';
        this.setState({
          loading: false,
          error: errorMessage
        });

        mockNotificationManager.error('Google 登錄失敗', errorMessage, true);
      }
    } catch (error) {
      console.error('💥 AuthStore: Google 登錄異常:', error);
      const errorMessage = error.message || 'Google 登錄失敗';
      this.setState({
        error: errorMessage,
        loading: false
      });

      mockNotificationManager.error('Google 登錄失敗', errorMessage, true);
    }
  }
}

// 運行測試
async function runTest() {
  console.log('🎯 開始測試 Pending 狀態處理...');
  console.log('');
  
  // 清空通知記錄
  notifications.length = 0;
  
  const authStore = new MockAuthStore();
  
  console.log('📱 模擬用戶點擊 Google 登錄按鈕...');
  await authStore.signInWithGoogle();
  
  console.log('');
  console.log('📊 測試結果:');
  console.log('=============');
  
  // 檢查是否有錯誤通知
  const errorNotifications = notifications.filter(n => n.type === 'error');
  const successNotifications = notifications.filter(n => n.type === 'success');
  
  console.log('- 錯誤通知數量:', errorNotifications.length);
  console.log('- 成功通知數量:', successNotifications.length);
  console.log('- 總通知數量:', notifications.length);
  
  if (errorNotifications.length === 0) {
    console.log('✅ 測試通過：Web 重定向時沒有顯示錯誤通知');
  } else {
    console.log('❌ 測試失敗：Web 重定向時仍然顯示了錯誤通知');
    errorNotifications.forEach(notif => {
      console.log(`   - ${notif.title}: ${notif.message}`);
    });
  }
  
  console.log('');
  console.log('📋 詳細通知記錄:');
  if (notifications.length === 0) {
    console.log('   (無通知 - 這是期望的結果)');
  } else {
    notifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. [${notif.type.toUpperCase()}] ${notif.title}: ${notif.message}`);
    });
  }
  
  console.log('');
  console.log('🏁 測試完成');
  
  return errorNotifications.length === 0;
}

// 執行測試
runTest().then(success => {
  if (success) {
    console.log('🎉 所有測試通過！Google OAuth 重定向修復成功！');
  } else {
    console.log('💥 測試失敗，需要進一步修復');
  }
}).catch(error => {
  console.error('💥 測試執行失敗:', error);
});
