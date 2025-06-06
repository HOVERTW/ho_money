import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinancialCalculator } from '../utils/financialCalculator';
import { TimeRange } from '../services/taiwanStockService';

interface StockPriceImpactCardProps {
  timeRange?: TimeRange;
  onRefresh?: () => void;
}

const StockPriceImpactCard: React.FC<StockPriceImpactCardProps> = ({
  timeRange = 'month',
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [stockImpact, setStockImpact] = useState<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRange);

  const timeRangeOptions = [
    { key: 'today' as TimeRange, label: '本日' },
    { key: 'week' as TimeRange, label: '本周' },
    { key: 'month' as TimeRange, label: '本月' },
    { key: 'total' as TimeRange, label: '累積' },
  ];

  const loadStockImpact = async () => {
    try {
      setLoading(true);
      console.log(`📊 載入台股價格影響 (${selectedTimeRange})`);
      
      const impact = await FinancialCalculator.getStockPriceImpactRanking(selectedTimeRange);
      setStockImpact(impact);
      
      console.log(`✅ 台股價格影響載入完成:`, {
        gains: impact.topGains.length,
        losses: impact.topLosses.length,
        netImpact: impact.netImpact,
      });
    } catch (error) {
      console.error('❌ 載入台股價格影響失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockImpact();
  }, [selectedTimeRange]);

  const formatCurrency = (amount: number) => {
    return `NT$${Math.abs(amount).toLocaleString()}`;
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const renderStockItem = (stock: any, isGain: boolean) => (
    <View key={stock.stock_code} style={styles.stockItem}>
      <View style={styles.stockInfo}>
        <Text style={styles.stockName}>{stock.stock_name}</Text>
        <Text style={styles.stockCode}>({stock.stock_code})</Text>
        {stock.base_price && selectedTimeRange !== 'total' && (
          <Text style={styles.basePriceText}>
            基準: NT${stock.base_price.toFixed(2)} → NT${stock.current_price.toFixed(2)}
          </Text>
        )}
      </View>
      <View style={styles.stockValues}>
        <Text style={[styles.stockAmount, isGain ? styles.gainText : styles.lossText]}>
          {isGain ? '+' : '-'}{formatCurrency(Math.abs(stock.unrealized_gain_loss))}
        </Text>
        <Text style={[styles.stockPercent, isGain ? styles.gainText : styles.lossText]}>
          {formatPercent(stock.return_rate)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>載入台股價格影響...</Text>
      </View>
    );
  }

  if (!stockImpact || (stockImpact.topGains.length === 0 && stockImpact.topLosses.length === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trending-up-outline" size={48} color="#999" />
        <Text style={styles.emptyText}>暫無台股資產</Text>
        <Text style={styles.emptySubtext}>新增台股資產後即可查看價格影響</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 時間範圍選擇器 */}
      <View style={styles.timeRangeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === option.key && styles.activeTimeRangeButton,
              ]}
              onPress={() => setSelectedTimeRange(option.key)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  selectedTimeRange === option.key && styles.activeTimeRangeText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 總覽 */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>總收益</Text>
          <Text style={[styles.summaryValue, styles.gainText]}>
            +{formatCurrency(stockImpact.totalGains)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>總損失</Text>
          <Text style={[styles.summaryValue, styles.lossText]}>
            -{formatCurrency(stockImpact.totalLosses)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>淨影響</Text>
          <Text style={[
            styles.summaryValue,
            stockImpact.netImpact >= 0 ? styles.gainText : styles.lossText
          ]}>
            {stockImpact.netImpact >= 0 ? '+' : ''}{formatCurrency(stockImpact.netImpact)}
          </Text>
        </View>
      </View>

      {/* 資產增長 Top 5 */}
      {stockImpact.topGains.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color="#34C759" />
            <Text style={styles.sectionTitle}>資產增長 Top 5</Text>
          </View>
          {stockImpact.topGains.map((stock: any) => renderStockItem(stock, true))}
        </View>
      )}

      {/* 資產減損 Top 5 */}
      {stockImpact.topLosses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-down" size={20} color="#FF3B30" />
            <Text style={styles.sectionTitle}>資產減損 Top 5</Text>
          </View>
          {stockImpact.topLosses.map((stock: any) => renderStockItem(stock, false))}
        </View>
      )}

      {/* 刷新按鈕 */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadStockImpact}>
        <Ionicons name="refresh" size={16} color="#007AFF" />
        <Text style={styles.refreshText}>更新價格</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  timeRangeContainer: {
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  activeTimeRangeButton: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTimeRangeText: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  stockCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  basePriceText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  stockValues: {
    alignItems: 'flex-end',
  },
  stockAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  gainText: {
    color: '#34C759',
  },
  lossText: {
    color: '#FF3B30',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
});

export default StockPriceImpactCard;
