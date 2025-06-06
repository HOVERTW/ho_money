/**
 * 快速修正 AAPL 價格
 * 立即從 Alpha Vantage API 獲取真實價格並更新
 */

import { verifyAAPLPrice, updateSpecificStock } from './updateRealStockPrices';
import { usStockQueryService } from '../services/usStockQueryService';

export const quickFixAAPLPrice = async () => {
  console.log('🚀 快速修正 AAPL 價格...');
  
  try {
    // 1. 檢查當前資料庫中的價格
    console.log('1️⃣ 檢查當前資料庫中的 AAPL 價格...');
    const currentData = await usStockQueryService.getStockBySymbol('AAPL');
    
    if (currentData) {
      console.log(`📊 當前資料庫價格: $${currentData.price}`);
      console.log(`🕐 最後更新時間: ${currentData.updated_at}`);
    } else {
      console.log('❌ 資料庫中沒有 AAPL 資料');
    }
    
    // 2. 從 Alpha Vantage API 獲取真實價格
    console.log('2️⃣ 從 Alpha Vantage API 獲取真實價格...');
    const success = await updateSpecificStock('AAPL');
    
    if (success) {
      console.log('✅ AAPL 價格更新成功');
    } else {
      console.error('❌ AAPL 價格更新失敗');
      return false;
    }
    
    // 3. 驗證更新後的價格
    console.log('3️⃣ 驗證更新後的價格...');
    const updatedData = await usStockQueryService.getStockBySymbol('AAPL');
    
    if (updatedData) {
      console.log(`📊 更新後價格: $${updatedData.price}`);
      console.log(`🕐 更新時間: ${updatedData.updated_at}`);
      
      // 檢查是否接近預期的 $200.850
      const expectedPrice = 200.850;
      const difference = Math.abs(updatedData.price - expectedPrice);
      
      if (difference < 10) {
        console.log(`✅ 價格合理！與預期差異: $${difference.toFixed(3)}`);
      } else {
        console.log(`⚠️ 價格差異較大: $${difference.toFixed(3)}`);
        console.log(`預期: $${expectedPrice}, 實際: $${updatedData.price}`);
      }
    }
    
    // 4. 測試搜尋功能
    console.log('4️⃣ 測試搜尋功能...');
    const searchResults = await usStockQueryService.searchStocks('AAPL', true, 1);
    
    if (searchResults.length > 0) {
      const result = searchResults[0];
      console.log(`🔍 搜尋結果: ${result.symbol} - ${result.name}`);
      console.log(`💰 搜尋顯示價格: $${result.price}`);
      
      if (result.price === updatedData?.price) {
        console.log('✅ 搜尋價格與資料庫一致');
      } else {
        console.log('❌ 搜尋價格與資料庫不一致');
      }
    } else {
      console.log('❌ 搜尋沒有找到 AAPL');
    }
    
    console.log('🎉 AAPL 價格修正完成！');
    return true;
    
  } catch (error) {
    console.error('❌ AAPL 價格修正失敗:', error);
    return false;
  }
};

export const batchUpdateTopStocks = async () => {
  console.log('📦 批量更新熱門股票價格...');
  
  const topStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  
  for (const symbol of topStocks) {
    console.log(`\n🔄 更新 ${symbol}...`);
    
    try {
      const success = await updateSpecificStock(symbol);
      
      if (success) {
        // 驗證更新結果
        const data = await usStockQueryService.getStockBySymbol(symbol);
        if (data) {
          console.log(`✅ ${symbol}: $${data.price}`);
        }
      } else {
        console.log(`❌ ${symbol}: 更新失敗`);
      }
      
      // 避免 API 限制
      await new Promise(resolve => setTimeout(resolve, 12000));
      
    } catch (error) {
      console.error(`❌ 更新 ${symbol} 時發生錯誤:`, error);
    }
  }
  
  console.log('🎉 批量更新完成！');
};

export const testCurrentPrices = async () => {
  console.log('🧪 測試當前股價...');
  
  const testStocks = ['AAPL', 'MSFT', 'GOOGL'];
  
  for (const symbol of testStocks) {
    try {
      const data = await usStockQueryService.getStockBySymbol(symbol);
      
      if (data) {
        console.log(`📊 ${symbol}: $${data.price} (${data.updated_at})`);
      } else {
        console.log(`❌ ${symbol}: 沒有資料`);
      }
      
    } catch (error) {
      console.error(`❌ 查詢 ${symbol} 失敗:`, error);
    }
  }
};

// 開發模式下的快速執行
export const devQuickFix = async () => {
  if (!__DEV__) {
    console.warn('⚠️ 此函數僅在開發模式下可用');
    return;
  }
  
  console.log('🧪 開發模式快速修正...');
  
  // 測試當前價格
  await testCurrentPrices();
  
  // 修正 AAPL 價格
  await quickFixAAPLPrice();
  
  console.log('🎉 開發模式快速修正完成！');
};

export default {
  quickFixAAPLPrice,
  batchUpdateTopStocks,
  testCurrentPrices,
  devQuickFix,
};
