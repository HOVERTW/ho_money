// 清理本地無效交易數據
const fs = require('fs');
const path = require('path');

// 模擬 AsyncStorage 的本地存儲路徑（Web 版本使用 localStorage）
// 這個腳本主要用於清理開發環境中的無效數據

console.log('🧹 開始清理本地無效交易數據...');

// 檢查是否有本地存儲文件（React Native 環境）
const localStoragePath = path.join(__dirname, '../.expo/web-cache');

if (fs.existsSync(localStoragePath)) {
  console.log('📁 找到本地緩存目錄:', localStoragePath);
  
  try {
    // 清理緩存目錄
    fs.rmSync(localStoragePath, { recursive: true, force: true });
    console.log('✅ 本地緩存已清理');
  } catch (error) {
    console.error('❌ 清理本地緩存失敗:', error);
  }
} else {
  console.log('📝 沒有找到本地緩存目錄');
}

// 清理 Metro bundler 緩存
const metroCachePath = path.join(__dirname, '../node_modules/.cache');
if (fs.existsSync(metroCachePath)) {
  try {
    fs.rmSync(metroCachePath, { recursive: true, force: true });
    console.log('✅ Metro 緩存已清理');
  } catch (error) {
    console.error('❌ 清理 Metro 緩存失敗:', error);
  }
}

// 清理 Expo 緩存
const expoCachePath = path.join(__dirname, '../.expo');
if (fs.existsSync(expoCachePath)) {
  try {
    fs.rmSync(expoCachePath, { recursive: true, force: true });
    console.log('✅ Expo 緩存已清理');
  } catch (error) {
    console.error('❌ 清理 Expo 緩存失敗:', error);
  }
}

console.log('🎉 本地數據清理完成！');
console.log('💡 建議：');
console.log('1. 重新啟動開發服務器');
console.log('2. 清除瀏覽器的 localStorage');
console.log('3. 重新登錄以同步乾淨的數據');
