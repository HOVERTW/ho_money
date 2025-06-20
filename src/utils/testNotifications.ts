/**
 * 通知系統測試工具
 * 用於測試各種通知場景
 */

import { notificationManager } from '../components/NotificationManager';

export class NotificationTester {
  /**
   * 測試所有通知類型
   */
  static testAllNotificationTypes() {
    console.log('🧪 開始測試通知系統...');

    // 測試成功通知 (Toast)
    setTimeout(() => {
      notificationManager.success(
        '登錄成功',
        '歡迎回來，user@example.com！',
        false
      );
    }, 1000);

    // 測試錯誤通知 (Modal)
    setTimeout(() => {
      notificationManager.error(
        '登錄失敗',
        '帳號或密碼錯誤，請檢查後重試',
        true
      );
    }, 3000);

    // 測試警告通知 (Toast)
    setTimeout(() => {
      notificationManager.warning(
        '網路連接不穩定',
        '請檢查您的網路連接',
        false
      );
    }, 5000);

    // 測試信息通知 (Toast)
    setTimeout(() => {
      notificationManager.info(
        '同步完成',
        '您的數據已成功同步到雲端',
        false
      );
    }, 7000);
  }

  /**
   * 測試Google登錄場景
   */
  static testGoogleLoginScenarios() {
    console.log('🧪 測試 Google 登錄通知場景...');

    // 成功場景
    setTimeout(() => {
      notificationManager.success(
        'Google 登錄成功',
        '歡迎回來，google.user@gmail.com！',
        false
      );
    }, 1000);

    // 失敗場景
    setTimeout(() => {
      notificationManager.error(
        'Google 登錄失敗',
        '網路連接異常，請檢查網路後重試',
        true
      );
    }, 3000);

    // 取消場景
    setTimeout(() => {
      notificationManager.warning(
        'Google 登錄取消',
        '您已取消 Google 登錄',
        false
      );
    }, 5000);
  }

  /**
   * 測試註冊場景
   */
  static testRegistrationScenarios() {
    console.log('🧪 測試註冊通知場景...');

    // 註冊成功場景
    setTimeout(() => {
      notificationManager.success(
        '註冊成功',
        '歡迎加入 FinTranzo，new.user@example.com！',
        false
      );
    }, 1000);

    // 需要郵件確認場景
    setTimeout(() => {
      notificationManager.success(
        '註冊成功',
        '請檢查您的電子郵件並點擊確認連結完成註冊',
        true
      );
    }, 3000);

    // 註冊失敗場景
    setTimeout(() => {
      notificationManager.error(
        '註冊失敗',
        '此電子郵件已被註冊，請使用其他郵箱或直接登錄',
        true
      );
    }, 5000);
  }

  /**
   * 測試連續通知
   */
  static testSequentialNotifications() {
    console.log('🧪 測試連續通知...');

    const notifications = [
      { type: 'info', title: '開始同步', message: '正在同步您的數據...', modal: false },
      { type: 'warning', title: '同步警告', message: '發現數據衝突，正在解決...', modal: false },
      { type: 'success', title: '同步完成', message: '所有數據已成功同步', modal: false },
    ];

    notifications.forEach((notif, index) => {
      setTimeout(() => {
        switch (notif.type) {
          case 'success':
            notificationManager.success(notif.title, notif.message, notif.modal);
            break;
          case 'error':
            notificationManager.error(notif.title, notif.message, notif.modal);
            break;
          case 'warning':
            notificationManager.warning(notif.title, notif.message, notif.modal);
            break;
          case 'info':
            notificationManager.info(notif.title, notif.message, notif.modal);
            break;
        }
      }, (index + 1) * 2000);
    });
  }

  /**
   * 測試長文本通知
   */
  static testLongTextNotifications() {
    console.log('🧪 測試長文本通知...');

    setTimeout(() => {
      notificationManager.error(
        '同步失敗',
        '由於網路連接不穩定，無法完成數據同步。請檢查您的網路連接並重試。如果問題持續存在，請聯繫客服支援。',
        true
      );
    }, 1000);

    setTimeout(() => {
      notificationManager.info(
        '功能更新',
        '我們已經為您的應用添加了新功能：資產自動分類、智能預算建議、月度財務報告等。請到設置頁面查看詳細說明。',
        false
      );
    }, 3000);
  }

  /**
   * 測試錯誤恢復場景
   */
  static testErrorRecoveryScenarios() {
    console.log('🧪 測試錯誤恢復場景...');

    // 模擬網路錯誤
    setTimeout(() => {
      notificationManager.error(
        '網路錯誤',
        '無法連接到服務器，請檢查網路連接',
        true
      );
    }, 1000);

    // 模擬重試成功
    setTimeout(() => {
      notificationManager.success(
        '連接恢復',
        '網路連接已恢復，數據同步正常',
        false
      );
    }, 4000);
  }
}

// 導出便捷測試函數
export const testNotifications = {
  all: NotificationTester.testAllNotificationTypes,
  google: NotificationTester.testGoogleLoginScenarios,
  registration: NotificationTester.testRegistrationScenarios,
  sequential: NotificationTester.testSequentialNotifications,
  longText: NotificationTester.testLongTextNotifications,
  errorRecovery: NotificationTester.testErrorRecoveryScenarios,
};

// 在開發環境中將測試函數添加到全局對象
if (__DEV__) {
  (global as any).testNotifications = testNotifications;
  console.log('🧪 通知測試工具已加載，使用 testNotifications.all() 等方法進行測試');
}
