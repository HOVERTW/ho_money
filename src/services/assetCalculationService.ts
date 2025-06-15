/**
 * 資產計算服務
 * 正確計算資產金額變化，包含交易影響
 */

import { transactionDataService } from './transactionDataService';
import { assetTransactionSyncService } from './assetTransactionSyncService';

export interface AssetCalculation {
  id: string;
  name: string;
  type: string;
  originalValue: number;
  currentValue: number;
  transactionImpact: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  lastUpdated: Date;
}

export interface TransactionImpact {
  assetId: string;
  totalIncome: number;
  totalExpense: number;
  netImpact: number;
  transactionCount: number;
}

class AssetCalculationService {
  
  /**
   * 計算所有資產的完整信息
   */
  async calculateAllAssets(): Promise<AssetCalculation[]> {
    try {
      console.log('📊 開始計算所有資產...');

      // 獲取所有資產
      const assets = await assetTransactionSyncService.getAllAssets();
      
      // 獲取所有交易
      const transactions = await transactionDataService.getAllTransactions();

      // 計算每個資產的交易影響
      const assetCalculations: AssetCalculation[] = [];

      for (const asset of assets) {
        const calculation = await this.calculateSingleAsset(asset, transactions);
        assetCalculations.push(calculation);
      }

      console.log(`✅ 完成 ${assetCalculations.length} 個資產計算`);
      return assetCalculations;
    } catch (error) {
      console.error('❌ 資產計算失敗:', error);
      throw error;
    }
  }

  /**
   * 計算單個資產的完整信息
   */
  async calculateSingleAsset(asset: any, transactions?: any[]): Promise<AssetCalculation> {
    try {
      // 如果沒有提供交易數據，則獲取
      if (!transactions) {
        transactions = await transactionDataService.getAllTransactions();
      }

      // 計算交易影響
      const transactionImpact = this.calculateTransactionImpact(asset.id, transactions);

      // 基礎資產值
      const originalValue = asset.cost_basis || asset.current_value || 0;
      const currentMarketValue = asset.current_value || originalValue;

      // 計算總價值（市場價值 + 交易影響）
      const totalValue = currentMarketValue + transactionImpact.netImpact;

      // 計算損益
      const gainLoss = totalValue - originalValue;
      const gainLossPercentage = originalValue > 0 ? (gainLoss / originalValue) * 100 : 0;

      const calculation: AssetCalculation = {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        originalValue,
        currentValue: currentMarketValue,
        transactionImpact: transactionImpact.netImpact,
        totalValue,
        gainLoss,
        gainLossPercentage,
        lastUpdated: new Date(),
      };

      console.log(`📊 資產計算完成: ${asset.name}`, {
        原始價值: originalValue,
        市場價值: currentMarketValue,
        交易影響: transactionImpact.netImpact,
        總價值: totalValue,
        損益: gainLoss,
      });

      return calculation;
    } catch (error) {
      console.error(`❌ 計算資產 ${asset.name} 失敗:`, error);
      throw error;
    }
  }

  /**
   * 計算交易對資產的影響
   */
  private calculateTransactionImpact(assetId: string, transactions: any[]): TransactionImpact {
    let totalIncome = 0;
    let totalExpense = 0;
    let transactionCount = 0;

    // 篩選與該資產相關的交易
    const assetTransactions = transactions.filter(transaction => {
      // 檢查交易是否與資產相關
      return (
        transaction.account === assetId ||
        transaction.asset_id === assetId ||
        transaction.related_asset === assetId ||
        (transaction.category && transaction.category.includes('投資')) ||
        (transaction.description && transaction.description.includes(assetId))
      );
    });

    for (const transaction of assetTransactions) {
      const amount = parseFloat(transaction.amount) || 0;
      
      if (transaction.type === 'income') {
        totalIncome += amount;
      } else if (transaction.type === 'expense') {
        totalExpense += amount;
      }
      
      transactionCount++;
    }

    const netImpact = totalIncome - totalExpense;

    console.log(`📊 資產 ${assetId} 交易影響:`, {
      收入: totalIncome,
      支出: totalExpense,
      淨影響: netImpact,
      交易數量: transactionCount,
    });

    return {
      assetId,
      totalIncome,
      totalExpense,
      netImpact,
      transactionCount,
    };
  }

  /**
   * 獲取資產組合總覽
   */
  async getPortfolioSummary(): Promise<{
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    assetCount: number;
    lastUpdated: Date;
  }> {
    try {
      const calculations = await this.calculateAllAssets();

      const totalValue = calculations.reduce((sum, calc) => sum + calc.totalValue, 0);
      const totalOriginalValue = calculations.reduce((sum, calc) => sum + calc.originalValue, 0);
      const totalGainLoss = totalValue - totalOriginalValue;
      const totalGainLossPercentage = totalOriginalValue > 0 ? (totalGainLoss / totalOriginalValue) * 100 : 0;

      return {
        totalValue,
        totalGainLoss,
        totalGainLossPercentage,
        assetCount: calculations.length,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('❌ 獲取資產組合總覽失敗:', error);
      throw error;
    }
  }

  /**
   * 更新資產市場價值
   */
  async updateAssetMarketValue(assetId: string, newValue: number): Promise<void> {
    try {
      console.log(`📊 更新資產 ${assetId} 市場價值: ${newValue}`);

      // 更新資產數據
      await assetTransactionSyncService.updateAsset(assetId, {
        current_value: newValue,
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ 資產 ${assetId} 市場價值更新成功`);
    } catch (error) {
      console.error(`❌ 更新資產 ${assetId} 市場價值失敗:`, error);
      throw error;
    }
  }

  /**
   * 記錄資產相關交易
   */
  async recordAssetTransaction(assetId: string, transaction: {
    type: 'buy' | 'sell' | 'dividend' | 'fee';
    amount: number;
    quantity?: number;
    price?: number;
    description: string;
  }): Promise<void> {
    try {
      console.log(`📊 記錄資產 ${assetId} 交易:`, transaction);

      // 創建交易記錄
      const transactionRecord = {
        id: `asset_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: transaction.type === 'buy' || transaction.type === 'dividend' ? 'income' : 'expense',
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        category: '投資',
        account: assetId,
        asset_id: assetId,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 添加交易記錄
      await transactionDataService.addTransaction(transactionRecord);

      // 如果是買入或賣出，更新資產數量
      if (transaction.type === 'buy' || transaction.type === 'sell') {
        const asset = await assetTransactionSyncService.getAssetById(assetId);
        if (asset) {
          const currentQuantity = asset.quantity || 0;
          const quantityChange = transaction.quantity || 0;
          const newQuantity = transaction.type === 'buy' 
            ? currentQuantity + quantityChange 
            : currentQuantity - quantityChange;

          await assetTransactionSyncService.updateAsset(assetId, {
            quantity: Math.max(0, newQuantity),
            updated_at: new Date().toISOString(),
          });
        }
      }

      console.log(`✅ 資產 ${assetId} 交易記錄成功`);
    } catch (error) {
      console.error(`❌ 記錄資產 ${assetId} 交易失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取資產歷史表現
   */
  async getAssetPerformanceHistory(assetId: string, days: number = 30): Promise<{
    date: string;
    value: number;
    gainLoss: number;
  }[]> {
    try {
      // 這裡可以實現歷史數據追蹤
      // 目前返回模擬數據
      const history = [];
      const asset = await assetTransactionSyncService.getAssetById(assetId);
      
      if (asset) {
        const currentCalculation = await this.calculateSingleAsset(asset);
        
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // 模擬歷史數據（實際應用中應該從數據庫獲取）
          const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% 變化
          const value = currentCalculation.totalValue * (1 + randomVariation);
          const gainLoss = value - currentCalculation.originalValue;
          
          history.push({
            date: date.toISOString().split('T')[0],
            value,
            gainLoss,
          });
        }
      }

      return history;
    } catch (error) {
      console.error(`❌ 獲取資產 ${assetId} 歷史表現失敗:`, error);
      return [];
    }
  }
}

// 創建單例實例
export const assetCalculationService = new AssetCalculationService();
