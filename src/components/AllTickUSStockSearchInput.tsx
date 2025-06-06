/**
 * AllTick 美股搜尋輸入組件
 * 使用 AllTick API 提供美股搜尋和自動完成功能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { allTickUSStockService, AllTickStockData } from '../services/allTickUSStockService';

interface AllTickUSStockSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onStockSelect: (stock: AllTickStockData) => void;
  placeholder?: string;
  style?: any;
}

const AllTickUSStockSearchInput: React.FC<AllTickUSStockSearchInputProps> = ({
  value,
  onChangeText,
  onStockSelect,
  placeholder = "輸入美股代號或公司名稱",
  style,
}) => {
  const [searchResults, setSearchResults] = useState<AllTickStockData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);

  // 搜尋美股
  const searchStocks = async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await allTickUSStockService.searchStocks(query);
      setSearchResults(results);
      setShowResults(results.length > 0);
      
      // 更新使用統計
      setUsageStats(allTickUSStockService.getUsageStats());
    } catch (error) {
      console.error('AllTick 搜尋美股失敗:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜尋
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        searchStocks(value.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 800); // 增加延遲以減少 API 使用

    return () => clearTimeout(timeoutId);
  }, [value]);

  // 處理股票選擇
  const handleStockSelect = (stock: AllTickStockData) => {
    onStockSelect(stock);
    setShowResults(false);
  };

  // 渲染搜尋結果項目
  const renderSearchResult = ({ item }: { item: AllTickStockData }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleStockSelect(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultSymbol}>{item.symbol}</Text>
          <Text style={styles.resultPrice}>
            {allTickUSStockService.formatPrice(item.price)}
          </Text>
        </View>
        <Text style={styles.resultName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.resultFooter}>
          <Text style={[
            styles.resultChange,
            item.change >= 0 ? styles.positiveChange : styles.negativeChange
          ]}>
            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} 
            ({allTickUSStockService.formatChangePercent(item.changePercent)})
          </Text>
          <Text style={styles.resultVolume}>
            Vol: {item.volume.toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="characters"
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {/* API 使用統計 (開發模式) */}
      {__DEV__ && usageStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            AllTick API: {usageStats.requestCount}/{usageStats.maxRequests} 
            (重置: {usageStats.resetTime})
          </Text>
        </View>
      )}

      {showResults && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.symbol}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
  },
  statsContainer: {
    marginTop: 4,
    paddingHorizontal: 8,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 320,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsList: {
    maxHeight: 320,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultContent: {
    flexDirection: 'column',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  resultName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  resultVolume: {
    fontSize: 12,
    color: '#999',
  },
});

export default AllTickUSStockSearchInput;
