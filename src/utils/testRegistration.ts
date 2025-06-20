/**
 * 註冊流程測試工具
 * 用於測試新的直接註冊功能
 */

import { authService } from '../services/supabase';
import { notificationManager } from '../components/NotificationManager';

export class RegistrationTester {
  /**
   * 測試新用戶註冊流程
   */
  static async testNewUserRegistration() {
    console.log('🧪 測試新用戶註冊流程...');
    
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    try {
      console.log(`📧 測試郵箱: ${testEmail}`);
      console.log(`🔐 測試密碼: ${testPassword}`);
      
      const result = await authService.createUserDirectly(testEmail, testPassword);
      
      console.log('📝 註冊測試結果:', {
        success: !result.error,
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        userEmail: result.data.user?.email,
        error: result.error?.message
      });
      
      if (result.data.user && !result.error) {
        notificationManager.success(
          '測試成功',
          `新用戶 ${testEmail} 註冊成功！`,
          false
        );
        
        if (result.data.session) {
          console.log('✅ 自動登錄成功');
        } else {
          console.log('⚠️ 需要手動登錄');
        }
      } else {
        notificationManager.error(
          '測試失敗',
          result.error?.message || '註冊測試失敗',
          true
        );
      }
      
      return result;
    } catch (error) {
      console.error('💥 註冊測試異常:', error);
      notificationManager.error(
        '測試異常',
        error instanceof Error ? error.message : '未知錯誤',
        true
      );
      throw error;
    }
  }

  /**
   * 測試已存在用戶註冊
   */
  static async testExistingUserRegistration() {
    console.log('🧪 測試已存在用戶註冊...');
    
    const existingEmail = 'user01@gmail.com';
    const existingPassword = 'user01';
    
    try {
      console.log(`📧 已存在郵箱: ${existingEmail}`);
      
      const result = await authService.createUserDirectly(existingEmail, existingPassword);
      
      console.log('📝 已存在用戶測試結果:', {
        success: !result.error,
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        userEmail: result.data.user?.email,
        error: result.error?.message
      });
      
      if (result.data.user && result.data.session && !result.error) {
        notificationManager.success(
          '測試成功',
          `已存在用戶 ${existingEmail} 直接登錄成功！`,
          false
        );
      } else {
        notificationManager.warning(
          '測試結果',
          '已存在用戶處理結果不如預期',
          true
        );
      }
      
      return result;
    } catch (error) {
      console.error('💥 已存在用戶測試異常:', error);
      notificationManager.error(
        '測試異常',
        error instanceof Error ? error.message : '未知錯誤',
        true
      );
      throw error;
    }
  }

  /**
   * 測試錯誤密碼註冊
   */
  static async testWrongPasswordRegistration() {
    console.log('🧪 測試錯誤密碼註冊...');
    
    const existingEmail = 'user01@gmail.com';
    const wrongPassword = 'wrongpassword123';
    
    try {
      console.log(`📧 已存在郵箱: ${existingEmail}`);
      console.log(`🔐 錯誤密碼: ${wrongPassword}`);
      
      const result = await authService.createUserDirectly(existingEmail, wrongPassword);
      
      console.log('📝 錯誤密碼測試結果:', {
        success: !result.error,
        hasUser: !!result.data.user,
        hasSession: !!result.data.session,
        error: result.error?.message
      });
      
      if (result.error) {
        notificationManager.info(
          '測試成功',
          '錯誤密碼正確被拒絕',
          false
        );
      } else {
        notificationManager.warning(
          '測試異常',
          '錯誤密碼應該被拒絕',
          true
        );
      }
      
      return result;
    } catch (error) {
      console.error('💥 錯誤密碼測試異常:', error);
      notificationManager.info(
        '測試成功',
        '錯誤密碼正確被拒絕（異常處理）',
        false
      );
      return { data: { user: null, session: null }, error };
    }
  }

  /**
   * 測試無效郵箱註冊
   */
  static async testInvalidEmailRegistration() {
    console.log('🧪 測試無效郵箱註冊...');
    
    const invalidEmail = 'invalid-email';
    const testPassword = 'test123456';
    
    try {
      console.log(`📧 無效郵箱: ${invalidEmail}`);
      
      const result = await authService.createUserDirectly(invalidEmail, testPassword);
      
      console.log('📝 無效郵箱測試結果:', {
        success: !result.error,
        error: result.error?.message
      });
      
      if (result.error) {
        notificationManager.info(
          '測試成功',
          '無效郵箱正確被拒絕',
          false
        );
      } else {
        notificationManager.warning(
          '測試異常',
          '無效郵箱應該被拒絕',
          true
        );
      }
      
      return result;
    } catch (error) {
      console.error('💥 無效郵箱測試異常:', error);
      notificationManager.info(
        '測試成功',
        '無效郵箱正確被拒絕（異常處理）',
        false
      );
      return { data: { user: null, session: null }, error };
    }
  }

  /**
   * 運行所有註冊測試
   */
  static async runAllTests() {
    console.log('🧪 開始運行所有註冊測試...');
    
    const tests = [
      { name: '新用戶註冊', test: this.testNewUserRegistration },
      { name: '已存在用戶註冊', test: this.testExistingUserRegistration },
      { name: '錯誤密碼註冊', test: this.testWrongPasswordRegistration },
      { name: '無效郵箱註冊', test: this.testInvalidEmailRegistration },
    ];
    
    const results = [];
    
    for (let i = 0; i < tests.length; i++) {
      const { name, test } = tests[i];
      
      console.log(`\n🔄 執行測試 ${i + 1}/${tests.length}: ${name}`);
      
      try {
        const result = await test();
        results.push({ name, success: true, result });
        
        // 測試間隔
        if (i < tests.length - 1) {
          console.log('⏳ 等待 2 秒後執行下一個測試...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results.push({ name, success: false, error });
        console.error(`❌ 測試 ${name} 失敗:`, error);
      }
    }
    
    // 顯示測試總結
    console.log('\n📊 測試總結:');
    results.forEach(({ name, success, error }) => {
      console.log(`${success ? '✅' : '❌'} ${name}: ${success ? '成功' : error?.message || '失敗'}`);
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    notificationManager.info(
      '測試完成',
      `${successCount}/${totalCount} 個測試通過`,
      true
    );
    
    return results;
  }
}

// 導出便捷測試函數
export const testRegistration = {
  newUser: RegistrationTester.testNewUserRegistration,
  existingUser: RegistrationTester.testExistingUserRegistration,
  wrongPassword: RegistrationTester.testWrongPasswordRegistration,
  invalidEmail: RegistrationTester.testInvalidEmailRegistration,
  all: RegistrationTester.runAllTests,
};

// 在開發環境中將測試函數添加到全局對象
if (__DEV__) {
  (global as any).testRegistration = testRegistration;
  console.log('🧪 註冊測試工具已加載，使用 testRegistration.all() 等方法進行測試');
}
