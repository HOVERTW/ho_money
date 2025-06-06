/**
 * 股票連接測試組件
 * 用於測試 Supabase 連接和股票資料獲取
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { stockService } from '../src/services/supabase';
import { useStocks, useStockStats } from '../hooks/useStocks';

const StockConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'failed'>('testing');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // 使用 Hook 測試
  const { stocks, loading: stocksLoading, error: stocksError } = useStocks({ limit: 5 });
  const { stats, loading: statsLoading } = useStockStats();

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runConnectionTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    addTestResult('🚀 開始連接測試...');

    try {
      // 測試 1: 基本連接
      addTestResult('📡 測試 Supabase 基本連接...');
      const connectionTest = await stockService.testConnection();
      
      if (connectionTest) {
        addTestResult('✅ Supabase 連接成功');
        setConnectionStatus('success');
      } else {
        addTestResult('❌ Supabase 連接失敗');
        setConnectionStatus('failed');
        return;
      }

      // 測試 2: 資料表查詢
      addTestResult('📊 測試資料表查詢...');
      const tableData = await stockService.searchStocks('', undefined, 3);

      if (tableData && tableData.length > 0) {
        addTestResult(`✅ 資料表查詢成功，獲取 ${tableData.length} 筆資料`);
        tableData.forEach((stock, index) => {
          addTestResult(`   ${index + 1}. ${stock.code} ${stock.name} (${stock.market_type}) NT$${stock.closing_price}`);
        });
      } else {
        addTestResult('❌ 資料表查詢失敗');
      }

      // 測試 3: 搜尋功能
      addTestResult('🔍 測試搜尋功能...');
      const searchResults = await stockService.searchStocks('台積', undefined, 3);
      
      if (searchResults.length > 0) {
        addTestResult(`✅ 搜尋功能正常，找到 ${searchResults.length} 筆結果`);
        searchResults.forEach((stock, index) => {
          addTestResult(`   ${index + 1}. ${stock.code} ${stock.name} NT$${stock.closing_price}`);
        });
      } else {
        addTestResult('⚠️ 搜尋功能無結果');
      }

      // 測試 4: 統計視圖
      addTestResult('📈 測試統計視圖...');
      const statsData = await stockService.getMarketStats();
      
      if (statsData && statsData.length > 0) {
        addTestResult(`✅ 統計視圖正常，獲取 ${statsData.length} 個市場統計`);
        statsData.forEach(stat => {
          addTestResult(`   ${stat.market_type}: ${stat.stock_count} 檔股票，平均價格 NT$${stat.avg_price}`);
        });
      } else {
        addTestResult('⚠️ 統計視圖無資料');
      }

      // 測試 5: 額外搜尋測試
      addTestResult('⚙️ 測試額外搜尋功能...');
      const extraSearchResults = await stockService.searchStocks('元大', undefined, 3);

      if (extraSearchResults && extraSearchResults.length > 0) {
        addTestResult(`✅ 額外搜尋正常，獲取 ${extraSearchResults.length} 筆結果`);
      } else {
        addTestResult('⚠️ 額外搜尋無結果');
      }

      addTestResult('🎉 所有測試完成！');

    } catch (error) {
      addTestResult(`❌ 測試過程發生錯誤: ${error}`);
      setConnectionStatus('failed');
    } finally {
      setIsRunningTests(false);
    }
  };

  useEffect(() => {
    runConnectionTests();
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'success': return '✅ 連接成功';
      case 'failed': return '❌ 連接失敗';
      default: return '🔄 測試中...';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔗 Supabase 股票資料連接測試</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      {/* Hook 測試結果 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 React Hook 測試</Text>
        
        <View style={styles.hookTest}>
          <Text style={styles.hookTitle}>useStocks Hook:</Text>
          {stocksLoading ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : stocksError ? (
            <Text style={styles.errorText}>❌ 錯誤: {stocksError}</Text>
          ) : (
            <Text style={styles.successText}>✅ 成功獲取 {stocks.length} 檔股票</Text>
          )}
        </View>

        <View style={styles.hookTest}>
          <Text style={styles.hookTitle}>useStockStats Hook:</Text>
          {statsLoading ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : stats ? (
            <Text style={styles.successText}>
              ✅ 統計: 總計 {stats.total} 檔 (TSE: {stats.tse_count}, OTC: {stats.otc_count}, ETF: {stats.etf_count})
            </Text>
          ) : (
            <Text style={styles.errorText}>❌ 無統計資料</Text>
          )}
        </View>
      </View>

      {/* 股票資料預覽 */}
      {stocks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 股票資料預覽 (前5檔)</Text>
          {stocks.slice(0, 5).map((stock, index) => (
            <View key={stock.code} style={styles.stockItem}>
              <Text style={styles.stockCode}>{stock.code}</Text>
              <Text style={styles.stockName}>{stock.name}</Text>
              <Text style={styles.stockPrice}>NT$ {stock.closing_price}</Text>
              <Text style={styles.stockMarket}>{stock.market_type}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 測試日誌 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 測試日誌</Text>
        <TouchableOpacity 
          style={styles.retestButton} 
          onPress={runConnectionTests}
          disabled={isRunningTests}
        >
          <Text style={styles.retestButtonText}>
            {isRunningTests ? '🔄 測試中...' : '🔄 重新測試'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.logContainer}>
          {testResults.map((result, index) => (
            <Text key={`test-result-${index}-${result.slice(0, 10)}`} style={styles.logText}>{result}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hookTest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hookTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 120,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stockCode: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 60,
  },
  stockName: {
    fontSize: 14,
    flex: 1,
    marginHorizontal: 8,
  },
  stockPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    minWidth: 80,
    textAlign: 'right',
  },
  stockMarket: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
    textAlign: 'center',
  },
  retestButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  retestButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
});

export default StockConnectionTest;
