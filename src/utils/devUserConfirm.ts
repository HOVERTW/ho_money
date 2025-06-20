/**
 * 開發環境用戶確認工具
 * 幫助開發者快速確認用戶郵箱
 */

import { authService } from '../services/supabase';
import { notificationManager } from '../components/NotificationManager';

export class DevUserConfirm {
  /**
   * 檢查用戶是否需要確認
   */
  static async checkUserConfirmationStatus(email: string): Promise<{
    needsConfirmation: boolean;
    message: string;
  }> {
    console.log('🔍 檢查用戶確認狀態:', email);
    
    try {
      // 嘗試登錄來檢查狀態
      const loginResult = await authService.signIn(email, 'test');
      
      if (loginResult.error) {
        const errorMessage = loginResult.error.message;
        
        if (errorMessage.includes('Invalid login credentials')) {
          return {
            needsConfirmation: true,
            message: '用戶可能需要郵箱確認才能登錄'
          };
        } else if (errorMessage.includes('Email not confirmed')) {
          return {
            needsConfirmation: true,
            message: '用戶郵箱尚未確認'
          };
        } else {
          return {
            needsConfirmation: false,
            message: '用戶狀態正常（密碼錯誤是正常的）'
          };
        }
      } else {
        return {
          needsConfirmation: false,
          message: '用戶已確認且可以正常登錄'
        };
      }
    } catch (error) {
      console.error('💥 檢查用戶狀態錯誤:', error);
      return {
        needsConfirmation: true,
        message: '無法檢查用戶狀態，可能需要確認'
      };
    }
  }

  /**
   * 顯示手動確認指南
   */
  static showManualConfirmationGuide(email: string) {
    console.log('📋 手動確認用戶指南:');
    console.log('');
    console.log('🔧 方法1: 使用 Supabase Dashboard');
    console.log('1. 前往 https://supabase.com/dashboard');
    console.log('2. 選擇您的項目');
    console.log('3. 前往 Authentication > Users');
    console.log(`4. 找到用戶: ${email}`);
    console.log('5. 點擊用戶行');
    console.log('6. 點擊 "Confirm email" 按鈕');
    console.log('');
    console.log('🔧 方法2: 使用 SQL 編輯器');
    console.log('1. 前往 Supabase Dashboard > SQL Editor');
    console.log('2. 執行以下 SQL 命令:');
    console.log(`   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`);
    console.log('');
    console.log('✅ 確認後用戶就可以正常登錄了！');
    
    // 顯示通知
    if (typeof notificationManager !== 'undefined') {
      notificationManager.info(
        '需要手動確認',
        `請在 Supabase Dashboard 中確認用戶 ${email} 的郵箱`,
        true
      );
    }
  }

  /**
   * 自動確認用戶（需要 service_role key）
   */
  static async autoConfirmUser(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🤖 嘗試自動確認用戶:', email);
    
    try {
      // 調用手動確認方法
      const result = await authService.manualConfirmUser(email);
      
      if (result.success) {
        console.log('✅ 自動確認指南已顯示');
        this.showManualConfirmationGuide(email);
        
        return {
          success: true,
          message: '請按照指南手動確認用戶'
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error('💥 自動確認用戶錯誤:', error);
      return {
        success: false,
        message: '自動確認失敗，請手動確認'
      };
    }
  }

  /**
   * 註冊後自動處理確認流程
   */
  static async handlePostRegistration(email: string, registrationResult: any) {
    console.log('🔄 處理註冊後確認流程:', email);
    
    try {
      // 檢查註冊結果
      if (registrationResult.data?.user && !registrationResult.data?.session) {
        console.log('📧 用戶已創建但需要確認');
        
        // 等待一下，然後檢查狀態
        setTimeout(async () => {
          const status = await this.checkUserConfirmationStatus(email);
          
          if (status.needsConfirmation) {
            console.log('⚠️ 確認需要手動確認用戶');
            this.showManualConfirmationGuide(email);
          } else {
            console.log('✅ 用戶狀態正常');
          }
        }, 3000);
        
        return {
          needsManualConfirmation: true,
          message: '用戶已創建，但可能需要手動確認郵箱'
        };
      } else if (registrationResult.data?.session) {
        console.log('🎉 用戶已創建並自動登錄');
        return {
          needsManualConfirmation: false,
          message: '用戶已成功創建並登錄'
        };
      } else {
        console.log('❌ 註冊失敗');
        return {
          needsManualConfirmation: false,
          message: '註冊失敗'
        };
      }
    } catch (error) {
      console.error('💥 處理註冊後確認流程錯誤:', error);
      return {
        needsManualConfirmation: true,
        message: '無法確定用戶狀態，建議手動確認'
      };
    }
  }

  /**
   * 測試用戶確認工具
   */
  static async testConfirmationTools() {
    console.log('🧪 測試用戶確認工具...');
    
    const testEmail = 'test@example.com';
    
    try {
      // 測試狀態檢查
      console.log('1. 測試狀態檢查...');
      const status = await this.checkUserConfirmationStatus(testEmail);
      console.log('狀態檢查結果:', status);
      
      // 測試手動確認指南
      console.log('2. 測試手動確認指南...');
      this.showManualConfirmationGuide(testEmail);
      
      // 測試自動確認
      console.log('3. 測試自動確認...');
      const autoResult = await this.autoConfirmUser(testEmail);
      console.log('自動確認結果:', autoResult);
      
      console.log('✅ 用戶確認工具測試完成');
      
      return {
        success: true,
        message: '所有測試完成'
      };
    } catch (error) {
      console.error('💥 測試用戶確認工具錯誤:', error);
      return {
        success: false,
        message: '測試失敗'
      };
    }
  }
}

// 導出便捷函數
export const devUserConfirm = {
  check: DevUserConfirm.checkUserConfirmationStatus,
  guide: DevUserConfirm.showManualConfirmationGuide,
  confirm: DevUserConfirm.autoConfirmUser,
  handle: DevUserConfirm.handlePostRegistration,
  test: DevUserConfirm.testConfirmationTools,
};

// 在開發環境中將工具添加到全局對象
if (__DEV__) {
  (global as any).devUserConfirm = devUserConfirm;
  console.log('🔧 開發用戶確認工具已加載，使用 devUserConfirm.guide("email") 等方法');
}
