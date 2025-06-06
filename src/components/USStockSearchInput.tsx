/**
 * 美股搜尋輸入組件
 * 從 Supabase 資料庫搜尋美股，支援 S&P 500 股票
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { usStockQueryService, USStockSearchResult } from '../services/usStockQueryService';

interface USStockSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onStockSelect: (stock: USStockSearchResult) => void;
  placeholder?: string;
  style?: any;
  includeETF?: boolean; // 是否包含ETF搜索
  sp500Only?: boolean; // 是否僅搜索S&P 500
}

const USStockSearchInput: React.FC<USStockSearchInputProps> = ({
  value,
  onChangeText,
  onStockSelect,
  placeholder = "輸入美股代號或公司名稱",
  style,
  includeETF = true,
  sp500Only = false,
}) => {
  const [searchResults, setSearchResults] = useState<USStockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const justSelectedRef = useRef(false);

  // 搜尋美股
  const searchStocks = async (query: string) => {
    // 如果剛剛選擇了項目，跳過這次搜尋
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (query.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await usStockQueryService.searchStocks(query, sp500Only, 5, includeETF);
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch (error) {
      console.error('搜尋美股失敗:', error);
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
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // 處理股票選擇
  const handleStockSelect = (stock: USStockSearchResult) => {
    console.log('🎯 選擇股票:', stock.symbol, stock.name);

    // 設定標記，防止下次搜尋被觸發
    justSelectedRef.current = true;

    // 調用父組件的選擇處理函數
    onStockSelect(stock);

    // 隱藏搜尋結果
    setShowResults(false);
  };



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

      {showResults && (
        <View style={styles.resultsContainer}>
          <ScrollView
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.symbol}
                style={styles.resultItem}
                onPress={() => handleStockSelect(item)}
              >
                <View style={styles.resultContent}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultSymbol}>{item.symbol}</Text>
                    <Text style={styles.resultPrice}>
                      {usStockQueryService.formatPrice(item.price)}
                    </Text>
                  </View>
                  <Text style={styles.resultName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.resultFooter}>
                    <Text style={styles.resultSector}>{item.sector || 'N/A'}</Text>
                    <Text style={[
                      styles.resultChange,
                      item.change_percent >= 0 ? styles.positiveChange : styles.negativeChange
                    ]}>
                      {usStockQueryService.formatChangePercent(item.change_percent)}
                    </Text>
                  </View>
                  {item.market_cap && (
                    <Text style={styles.resultMarketCap}>
                      市值: {usStockQueryService.formatMarketCap(item.market_cap)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    marginBottom: 2,
  },
  resultSector: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
  resultMarketCap: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});

export default USStockSearchInput;
