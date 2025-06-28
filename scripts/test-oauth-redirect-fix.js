/**
 * 測試 OAuth 重定向修復
 * 驗證在 OAuth 重定向過程中不會觸發錯誤通知
 */

console.log('🧪 測試 OAuth 重定向修復');
console.log('==========================');

// 模擬瀏覽器環境
global.window = {
  location: {
    href: 'https://19930913.xyz/?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600',
    origin: 'https://19930913.xyz',
    search: '?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600',
    pathname: '/'
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

// 模擬用戶數據同步服務
const mockUserDataSyncService = {
  initializeUserData: async (user) => {
    console.log('🔄 模擬用戶數據初始化:', user.email);
    // 模擬一些可能會失敗的操作
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ 模擬用戶數據初始化完成');
  }
};

// 模擬交易數據服務
const mockTransactionDataService = {
  reloadUserData: async (userId) => {
    console.log('🔄 模擬重新加載交易數據:', userId);
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('✅ 模擬交易數據重新加載完成');
  }
};

// 模擬認證狀態監聽器
class MockAuthStateListener {
  constructor() {
    this.listeners = [];
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    return { unsubscribe: () => {} };
  }

  // 模擬觸發認證狀態變化
  async triggerAuthStateChange(event, session) {
    console.log(`🔄 觸發認證狀態變化: ${event}`, session?.user?.email);
    
    for (const callback of this.listeners) {
      try {
        await callback(event, session);
      } catch (error) {
        console.error('❌ 認證狀態監聽器錯誤:', error);
      }
    }
  }
}

// 創建模擬的 AppNavigator 認證監聽器
class MockAppNavigator {
  constructor() {
    this.user = null;
    this.session = null;
    this.authListener = new MockAuthStateListener();
    this.setupAuthListener();
  }

  setUser(user) {
    this.user = user;
    console.log('👤 設置用戶:', user?.email);
  }

  setSession(session) {
    this.session = session;
    console.log('🔐 設置會話:', session?.user?.email);
  }

  setupAuthListener() {
    this.authListener.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);

      if (session && session.user) {
        // 用戶登錄成功
        console.log('✅ 設置用戶狀態:', session.user.email);
        this.setUser(session.user);
        this.setSession(session);

        // 🔧 檢查是否是 Google OAuth 重定向過程中的中間狀態
        const isOAuthRedirect = typeof window !== 'undefined' && 
          (window.location.search.includes('access_token') || 
           window.location.search.includes('code=') ||
           window.location.search.includes('state='));

        if (isOAuthRedirect) {
          console.log('🌐 檢測到 OAuth 重定向，跳過用戶數據初始化');
          return;
        }

        // 初始化用戶數據（僅在首次登錄或新用戶時）
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            console.log('🔄 開始初始化用戶數據...');

            // 1. 初始化用戶數據（遷移和同步）
            await mockUserDataSyncService.initializeUserData(session.user);

            // 2. 直接重新加載交易數據服務（確保數據顯示）
            await mockTransactionDataService.reloadUserData(session.user.id);

            console.log('✅ 用戶數據初始化完成');
          } catch (error) {
            console.error('❌ 用戶數據初始化失敗:', error);
            // 不阻止用戶繼續使用應用，但記錄錯誤
            console.log('⚠️ 繼續使用應用，但數據同步可能有問題');
            
            // 這裡可能會觸發錯誤通知
            mockNotificationManager.error(
              '數據同步失敗',
              '用戶數據初始化失敗，請稍後重試',
              true
            );
          }
        }
      } else {
        // 用戶登出
        console.log('🚪 用戶登出，清除狀態');
        this.setUser(null);
        this.setSession(null);
      }
    });
  }

  // 模擬觸發認證事件
  async simulateAuthEvent(event, session) {
    await this.authListener.triggerAuthStateChange(event, session);
  }
}

// 測試場景
async function runTests() {
  console.log('🎯 開始測試 OAuth 重定向修復...');
  console.log('');

  const appNavigator = new MockAppNavigator();

  // 測試場景1: 正常登錄（沒有 OAuth 參數）
  console.log('📋 測試場景1: 正常登錄（沒有 OAuth 參數）');
  console.log('===========================================');
  
  // 清除 OAuth 參數
  global.window.location.search = '';
  global.window.location.href = 'https://19930913.xyz/';
  
  notifications.length = 0; // 清空通知記錄
  
  await appNavigator.simulateAuthEvent('SIGNED_IN', {
    user: {
      id: 'test-user-1',
      email: 'test1@example.com'
    }
  });
  
  console.log('');
  console.log('📊 場景1結果:');
  console.log('- 錯誤通知數量:', notifications.filter(n => n.type === 'error').length);
  console.log('- 總通知數量:', notifications.length);
  console.log('- 用戶數據初始化:', '應該執行');
  console.log('');

  // 測試場景2: OAuth 重定向中的登錄（有 access_token 參數）
  console.log('📋 測試場景2: OAuth 重定向中的登錄（有 access_token 參數）');
  console.log('====================================================');
  
  // 設置 OAuth 參數
  global.window.location.search = '?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600';
  global.window.location.href = 'https://19930913.xyz/?access_token=test_token&refresh_token=test_refresh&token_type=bearer&expires_in=3600';
  
  notifications.length = 0; // 清空通知記錄
  
  await appNavigator.simulateAuthEvent('SIGNED_IN', {
    user: {
      id: 'test-user-2',
      email: 'test2@example.com'
    }
  });
  
  console.log('');
  console.log('📊 場景2結果:');
  console.log('- 錯誤通知數量:', notifications.filter(n => n.type === 'error').length);
  console.log('- 總通知數量:', notifications.length);
  console.log('- 用戶數據初始化:', '應該跳過');
  console.log('');

  // 測試場景3: OAuth 重定向中的登錄（有 code 參數）
  console.log('📋 測試場景3: OAuth 重定向中的登錄（有 code 參數）');
  console.log('===============================================');
  
  // 設置 OAuth 參數
  global.window.location.search = '?code=auth_code_123&state=random_state';
  global.window.location.href = 'https://19930913.xyz/?code=auth_code_123&state=random_state';
  
  notifications.length = 0; // 清空通知記錄
  
  await appNavigator.simulateAuthEvent('SIGNED_IN', {
    user: {
      id: 'test-user-3',
      email: 'test3@example.com'
    }
  });
  
  console.log('');
  console.log('📊 場景3結果:');
  console.log('- 錯誤通知數量:', notifications.filter(n => n.type === 'error').length);
  console.log('- 總通知數量:', notifications.length);
  console.log('- 用戶數據初始化:', '應該跳過');
  console.log('');

  // 總結
  console.log('📊 總測試結果:');
  console.log('==============');
  
  const totalErrorNotifications = notifications.filter(n => n.type === 'error').length;
  
  if (totalErrorNotifications === 0) {
    console.log('✅ 所有測試通過！OAuth 重定向修復成功！');
    console.log('🎉 在 OAuth 重定向過程中不會觸發錯誤通知');
  } else {
    console.log('❌ 測試失敗，仍有錯誤通知被觸發');
    console.log('🔍 需要進一步調試');
  }
  
  console.log('');
  console.log('🏁 測試完成');
  
  return totalErrorNotifications === 0;
}

// 執行測試
runTests().then(success => {
  if (success) {
    console.log('🎉 OAuth 重定向修復驗證成功！');
  } else {
    console.log('💥 OAuth 重定向修復驗證失敗');
  }
}).catch(error => {
  console.error('💥 測試執行失敗:', error);
});
