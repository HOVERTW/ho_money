/**
 * 清理台股資料表 - 排除所有權證
 * 排除名稱中包含「牛」、「熊」、「購」、「售」的權證
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 檢查環境變數
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ 請設置 SUPABASE_URL 和 SUPABASE_ANON_KEY 環境變數');
  process.exit(1);
}

// 初始化 Supabase 客戶端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🧹 台股資料表清理工具');
console.log('⏰ 執行時間:', new Date().toLocaleString('zh-TW'));
console.log('🎯 目標：排除所有權證（牛、熊、購、售）\n');

/**
 * 查看清理前的統計
 */
async function getBeforeStats() {
  try {
    console.log('📊 步驟 1：查看清理前統計...');
    
    // 總筆數
    const { count: totalCount, error: totalError } = await supabase
      .from('taiwan_stocks')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // 權證筆數
    const { count: warrantCount, error: warrantError } = await supabase
      .from('taiwan_stocks')
      .select('*', { count: 'exact', head: true })
      .or('name.like.%牛%,name.like.%熊%,name.like.%購%,name.like.%售%,name.like.%權證%,name.like.%認購%,name.like.%認售%');
    
    if (warrantError) throw warrantError;
    
    console.log(`✅ 清理前總筆數: ${totalCount}`);
    console.log(`⚠️ 將被刪除的權證數量: ${warrantCount}`);
    console.log(`📈 清理後預計剩餘: ${totalCount - warrantCount}\n`);
    
    return { totalCount, warrantCount };
  } catch (error) {
    console.error('❌ 獲取統計失敗:', error.message);
    throw error;
  }
}

/**
 * 顯示將被刪除的權證範例
 */
async function showWarrantExamples() {
  try {
    console.log('📋 步驟 2：顯示將被刪除的權證範例...');
    
    const { data, error } = await supabase
      .from('taiwan_stocks')
      .select('code, name, market_type')
      .or('name.like.%牛%,name.like.%熊%,name.like.%購%,name.like.%售%,name.like.%權證%')
      .order('code')
      .limit(10);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('權證範例:');
      data.forEach(stock => {
        console.log(`  ${stock.code} - ${stock.name} (${stock.market_type})`);
      });
    } else {
      console.log('✅ 沒有找到權證資料');
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ 顯示權證範例失敗:', error.message);
  }
}

/**
 * 執行清理
 */
async function cleanWarrants() {
  try {
    console.log('🧹 步驟 3：開始清理權證...');
    
    // 分批刪除，避免一次刪除太多資料
    let totalDeleted = 0;
    let batchSize = 100;
    
    while (true) {
      // 獲取一批權證資料
      const { data: warrants, error: selectError } = await supabase
        .from('taiwan_stocks')
        .select('code')
        .or('name.like.%牛%,name.like.%熊%,name.like.%購%,name.like.%售%,name.like.%權證%,name.like.%認購%,name.like.%認售%,code.like.03%,code.like.04%,code.like.05%,code.like.07%,code.like.08%,code.like.09%')
        .limit(batchSize);
      
      if (selectError) throw selectError;
      
      if (!warrants || warrants.length === 0) {
        break; // 沒有更多權證需要刪除
      }
      
      // 刪除這批權證
      const codes = warrants.map(w => w.code);
      const { error: deleteError } = await supabase
        .from('taiwan_stocks')
        .delete()
        .in('code', codes);
      
      if (deleteError) throw deleteError;
      
      totalDeleted += warrants.length;
      console.log(`🗑️ 已刪除 ${warrants.length} 筆權證，累計刪除 ${totalDeleted} 筆`);
      
      // 如果這批少於 batchSize，表示已經清理完成
      if (warrants.length < batchSize) {
        break;
      }
    }
    
    console.log(`✅ 清理完成！總共刪除 ${totalDeleted} 筆權證\n`);
    return totalDeleted;
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
    throw error;
  }
}

/**
 * 查看清理後的統計
 */
async function getAfterStats() {
  try {
    console.log('📊 步驟 4：查看清理後統計...');
    
    // 總筆數
    const { count: totalCount, error: totalError } = await supabase
      .from('taiwan_stocks')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // 檢查是否還有權證
    const { count: remainingWarrants, error: warrantError } = await supabase
      .from('taiwan_stocks')
      .select('*', { count: 'exact', head: true })
      .or('name.like.%牛%,name.like.%熊%,name.like.%購%,name.like.%售%,name.like.%權證%');
    
    if (warrantError) throw warrantError;
    
    console.log(`✅ 清理後總筆數: ${totalCount}`);
    console.log(`🔍 剩餘權證數量: ${remainingWarrants} (應為 0)`);
    
    // 市場分類統計
    const { data: marketStats, error: marketError } = await supabase
      .from('taiwan_stocks')
      .select('market_type')
      .not('market_type', 'is', null);
    
    if (!marketError && marketStats) {
      const stats = {};
      marketStats.forEach(item => {
        stats[item.market_type] = (stats[item.market_type] || 0) + 1;
      });
      
      console.log('\n📈 市場分類統計:');
      Object.entries(stats).forEach(([type, count]) => {
        const percentage = ((count / totalCount) * 100).toFixed(1);
        console.log(`  ${type}: ${count} 筆 (${percentage}%)`);
      });
    }
    
    console.log('');
    return { totalCount, remainingWarrants };
  } catch (error) {
    console.error('❌ 獲取清理後統計失敗:', error.message);
    throw error;
  }
}

/**
 * 顯示清理後的股票範例
 */
async function showCleanStockExamples() {
  try {
    console.log('📋 步驟 5：顯示清理後的股票範例...');
    
    const { data, error } = await supabase
      .from('taiwan_stocks')
      .select('code, name, market_type, closing_price')
      .not('closing_price', 'is', null)
      .order('code')
      .limit(10);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('清理後的股票範例:');
      data.forEach(stock => {
        console.log(`  ${stock.code} - ${stock.name} (${stock.market_type}) $${stock.closing_price}`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ 顯示股票範例失敗:', error.message);
  }
}

/**
 * 主要執行函數
 */
async function main() {
  try {
    // 步驟 1：查看清理前統計
    const beforeStats = await getBeforeStats();
    
    // 步驟 2：顯示權證範例
    await showWarrantExamples();
    
    // 確認是否繼續
    console.log('⚠️ 即將刪除所有權證資料，此操作無法復原！');
    console.log('💡 建議：如需備份，請先在 Supabase 中匯出資料');
    
    // 步驟 3：執行清理
    const deletedCount = await cleanWarrants();
    
    // 步驟 4：查看清理後統計
    const afterStats = await getAfterStats();
    
    // 步驟 5：顯示清理後範例
    await showCleanStockExamples();
    
    // 總結
    console.log('🎉 台股資料表清理完成！');
    console.log('==================');
    console.log(`📊 清理前: ${beforeStats.totalCount} 筆`);
    console.log(`🗑️ 刪除權證: ${deletedCount} 筆`);
    console.log(`📈 清理後: ${afterStats.totalCount} 筆`);
    console.log(`✅ 剩餘權證: ${afterStats.remainingWarrants} 筆`);
    
    if (afterStats.remainingWarrants === 0) {
      console.log('\n🎯 清理成功！所有權證已移除');
    } else {
      console.log('\n⚠️ 仍有權證殘留，可能需要手動檢查');
    }
    
  } catch (error) {
    console.error('\n💥 清理過程發生錯誤:', error.message);
    console.log('💡 建議：檢查網路連線和 Supabase 權限設置');
    process.exit(1);
  }
}

// 執行清理
main();
