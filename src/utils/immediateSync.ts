/**
 * 立即執行 S&P 500 同步
 * 直接啟動，無需等待
 */

import { startFullSyncProcess } from './executeSP500FullSync';

console.log('🚀 立即啟動 S&P 500 同步系統...');
console.log('=====================================');
console.log('📊 目標：500 檔股票');
console.log('🔑 API Key: QJTK95T7SA1661WM');
console.log('⚠️ Alpha Vantage 限制：每分鐘 5 次，每日 500 次');
console.log('💡 只獲取收盤價，避免被封鎖');
console.log('⏱️ 預計需要：100 分鐘');
console.log('=====================================\n');

// 立即執行
(async () => {
  try {
    console.log('🔄 正在啟動同步流程...\n');
    
    const success = await startFullSyncProcess();
    
    if (success) {
      console.log('\n🎉 S&P 500 同步流程執行完成！');
      console.log('💡 現在 AAPL 應該顯示真實價格 $200.85');
      console.log('🔍 請測試搜尋功能確認同步結果');
    } else {
      console.log('\n❌ 同步流程執行失敗');
      console.log('💡 請檢查錯誤訊息並重試');
    }
    
  } catch (error) {
    console.error('\n❌ 執行同步時發生錯誤:', error);
    console.log('💡 請檢查：');
    console.log('   1. 網路連接是否正常');
    console.log('   2. Supabase 配置是否正確');
    console.log('   3. Alpha Vantage API Key 是否有效');
  }
})();

export { startFullSyncProcess };
