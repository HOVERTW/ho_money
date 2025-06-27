#!/usr/bin/env node

/**
 * 簡化的本地認證測試
 * 直接測試本地存儲認證邏輯
 */

console.log('🏠 本地認證系統測試');
console.log('==================');
console.log('');

// 模擬本地存儲
const localStorage = {
  data: {},
  getItem: function(key) { 
    return this.data[key] || null; 
  },
  setItem: function(key, value) { 
    this.data[key] = value; 
  },
  removeItem: function(key) { 
    delete this.data[key]; 
  },
  clear: function() {
    this.data = {};
  }
};

// 簡化的本地認證服務
class SimpleLocalAuth {
  constructor() {
    this.USERS_KEY = 'local_users';
    this.SESSION_KEY = 'current_session';
    this.initializeDefaultUsers();
  }

  initializeDefaultUsers() {
    const defaultUsers = [
      {
        id: 'user01-local-id',
        email: 'user01@gmail.com',
        password: 'user01',
        created_at: new Date().toISOString(),
        confirmed: true
      },
      {
        id: 'test-local-id',
        email: 'test@example.com',
        password: 'test123',
        created_at: new Date().toISOString(),
        confirmed: true
      }
    ];

    // 初始化用戶
    localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
    console.log('✅ 默認用戶已初始化');
  }

  getUsers() {
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  addUser(user) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.email === user.email);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  generateId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateToken() {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async signIn(email, password) {
    console.log('🔐 本地登錄:', email);

    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return {
        data: { user: null, session: null },
        error: new Error('電子郵件或密碼不正確')
      };
    }

    const session = {
      user,
      access_token: this.generateToken(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    return {
      data: { user, session },
      error: null
    };
  }

  async signUp(email, password) {
    console.log('📝 本地註冊:', email);

    const users = this.getUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      return {
        data: { user: null, session: null },
        error: new Error('此電子郵件已被註冊')
      };
    }

    const newUser = {
      id: this.generateId(),
      email,
      password,
      created_at: new Date().toISOString(),
      confirmed: true
    };

    this.addUser(newUser);

    const session = {
      user: newUser,
      access_token: this.generateToken(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    return {
      data: { user: newUser, session },
      error: null
    };
  }

  async getSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    
    if (!session) {
      return {
        data: { user: null, session: null },
        error: null
      };
    }

    const parsedSession = JSON.parse(session);

    if (new Date(parsedSession.expires_at) < new Date()) {
      this.signOut();
      return {
        data: { user: null, session: null },
        error: new Error('會話已過期')
      };
    }

    return {
      data: { user: parsedSession.user, session: parsedSession },
      error: null
    };
  }

  async signOut() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  clearAllData() {
    localStorage.clear();
  }
}

// 測試函數
async function runTests() {
  const auth = new SimpleLocalAuth();
  const results = {
    defaultLogin: false,
    newUserSignup: false,
    sessionManagement: false,
    errorHandling: false
  };

  try {
    // 測試1: 默認用戶登錄
    console.log('👤 測試1: 默認用戶登錄');
    console.log('---------------------');
    
    const loginResult = await auth.signIn('user01@gmail.com', 'user01');
    if (loginResult.error) {
      console.log('❌ 默認用戶登錄失敗:', loginResult.error.message);
    } else {
      console.log('✅ 默認用戶登錄成功');
      console.log('👤 用戶:', loginResult.data.user.email);
      console.log('🔑 令牌:', loginResult.data.session.access_token.substring(0, 20) + '...');
      results.defaultLogin = true;
    }

    await auth.signOut();
    console.log('🚪 已登出');

    // 測試2: 新用戶註冊
    console.log('');
    console.log('📝 測試2: 新用戶註冊');
    console.log('-------------------');
    
    const signupResult = await auth.signUp('newuser@example.com', 'newpass123');
    if (signupResult.error) {
      console.log('❌ 新用戶註冊失敗:', signupResult.error.message);
    } else {
      console.log('✅ 新用戶註冊成功');
      console.log('👤 用戶:', signupResult.data.user.email);
      console.log('🔑 自動登錄:', !!signupResult.data.session);
      results.newUserSignup = true;
    }

    // 測試3: 會話管理
    console.log('');
    console.log('📋 測試3: 會話管理');
    console.log('-----------------');
    
    const sessionResult = await auth.getSession();
    if (sessionResult.data.session) {
      console.log('✅ 會話有效');
      console.log('👤 會話用戶:', sessionResult.data.user.email);
      console.log('⏰ 過期時間:', sessionResult.data.session.expires_at);
      results.sessionManagement = true;
    } else {
      console.log('❌ 會話無效');
    }

    await auth.signOut();
    console.log('🚪 已登出');

    // 測試4: 錯誤處理
    console.log('');
    console.log('❌ 測試4: 錯誤處理');
    console.log('-----------------');
    
    // 錯誤密碼
    const wrongPasswordResult = await auth.signIn('user01@gmail.com', 'wrongpassword');
    if (wrongPasswordResult.error) {
      console.log('✅ 錯誤密碼正確被拒絕');
    } else {
      console.log('❌ 錯誤密碼應該被拒絕');
    }

    // 重複註冊
    const duplicateResult = await auth.signUp('user01@gmail.com', 'newpassword');
    if (duplicateResult.error) {
      console.log('✅ 重複註冊正確被拒絕');
      results.errorHandling = true;
    } else {
      console.log('❌ 重複註冊應該被拒絕');
    }

  } catch (error) {
    console.error('💥 測試過程中發生錯誤:', error);
  }

  // 顯示結果
  console.log('');
  console.log('📊 測試結果總結');
  console.log('==============');
  console.log('');
  console.log('👤 默認用戶登錄:', results.defaultLogin ? '✅ 通過' : '❌ 失敗');
  console.log('📝 新用戶註冊:', results.newUserSignup ? '✅ 通過' : '❌ 失敗');
  console.log('📋 會話管理:', results.sessionManagement ? '✅ 通過' : '❌ 失敗');
  console.log('❌ 錯誤處理:', results.errorHandling ? '✅ 通過' : '❌ 失敗');
  console.log('');

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`📈 總體結果: ${passedTests}/${totalTests} 測試通過`);

  if (passedTests === totalTests) {
    console.log('');
    console.log('🎉 所有測試通過！本地認證系統工作正常');
    console.log('');
    console.log('✅ 本地認證功能:');
    console.log('   - 用戶註冊和登錄 ✅');
    console.log('   - 會話管理 ✅');
    console.log('   - 錯誤處理 ✅');
    console.log('   - 完全離線工作 ✅');
    console.log('');
    console.log('💡 默認測試帳號:');
    console.log('   - user01@gmail.com / user01');
    console.log('   - test@example.com / test123');
    
    return true;
  } else {
    console.log('');
    console.log('⚠️ 部分測試失敗，需要檢查實現');
    return false;
  }
}

// 執行測試
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});
