import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transactionDataService, Transaction, Category, Account } from '../../services/transactionDataService';
// import { currentMonthCalculationService } from '../../services/currentMonthCalculationService'; // 已移除
import { FinancialCalculator } from '../../utils/financialCalculator';
import { eventEmitter, EVENTS } from '../../services/eventEmitter';

export default function CashFlowScreen() {
  const insets = useSafeAreaInsets();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 新增：類別篩選
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // 🔥 新增：強制刷新鍵

  // 自動刷新函數
  const autoRefresh = () => {
    const allTransactions = transactionDataService.getTransactions();
    setTransactions(allTransactions);
  };

  // 監聽交易資料變化
  useEffect(() => {
    // 初始化資料
    setTransactions(transactionDataService.getTransactions());

    // 添加監聽器
    const handleTransactionsUpdate = () => {
      console.log('🔥 收支分析 - 交易數據更新事件');
      setTransactions(transactionDataService.getTransactions());
      setRefreshKey(prev => prev + 1);
    };
    transactionDataService.addListener(handleTransactionsUpdate);

    // 🔥 方法10：CashFlowScreen 增強的負債添加事件監聽器
    const handleLiabilityAdded = (liability: any) => {
      console.log('🔥 方法10 - CashFlowScreen 收到負債添加事件:', liability.name);
      console.log('🔥 方法10 - 立即刷新交易數據');

      // 立即刷新
      setTransactions(transactionDataService.getTransactions());
      setRefreshKey(prev => prev + 1);

      // 延遲再次刷新
      setTimeout(() => {
        console.log('🔥 方法10 - 延遲刷新交易數據');
        setTransactions(transactionDataService.getTransactions());
        setRefreshKey(prev => prev + 1);
      }, 500);
    };

    const handleForceRefreshAll = (data: any) => {
      console.log('🔥 方法10 - CashFlowScreen 收到強制刷新事件:', data);
      console.log('🔥 方法10 - 立即刷新交易數據');

      setTransactions(transactionDataService.getTransactions());
      setRefreshKey(prev => prev + 1);

      // 延遲再次刷新
      setTimeout(() => {
        console.log('🔥 方法10 - 延遲刷新交易數據');
        setTransactions(transactionDataService.getTransactions());
        setRefreshKey(prev => prev + 1);
      }, 300);
    };

    eventEmitter.on(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
    eventEmitter.on(EVENTS.LIABILITY_DELETED, handleLiabilityAdded); // 🔥 修復4：負債刪除也需要刷新
    eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
    eventEmitter.on(EVENTS.FORCE_REFRESH_CASHFLOW, handleForceRefreshAll);

    // 清理函數
    return () => {
      transactionDataService.removeListener(handleTransactionsUpdate);
      eventEmitter.off(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
      eventEmitter.off(EVENTS.LIABILITY_DELETED, handleLiabilityAdded); // 🔥 修復4：清理負債刪除監聽器
      eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
      eventEmitter.off(EVENTS.FORCE_REFRESH_CASHFLOW, handleForceRefreshAll);
    };
  }, []);

  const accounts = transactionDataService.getAccounts();
  const categories = transactionDataService.getCategories();

  // 獲取當前類型下的可用類別
  const getAvailableCategories = () => {
    const filteredByType = transactions.filter(t => {
      if (filterType === 'all') return true;
      return t.type === filterType;
    });

    const uniqueCategories = [...new Set(filteredByType.map(t => t.category))];
    return uniqueCategories.filter(cat => cat && cat.trim() !== '');
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // 🔥 修復：月末應該是該月最後一天，不是當前日期
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        // 季末：該季最後一個月的最後一天
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        // 年末：12月31日
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }



    const filtered = transactions
      .filter((t: Transaction) => {
        // 確保交易有有效的日期
        if (!t || !t.date) return false;

        const transactionDate = new Date(t.date);
        // 檢查日期是否有效
        if (isNaN(transactionDate.getTime())) return false;

        // 🔥 修復：使用 endDate 而不是 now
        const isInRange = transactionDate >= startDate && transactionDate <= endDate;

        // 類型篩選
        let typeMatch = true;
        if (filterType !== 'all') {
          typeMatch = t.type === filterType;
        }

        // 類別篩選
        let categoryMatch = true;
        if (selectedCategory !== 'all') {
          categoryMatch = t.category === selectedCategory;
        }

        return isInRange && typeMatch && categoryMatch;
      })
      .sort((a: Transaction, b: Transaction) => {
        // 安全的日期排序
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        // 檢查日期是否有效
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        return dateB.getTime() - dateA.getTime();
      });

    return filtered;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const account = transactionDataService.getAccountByName(item.account);
    const category = transactionDataService.getCategoryByName(item.category);

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.categoryIcon,
            { backgroundColor: category?.color || '#007AFF' }
          ]}>
            <Ionicons
              name={category?.icon as any || 'help-outline'}
              size={20}
              color="#fff"
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>
              {/* 修改：主要顯示類別，描述作為小字註記 */}
              {category?.name || '未分類'}
              {item.description && item.description !== (category?.name || '未分類') && (
                <Text style={styles.descriptionNote}> {item.description}</Text>
              )}
            </Text>
            <Text style={styles.transactionMeta}>
              {item.account || account?.name || '未知帳戶'} • {
                item.date ?
                  (() => {
                    const date = new Date(item.date);
                    return isNaN(date.getTime()) ? '無效日期' : date.toLocaleDateString('zh-TW');
                  })()
                  : '無日期'
              }
            </Text>
          </View>
        </View>
        <Text style={[
          styles.transactionAmount,
          item.type === 'income' ? styles.incomeAmount : styles.expenseAmount
        ]}>
          {item.type === 'income' ? '+' : '-'}
          {formatCurrency(Math.abs(item.amount))}
        </Text>
      </View>
    );
  };

  const filteredTransactions = getFilteredTransactions();

  // 🔥 方法10：CashFlowScreen 使用獨立計算器
  const calculateFinancials = () => {
    // 如果是本月，使用獨立計算器
    if (timeRange === 'month') {
      console.log('🔥 方法10 - CashFlowScreen 使用獨立計算器 (本月)');

      const summary = FinancialCalculator.calculateCurrentMonthSummary();

      return {
        totalIncome: summary.monthlyIncome,
        totalExpense: summary.totalExpenses // 使用總支出（包含還款）
      };
    } else {
      // 其他時間範圍使用過濾後的交易
      const income = filteredTransactions
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const expense = filteredTransactions
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      console.log('🔥 方法10 - CashFlowScreen 計算 (其他時間範圍):', {
        timeRange: timeRange,
        filteredTransactionsCount: filteredTransactions.length,
        income: income,
        expense: expense
      });

      return { totalIncome: income, totalExpense: expense };
    }
  };

  const { totalIncome, totalExpense } = calculateFinancials();

  const netCashFlow = totalIncome - totalExpense;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Time Range Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'week', label: '本週' },
            { key: 'month', label: '本月' },
            { key: 'quarter', label: '本季' },
            { key: 'year', label: '本年' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                timeRange === option.key && styles.activeFilterButton
              ]}
              onPress={() => setTimeRange(option.key as any)}
            >
              <Text style={[
                styles.filterButtonText,
                timeRange === option.key && styles.activeFilterButtonText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'all', label: '全部', icon: 'list-outline' },
            { key: 'income', label: '收入', icon: 'arrow-down-outline' },
            { key: 'expense', label: '支出', icon: 'arrow-up-outline' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.typeFilterButton,
                filterType === option.key && styles.activeTypeFilterButton
              ]}
              onPress={() => {
                setFilterType(option.key as any);
                setSelectedCategory('all'); // 重置類別篩選
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={filterType === option.key ? '#fff' : '#666'}
              />
              <Text style={[
                styles.typeFilterButtonText,
                filterType === option.key && styles.activeTypeFilterButtonText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Filter - 只在選擇收入或支出時顯示 */}
        {filterType !== 'all' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.categoryFilterButton,
                selectedCategory === 'all' && styles.activeCategoryFilterButton
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryFilterButtonText,
                selectedCategory === 'all' && styles.activeCategoryFilterButtonText
              ]}>
                全部類別
              </Text>
            </TouchableOpacity>
            {getAvailableCategories().map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryFilterButton,
                  selectedCategory === category && styles.activeCategoryFilterButton
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryFilterButtonText,
                  selectedCategory === category && styles.activeCategoryFilterButtonText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>總收入</Text>
          <Text style={[styles.summaryAmount, styles.incomeAmount]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>總支出</Text>
          <Text style={[styles.summaryAmount, styles.expenseAmount]}>
            {formatCurrency(totalExpense)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>淨現金流</Text>
          <Text style={[
            styles.summaryAmount,
            netCashFlow >= 0 ? styles.incomeAmount : styles.expenseAmount
          ]}>
            {formatCurrency(netCashFlow)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        style={styles.transactionsList}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100), // 確保底部有足夠空間
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>此期間沒有交易記錄</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    gap: 4,
  },
  activeTypeFilterButton: {
    backgroundColor: '#007AFF',
  },
  typeFilterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeTypeFilterButtonText: {
    color: '#fff',
  },
  categoryFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeCategoryFilterButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  categoryFilterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryFilterButtonText: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#34C759',
  },
  expenseAmount: {
    color: '#FF3B30',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  descriptionNote: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
