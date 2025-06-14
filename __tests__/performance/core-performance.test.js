/**
 * 核心功能性能測試
 * 確保五個核心功能的性能表現
 */

import { performance } from 'perf_hooks';

// Mock 環境
process.env.NODE_ENV = 'test';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue('[]'),
  setItem: jest.fn().mockResolvedValue(),
  removeItem: jest.fn().mockResolvedValue(),
};

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' } }
    }),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('FinTranzo 核心功能性能測試', () => {
  
  // 性能測試輔助函數
  const measurePerformance = async (testName, testFunction) => {
    const startTime = performance.now();
    await testFunction();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ ${testName}: ${duration.toFixed(2)}ms`);
    
    // 性能標準：大部分操作應該在 100ms 內完成
    if (duration > 1000) {
      console.warn(`⚠️ ${testName} 性能較慢: ${duration.toFixed(2)}ms`);
    } else if (duration < 100) {
      console.log(`🚀 ${testName} 性能優秀: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  };

  describe('功能1: 新增交易性能測試', () => {
    test('單筆交易新增性能', async () => {
      const { transactionDataService } = await import('../../src/services/transactionDataService');
      
      await measurePerformance('交易服務初始化', async () => {
        await transactionDataService.initialize();
      });

      const mockTransaction = {
        id: 'perf-test-transaction',
        amount: 1000,
        type: 'expense',
        description: '性能測試交易',
        category: '測試',
      };

      await measurePerformance('單筆交易新增', async () => {
        await transactionDataService.addTransaction(mockTransaction);
      });
    });

    test('批量交易新增性能', async () => {
      const { transactionDataService } = await import('../../src/services/transactionDataService');
      
      // 生成100筆測試交易
      const transactions = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-test-${i}`,
        amount: Math.random() * 1000,
        type: Math.random() > 0.5 ? 'income' : 'expense',
        description: `性能測試交易 ${i}`,
        category: '測試',
      }));

      await measurePerformance('100筆交易批量新增', async () => {
        for (const transaction of transactions) {
          await transactionDataService.addTransaction(transaction);
        }
      });
    });
  });

  describe('功能2: 資產管理性能測試', () => {
    test('資產新增性能', async () => {
      const { assetTransactionSyncService } = await import('../../src/services/assetTransactionSyncService');
      
      await measurePerformance('資產服務初始化', async () => {
        await assetTransactionSyncService.initialize();
      });

      const mockAsset = {
        id: 'perf-test-asset',
        name: '性能測試資產',
        type: 'stock',
        current_value: 50000,
        cost_basis: 45000,
      };

      await measurePerformance('單個資產新增', async () => {
        await assetTransactionSyncService.addAsset(mockAsset);
      });
    });

    test('多個資產管理性能', async () => {
      const { assetTransactionSyncService } = await import('../../src/services/assetTransactionSyncService');
      
      // 生成50個測試資產
      const assets = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-asset-${i}`,
        name: `性能測試資產 ${i}`,
        type: 'stock',
        current_value: Math.random() * 100000,
        cost_basis: Math.random() * 80000,
      }));

      await measurePerformance('50個資產批量新增', async () => {
        for (const asset of assets) {
          await assetTransactionSyncService.addAsset(asset);
        }
      });
    });
  });

  describe('功能3: 刪除操作性能測試', () => {
    test('交易刪除性能', async () => {
      const { transactionDataService } = await import('../../src/services/transactionDataService');
      
      // 先新增一些交易
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `delete-test-${i}`,
        amount: 1000,
        type: 'expense',
        description: `刪除測試交易 ${i}`,
      }));

      for (const transaction of transactions) {
        await transactionDataService.addTransaction(transaction);
      }

      await measurePerformance('10筆交易批量刪除', async () => {
        for (const transaction of transactions) {
          await transactionDataService.deleteTransaction(transaction.id);
        }
      });
    });
  });

  describe('功能4: 類別管理性能測試', () => {
    test('類別操作性能', async () => {
      // 模擬類別相關操作
      await measurePerformance('類別數據處理', async () => {
        const categories = Array.from({ length: 20 }, (_, i) => ({
          id: `cat-${i}`,
          name: `類別 ${i}`,
          type: Math.random() > 0.5 ? 'income' : 'expense',
        }));

        // 模擬類別處理邏輯
        const processedCategories = categories.map(cat => ({
          ...cat,
          transactionCount: Math.floor(Math.random() * 100),
        }));

        return processedCategories;
      });
    });
  });

  describe('功能5: 雲端同步性能測試', () => {
    test('數據上傳性能', async () => {
      const { manualUploadService } = await import('../../src/services/manualUploadService');
      
      // Mock 大量數據
      const largeDataSet = {
        transactions: Array.from({ length: 200 }, (_, i) => ({
          id: `sync-transaction-${i}`,
          amount: Math.random() * 1000,
          description: `同步測試交易 ${i}`,
        })),
        assets: Array.from({ length: 50 }, (_, i) => ({
          id: `sync-asset-${i}`,
          name: `同步測試資產 ${i}`,
          current_value: Math.random() * 100000,
        })),
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(largeDataSet.transactions))
        .mockResolvedValueOnce(JSON.stringify(largeDataSet.assets))
        .mockResolvedValueOnce('[]') // categories
        .mockResolvedValueOnce('[]') // liabilities
        .mockResolvedValueOnce('[]'); // accounts

      await measurePerformance('大量數據雲端同步', async () => {
        await manualUploadService.uploadAllData();
      });
    });

    test('即時同步性能', async () => {
      const { instantSyncService } = await import('../../src/services/instantSyncService');
      
      const mockTransaction = {
        id: 'instant-sync-test',
        amount: 1000,
        type: 'expense',
        description: '即時同步測試',
      };

      await measurePerformance('即時交易同步', async () => {
        await instantSyncService.syncTransactionInstantly(mockTransaction);
      });
    });
  });

  describe('綜合性能測試', () => {
    test('完整用戶流程性能', async () => {
      console.log('🚀 開始綜合性能測試...');

      const totalStartTime = performance.now();

      // 1. 服務初始化
      await measurePerformance('所有服務初始化', async () => {
        const { transactionDataService } = await import('../../src/services/transactionDataService');
        const { assetTransactionSyncService } = await import('../../src/services/assetTransactionSyncService');
        
        await Promise.all([
          transactionDataService.initialize(),
          assetTransactionSyncService.initialize(),
        ]);
      });

      // 2. 數據操作
      await measurePerformance('混合數據操作', async () => {
        const { transactionDataService } = await import('../../src/services/transactionDataService');
        const { assetTransactionSyncService } = await import('../../src/services/assetTransactionSyncService');
        
        // 並行執行多種操作
        await Promise.all([
          transactionDataService.addTransaction({
            id: 'comprehensive-transaction',
            amount: 1000,
            type: 'expense',
            description: '綜合測試交易',
          }),
          assetTransactionSyncService.addAsset({
            id: 'comprehensive-asset',
            name: '綜合測試資產',
            type: 'stock',
            current_value: 50000,
          }),
        ]);
      });

      // 3. 同步操作
      await measurePerformance('綜合同步操作', async () => {
        const { manualUploadService } = await import('../../src/services/manualUploadService');
        await manualUploadService.uploadAllData();
      });

      const totalEndTime = performance.now();
      const totalDuration = totalEndTime - totalStartTime;

      console.log(`🏁 綜合性能測試總耗時: ${totalDuration.toFixed(2)}ms`);

      // 總體性能標準：完整流程應該在 5 秒內完成
      if (totalDuration < 2000) {
        console.log('🚀 綜合性能優秀！');
      } else if (totalDuration < 5000) {
        console.log('✅ 綜合性能良好');
      } else {
        console.warn('⚠️ 綜合性能需要優化');
      }
    });

    test('記憶體使用測試', async () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const initialMemory = process.memoryUsage();
        console.log('📊 初始記憶體使用:', {
          rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        });

        // 執行一些操作
        const { transactionDataService } = await import('../../src/services/transactionDataService');
        await transactionDataService.initialize();

        // 新增大量數據
        for (let i = 0; i < 100; i++) {
          await transactionDataService.addTransaction({
            id: `memory-test-${i}`,
            amount: Math.random() * 1000,
            type: 'expense',
            description: `記憶體測試交易 ${i}`,
          });
        }

        const finalMemory = process.memoryUsage();
        console.log('📊 最終記憶體使用:', {
          rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        });

        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        console.log(`📈 記憶體增長: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

        // 記憶體增長應該合理（小於 50MB）
        if (memoryIncrease < 50 * 1024 * 1024) {
          console.log('✅ 記憶體使用正常');
        } else {
          console.warn('⚠️ 記憶體使用較高，可能有記憶體洩漏');
        }
      } else {
        console.log('⚠️ 無法測試記憶體使用（非 Node.js 環境）');
      }
    });
  });
});
