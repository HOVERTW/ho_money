import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taiwanStockService, StockSearchResult } from '../services/taiwanStockService';
import StockSearchInput from '../components/StockSearchInput';

export default function StockManagementScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [stockCount, setStockCount] = useState<number>(0);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 載入股票資料狀態
  const loadStockStatus = async () => {
    try {
      const stocks = await taiwanStockService.getAllLatestStocks();
      setStockCount(stocks.length);

      if (stocks.length > 0) {
        // 假設所有股票的更新時間相同，取第一筆的日期
        setLastUpdateTime(stocks[0].price_date);
      }
    } catch (error) {
      console.error('載入股票狀態失敗:', error);
    }
  };

  // 更新股票資料
  const updateStockData = async () => {
    Alert.alert(
      '更新股票資料',
      '這將從台灣證交所獲取最新的股票資料，可能需要幾分鐘時間。確定要繼續嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await taiwanStockService.updateStockData();
              await loadStockStatus();
              Alert.alert('成功', '股票資料已更新完成！');
            } catch (error) {
              console.error('更新股票資料失敗:', error);
              Alert.alert('錯誤', '更新股票資料失敗，請稍後再試');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // 檢查是否需要更新
  const checkForUpdates = async () => {
    setIsLoading(true);
    try {
      const needsUpdate = await taiwanStockService.checkIfDataNeedsUpdate();
      if (needsUpdate) {
        Alert.alert(
          '資料需要更新',
          '股票資料不是最新的，建議立即更新以獲得準確的價格資訊。',
          [
            { text: '稍後更新', style: 'cancel' },
            { text: '立即更新', onPress: updateStockData },
          ]
        );
      } else {
        Alert.alert('資訊', '股票資料已是最新版本');
      }
    } catch (error) {
      console.error('檢查更新失敗:', error);
      Alert.alert('錯誤', '檢查更新失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 處理股票選擇
  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock);
  };

  // 測試 Supabase 連接
  const testSupabaseConnection = async () => {
    setIsLoading(true);
    try {
      const isConnected = await taiwanStockService.testSupabaseConnection();
      if (isConnected) {
        Alert.alert('連接測試', '✅ Supabase 連接成功！');
      } else {
        Alert.alert('連接測試', '❌ Supabase 連接失敗\n請檢查環境變數設定');
      }
    } catch (error) {
      console.error('測試連接失敗:', error);
      Alert.alert('錯誤', '連接測試失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 測試股票搜尋
  const testStockSearch = async () => {
    setIsLoading(true);
    try {
      // 測試搜尋台積電
      const results = await taiwanStockService.searchStocks('2330');
      if (results.length > 0) {
        Alert.alert(
          '搜尋測試成功',
          `找到 ${results.length} 筆結果\n第一筆: ${results[0].code} ${results[0].name} NT$${results[0].closing_price}`
        );
      } else {
        Alert.alert('搜尋測試', '沒有找到結果，可能需要先更新股票資料');
      }
    } catch (error) {
      console.error('測試搜尋失敗:', error);
      Alert.alert('錯誤', '測試搜尋失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockStatus();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>台股資料管理</Text>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 資料狀態卡片 */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="analytics-outline" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>資料狀態</Text>
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>股票數量</Text>
              <Text style={styles.statusValue}>{stockCount.toLocaleString()} 檔</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>最後更新</Text>
              <Text style={styles.statusValue}>
                {lastUpdateTime
                  ? new Date(lastUpdateTime).toLocaleDateString('zh-TW')
                  : '尚未更新'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* 操作按鈕 */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>資料管理</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={updateStockData}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>
              {isUpdating ? '更新中...' : '更新股票資料'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.checkButton]}
            onPress={checkForUpdates}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>檢查更新</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.connectionButton]}
            onPress={testSupabaseConnection}
            disabled={isLoading}
          >
            <Ionicons name="link-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>測試連接</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={testStockSearch}
            disabled={isLoading}
          >
            <Ionicons name="search-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>測試搜尋</Text>
          </TouchableOpacity>
        </View>

        {/* 股票搜尋測試 */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>股票搜尋測試</Text>
          <Text style={styles.sectionDescription}>
            輸入股票代號或名稱來測試搜尋功能
          </Text>

          <StockSearchInput
            onStockSelect={handleStockSelect}
            placeholder="輸入股票代號或名稱 (例: 2330 或 台積電)"
            style={styles.searchInput}
          />
        </View>

        {/* 選中的股票資訊 */}
        {selectedStock && (
          <View style={styles.selectedStockSection}>
            <Text style={styles.sectionTitle}>股票詳細資訊</Text>
            <View style={styles.stockDetailCard}>
              <View style={styles.stockDetailHeader}>
                <Text style={styles.stockDetailCode}>{selectedStock.code}</Text>
                <Text style={styles.stockDetailPrice}>NT${selectedStock.closing_price}</Text>
              </View>
              <Text style={styles.stockDetailName}>{selectedStock.name}</Text>
              <View style={styles.stockDetailInfo}>
                <View style={styles.stockDetailItem}>
                  <Text style={styles.stockDetailLabel}>月平均價</Text>
                  <Text style={styles.stockDetailValue}>
                    NT${selectedStock.monthly_average_price}
                  </Text>
                </View>
                <View style={styles.stockDetailItem}>
                  <Text style={styles.stockDetailLabel}>價格日期</Text>
                  <Text style={styles.stockDetailValue}>
                    {new Date(selectedStock.price_date).toLocaleDateString('zh-TW')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 使用說明 */}
        <View style={styles.instructionSection}>
          <Text style={styles.sectionTitle}>使用說明</Text>
          <View style={styles.instructionCard}>
            <View style={styles.instructionItem}>
              <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
              <Text style={styles.instructionText}>
                首次使用需要點擊「更新股票資料」來獲取台股資料
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="time-outline" size={16} color="#007AFF" />
              <Text style={styles.instructionText}>
                建議每日更新一次以獲得最新的股票價格
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="search-outline" size={16} color="#007AFF" />
              <Text style={styles.instructionText}>
                支援股票代號（如 2330）或股票名稱（如 台積電）搜尋
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#34C759',
  },
  checkButton: {
    backgroundColor: '#007AFF',
  },
  connectionButton: {
    backgroundColor: '#5856D6',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    marginTop: 8,
  },
  selectedStockSection: {
    marginBottom: 20,
  },
  stockDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockDetailCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  stockDetailPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  stockDetailName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  stockDetailInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockDetailItem: {
    flex: 1,
  },
  stockDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stockDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  instructionSection: {
    marginBottom: 40,
  },
  instructionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
});
