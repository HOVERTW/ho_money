import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taiwanStockService, StockSearchResult } from '../services/taiwanStockService';

interface StockSearchInputProps {
  onStockSelect: (stock: StockSearchResult) => void;
  placeholder?: string;
  initialValue?: string;
  style?: any;
}

export default function StockSearchInput({
  onStockSelect,
  placeholder = '輸入股票代號',
  initialValue = '',
  style,
}: StockSearchInputProps) {
  const [searchText, setSearchText] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);

  // 根據代號搜尋股票
  const searchStocks = async (code: string) => {
    if (!code.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // 只允許數字和字母的組合（股票代號格式）
    const stockCodePattern = /^[0-9]+[A-Z]*$/i;
    if (!stockCodePattern.test(code.trim())) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await taiwanStockService.searchStocks(code.trim());
      // 只顯示代號完全匹配或開頭匹配的結果
      const filteredResults = results.filter(stock =>
        stock.code.toLowerCase().startsWith(code.trim().toLowerCase())
      );
      setSearchResults(filteredResults.slice(0, 5));
      setShowResults(filteredResults.length > 0);
    } catch (error) {
      console.error('搜尋股票失敗:', error);
      Alert.alert('錯誤', '搜尋股票失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // 處理文字輸入
  const handleTextChange = (text: string) => {
    setSearchText(text);
    setSelectedStock(null);

    // 延遲搜尋，避免過於頻繁的 API 呼叫
    const timeoutId = setTimeout(() => {
      searchStocks(text);
    }, 200);

    return () => clearTimeout(timeoutId);
  };

  // 選擇股票
  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock);
    setSearchText(`${stock.code} ${stock.name}`);
    setShowResults(false);
    onStockSelect(stock);
  };

  // 清除選擇
  const handleClear = () => {
    setSearchText('');
    setSelectedStock(null);
    setSearchResults([]);
    setShowResults(false);
  };

  // 渲染搜尋結果項目
  const renderSearchResult = ({ item }: { item: StockSearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleStockSelect(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.stockCode}>{item.code}</Text>
          <Text style={styles.stockPrice}>NT${item.closing_price}</Text>
        </View>
        <Text style={styles.stockName}>{item.name}</Text>
        <Text style={styles.priceDate}>
          更新日期: {new Date(item.price_date).toLocaleDateString('zh-TW')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {/* 搜尋輸入框 */}
      <View style={styles.inputContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={searchText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIcon} />
        )}
        {searchText.length > 0 && !isLoading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* 已選擇的股票資訊 */}
      {selectedStock && (
        <View style={styles.selectedStockContainer}>
          <View style={styles.selectedStockHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.selectedStockLabel}>已選擇股票</Text>
          </View>
          <View style={styles.selectedStockInfo}>
            <Text style={styles.selectedStockCode}>{selectedStock.code}</Text>
            <Text style={styles.selectedStockName}>{selectedStock.name}</Text>
            <Text style={styles.selectedStockPrice}>
              現價: NT${selectedStock.closing_price}
            </Text>
          </View>
        </View>
      )}

      {/* 搜尋結果列表 - 使用ScrollView支持滾動 */}
      {showResults && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={styles.resultItem}
                onPress={() => handleStockSelect(item)}
              >
                <View style={styles.resultContent}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.stockCode}>{item.code}</Text>
                    <Text style={styles.stockPrice}>NT${item.closing_price}</Text>
                  </View>
                  <Text style={styles.stockName}>{item.name}</Text>
                  <Text style={styles.priceDate}>
                    更新日期: {new Date(item.price_date).toLocaleDateString('zh-TW')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 無搜尋結果 */}
      {showResults && searchResults.length === 0 && !isLoading && searchText.trim() && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={24} color="#999" />
          <Text style={styles.noResultsText}>找不到相關股票</Text>
          <Text style={styles.noResultsHint}>請檢查股票代號是否正確</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  selectedStockContainer: {
    marginTop: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B3E5FC',
  },
  selectedStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedStockLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  selectedStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  selectedStockCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 8,
  },
  selectedStockName: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  selectedStockPrice: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsList: {
    borderRadius: 12,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  stockPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  stockName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  priceDate: {
    fontSize: 12,
    color: '#666',
  },
  noResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  noResultsHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
