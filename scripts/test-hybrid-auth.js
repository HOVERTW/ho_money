#!/usr/bin/env node

/**
 * 混合認證系統測試
 * 測試本地認證和 Supabase 認證的混合使用
 */

// 模擬 React Native 環境
global.Platform = { OS: 'web' };
global.localStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = value; },
  removeItem: function(key) { delete this.data[key]; }
};

// 導入服務
const { localAuthService } = require('../src/services/localAuthService');
const { hybridAuthService } = require('../src/services/hybridAuthService');

console.log('🔄 混合認證系統測試');
console.log('==================');
console.log('');

/**
 * 測試本地認證
 */
async function testLocalAuth() {
  console.log('🏠 測試1: 本地認證系統');
  console.log('----------------------');
  
  try {
    // 清除所有數據
    await localAuthService.clearAllData();
    console.log('🧹 已清除本地數據');
    
    // 測試註冊
    console.log('📝 測試本地註冊...');
    const signUpResult = await localAuthService.signUp('test@local.com', 'test123');
    
    if (signUpResult.error) {
      console.log('❌ 本地註冊失敗:', signUpResult.error.message);
      return false;
    } else {
      console.log('✅ 本地註冊成功');
      console.log('👤 用戶ID:', signUpResult.data.user.id);
      console.log('📧 用戶郵箱:', signUpResult.data.user.email);
      console.log('✅ 自動登錄:', !!signUpResult.data.session);
    }
    
    // 登出
    await localAuthService.signOut();
    console.log('🚪 已登出');
    
    // 測試登錄
    console.log('🔑 測試本地登錄...');
    const signInResult = await localAuthService.signIn('test@local.com', 'test123');
    
    if (signInResult.error) {
      console.log('❌ 本地登錄失敗:', signInResult.error.message);
      return false;
    } else {
      console.log('✅ 本地登錄成功');
      console.log('👤 用戶ID:', signInResult.data.user.id);
      console.log('📧 用戶郵箱:', signInResult.data.user.email);
    }
    
    // 測試會話
    console.log('📋 測試會話獲取...');
    const sessionResult = await localAuthService.getSession();
    
    if (sessionResult.data.session) {
      console.log('✅ 會話有效');
      console.log('⏰ 過期時間:', sessionResult.data.session.expires_at);
    } else {
      console.log('❌ 會話無效');
      return false;
    }
    
    // 登出
    await localAuthService.signOut();
    console.log('🚪 已登出');
    
    return true;
    
  } catch (error) {
    console.error('💥 本地認證測試異常:', error);
    return false;
  }
}

/**
 * 測試混合認證（本地模式）
 */
async function testHybridAuthLocal() {
  console.log('');
  console.log('🔄 測試2: 混合認證（本地模式）');
  console.log('-----------------------------');
  
  try {
    // 啟用本地認證模式
    hybridAuthService.enableLocalAuth();
    
    // 測試註冊
    console.log('📝 測試混合註冊（本地模式）...');
    const signUpResult = await hybridAuthService.signUp('hybrid@local.com', 'hybrid123');
    
    if (signUpResult.error) {
      console.log('❌ 混合註冊失敗:', signUpResult.error.message);
      return false;
    } else {
      console.log('✅ 混合註冊成功');
      console.log('👤 用戶郵箱:', signUpResult.data.user.email);
      console.log('🔧 認證來源:', signUpResult.source);
      console.log('✅ 自動登錄:', !!signUpResult.data.session);
    }
    
    // 登出
    await hybridAuthService.signOut();
    console.log('🚪 已登出');
    
    // 測試登錄
    console.log('🔑 測試混合登錄（本地模式）...');
    const signInResult = await hybridAuthService.signIn('hybrid@local.com', 'hybrid123');
    
    if (signInResult.error) {
      console.log('❌ 混合登錄失敗:', signInResult.error.message);
      return false;
    } else {
      console.log('✅ 混合登錄成功');
      console.log('👤 用戶郵箱:', signInResult.data.user.email);
      console.log('🔧 認證來源:', signInResult.source);
    }
    
    // 測試會話
    console.log('📋 測試混合會話獲取...');
    const sessionResult = await hybridAuthService.getSession();
    
    if (sessionResult.data.session) {
      console.log('✅ 混合會話有效');
      console.log('🔧 會話來源:', sessionResult.source);
    } else {
      console.log('❌ 混合會話無效');
      return false;
    }
    
    // 登出
    await hybridAuthService.signOut();
    console.log('🚪 已登出');
    
    return true;
    
  } catch (error) {
    console.error('💥 混合認證（本地模式）測試異常:', error);
    return false;
  }
}

/**
 * 測試默認用戶登錄
 */
async function testDefaultUsers() {
  console.log('');
  console.log('👤 測試3: 默認用戶登錄');
  console.log('---------------------');
  
  const defaultUsers = [
    { email: 'user01@gmail.com', password: 'user01' },
    { email: 'test@example.com', password: 'test123' }
  ];
  
  let successCount = 0;
  
  for (const user of defaultUsers) {
    try {
      console.log(`🔑 測試默認用戶登錄: ${user.email}`);
      
      const signInResult = await hybridAuthService.signIn(user.email, user.password);
      
      if (signInResult.error) {
        console.log(`❌ ${user.email} 登錄失敗:`, signInResult.error.message);
      } else {
        console.log(`✅ ${user.email} 登錄成功 (${signInResult.source})`);
        successCount++;
        
        // 登出
        await hybridAuthService.signOut();
        console.log('🚪 已登出');
      }
    } catch (error) {
      console.error(`💥 ${user.email} 登錄異常:`, error);
    }
  }
  
  console.log(`📊 默認用戶測試結果: ${successCount}/${defaultUsers.length} 成功`);
  return successCount === defaultUsers.length;
}

/**
 * 測試錯誤情況
 */
async function testErrorCases() {
  console.log('');
  console.log('❌ 測試4: 錯誤情況處理');
  console.log('----------------------');
  
  try {
    // 測試錯誤密碼
    console.log('🔑 測試錯誤密碼...');
    const wrongPasswordResult = await hybridAuthService.signIn('user01@gmail.com', 'wrongpassword');
    
    if (wrongPasswordResult.error) {
      console.log('✅ 錯誤密碼正確被拒絕:', wrongPasswordResult.error.message);
    } else {
      console.log('❌ 錯誤密碼應該被拒絕');
      return false;
    }
    
    // 測試不存在的用戶
    console.log('👤 測試不存在的用戶...');
    const nonExistentResult = await hybridAuthService.signIn('nonexistent@example.com', 'password');
    
    if (nonExistentResult.error) {
      console.log('✅ 不存在用戶正確被拒絕:', nonExistentResult.error.message);
    } else {
      console.log('❌ 不存在用戶應該被拒絕');
      return false;
    }
    
    // 測試重複註冊
    console.log('📝 測試重複註冊...');
    const duplicateResult = await hybridAuthService.signUp('user01@gmail.com', 'newpassword');
    
    if (duplicateResult.error) {
      console.log('✅ 重複註冊正確被拒絕:', duplicateResult.error.message);
    } else {
      console.log('❌ 重複註冊應該被拒絕');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 錯誤情況測試異常:', error);
    return false;
  }
}

/**
 * 主測試函數
 */
async function runHybridAuthTests() {
  console.log('🚀 開始混合認證系統測試...');
  console.log('');
  
  const results = {
    localAuth: false,
    hybridAuthLocal: false,
    defaultUsers: false,
    errorCases: false
  };
  
  try {
    // 測試1: 本地認證
    results.localAuth = await testLocalAuth();
    
    // 測試2: 混合認證（本地模式）
    results.hybridAuthLocal = await testHybridAuthLocal();
    
    // 測試3: 默認用戶
    results.defaultUsers = await testDefaultUsers();
    
    // 測試4: 錯誤情況
    results.errorCases = await testErrorCases();
    
  } catch (error) {
    console.log('💥 測試過程中發生錯誤:', error.message);
  }
  
  // 顯示測試結果
  console.log('');
  console.log('📊 混合認證測試結果總結');
  console.log('========================');
  console.log('');
  console.log('🏠 本地認證系統:', results.localAuth ? '✅ 通過' : '❌ 失敗');
  console.log('🔄 混合認證（本地模式）:', results.hybridAuthLocal ? '✅ 通過' : '❌ 失敗');
  console.log('👤 默認用戶登錄:', results.defaultUsers ? '✅ 通過' : '❌ 失敗');
  console.log('❌ 錯誤情況處理:', results.errorCases ? '✅ 通過' : '❌ 失敗');
  console.log('');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`📈 總體結果: ${passedTests}/${totalTests} 測試通過`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有測試通過！混合認證系統工作正常');
    console.log('');
    console.log('✅ 用戶現在可以:');
    console.log('   - 使用本地認證註冊和登錄');
    console.log('   - 使用默認測試帳號登錄');
    console.log('   - 享受完全離線的認證體驗');
    console.log('   - 在需要時切換到雲端認證');
    
    process.exit(0);
  } else {
    console.log('⚠️ 部分測試失敗，但本地認證應該仍然可用');
    
    if (results.localAuth && results.hybridAuthLocal) {
      console.log('');
      console.log('💡 好消息: 本地認證系統正常工作');
      console.log('   用戶可以正常註冊和登錄，不依賴外部服務');
    }
    
    process.exit(1);
  }
}

// 執行測試
runHybridAuthTests().catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});
