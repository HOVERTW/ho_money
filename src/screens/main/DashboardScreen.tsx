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
// import { LineChart } from 'react-native-chart-kit'; // 移除不兼容的圖表庫
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transactionDataService, Transaction } from '../../services/transactionDataService';
import { assetTransactionSyncService, AssetData } from '../../services/assetTransactionSyncService';
import { liabilityService, LiabilityData } from '../../services/liabilityService';
// import { currentMonthCalculationService } from '../../services/currentMonthCalculationService'; // 已移除
import { eventEmitter, EVENTS } from '../../services/eventEmitter';
import { recurringTransactionService } from '../../services/recurringTransactionService';
import { FinancialCalculator } from '../../utils/financialCalculator';
import { runSyncValidationTests } from '../../utils/testSyncValidation';
import { userProfileService, UserProfile } from '../../services/userProfileService';
import ErrorBoundary from '../../components/ErrorBoundary';
import { clearAllStorage } from '../../utils/storageManager';
import { useAuthStore } from '../../store/authStore';
import { userDataSyncService } from '../../services/userDataSyncService';
// import { SupabaseTableChecker } from '../../utils/supabaseTableChecker';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
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

  // 登錄相關狀態
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // 從 auth store 獲取認證狀態和方法
  const {
    user,
    loading: authLoading,
    error: authError,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError
  } = useAuthStore();

  // 初始化用戶資料服務和資產同步
  useEffect(() => {
    const initUserProfile = async () => {
      try {
        await userProfileService.initialize();
        setUserProfile(userProfileService.getProfile());

        // 啟動資產自動同步（使用原本的服務）
        console.log('✅ 使用原本的資產服務');
      } catch (error) {
        console.error('❌ 用戶資料初始化失敗:', error);
      }
    };
    initUserProfile();
  }, []);

  // 監聽用戶登錄狀態變化，自動觸發數據同步
  useEffect(() => {
    if (user) {
      console.log('👤 檢測到用戶登錄，自動觸發數據同步...');
      // 延遲執行，確保登錄流程完成
      setTimeout(() => {
        handleSyncToSupabase();
      }, 2000);
    }
  }, [user]);

  // 監聽所有資料變化
  useEffect(() => {
    try {
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

      const handleLiabilityAdded = (liability: any) => {
        console.log('🔥 DashboardScreen 收到負債添加事件:', liability.name);
        // 立即刷新所有數據
        setLiabilities(liabilityService.getLiabilities());
        setTransactions(transactionDataService.getTransactions());
        setAssets(assetTransactionSyncService.getAssets());
        setForceRefresh(prev => prev + 1);
      };

      eventEmitter.on(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
      eventEmitter.on(EVENTS.LIABILITY_DELETED, handleLiabilityAdded);
      eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.FORCE_REFRESH_DASHBOARD, handleFinancialDataUpdate);

      // 清理函數
      return () => {
        transactionDataService.removeListener(handleTransactionsUpdate);
        assetTransactionSyncService.removeListener(handleAssetsUpdate);
        liabilityService.removeListener(handleLiabilitiesUpdate);
        eventEmitter.off(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
        eventEmitter.off(EVENTS.LIABILITY_DELETED, handleLiabilityAdded);
        eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.FORCE_REFRESH_DASHBOARD, handleFinancialDataUpdate);
      };
    } catch (error) {
      console.error('❌ DashboardScreen 初始化失敗:', error);
    }
  }, []);

  // 使用獨立計算器
  const calculateSummary = () => {
    try {
      const summary = FinancialCalculator.calculateCurrentMonthSummary();
      return {
        net_worth: summary.netWorth,
        total_assets: summary.totalAssets,
        total_liabilities: summary.totalLiabilities,
        monthly_income: summary.monthlyIncome,
        monthly_expenses: summary.totalExpenses,
        savings_rate: summary.savingsRate,
        monthly_debt_payments: summary.monthlyDebtPayments,
      };
    } catch (error) {
      console.error('❌ 財務計算失敗:', error);
      return {
        net_worth: 0,
        total_assets: 0,
        total_liabilities: 0,
        monthly_income: 0,
        monthly_expenses: 0,
        savings_rate: 0,
        monthly_debt_payments: 0,
      };
    }
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

  // 計算收入支出分析
  const calculateTopIncomeExpense = () => {
    try {
      if (timeRange === 'month') {
        const incomeExpenseAnalysis = FinancialCalculator.getTopIncomeExpenseAnalysis();
        return {
          topIncomes: incomeExpenseAnalysis.topIncomes,
          topExpenses: incomeExpenseAnalysis.topExpenses,
        };
      } else {
        const topIncomes: Array<{ id: string; name: string; amount: number; type: string }> = [];
        const topExpenses: Array<{ id: string; name: string; amount: number; type: string }> = [];
        const { startDate, endDate } = getDateRange();

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
    } catch (error) {
      console.error('❌ 收支分析計算失敗:', error);
      return {
        topIncomes: [],
        topExpenses: [],
      };
    }
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
      for (let i = 11; i >= 0; i--) {
        try {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
          const month = date.getMonth() + 1;
          labels.push(`${month}月`);

          // 計算該月的實際資產變化
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);

          const monthTransactions = safeTransactions.filter(t => {
            if (!t || !t.date) return false;
            const tDate = new Date(t.date);
            if (isNaN(tDate.getTime())) return false;
            return tDate >= monthStart && tDate <= monthEnd;
          });

          const monthIncome = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          const monthExpense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          const currentAssets = safeAssets.reduce((sum, asset) => sum + (asset?.current_value || 0), 0);
          const currentLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
          const currentNetWorth = currentAssets - currentLiabilities;

          const todayDate = new Date();
          const isCurrentMonth = date.getFullYear() === todayDate.getFullYear() &&
                                date.getMonth() === todayDate.getMonth();

          let monthNetWorth;
          if (isCurrentMonth) {
            monthNetWorth = currentNetWorth;
          } else {
            const futureTransactions = safeTransactions.filter(t => {
              if (!t || !t.date) return false;
              const tDate = new Date(t.date);
              if (isNaN(tDate.getTime())) return false;
              return tDate > monthEnd;
            });

            const futureNetChange = futureTransactions
              .filter(t => t.type === 'income')
              .reduce((sum, t) => sum + (t.amount || 0), 0) -
              futureTransactions
              .filter(t => t.type === 'expense')
              .reduce((sum, t) => sum + (t.amount || 0), 0);

            monthNetWorth = currentNetWorth - futureNetChange + (monthIncome - monthExpense);
          }

          // 確保 monthNetWorth 是有效數字
          const safeMonthNetWorth = isNaN(monthNetWorth) ? 0 : monthNetWorth;
          data.push(safeMonthNetWorth);
        } catch (error) {
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

  // 計算真實的財務摘要數據
  const calculateRealFinancialSummary = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeAssets = Array.isArray(assets) ? assets : [];
    const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];

    const currentMonthTransactions = safeTransactions.filter(t => {
      if (!t || !t.date) return false;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return false;
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

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
  const { topIncomes, topExpenses } = calculateTopIncomeExpense();

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
      fontSize: 10,
    },
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 DashboardScreen 強制刷新所有數據');
    setTransactions(transactionDataService.getTransactions());
    setAssets(assetTransactionSyncService.getAssets());
    setLiabilities(liabilityService.getLiabilities());
    setForceRefresh(prev => prev + 1);
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

  // 上傳按鈕處理函數
  const handleUploadClick = () => {
    if (user) {
      // 用戶已登錄，直接進行同步
      handleSyncToSupabase();
    } else {
      // 用戶未登錄，顯示登錄模態
      setShowLoginModal(true);
      clearError();
    }
  };

  // 處理登錄
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('錯誤', '請輸入電子郵件和密碼');
      return;
    }

    clearError();

    try {
      if (isRegistering) {
        if (loginPassword !== confirmPassword) {
          Alert.alert('錯誤', '密碼確認不一致');
          return;
        }
        if (loginPassword.length < 6) {
          Alert.alert('錯誤', '密碼長度至少需要6個字符');
          return;
        }
        console.log('🔐 開始註冊流程:', loginEmail.trim());
        await signUp(loginEmail.trim(), loginPassword);
      } else {
        console.log('🔐 開始登錄流程:', loginEmail.trim());
        await signIn(loginEmail.trim(), loginPassword);
      }

      // 等待一下讓狀態更新
      setTimeout(() => {
        const { user: currentUser, error: currentError } = useAuthStore.getState();

        if (currentUser && !currentError) {
          console.log('✅ 登錄/註冊成功:', currentUser.email);
          setShowLoginModal(false);
          resetLoginForm();
          // 登錄成功後自動同步
          setTimeout(() => {
            handleSyncToSupabase();
          }, 1000);
        } else if (currentError) {
          console.log('❌ 登錄/註冊失敗:', currentError);
          Alert.alert(isRegistering ? '註冊失敗' : '登錄失敗', currentError);
        }
      }, 500);

    } catch (error) {
      console.error('💥 登錄/註冊異常:', error);
      Alert.alert('錯誤', '登錄過程中發生錯誤，請稍後再試');
    }
  };

  // 處理 Google 登錄
  const handleGoogleLogin = async () => {
    clearError();

    try {
      console.log('🔐 開始 Google 登錄流程');
      await signInWithGoogle();

      // 等待一下讓狀態更新
      setTimeout(() => {
        const { user: currentUser, error: currentError } = useAuthStore.getState();

        if (currentUser && !currentError) {
          console.log('✅ Google 登錄成功:', currentUser.email);
          setShowLoginModal(false);
          resetLoginForm();
          // 登錄成功後自動同步
          setTimeout(() => {
            handleSyncToSupabase();
          }, 1000);
        } else if (currentError) {
          console.log('❌ Google 登錄失敗:', currentError);
          Alert.alert('Google 登錄失敗', currentError);
        }
      }, 500);

    } catch (error) {
      console.error('💥 Google 登錄異常:', error);
      Alert.alert('錯誤', 'Google 登錄過程中發生錯誤，請稍後再試');
    }
  };

  // 重置登錄表單
  const resetLoginForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setConfirmPassword('');
    setIsRegistering(false);
  };

  // 關閉登錄模態
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    resetLoginForm();
    clearError();
  };

  // 手動觸發數據同步到 Supabase
  const handleSyncToSupabase = async () => {
    if (!user) {
      console.log('❌ 用戶未登錄，無法同步');
      return;
    }

    try {
      console.log('🔄 開始手動同步數據到 Supabase...');

      // 觸發用戶數據同步
      await userDataSyncService.initializeUserData(user);

      console.log('✅ 手動同步完成');
      window.alert('同步完成！數據已成功同步到雲端。');

    } catch (error) {
      console.error('❌ 手動同步失敗:', error);
      window.alert(`同步失敗：${error.message || '未知錯誤'}`);
    }
  };

  // 診斷 Supabase 表結構
  const handleDiagnoseSupabase = async () => {
    if (!user) {
      Alert.alert('錯誤', '請先登錄');
      return;
    }

    try {
      console.log('🔍 開始診斷 Supabase 表結構...');
      Alert.alert('診斷功能', '診斷功能暫時停用，請查看控制台日誌');

      // TODO: 重新啟用診斷功能
      // const tableStatus = await SupabaseTableChecker.checkAllTables();
      // const userDataCounts = await SupabaseTableChecker.checkUserData();
      // const insertionTest = await SupabaseTableChecker.testDataInsertion();
      // const assetInsertionTest = await SupabaseTableChecker.testAssetInsertion();

    } catch (error) {
      console.error('❌ 診斷失敗:', error);
      Alert.alert('診斷失敗', `診斷過程中發生錯誤：${error.message || '未知錯誤'}`);
    }
  };

  // 一鍵清除所有資料功能
  const handleClearAllData = async () => {
    console.log('🗑️ 刪除按鈕被點擊');

    // 使用瀏覽器原生確認對話框
    const confirmed = window.confirm(
      '確定刪除所有資料？\n\n此操作將永久刪除：\n• 所有交易記錄\n• 所有資產數據\n• 所有負債數據\n• 用戶設定\n• 其他應用數據\n\n此操作無法撤銷！'
    );

    if (!confirmed) {
      console.log('用戶取消刪除操作');
      return;
    }

    try {
      console.log('🧹 用戶確認，開始清除所有資料...');

      const success = await clearAllStorage();

      if (success) {
        console.log('✅ 所有資料清除成功');

        // 重置所有本地狀態
        setTransactions([]);
        setAssets([]);
        setLiabilities([]);
        setForceRefresh(prev => prev + 10);

        // 重新初始化所有服務
        await transactionDataService.initialize();
        await assetTransactionSyncService.initialize();
        await liabilityService.initialize();

        window.alert('清除完成！所有資料已清除完成！應用程式已重新初始化。');
      } else {
        console.error('❌ 清除資料失敗');
        window.alert('錯誤：清除資料失敗，請稍後再試。');
      }
    } catch (error) {
      console.error('❌ 清除資料時發生錯誤:', error);
      window.alert(`錯誤：清除資料時發生錯誤：${error.message || '未知錯誤'}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getTimeRangeText = () => {
    switch (timeRange) {
      case 'today': return '今日';
      case 'week': return '本週';
      case 'month': return '本月';
      case 'total': return '總計';
      default: return '本月';
    }
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.userInfo}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>您好，</Text>
            <TouchableOpacity onPress={handleEditName} style={styles.editNameButton}>
              <Ionicons name="create-outline" size={16} color="#007AFF" />
            </TouchableOpacity>

            {/* 顯示登錄狀態 - 緊貼編輯按鈕右側 */}
            {user ? (
              <View style={[styles.loginStatusContainer, styles.loggedInContainer]}>
                <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                <Text style={styles.loginStatusText}>{user.email}</Text>
              </View>
            ) : (
              <View style={[styles.loginStatusContainer, styles.loggedOutContainer]}>
                <Ionicons name="alert-circle-outline" size={12} color="#FF9500" />
                <Text style={styles.logoutStatusText}>未登錄</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{userProfile?.displayName || '小富翁'}</Text>
        </View>

        <View style={styles.headerButtons}>
          {/* Supabase 診斷按鈕 - 只在已登錄時顯示 */}
          {user && (
            <TouchableOpacity onPress={handleDiagnoseSupabase} style={styles.diagnoseButton}>
              <Ionicons name="medical-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}

          {/* 一鍵清除按鈕 */}
          <TouchableOpacity onPress={handleClearAllData} style={styles.clearDataButton}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

      </View>

      {/* 登錄提示橫幅 - 只在未登錄時顯示 */}
      {!user && (
        <View style={styles.loginBanner}>
          <View style={styles.loginBannerContent}>
            <Ionicons name="cloud-outline" size={24} color="#007AFF" />
            <View style={styles.loginBannerText}>
              <Text style={styles.loginBannerTitle}>體驗雲端同步</Text>
              <Text style={styles.loginBannerSubtitle}>登錄後可在多設備間同步您的財務數據</Text>
            </View>
            <TouchableOpacity onPress={handleUploadClick} style={styles.loginBannerButton}>
              <Text style={styles.loginBannerButtonText}>登錄</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100), // 確保底部有足夠空間
        }}
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
          {/* 實際的資產變化圖表 */}
          <View style={styles.chartContainer}>
            {(() => {
              const yearlyData = generateYearlyNetWorthData();
              if (yearlyData.labels.length === 0 || yearlyData.datasets[0].data.length === 0) {
                return (
                  <View style={styles.chartPlaceholder}>
                    <Text style={styles.chartPlaceholderText}>暫無資產變化數據</Text>
                    <Text style={styles.chartPlaceholderSubtext}>
                      開始記帳後將顯示資產變化趨勢
                    </Text>
                  </View>
                );
              }

              // 簡化的圖表顯示
              const latestValue = yearlyData.datasets[0].data[yearlyData.datasets[0].data.length - 1];
              const firstValue = yearlyData.datasets[0].data[0];
              const change = latestValue - firstValue;
              const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : '0';

              return (
                <View style={styles.chartDataContainer}>
                  <View style={styles.chartSummaryRow}>
                    <Text style={styles.chartSummaryLabel}>年度變化</Text>
                    <Text style={[
                      styles.chartSummaryValue,
                      change >= 0 ? styles.positiveChange : styles.negativeChange
                    ]}>
                      {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent}%)
                    </Text>
                  </View>
                  <View style={styles.chartTrendContainer}>
                    {yearlyData.datasets[0].data.map((value, index) => {
                      // 安全的高度計算，避免 NaN
                      const maxValue = Math.max(...yearlyData.datasets[0].data.map(v => Math.abs(v || 0)));
                      const safeValue = value || 0;
                      const height = maxValue > 0
                        ? Math.max(4, Math.abs(safeValue) / maxValue * 40)
                        : 4;

                      // 確保高度是有效數字
                      const finalHeight = isNaN(height) ? 4 : height;

                      return (
                        <View
                          key={index}
                          style={[
                            styles.chartBar,
                            {
                              height: finalHeight,
                              backgroundColor: safeValue >= 0 ? '#34C759' : '#FF3B30'
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.chartLabelsContainer}>
                    <Text style={styles.chartLabel}>{yearlyData.labels[0]}</Text>
                    <Text style={styles.chartLabel}>{yearlyData.labels[Math.floor(yearlyData.labels.length / 2)]}</Text>
                    <Text style={styles.chartLabel}>{yearlyData.labels[yearlyData.labels.length - 1]}</Text>
                  </View>
                </View>
              );
            })()}
          </View>
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

      {/* 登錄模態 */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseLoginModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loginModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {user ? '已登錄' : (isRegistering ? '註冊帳號' : '登錄帳號')}
              </Text>
              <TouchableOpacity onPress={handleCloseLoginModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {user ? (
                // 已登錄狀態
                <View style={styles.loggedInContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="#34C759" style={styles.successIcon} />
                  <Text style={styles.loggedInText}>您已成功登錄</Text>
                  <Text style={styles.userEmailText}>{user.email}</Text>

                  <View style={styles.autoSyncInfo}>
                    <Ionicons name="sync" size={16} color="#007AFF" />
                    <Text style={styles.autoSyncText}>數據已自動同步到雲端</Text>
                  </View>

                  <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                    <Text style={styles.signOutButtonText}>登出</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // 未登錄狀態
                <View>
                  {/* Google 登錄按鈕 - Development build 中暫時禁用 */}
                  <TouchableOpacity
                    onPress={handleGoogleLogin}
                    style={[
                      styles.googleLoginButton,
                      { opacity: 0.3 }
                    ]}
                    disabled={true}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.googleLoginText}>
                      Google 登錄（Development build 中暫不可用）
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>或</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* 電子郵件登錄表單 */}
                  <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>電子郵件</Text>
                    <TextInput
                      style={styles.loginInput}
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      placeholder="請輸入您的電子郵件"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <Text style={styles.inputLabel}>密碼</Text>
                    <TextInput
                      style={styles.loginInput}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder={isRegistering ? "請輸入密碼（至少6個字符）" : "請輸入您的密碼"}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    {isRegistering && (
                      <>
                        <Text style={styles.inputLabel}>確認密碼</Text>
                        <TextInput
                          style={styles.loginInput}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="請再次輸入密碼"
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </>
                    )}

                    <TouchableOpacity
                      onPress={handleLogin}
                      style={[styles.loginButton, authLoading && styles.disabledButton]}
                      disabled={authLoading}
                    >
                      <Text style={styles.loginButtonText}>
                        {authLoading ? (isRegistering ? '註冊中...' : '登錄中...') : (isRegistering ? '註冊' : '登錄')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsRegistering(!isRegistering)}
                      style={styles.switchModeButton}
                    >
                      <Text style={styles.switchModeText}>
                        {isRegistering ? '已有帳號？立即登錄' : '沒有帳號？立即註冊'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    gap: 8,
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
    marginBottom: 4,
  },
  loginStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  loginStatusText: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '500',
  },
  logoutStatusText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '500',
  },
  loggedInContainer: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  loggedOutContainer: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8F0',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#E5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDataButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  diagnoseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#E5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 登錄橫幅樣式
  loginBanner: {
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5F3FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginBannerText: {
    flex: 1,
  },
  loginBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  loginBannerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  loginBannerButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginBannerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartDataContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  chartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartSummaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  chartSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  chartTrendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 8,
  },
  chartBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
  chartLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 10,
    color: '#999',
  },
  chartDataSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  chartDataText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
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
  // 登錄模態樣式
  loginModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  loggedInContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  loggedInText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userEmailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  autoSyncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5F3FF',
  },
  autoSyncText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  signOutButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  googleLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  googleLoginText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 16,
  },
  formContainer: {
    gap: 16,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F9FA',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
