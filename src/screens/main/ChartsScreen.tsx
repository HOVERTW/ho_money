import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { PieChart, LineChart, BarChart } from 'react-native-chart-kit'; // 移除不兼容的圖表庫
import { transactionDataService, Transaction } from '../../services/transactionDataService';
// import { currentMonthCalculationService } from '../../services/currentMonthCalculationService'; // 已移除

const { width: screenWidth } = Dimensions.get('window');

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedChart, setSelectedChart] = useState<'spending' | 'income' | 'assets'>('spending');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 監聽交易資料變化
  useEffect(() => {
    // 初始化資料
    setTransactions(transactionDataService.getTransactions());

    // 添加監聽器
    const handleTransactionsUpdate = () => {
      setTransactions(transactionDataService.getTransactions());
    };
    transactionDataService.addListener(handleTransactionsUpdate);

    // 清理函數
    return () => {
      transactionDataService.removeListener(handleTransactionsUpdate);
    };
  }, []);

  // Mock assets data (這個暫時保留，因為還沒有資產服務)
  const mockAssets = [
    { id: '1', type: 'real_estate', current_value: 8500000 },
  ];

  const mockSummary = {
    savings_rate: 43.75,
    net_worth: 8700000, // 調整為只包含房地產和現金銀行的總值
    monthly_income: 80000,
    monthly_expenses: 45000,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 根據時間範圍過濾交易
  const getFilteredTransactions = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return transactions.filter(transaction => {
      // 確保交易有有效的日期
      if (!transaction || !transaction.date) return false;

      const transactionDate = new Date(transaction.date);
      // 檢查日期是否有效
      if (isNaN(transactionDate.getTime())) return false;

      switch (selectedTimeRange) {
        case 'week':
          const startOfWeek = new Date(startOfToday);
          startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
          return transactionDate >= startOfWeek;

        case 'month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return transactionDate >= startOfMonth;

        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
          return transactionDate >= startOfQuarter;

        case 'year':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          return transactionDate >= startOfYear;

        case 'all':
        default:
          return true;
      }
    });
  };

  // Get spending by category data (包含負債還款)
  const getSpendingByCategory = () => {
    const filteredTransactions = getFilteredTransactions();

    // 計算一般支出
    const categorySpending = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const categoryName = transaction.category || '未分類';
        acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    // 添加負債還款
    const debtPayments = filteredTransactions
      .filter(t => t.category === '還款')
      .reduce((sum, t) => sum + t.amount, 0);

    if (debtPayments > 0) {
      categorySpending['還款'] = debtPayments;
    }

    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    const total = Object.values(categorySpending).reduce((sum, value) => sum + value, 0);

    return Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value], index) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
        const formattedAmount = new Intl.NumberFormat('zh-TW', {
          minimumFractionDigits: 0,
        }).format(value);

        return {
          name: `${percentage}% ${name} $${formattedAmount}`,
          value,
          color: colors[index % colors.length],
          legendFontColor: '#333',
          legendFontSize: 12,
        };
      });
  };

  // Get income by category data
  const getIncomeByCategory = () => {
    const filteredTransactions = getFilteredTransactions();

    // 計算收入分類
    const categoryIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, transaction) => {
        const categoryName = transaction.category || '未分類';
        acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    const colors = ['#34C759', '#007AFF', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];
    const total = Object.values(categoryIncome).reduce((sum, value) => sum + value, 0);

    return Object.entries(categoryIncome)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value], index) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
        const formattedAmount = new Intl.NumberFormat('zh-TW', {
          minimumFractionDigits: 0,
        }).format(value);

        return {
          name: `${percentage}% ${name} $${formattedAmount}`,
          value,
          color: colors[index % colors.length],
          legendFontColor: '#333',
          legendFontSize: 12,
        };
      });
  };

  // Get asset allocation data
  const getAssetAllocation = () => {
    const assetAllocation = mockAssets.reduce((acc, asset) => {
      const typeLabel = getAssetTypeLabel(asset.type);
      acc[typeLabel] = (acc[typeLabel] || 0) + asset.current_value;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#34C759', '#007AFF', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];
    const total = Object.values(assetAllocation).reduce((sum, value) => sum + value, 0);

    return Object.entries(assetAllocation)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
        const formattedAmount = new Intl.NumberFormat('zh-TW', {
          minimumFractionDigits: 0,
        }).format(value);

        return {
          name: `${percentage}% ${name} $${formattedAmount}`,
          value,
          color: colors[index % colors.length],
          legendFontColor: '#333',
          legendFontSize: 12,
        };
      });
  };

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'tw_stock': '台股',
      'us_stock': '美股',
      'mutual_fund': '基金',
      'cryptocurrency': '加密貨幣',
      'real_estate': '不動產',
      'vehicle': '汽車',
      'insurance': '保險',
      'precious_metal': '貴金屬',
      'other': '其他',
    };
    return labels[type] || type;
  };



  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
  };

  const renderChart = () => {
    switch (selectedChart) {
      case 'spending':
        const spendingData = getSpendingByCategory();
        return spendingData.length > 0 ? (
          <View style={styles.chartWithLegendContainer}>
            {/* 根據平台顯示圓餅圖 */}
            <View style={styles.pieChartFrame}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>支出分析圖表</Text>
                <Text style={styles.chartPlaceholderSubtext}>圖表功能正在優化中</Text>
              </View>
            </View>

            {/* 文字圖例 Frame */}
            <View style={styles.legendFrame}>
              {spendingData.map((item, index) => (
                <View key={`spending-${item.name}-${index}`} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>暫無支出數據</Text>
          </View>
        );

      case 'assets':
        const assetData = getAssetAllocation();
        return assetData.length > 0 ? (
          <View style={styles.chartWithLegendContainer}>
            {/* 圓餅圖 Frame */}
            <View style={styles.pieChartFrame}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>資產配置圖表</Text>
                <Text style={styles.chartPlaceholderSubtext}>圖表功能正在優化中</Text>
              </View>
            </View>

            {/* 文字圖例 Frame */}
            <View style={styles.legendFrame}>
              {assetData.map((item, index) => (
                <View key={`asset-${item.name}-${index}`} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>暫無資產數據</Text>
          </View>
        );

      case 'income':
        const incomeData = getIncomeByCategory();
        return incomeData.length > 0 ? (
          <View style={styles.chartWithLegendContainer}>
            {/* 圓餅圖 Frame */}
            <View style={styles.pieChartFrame}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>收入分析圖表</Text>
                <Text style={styles.chartPlaceholderSubtext}>圖表功能正在優化中</Text>
              </View>
            </View>

            {/* 文字圖例 Frame */}
            <View style={styles.legendFrame}>
              {incomeData.map((item, index) => (
                <View key={`income-${item.name}-${index}`} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>暫無收入數據</Text>
          </View>
        );

      default:
        return (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>選擇圖表類型</Text>
          </View>
        );
    }
  };

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'spending':
        return '支出類別分析';
      case 'income':
        return '收入來源分析';
      case 'assets':
        return '資產配置分析';
      default:
        return '財務分析';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100), // 確保底部有足夠空間
        }}
      >
        {/* Chart Type Selector */}
        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'spending', label: '支出分析', icon: 'pie-chart-outline' },
              { key: 'income', label: '收入分析', icon: 'cash-outline' },
              { key: 'assets', label: '資產配置', icon: 'wallet-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.selectorButton,
                  selectedChart === option.key && styles.activeSelectorButton
                ]}
                onPress={() => setSelectedChart(option.key as any)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={selectedChart === option.key ? '#fff' : '#666'}
                />
                <Text style={[
                  styles.selectorButtonText,
                  selectedChart === option.key && styles.activeSelectorButtonText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'week', label: '本周' },
              { key: 'month', label: '本月' },
              { key: 'quarter', label: '本季' },
              { key: 'year', label: '本年' },
              { key: 'all', label: '歷年' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.timeRangeButton,
                  selectedTimeRange === option.key && styles.activeTimeRangeButton
                ]}
                onPress={() => setSelectedTimeRange(option.key as TimeRange)}
              >
                <Text style={[
                  styles.timeRangeButtonText,
                  selectedTimeRange === option.key && styles.activeTimeRangeButtonText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{getChartTitle()}</Text>
          {renderChart()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  selectorContainer: {
    paddingVertical: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  activeSelectorButton: {
    backgroundColor: '#007AFF',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeSelectorButtonText: {
    color: '#fff',
  },
  timeRangeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  activeTimeRangeButton: {
    backgroundColor: '#34C759',
  },
  timeRangeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTimeRangeButtonText: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  chartWithLegendContainer: {
    flexDirection: 'column',
  },
  pieChartFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  legendFrame: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  chartPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
  },
});
