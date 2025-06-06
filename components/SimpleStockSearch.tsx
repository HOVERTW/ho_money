/**
 * 簡化的股票搜尋組件
 * 直接使用 Supabase 客戶端，避免複雜的 Hook 依賴
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { stockService } from '../src/services/supabase';

interface Stock {
  code: string;
  name: string;
  market_type: 'TSE' | 'OTC' | 'ETF';
  closing_price: number;
  price_date: string;
}

const SimpleStockSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // 測試連接
  const testConnection = async () => {
    try {
      setLoading(true);
      console.log('🔍 測試 Supabase 連接...');

      const success = await stockService.testConnection();

      if (success) {
        console.log('✅ 連接成功');
        setConnectionStatus('connected');
        Alert.alert('連接成功', '已成功連接到股票資料庫');
      } else {
        console.error('❌ 連接失敗');
        setConnectionStatus('failed');
        Alert.alert('連接失敗', '無法連接到股票資料庫');
      }
    } catch (error) {
      console.error('❌ 連接測試失敗:', error);
      setConnectionStatus('failed');
      Alert.alert('連接失敗', '無法連接到資料庫');
    } finally {
      setLoading(false);
    }
  };

  // 搜尋股票
  const searchStocks = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('提示', '請輸入搜尋關鍵字');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 搜尋股票: ${searchTerm}`);

      const results = await stockService.searchStocks(searchTerm, undefined, 10);

      console.log(`✅ 找到 ${results.length} 筆結果`);
      setStocks(results);

      if (results.length === 0) {
        Alert.alert('搜尋結果', '沒有找到相關股票');
      }
    } catch (error) {
      console.error('❌ 搜尋錯誤:', error);
      Alert.alert('搜尋錯誤', '搜尋過程發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 獲取熱門股票
  const getPopularStocks = async () => {
    try {
      setLoading(true);
      console.log('📊 獲取熱門股票...');

      const results = await stockService.getPopularStocks(10);

      console.log(`✅ 獲取 ${results.length} 檔熱門股票`);
      setStocks(results);
    } catch (error) {
      console.error('❌ 獲取熱門股票錯誤:', error);
      Alert.alert('獲取錯誤', '獲取熱門股票時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const getMarketColor = (type: string) => {
    switch (type) {
      case 'TSE': return '#2196F3'; // 藍色
      case 'OTC': return '#FF9800'; // 橘色
      case 'ETF': return '#4CAF50'; // 綠色
      default: return '#757575';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ 已連接';
      case 'failed': return '❌ 連接失敗';
      default: return '🔄 未測試';
    }
  };

  const renderStockItem = ({ item }: { item: Stock }) => (
    <View style={styles.stockItem}>
      <View style={styles.stockHeader}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockCode}>{item.code}</Text>
          <View style={[styles.marketBadge, { backgroundColor: getMarketColor(item.market_type) }]}>
            <Text style={styles.marketText}>{item.market_type}</Text>
          </View>
        </View>
        <Text style={styles.price}>NT$ {item.closing_price?.toLocaleString() || 'N/A'}</Text>
      </View>
      <Text style={styles.stockName}>{item.name}</Text>
      <Text style={styles.priceDate}>資料日期: {item.price_date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📱 簡化股票搜尋測試</Text>
        <View style={[styles.statusBadge, { backgroundColor: getConnectionStatusColor() }]}>
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
        </View>
      </View>

      {/* 連接測試 */}
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testConnection}
        disabled={loading}
      >
        <Text style={styles.testButtonText}>
          {loading ? '🔄 測試中...' : '🔗 測試連接'}
        </Text>
      </TouchableOpacity>

      {/* 搜尋區域 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="輸入股票代號或名稱 (例如: 2330, 台積電)"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={searchStocks}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchStocks}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* 快速操作 */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickButton} 
          onPress={getPopularStocks}
          disabled={loading}
        >
          <Text style={styles.quickButtonText}>📊 熱門股票</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickButton} 
          onPress={() => {
            setSearchTerm('台積');
            searchStocks();
          }}
          disabled={loading}
        >
          <Text style={styles.quickButtonText}>🔍 搜尋台積</Text>
        </TouchableOpacity>
      </View>

      {/* 載入指示器 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      )}

      {/* 結果清單 */}
      <FlatList
        data={stocks}
        keyExtractor={(item) => item.code}
        renderItem={renderStockItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {connectionStatus === 'connected' 
                  ? '🔍 請搜尋股票或查看熱門股票' 
                  : '🔗 請先測試連接'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
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
    fontSize: 12,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  searchButtonText: {
    fontSize: 18,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  stockItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockCode: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  marketBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marketText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  stockName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default SimpleStockSearch;
