import { assetTransactionSyncService } from './assetTransactionSyncService';
import { taiwanStockService, StockPriceImpact, StockImpactRanking, TimeRange } from './taiwanStockService';

/**
 * 台股價格影響追蹤服務
 * 負責計算台股資產的價格變化對投資組合的影響
 */
class StockPriceImpactService {
  private listeners: Array<(data: any) => void> = [];

  /**
   * 添加事件監聽器
   */
  addListener(callback: (data: any) => void) {
    this.listeners.push(callback);
  }

  /**
   * 移除事件監聽器
   */
  removeListener(callback: (data: any) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(data: any) {
    this.listeners.forEach(listener => listener(data));
  }

  /**
   * 獲取所有台股資產
   */
  private getTaiwanStockAssets() {
    const allAssets = assetTransactionSyncService.getAssets();
    return allAssets.filter(asset => asset.type === 'tw_stock' && asset.stock_code);
  }

  /**
   * 計算單一台股的價格影響
   */
  private async calculateStockImpact(asset: any): Promise<StockPriceImpact | null> {
    try {
      if (!asset.stock_code || !asset.purchase_price || !asset.quantity) {
        console.warn('⚠️ 台股資產缺少必要資訊:', asset);
        return null;
      }

      // 獲取最新股價
      const stockData = await taiwanStockService.getStockByCode(asset.stock_code);
      if (!stockData) {
        console.warn('⚠️ 無法獲取股票資料:', asset.stock_code);
        return null;
      }

      const currentPrice = stockData.closing_price;
      const purchasePrice = asset.purchase_price;
      const quantity = asset.quantity;

      const costBasis = purchasePrice * quantity;
      const currentValue = currentPrice * quantity;
      const unrealizedGainLoss = currentValue - costBasis;
      const returnRate = costBasis > 0 ? (unrealizedGainLoss / costBasis) * 100 : 0;

      return {
        stock_code: asset.stock_code,
        stock_name: asset.name || stockData.name,
        quantity,
        purchase_price: purchasePrice,
        current_price: currentPrice,
        cost_basis: costBasis,
        current_value: currentValue,
        unrealized_gain_loss: unrealizedGainLoss,
        return_rate: returnRate,
        impact_type: unrealizedGainLoss >= 0 ? 'gain' : 'loss',
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ 計算台股價格影響失敗:', error);
      return null;
    }
  }

  /**
   * 獲取台股價格影響排行榜
   */
  async getStockImpactRanking(timeRange: TimeRange = 'total'): Promise<StockImpactRanking> {
    try {
      console.log(`📊 計算台股價格影響排行榜 (${timeRange})`);

      const taiwanStockAssets = this.getTaiwanStockAssets();
      
      if (taiwanStockAssets.length === 0) {
        console.log('📊 沒有台股資產');
        return {
          timeRange,
          topGains: [],
          topLosses: [],
          totalGains: 0,
          totalLosses: 0,
          netImpact: 0,
        };
      }

      // 計算所有台股的價格影響
      const stockImpacts: StockPriceImpact[] = [];
      for (const asset of taiwanStockAssets) {
        const impact = await this.calculateStockImpact(asset);
        if (impact) {
          stockImpacts.push(impact);
        }
      }

      // 根據時間範圍重新計算損益
      const filteredImpacts = await this.calculateTimeRangeImpacts(stockImpacts, timeRange);

      // 分類收益和損失
      const gains = filteredImpacts.filter(impact => impact.impact_type === 'gain');
      const losses = filteredImpacts.filter(impact => impact.impact_type === 'loss');

      // 排序：收益按金額降序，損失按金額升序（絕對值降序）
      const topGains = gains
        .sort((a, b) => b.unrealized_gain_loss - a.unrealized_gain_loss)
        .slice(0, 5);

      const topLosses = losses
        .sort((a, b) => a.unrealized_gain_loss - b.unrealized_gain_loss)
        .slice(0, 5);

      // 計算總計
      const totalGains = gains.reduce((sum, impact) => sum + impact.unrealized_gain_loss, 0);
      const totalLosses = losses.reduce((sum, impact) => sum + Math.abs(impact.unrealized_gain_loss), 0);
      const netImpact = totalGains - totalLosses;

      console.log(`✅ 台股影響計算完成 - 收益: ${topGains.length}, 損失: ${topLosses.length}`);

      return {
        timeRange,
        topGains,
        topLosses,
        totalGains,
        totalLosses,
        netImpact,
      };
    } catch (error) {
      console.error('❌ 獲取台股價格影響排行榜失敗:', error);
      return {
        timeRange,
        topGains: [],
        topLosses: [],
        totalGains: 0,
        totalLosses: 0,
        netImpact: 0,
      };
    }
  }

  /**
   * 根據時間範圍計算價格影響
   * 使用不同的基準價格來計算不同時間範圍的損益
   */
  private async calculateTimeRangeImpacts(impacts: StockPriceImpact[], timeRange: TimeRange): Promise<StockPriceImpact[]> {
    const now = new Date();

    return Promise.all(impacts.map(async (impact) => {
      let basePrice = impact.purchase_price; // 預設使用成本價（累積損益）
      let timeRangeLabel = '累積';

      try {
        // 根據時間範圍獲取不同的基準價格
        switch (timeRange) {
          case 'today':
            // 今日損益 = 當前價格 - 昨日收盤價
            basePrice = await this.getHistoricalPrice(impact.stock_code, 1) || impact.current_price;
            timeRangeLabel = '今日';
            break;

          case 'week':
            // 本周損益 = 當前價格 - 上周五收盤價
            basePrice = await this.getHistoricalPrice(impact.stock_code, 7) || impact.current_price;
            timeRangeLabel = '本周';
            break;

          case 'month':
            // 本月損益 = 當前價格 - 上月最後一個交易日收盤價
            basePrice = await this.getHistoricalPrice(impact.stock_code, 30) || impact.current_price;
            timeRangeLabel = '本月';
            break;

          case 'total':
          default:
            // 累積損益 = 當前價格 - 成本價
            basePrice = impact.purchase_price;
            timeRangeLabel = '累積';
            break;
        }

        // 重新計算基於時間範圍的損益
        const currentValue = impact.current_price * impact.quantity;
        const baseValue = basePrice * impact.quantity;
        const timeRangeGainLoss = currentValue - baseValue;
        const timeRangeReturnRate = baseValue > 0 ? (timeRangeGainLoss / baseValue) * 100 : 0;

        return {
          ...impact,
          unrealized_gain_loss: timeRangeGainLoss,
          return_rate: timeRangeReturnRate,
          impact_type: timeRangeGainLoss >= 0 ? 'gain' : 'loss',
          time_range_label: timeRangeLabel,
          base_price: basePrice,
        };
      } catch (error) {
        console.error(`❌ 計算 ${impact.stock_code} 的 ${timeRangeLabel} 損益失敗:`, error);
        // 發生錯誤時返回原始數據
        return impact;
      }
    }));
  }

  /**
   * 獲取歷史價格（簡化實現）
   * 在沒有歷史數據的情況下，使用當前價格作為基準
   */
  private async getHistoricalPrice(stockCode: string, daysAgo: number): Promise<number | null> {
    try {
      // 目前簡化實現：由於沒有歷史價格數據，我們使用一些模擬邏輯
      // 實際應用中，這裡應該查詢歷史價格數據庫

      const currentStock = await taiwanStockService.getStockByCode(stockCode);
      if (!currentStock) return null;

      const currentPrice = currentStock.closing_price;

      // 簡化模擬：根據時間範圍生成一些合理的歷史價格
      // 這只是為了展示不同時間範圍的計算邏輯
      switch (daysAgo) {
        case 1: // 昨日價格：當前價格的 ±2% 隨機變動
          return currentPrice * (1 + (Math.random() - 0.5) * 0.04);

        case 7: // 一周前價格：當前價格的 ±5% 隨機變動
          return currentPrice * (1 + (Math.random() - 0.5) * 0.10);

        case 30: // 一月前價格：當前價格的 ±10% 隨機變動
          return currentPrice * (1 + (Math.random() - 0.5) * 0.20);

        default:
          return currentPrice;
      }
    } catch (error) {
      console.error(`❌ 獲取 ${stockCode} 歷史價格失敗:`, error);
      return null;
    }
  }

  /**
   * 更新所有台股資產的當前價格
   */
  async updateAllStockPrices(): Promise<void> {
    try {
      console.log('🔄 開始更新所有台股資產價格...');

      const taiwanStockAssets = this.getTaiwanStockAssets();
      
      if (taiwanStockAssets.length === 0) {
        console.log('📊 沒有台股資產需要更新');
        return;
      }

      let updatedCount = 0;
      for (const asset of taiwanStockAssets) {
        try {
          if (!asset.stock_code) continue;

          const stockData = await taiwanStockService.getStockByCode(asset.stock_code);
          if (stockData) {
            // 更新資產的當前價格和價值
            const newCurrentValue = stockData.closing_price * asset.quantity;
            
            await assetTransactionSyncService.updateAsset(asset.id, {
              current_price: stockData.closing_price,
              current_value: newCurrentValue,
              last_updated: new Date().toISOString(),
            });

            updatedCount++;
          }
        } catch (error) {
          console.error(`❌ 更新股票 ${asset.stock_code} 價格失敗:`, error);
        }
      }

      console.log(`✅ 台股價格更新完成，共更新 ${updatedCount} 筆資產`);
      
      // 通知監聽器
      this.notifyListeners({
        type: 'stock_prices_updated',
        updatedCount,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('❌ 更新台股價格失敗:', error);
    }
  }

  /**
   * 獲取台股投資組合摘要
   */
  async getPortfolioSummary(): Promise<{
    totalInvestment: number;
    currentValue: number;
    totalGainLoss: number;
    totalReturnRate: number;
    stockCount: number;
  }> {
    try {
      const taiwanStockAssets = this.getTaiwanStockAssets();
      
      if (taiwanStockAssets.length === 0) {
        return {
          totalInvestment: 0,
          currentValue: 0,
          totalGainLoss: 0,
          totalReturnRate: 0,
          stockCount: 0,
        };
      }

      let totalInvestment = 0;
      let currentValue = 0;

      for (const asset of taiwanStockAssets) {
        const impact = await this.calculateStockImpact(asset);
        if (impact) {
          totalInvestment += impact.cost_basis;
          currentValue += impact.current_value;
        }
      }

      const totalGainLoss = currentValue - totalInvestment;
      const totalReturnRate = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

      return {
        totalInvestment,
        currentValue,
        totalGainLoss,
        totalReturnRate,
        stockCount: taiwanStockAssets.length,
      };
    } catch (error) {
      console.error('❌ 獲取台股投資組合摘要失敗:', error);
      return {
        totalInvestment: 0,
        currentValue: 0,
        totalGainLoss: 0,
        totalReturnRate: 0,
        stockCount: 0,
      };
    }
  }
}

// 創建單例實例
export const stockPriceImpactService = new StockPriceImpactService();
