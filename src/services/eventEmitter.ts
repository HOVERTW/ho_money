/**
 * 簡單的事件發射器，用於組件間通信
 */
class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  /**
   * 添加事件監聽器
   */
  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  /**
   * 移除事件監聽器
   */
  off(event: string, listener: Function) {
    if (!this.listeners[event]) return;

    const index = this.listeners[event].indexOf(listener);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * 發射事件
   */
  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * 移除所有監聽器
   */
  removeAllListeners(event?: string) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// 創建全局事件發射器實例
export const eventEmitter = new EventEmitter();

// 定義事件類型
export const EVENTS = {
  RECURRING_TRANSACTION_CREATED: 'recurring_transaction_created',
  RECURRING_TRANSACTION_UPDATED: 'recurring_transaction_updated',
  RECURRING_TRANSACTION_DELETED: 'recurring_transaction_deleted',
  TRANSACTIONS_REFRESH_NEEDED: 'transactions_refresh_needed',
  FINANCIAL_DATA_UPDATED: 'financial_data_updated', // 新增：財務數據更新事件
  DEBT_PAYMENT_ADDED: 'debt_payment_added', // 新增：負債還款添加事件
  // 🔥 新增：負債相關事件
  LIABILITY_ADDED: 'liability_added',
  LIABILITY_DELETED: 'liability_deleted',
  LIABILITY_MODIFIED: 'liability_modified',
  // 🔥 新增：強制刷新事件
  FORCE_REFRESH_ALL: 'force_refresh_all',
  FORCE_REFRESH_DASHBOARD: 'force_refresh_dashboard',
  FORCE_REFRESH_TRANSACTIONS: 'force_refresh_transactions',
  FORCE_REFRESH_CASHFLOW: 'force_refresh_cashflow',
  FORCE_REFRESH_CHARTS: 'force_refresh_charts',
  // 🔥 新增：數據同步事件
  DATA_SYNC_COMPLETED: 'data_sync_completed',
} as const;
