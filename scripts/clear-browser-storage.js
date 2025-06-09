// 清除瀏覽器本地存儲的腳本
// 在瀏覽器控制台中執行此腳本來清除所有本地數據

console.log('🧹 開始清除瀏覽器本地存儲...');

// 定義所有可能的存儲鍵
const STORAGE_KEYS = {
  TRANSACTIONS: 'fintranzo_transactions',
  ASSETS: 'fintranzo_assets',
  LIABILITIES: 'fintranzo_liabilities',
  CATEGORIES: 'fintranzo_categories',
  USER_PREFERENCES: 'fintranzo_user_preferences',
  RECURRING_TRANSACTIONS: 'fintranzo_recurring_transactions',
  INITIALIZED: 'fintranzo_initialized'
};

// 額外的可能存在的鍵
const ADDITIONAL_KEYS = [
  'recurring_transactions',
  'future_transactions',
  'user_preferences',
  'app_settings',
  'sync_status',
  'last_sync_time',
  'asset_data',
  'transaction_data',
  'liability_data'
];

function clearBrowserStorage() {
  let clearedCount = 0;
  
  console.log('📋 檢查並清除 FinTranzo 相關的存儲項目...');
  
  // 清除定義的存儲鍵
  Object.values(STORAGE_KEYS).forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ 已清除: ${key}`);
      clearedCount++;
    }
  });
  
  // 清除額外的鍵
  ADDITIONAL_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ 已清除: ${key}`);
      clearedCount++;
    }
  });
  
  // 檢查所有以 'fintranzo_' 開頭的鍵
  const allKeys = Object.keys(localStorage);
  const appRelatedKeys = allKeys.filter(key => 
    key.startsWith('fintranzo_') || 
    key.startsWith('transaction_') ||
    key.startsWith('asset_') ||
    key.startsWith('liability_') ||
    key.startsWith('recurring_') ||
    key.includes('financial')
  );
  
  appRelatedKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ 已清除應用相關鍵: ${key}`);
    clearedCount++;
  });
  
  console.log(`✅ 清除完成！共清除了 ${clearedCount} 個存儲項目`);
  
  if (clearedCount === 0) {
    console.log('ℹ️ 沒有找到需要清除的數據');
  } else {
    console.log('🔄 請刷新頁面以查看效果');
  }
  
  return clearedCount;
}

// 執行清除
const result = clearBrowserStorage();

// 提供手動清除的函數
window.clearFinTranzoData = clearBrowserStorage;

console.log('💡 如果需要再次清除，可以在控制台執行: clearFinTranzoData()');
