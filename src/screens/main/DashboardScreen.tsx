import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { transactionDataService, Transaction } from '../../services/transactionDataService';
import { assetTransactionSyncService, AssetData } from '../../services/assetTransactionSyncService';
import { liabilityService, LiabilityData } from '../../services/liabilityService';
import { currentMonthCalculationService } from '../../services/currentMonthCalculationService';
import { eventEmitter, EVENTS } from '../../services/eventEmitter';
import { recurringTransactionService } from '../../services/recurringTransactionService';
import { FinancialCalculator } from '../../utils/financialCalculator';
import { runSyncValidationTests } from '../../utils/testSyncValidation';
import { userProfileService, UserProfile } from '../../services/userProfileService';
import ErrorBoundary from '../../components/ErrorBoundary';
import { clearAllStorage } from '../../utils/storageManager';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityData[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'total'>('month');
  const [forceRefresh, setForceRefresh] = useState(0); // 強制刷新計數器

  // 用戶名稱編輯相關狀態
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 初始化用戶資料服務
  useEffect(() => {
    const initUserProfile = async () => {
      await userProfileService.initialize();
      setUserProfile(userProfileService.getProfile());
    };
    initUserProfile();
  }, []);

  // 監聽所有資料變化
  useEffect(() => {
    // 初始化資料
    setTransactions(transactionDataService.getTransactions());
    setAssets(assetTransactionSyncService.getAssets());
    setLiabilities(liabilityService.getLiabilities());

    // 添加監聽器
    const handleTransactionsUpdate = () => {
      setTransactions(transactionDataService.getTransactions());
    };
    const handleAssetsUpdate = (updatedAssets: AssetData[]) => {
      setAssets(updatedAssets);
    };
    const handleLiabilitiesUpdate = (updatedLiabilities: LiabilityData[]) => {
      setLiabilities(updatedLiabilities);
    };

    transactionDataService.addListener(handleTransactionsUpdate);
    assetTransactionSyncService.addListener(handleAssetsUpdate);
    liabilityService.addListener(handleLiabilitiesUpdate);

    // 添加財務數據更新事件監聽器
    const handleFinancialDataUpdate = (data: any) => {
      console.log('📡 DashboardScreen 收到財務數據更新事件:', data);
      // 強制刷新所有數據
      setTransactions(transactionDataService.getTransactions());
      setAssets(assetTransactionSyncService.getAssets());
      setLiabilities(liabilityService.getLiabilities());
      setForceRefresh(prev => prev + 1);
      console.log('✅ DashboardScreen 數據已強制刷新');
    };

    const handleDebtPaymentAdded = (data: any) => {
      console.log('📡 DashboardScreen 收到負債還款添加事件:', data);
      // 強制刷新
      handleFinancialDataUpdate(data);
    };

    // 🔥 方法8：增強的負債添加事件監聽器
    const handleLiabilityAdded = (liability: any) => {
      console.log('🔥 方法8 - DashboardScreen 收到負債添加事件:', liability.name);
      console.log('🔥 方法8 - 立即刷新所有數據');

      // 立即刷新所有數據
      setLiabilities(liabilityService.getLiabilities());
      setTransactions(transactionDataService.getTransactions());
      setAssets(assetTransactionSyncService.getAssets());
      setForceRefresh(prev => prev + 1);

      // 延遲再次刷新確保數據同步
      setTimeout(() => {
        console.log('🔥 方法8 - 延遲刷新數據');
        setLiabilities(liabilityService.getLiabilities());
        setTransactions(transactionDataService.getTransactions());
        setAssets(assetTransactionSyncService.getAssets());
        setForceRefresh(prev => prev + 1);
      }, 500);
    };

    const handleForceRefreshAll = (data: any) => {
      console.log('🔥 方法8 - DashboardScreen 收到強制刷新事件:', data);
      console.log('🔥 方法8 - 立即刷新所有數據');

      setTransactions(transactionDataService.getTransactions());
      setAssets(assetTransactionSyncService.getAssets());
      setLiabilities(liabilityService.getLiabilities());
      setForceRefresh(prev => prev + 1);

      // 延遲再次刷新
      setTimeout(() => {
        console.log('🔥 方法8 - 延遲刷新數據');
        setTransactions(transactionDataService.getTransactions());
        setAssets(assetTransactionSyncService.getAssets());
        setLiabilities(liabilityService.getLiabilities());
        setForceRefresh(prev => prev + 1);
      }, 300);
    };

    eventEmitter.on(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
    eventEmitter.on(EVENTS.DEBT_PAYMENT_ADDED, handleDebtPaymentAdded);
    eventEmitter.on(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
    eventEmitter.on(EVENTS.LIABILITY_DELETED, handleLiabilityAdded); // 🔥 修復4：負債刪除也需要刷新
    eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
    eventEmitter.on(EVENTS.FORCE_REFRESH_DASHBOARD, handleForceRefreshAll);

    // 清理函數
    return () => {
      transactionDataService.removeListener(handleTransactionsUpdate);
      assetTransactionSyncService.removeListener(handleAssetsUpdate);
      liabilityService.removeListener(handleLiabilitiesUpdate);
      eventEmitter.off(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
      eventEmitter.off(EVENTS.DEBT_PAYMENT_ADDED, handleDebtPaymentAdded);
      eventEmitter.off(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
      eventEmitter.off(EVENTS.LIABILITY_DELETED, handleLiabilityAdded); // 🔥 修復4：清理負債刪除監聽器
      eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
      eventEmitter.off(EVENTS.FORCE_REFRESH_DASHBOARD, handleForceRefreshAll);
    };
  }, []);

  // Mock data for demo
  const mockUser = { email: 'demo@fintranzo.com' };
  // 🔥 方法9：使用獨立計算器
  const calculateSummary = () => {
    console.log('🔥 方法9 - DashboardScreen 使用獨立計算器');

    const summary = FinancialCalculator.calculateCurrentMonthSummary();

    return {
      net_worth: summary.netWorth,
      total_assets: summary.totalAssets,
      total_liabilities: summary.totalLiabilities,
      monthly_income: summary.monthlyIncome,
      monthly_expenses: summary.totalExpenses, // 使用總支出（包含還款）
      savings_rate: summary.savingsRate,
      monthly_debt_payments: summary.monthlyDebtPayments,
    };
  };

  // 使用 useMemo 確保在 forceRefresh 變化時重新計算
  const mockSummary = useMemo(() => {
    console.log('🔄 DashboardScreen 重新計算財務摘要, forceRefresh:', forceRefresh);
    return calculateSummary();
  }, [forceRefresh, transactions, assets, liabilities]);

  // 計算指定時間範圍的日期
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'total':
      default:
        startDate = new Date(0); // 從最早開始
        break;
    }

    return { startDate, endDate: now };
  };

  // 🔥 方法9：使用獨立計算器計算資產變化
  const calculateTopIncomeExpense = () => {
    console.log('🔥 方法9 - DashboardScreen 使用獨立計算器計算最大收入/支出');

    if (timeRange === 'month') {
      // 當月數據使用獨立計算器（僅計算記帳頁交易資料）
      const incomeExpenseAnalysis = FinancialCalculator.getTopIncomeExpenseAnalysis();
      return {
        topIncomes: incomeExpenseAnalysis.topIncomes,
        topExpenses: incomeExpenseAnalysis.topExpenses,
      };
    } else {
      // 其他時間範圍也改為收入/支出分析（僅計算記帳頁交易資料）
      const topIncomes: Array<{ id: string; name: string; amount: number; type: string }> = [];
      const topExpenses: Array<{ id: string; name: string; amount: number; type: string }> = [];
      const { startDate, endDate } = getDateRange();

      // 添加基於交易記錄的分類統計
      const rangeTransactions = transactionDataService.getTransactionsByDateRange(startDate, endDate);

      // 按類別統計收入和支出
      const incomeByCategory: { [key: string]: number } = {};
      const expenseByCategory: { [key: string]: number } = {};

      rangeTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
          incomeByCategory[transaction.category] = (incomeByCategory[transaction.category] || 0) + transaction.amount;
        } else if (transaction.type === 'expense') {
          expenseByCategory[transaction.category] = (expenseByCategory[transaction.category] || 0) + transaction.amount;
        }
      });

      // 添加收入類別到最大收入列表
      Object.entries(incomeByCategory).forEach(([category, amount]) => {
        if (amount > 0) {
          topIncomes.push({
            id: `income_${category}`,
            name: category,
            amount: amount,
            type: '記帳收入',
          });
        }
      });

      // 添加支出類別到最大支出列表
      Object.entries(expenseByCategory).forEach(([category, amount]) => {
        if (amount > 0) {
          topExpenses.push({
            id: `expense_${category}`,
            name: category,
            amount: amount,
            type: '記帳支出',
          });
        }
      });

      // 排序並取前5名
      topIncomes.sort((a, b) => b.amount - a.amount);
      topExpenses.sort((a, b) => b.amount - a.amount);

      return {
        topIncomes: topIncomes.slice(0, 5),
        topExpenses: topExpenses.slice(0, 5),
      };
    }
  };

  // 獲取時間範圍標籤
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return '今日';
      case 'week': return '本週';
      case 'month': return '本月';
      case 'total': return '累積';
      default: return '';
    }
  };

  const { topIncomes, topExpenses } = calculateTopIncomeExpense();

  // 🔄 強制更新類別
  const forceUpdateCategories = async () => {
    try {
      await transactionDataService.forceUpdateCategories();
      Alert.alert('成功', '類別已更新到最新版本！');
    } catch (error) {
      Alert.alert('錯誤', '更新類別失敗');
      console.error('更新類別失敗:', error);
    }
  };

  // 🔥 方法8：直接創建測試交易數據
  const validateFinancialCalculations = async () => {
    console.log('🔍 ===== 方法8：直接創建測試交易數據 =====');

    const allTransactions = transactionDataService.getTransactions();
    console.log('🔍 當前所有交易數據:', allTransactions.length);

    const debtTransactions = allTransactions.filter(t => t.category === '還款');
    console.log('🔍 當前還款交易數量:', debtTransactions.length);

    // 如果沒有還款交易，直接創建一個
    if (debtTransactions.length === 0) {
      console.log('🔥 方法8：沒有還款交易，直接創建一個測試交易');

      const currentDate = new Date();
      const testDebtTransaction = {
        id: `test_debt_payment_${Date.now()}`,
        amount: 50000,
        type: 'expense' as const,
        description: '信用貸款',
        category: '還款',
        account: '銀行',
        date: currentDate.toISOString(),
        is_recurring: true,
        recurring_frequency: 'monthly',
        max_occurrences: 12,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await transactionDataService.addTransaction(testDebtTransaction);
      console.log('✅ 方法8：測試還款交易已創建:', testDebtTransaction);

      // 強制刷新數據
      setTransactions(transactionDataService.getTransactions());
      setForceRefresh(prev => prev + 1);

      console.log('✅ 方法8：數據已強制刷新');
    } else {
      console.log('✅ 方法8：已存在還款交易，數量:', debtTransactions.length);
      debtTransactions.forEach(t => {
        console.log('  - 還款交易:', {
          id: t.id,
          amount: t.amount,
          description: t.description,
          date: t.date
        });
      });
    }

    console.log('🔍 ===== 方法8檢查完成 =====');
  };

  const onRefresh = async () => {
    setRefreshing(true);

    // 🔥 強制刷新所有數據
    console.log('🔄 DashboardScreen 強制刷新所有數據');
    setTransactions(transactionDataService.getTransactions());
    setAssets(assetTransactionSyncService.getAssets());
    setLiabilities(liabilityService.getLiabilities());
    setForceRefresh(prev => prev + 1);

    // 🔥 執行財務計算驗證
    validateFinancialCalculations();

    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSignOut = () => {
    console.log('Sign out pressed');
  };

  // 用戶名稱編輯相關函數
  const handleEditName = () => {
    setEditingName(userProfile?.displayName || '小富翁');
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      Alert.alert('錯誤', '名稱不能為空');
      return;
    }

    const success = await userProfileService.updateDisplayName(editingName.trim());
    if (success) {
      setUserProfile(userProfileService.getProfile());
      setShowEditNameModal(false);
      Alert.alert('成功', '名稱已更新');
    } else {
      Alert.alert('錯誤', '更新失敗，請重試');
    }
  };

  const handleCancelEdit = () => {
    setEditingName('');
    setShowEditNameModal(false);
  };

  // 一鍵清除所有資料功能
  const handleClearAllData = () => {
    Alert.alert(
      '清除所有資料',
      '確定要清除所有資料？\n\n此操作將刪除：\n• 所有交易記錄\n• 資產負債數據\n• 用戶設定\n• 其他應用數據\n\n此操作無法撤銷！',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '確定清除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🧹 開始清除所有資料...');

              // 使用存儲管理工具清除所有數據
              const success = await clearAllStorage();

              if (success) {
                Alert.alert(
                  '清除完成',
                  '所有資料已清除完成！\n\n請完全關閉應用程式並重新啟動，以重置到初始狀態。',
                  [
                    {
                      text: '確定',
                      onPress: () => {
                        console.log('✅ 用戶確認清除完成');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('錯誤', '清除資料失敗，請稍後再試。');
              }
            } catch (error) {
              console.error('❌ 清除資料時發生錯誤:', error);
              Alert.alert('錯誤', '清除資料時發生錯誤，請稍後再試。');
            }
          },
        },
      ]
    );
  };

  // 生成近12個月的資產變化數據
  const generateYearlyNetWorthData = () => {
    try {
      const currentDate = new Date();
      const labels: string[] = [];
      const data: number[] = [];

      // 確保數據存在且為陣列
      const safeTransactions = Array.isArray(transactions) ? transactions : [];
      const safeAssets = Array.isArray(assets) ? assets : [];
      const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];

    // 生成近12個月的標籤和數據
    // 修復：從去年同月的下一個月開始，到當前月份結束
    // 例如：現在是2025年6月，應該從2024年7月開始到2025年6月
    for (let i = 11; i >= 0; i--) {
      try {
        // 修復：正確計算起始月份 - 從去年同月的下一個月開始
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        // 只顯示月份，避免文字重疊
        labels.push(`${month}月`);

        // 計算該月的實際資產變化
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const monthTransactions = safeTransactions.filter(t => {
          // 確保交易有有效的日期
          if (!t || !t.date) return false;

          const tDate = new Date(t.date);
          // 檢查日期是否有效
          if (isNaN(tDate.getTime())) return false;

          return tDate >= monthStart && tDate <= monthEnd;
        });

        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const netChange = monthIncome - monthExpense;

        // 🔥 修復：正確計算歷史淨值
        const currentAssets = safeAssets.reduce((sum, asset) => sum + (asset?.current_value || 0), 0);
        const currentLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
        const currentNetWorth = currentAssets - currentLiabilities;

        // 如果是當前月份，直接使用當前淨值（已經包含所有交易影響）
        const todayDate = new Date();
        const isCurrentMonth = date.getFullYear() === todayDate.getFullYear() &&
                              date.getMonth() === todayDate.getMonth();

        let monthNetWorth;
        if (isCurrentMonth) {
          // 當前月份：直接使用當前淨值
          monthNetWorth = currentNetWorth;
        } else {
          // 歷史月份：基於當前淨值反推歷史值
          // 計算從該月到現在的累積淨變化
          const futureTransactions = safeTransactions.filter(t => {
            // 確保交易有有效的日期
            if (!t || !t.date) return false;

            const tDate = new Date(t.date);
            // 檢查日期是否有效
            if (isNaN(tDate.getTime())) return false;

            return tDate > monthEnd;
          });

          const futureNetChange = futureTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0) -
            futureTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          // 歷史淨值 = 當前淨值 - 未來累積變化 + 該月變化
          monthNetWorth = currentNetWorth - futureNetChange + netChange;
        }

        // 修復：允許顯示負資產，不強制設為0
        data.push(monthNetWorth);
      } catch (error) {
        // 添加默認值以防止崩潰
        labels.push(`${i}月`);
        data.push(0);
      }
    }

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
    } catch (error) {
      // 返回默認數據以防止崩潰
      return {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      };
    }
  };

  const netWorthData = generateYearlyNetWorthData();

  // 🔥 計算真實的財務摘要數據
  const calculateRealFinancialSummary = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 確保數據存在且為陣列
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeAssets = Array.isArray(assets) ? assets : [];
    const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];

    // 計算當月交易
    const currentMonthTransactions = safeTransactions.filter(t => {
      // 確保交易有有效的日期
      if (!t || !t.date) return false;

      const tDate = new Date(t.date);
      // 檢查日期是否有效
      if (isNaN(tDate.getTime())) return false;

      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // 計算資產負債
    const totalAssets = safeAssets.reduce((sum, asset) => sum + (asset?.current_value || 0), 0);
    const totalLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    return {
      monthlyIncome,
      monthlyExpenses,
      totalAssets,
      totalLiabilities,
      netWorth
    };
  };

  const realSummary = calculateRealFinancialSummary();

  // 🔥 驗證數據綁定的測試函數
  const validateDataBinding = () => {
    console.log('🔍 ===== 驗證近一年資產變化數據綁定 =====');

    console.log('📊 當前數據狀態:', {
      transactionsCount: transactions.length,
      assetsCount: assets.length,
      liabilitiesCount: liabilities.length,
      totalAssets: realSummary.totalAssets,
      totalLiabilities: realSummary.totalLiabilities,
      netWorth: realSummary.netWorth,
      monthlyIncome: realSummary.monthlyIncome,
      monthlyExpenses: realSummary.monthlyExpenses
    });

    // 檢查圖表數據
    const chartData = generateYearlyNetWorthData();
    console.log('📈 圖表數據:', {
      labelsCount: chartData.labels.length,
      dataPointsCount: chartData.datasets[0].data.length,
      labels: chartData.labels,
      firstDataPoint: chartData.datasets[0].data[0],
      lastDataPoint: chartData.datasets[0].data[chartData.datasets[0].data.length - 1]
    });

    // 檢查數據是否真實綁定
    const isRealData = !chartData.datasets[0].data.every(point => point === chartData.datasets[0].data[0]);
    console.log('✅ 數據綁定檢查:', {
      isUsingRealData: isRealData,
      hasTransactions: transactions.length > 0,
      hasAssets: assets.length > 0,
      hasLiabilities: liabilities.length > 0,
      netWorthCalculated: realSummary.netWorth !== 0
    });

    return isRealData;
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
    propsForLabels: {
      fontSize: 10, // 縮小2個字號 (原本約12)
    },
  };

  // 使用真實的資產增長和減損資料

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>您好，</Text>
            <TouchableOpacity onPress={handleEditName} style={styles.editNameButton}>
              <Ionicons name="create-outline" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userProfile?.displayName || '小富翁'}</Text>
        </View>

        {/* 一鍵清除按鈕 */}
        <TouchableOpacity onPress={handleClearAllData} style={styles.clearDataButton}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>

      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Net Worth Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>近一年資產變化</Text>
          <Text style={[
            styles.netWorthAmount,
            realSummary.netWorth < 0 && styles.negativeAmount
          ]}>
            {formatCurrency(realSummary.netWorth)}
          </Text>
          <LineChart
            data={netWorthData}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Bento Grid Layout */}
        <View style={styles.bentoGrid}>
          {/* Financial Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.assetsCard]}>
              <Text style={styles.summaryLabel}>總資產</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(realSummary.totalAssets)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.liabilitiesCard]}>
              <Text style={styles.summaryLabel}>總負債</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(realSummary.totalLiabilities)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.incomeCard]}>
              <Text style={styles.summaryLabel}>月收入</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(realSummary.monthlyIncome)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.expenseCard]}>
              <Text style={styles.summaryLabel}>月支出</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(realSummary.monthlyExpenses)}
              </Text>
            </View>
          </View>

          {/* Top Incomes */}
          <View style={styles.topCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>最大收入 TOP 5</Text>
              <View style={styles.timeRangeSelector}>
                {(['today', 'week', 'month', 'total'] as const).map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.timeRangeButton,
                      timeRange === range && styles.timeRangeButtonActive
                    ]}
                    onPress={() => setTimeRange(range)}
                  >
                    <Text style={[
                      styles.timeRangeButtonText,
                      timeRange === range && styles.timeRangeButtonTextActive
                    ]}>
                      {range === 'today' ? '今日' :
                       range === 'week' ? '本週' :
                       range === 'month' ? '本月' : '累積'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {topIncomes.length > 0 ? (
              topIncomes.map((income, index) => (
                <View key={income.id} style={styles.topItem}>
                  <Text style={styles.topItemName}>{income.name}</Text>
                  <View style={styles.topItemRight}>
                    <Text style={styles.gainAmount}>
                      +{formatCurrency(income.amount)}
                    </Text>
                    <Text style={styles.typeLabel}>
                      {income.type}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>暫無收入數據</Text>
            )}
          </View>

          {/* Top Expenses */}
          <View style={styles.topCard}>
            <Text style={styles.cardTitle}>最大支出 TOP 5</Text>
            {topExpenses.length > 0 ? (
              topExpenses.map((expense, index) => (
                <View key={expense.id} style={styles.topItem}>
                  <Text style={styles.topItemName}>{expense.name}</Text>
                  <View style={styles.topItemRight}>
                    <Text style={styles.lossAmount}>
                      -{formatCurrency(expense.amount)}
                    </Text>
                    <Text style={styles.typeLabel}>
                      {expense.type}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>暫無支出數據</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 編輯名稱Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>編輯名稱</Text>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>顯示名稱</Text>
              <TextInput
                style={styles.nameInput}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="請輸入您的名稱"
                placeholderTextColor="#999"
                maxLength={20}
                autoFocus={true}
              />
              <Text style={styles.inputHint}>最多20個字元</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  editNameButton: {
    padding: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clearDataButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  netWorthAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  negativeAmount: {
    color: '#FF3B30',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bentoGrid: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  assetsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  liabilitiesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  topItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  topItemRight: {
    alignItems: 'flex-end',
  },
  gainAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  gainPercent: {
    fontSize: 12,
    color: '#34C759',
  },
  lossAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  lossPercent: {
    fontSize: 12,
    color: '#FF3B30',
  },
  typeLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Modal樣式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F9FA',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
