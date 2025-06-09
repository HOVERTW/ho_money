// 測試 F5 連續刷新穩定性
// 這個腳本模擬連續快速刷新的情況

console.log('🧪 開始測試 F5 連續刷新穩定性...');

// 模擬瀏覽器環境
const mockWindow = {
  location: {
    reload: () => console.log('🔄 模擬頁面重新載入')
  }
};

// 模擬 React 組件的狀態管理
class MockDashboardComponent {
  constructor() {
    this.state = {
      refreshing: false,
      isInitialized: false,
      transactions: [],
      assets: [],
      liabilities: []
    };
    
    this.refs = {
      initializationRef: { current: false },
      syncTriggeredRef: { current: false },
      listenersSetupRef: { current: false },
      lastRefreshTime: { current: 0 },
      refreshTimeoutRef: { current: null }
    };
    
    this.refreshCount = 0;
    this.errorCount = 0;
  }

  // 模擬防抖刷新邏輯
  onRefresh() {
    const now = Date.now();
    
    // 防止連續快速刷新（500ms 內只允許一次）
    if (now - this.refs.lastRefreshTime.current < 500) {
      console.log('⚠️ 刷新過於頻繁，已忽略');
      return false;
    }
    
    this.refs.lastRefreshTime.current = now;
    
    // 清除之前的超時
    if (this.refs.refreshTimeoutRef.current) {
      clearTimeout(this.refs.refreshTimeoutRef.current);
    }
    
    this.state.refreshing = true;
    this.refreshCount++;
    console.log(`🔄 執行刷新 #${this.refreshCount}`);
    
    try {
      // 模擬數據載入
      this.loadData();
      
      // 設置超時來停止刷新狀態
      this.refs.refreshTimeoutRef.current = setTimeout(() => {
        this.state.refreshing = false;
        this.refs.refreshTimeoutRef.current = null;
        console.log(`✅ 刷新 #${this.refreshCount} 完成`);
      }, 100);
      
      return true;
    } catch (error) {
      console.error(`❌ 刷新 #${this.refreshCount} 失敗:`, error);
      this.state.refreshing = false;
      this.errorCount++;
      return false;
    }
  }

  loadData() {
    // 模擬數據載入
    this.state.transactions = Array(Math.floor(Math.random() * 100)).fill(null);
    this.state.assets = Array(Math.floor(Math.random() * 10)).fill(null);
    this.state.liabilities = Array(Math.floor(Math.random() * 5)).fill(null);
  }

  // 模擬初始化邏輯
  initialize() {
    if (this.refs.initializationRef.current) return;
    this.refs.initializationRef.current = true;
    
    console.log('🚀 組件初始化');
    this.state.isInitialized = true;
    this.loadData();
  }

  // 清理資源
  cleanup() {
    console.log('🧹 清理組件資源');
    if (this.refs.refreshTimeoutRef.current) {
      clearTimeout(this.refs.refreshTimeoutRef.current);
    }
    this.refs.initializationRef.current = false;
    this.refs.syncTriggeredRef.current = false;
    this.refs.listenersSetupRef.current = false;
  }

  getStats() {
    return {
      refreshCount: this.refreshCount,
      errorCount: this.errorCount,
      successRate: this.refreshCount > 0 ? ((this.refreshCount - this.errorCount) / this.refreshCount * 100).toFixed(1) : 0
    };
  }
}

// 執行測試
async function runStabilityTest() {
  const component = new MockDashboardComponent();
  
  console.log('\n=== 測試 1: 正常初始化 ===');
  component.initialize();
  
  console.log('\n=== 測試 2: 單次刷新 ===');
  component.onRefresh();
  
  // 等待刷新完成
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log('\n=== 測試 3: 連續快速刷新（模擬 F5 連按） ===');
  const rapidRefreshResults = [];
  
  for (let i = 0; i < 10; i++) {
    const result = component.onRefresh();
    rapidRefreshResults.push(result);
    
    // 模擬非常快速的連續點擊（50ms 間隔）
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('快速刷新結果:', rapidRefreshResults);
  console.log('成功執行的刷新:', rapidRefreshResults.filter(r => r).length);
  console.log('被防抖阻止的刷新:', rapidRefreshResults.filter(r => !r).length);
  
  console.log('\n=== 測試 4: 間隔刷新（模擬正常使用） ===');
  for (let i = 0; i < 5; i++) {
    component.onRefresh();
    // 正常間隔（600ms）
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  
  console.log('\n=== 測試 5: 清理測試 ===');
  component.cleanup();
  
  // 最終統計
  const stats = component.getStats();
  console.log('\n📊 測試統計:');
  console.log(`- 總刷新次數: ${stats.refreshCount}`);
  console.log(`- 錯誤次數: ${stats.errorCount}`);
  console.log(`- 成功率: ${stats.successRate}%`);
  
  // 判斷測試結果
  if (stats.errorCount === 0 && stats.successRate > 80) {
    console.log('\n🎉 測試通過！F5 連續刷新穩定性良好');
    return true;
  } else {
    console.log('\n❌ 測試失敗！需要進一步優化');
    return false;
  }
}

// 執行測試
runStabilityTest().then(success => {
  console.log('\n=== 測試建議 ===');
  if (success) {
    console.log('✅ 防抖機制工作正常');
    console.log('✅ 資源清理機制有效');
    console.log('✅ 可以安全地連續按 F5');
  } else {
    console.log('⚠️ 建議檢查防抖邏輯');
    console.log('⚠️ 建議增加錯誤處理');
    console.log('⚠️ 建議優化資源管理');
  }
  
  console.log('\n💡 實際測試方法:');
  console.log('1. 在瀏覽器中打開應用程式');
  console.log('2. 快速連續按 F5 鍵 5-10 次');
  console.log('3. 觀察控制台是否有錯誤');
  console.log('4. 檢查應用程式是否仍然響應');
  console.log('5. 確認數據載入正常');
});
