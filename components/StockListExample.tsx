/**
 * 台股清單範例組件
 * 展示如何使用 useStocks Hook
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useStocks, useStockSearch, useStockStats } from '../hooks/useStocks';

interface StockItemProps {
  code: string;
  name: string;
  market_type: 'TSE' | 'OTC' | 'ETF';
  closing_price: number;
  change_percent?: number;
  volume?: number;
}

const StockItem: React.FC<StockItemProps> = ({ 
  code, 
  name, 
  market_type, 
  closing_price, 
  change_percent,
  volume 
}) => {
  const getMarketColor = (type: string) => {
    switch (type) {
      case 'TSE': return '#2196F3'; // 藍色
      case 'OTC': return '#FF9800'; // 橘色
      case 'ETF': return '#4CAF50'; // 綠色
      default: return '#757575';
    }
  };

  const getPriceColor = (change?: number) => {
    if (!change) return '#000';
    return change > 0 ? '#F44336' : change < 0 ? '#4CAF50' : '#000';
  };

  return (
    <View style={styles.stockItem}>
      <View style={styles.stockHeader}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockCode}>{code}</Text>
          <View style={[styles.marketBadge, { backgroundColor: getMarketColor(market_type) }]}>
            <Text style={styles.marketText}>{market_type}</Text>
          </View>
        </View>
        <View style={styles.priceInfo}>
          <Text style={[styles.price, { color: getPriceColor(change_percent) }]}>
            NT$ {closing_price.toLocaleString()}
          </Text>
          {change_percent !== undefined && (
            <Text style={[styles.change, { color: getPriceColor(change_percent) }]}>
              {change_percent > 0 ? '+' : ''}{change_percent.toFixed(2)}%
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.stockName}>{name}</Text>
      {volume && volume > 0 && (
        <Text style={styles.volume}>成交量: {volume.toLocaleString()}</Text>
      )}
    </View>
  );
};

const StockListExample: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'TSE' | 'OTC' | 'ETF' | 'ALL'>('ALL');
  
  // 使用 Hook 獲取股票資料
  const { stocks, loading, error, refreshStocks } = useStocks({
    market_type: selectedMarket === 'ALL' ? undefined : selectedMarket,
    search: searchTerm,
    sort_by: 'volume',
    sort_order: 'desc',
    limit: 50
  });

  // 獲取統計資料
  const { stats, loading: statsLoading } = useStockStats();

  const handleMarketFilter = (market: 'TSE' | 'OTC' | 'ETF' | 'ALL') => {
    setSelectedMarket(market);
  };

  const handleRefresh = () => {
    refreshStocks();
  };

  if (error) {
    Alert.alert('錯誤', error);
  }

  return (
    <View style={styles.container}>
      {/* 統計資訊 */}
      {!statsLoading && stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 台股資料統計</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statItem}>總計: {stats.total} 檔</Text>
            <Text style={styles.statItem}>上市: {stats.tse_count} 檔</Text>
            <Text style={styles.statItem}>上櫃: {stats.otc_count} 檔</Text>
            <Text style={styles.statItem}>ETF: {stats.etf_count} 檔</Text>
          </View>
        </View>
      )}

      {/* 搜尋框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜尋股票代號或名稱..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* 市場篩選 */}
      <View style={styles.filterContainer}>
        {['ALL', 'TSE', 'OTC', 'ETF'].map((market) => (
          <TouchableOpacity
            key={market}
            style={[
              styles.filterButton,
              selectedMarket === market && styles.filterButtonActive
            ]}
            onPress={() => handleMarketFilter(market as any)}
          >
            <Text style={[
              styles.filterText,
              selectedMarket === market && styles.filterTextActive
            ]}>
              {market === 'ALL' ? '全部' : market}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 重新整理按鈕 */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshText}>🔄 重新整理</Text>
      </TouchableOpacity>

      {/* 股票清單 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      ) : (
        <FlatList
          data={stocks}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <StockItem
              code={item.code}
              name={item.name}
              market_type={item.market_type}
              closing_price={item.closing_price}
              change_percent={item.change_percent}
              volume={item.volume}
            />
          )}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statsContainer: {
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
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    fontSize: 12,
    color: '#666',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    padding: 8,
    marginHorizontal: 4,
    backgroundColor: 'white',
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  change: {
    fontSize: 12,
    marginTop: 2,
  },
  stockName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  volume: {
    fontSize: 12,
    color: '#999',
  },
});

export default StockListExample;
