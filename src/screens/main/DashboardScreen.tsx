import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ReliableDeleteService } from '../../services/reliableDeleteService';
import { runSyncValidationTests } from '../../utils/testSyncValidation';
import { userProfileService, UserProfile } from '../../services/userProfileService';
import ErrorBoundary from '../../components/ErrorBoundary';
import { clearAllStorage } from '../../utils/storageManager';
import { useAuthStore } from '../../store/authStore';
import { userDataSyncService } from '../../services/userDataSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { unifiedDataManager } from '../../services/unifiedDataManager';
import { DiagnosticButton } from '../../components/DiagnosticButton';
import SyncStatusIndicator from '../../components/SyncStatusIndicator';
import { assetDisplayFixService } from '../../services/assetDisplayFixService';
// import { SupabaseTableChecker } from '../../utils/supabaseTableChecker';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // 防止重複初始化
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

  // 防止重複初始化的 ref
  const initializationRef = useRef(false);

  // 初始化用戶資料服務和資產同步（只執行一次）
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initUserProfile = async () => {
      try {
        console.log('🚀 開始初始化 DashboardScreen...');
        await userProfileService.initialize();
        setUserProfile(userProfileService.getProfile());
        setIsInitialized(true);
        console.log('✅ DashboardScreen 初始化完成');
      } catch (error) {
        console.error('❌ 用戶資料初始化失敗:', error);
        setIsInitialized(true); // 即使失敗也標記為已初始化，避免重複嘗試
      }
    };
    initUserProfile();
  }, []);

  // 監聽用戶登錄狀態變化，自動觸發數據同步（防止重複執行）
  const syncTriggeredRef = useRef(false);
  useEffect(() => {
    if (user && isInitialized && !syncTriggeredRef.current) {
      syncTriggeredRef.current = true;
      console.log('👤 檢測到用戶登錄，自動觸發數據同步...');
      // 延遲執行，確保登錄流程完成
      setTimeout(() => {
        handleSyncToSupabase();
        // 重置標記，允許下次登錄時再次同步
        setTimeout(() => {
          syncTriggeredRef.current = false;
        }, 5000);
      }, 2000);
    }
  }, [user, isInitialized]);

  // 監聽所有資料變化（只在初始化完成後執行）
  const listenersSetupRef = useRef(false);
  useEffect(() => {
    if (!isInitialized || listenersSetupRef.current) return;
    listenersSetupRef.current = true;

    try {
      console.log('🔧 設置數據監聽器...');

      // 初始化資料
      setTransactions(transactionDataService.getTransactions());
      setAssets(assetTransactionSyncService.getAssets());
      setLiabilities(liabilityService.getLiabilities());

      // 添加監聽器（使用防抖機制）
      let updateTimeout: NodeJS.Timeout | null = null;

      const debouncedUpdate = () => {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          setTransactions(transactionDataService.getTransactions());
          setAssets(assetTransactionSyncService.getAssets());
          setLiabilities(liabilityService.getLiabilities());
        }, 100); // 100ms 防抖
      };

      const handleTransactionsUpdate = () => debouncedUpdate();
      const handleAssetsUpdate = (updatedAssets: AssetData[]) => {
        setAssets(updatedAssets);
      };
      const handleLiabilitiesUpdate = (updatedLiabilities: LiabilityData[]) => {
        setLiabilities(updatedLiabilities);
      };

      transactionDataService.addListener(handleTransactionsUpdate);
      assetTransactionSyncService.addListener(handleAssetsUpdate);
      liabilityService.addListener(handleLiabilitiesUpdate);

      // 添加財務數據更新事件監聽器（使用防抖）
      const handleFinancialDataUpdate = (data: any) => {
        console.log('📡 DashboardScreen 收到財務數據更新事件');
        debouncedUpdate();
      };

      eventEmitter.on(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.LIABILITY_ADDED, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.LIABILITY_DELETED, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, handleFinancialDataUpdate);
      eventEmitter.on(EVENTS.FORCE_REFRESH_DASHBOARD, handleFinancialDataUpdate);

      console.log('✅ 數據監聽器設置完成');

      // 清理函數
      return () => {
        if (updateTimeout) clearTimeout(updateTimeout);
        transactionDataService.removeListener(handleTransactionsUpdate);
        assetTransactionSyncService.removeListener(handleAssetsUpdate);
        liabilityService.removeListener(handleLiabilitiesUpdate);
        eventEmitter.off(EVENTS.FINANCIAL_DATA_UPDATED, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.LIABILITY_ADDED, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.LIABILITY_DELETED, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, handleFinancialDataUpdate);
        eventEmitter.off(EVENTS.FORCE_REFRESH_DASHBOARD, handleFinancialDataUpdate);
        listenersSetupRef.current = false;
      };
    } catch (error) {
      console.error('❌ DashboardScreen 監聽器設置失敗:', error);
    }
  }, [isInitialized]);

  // 組件卸載時的清理
  useEffect(() => {
    return () => {
      console.log('🧹 DashboardScreen 組件卸載，清理資源...');
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // 重置所有 ref
      initializationRef.current = false;
      syncTriggeredRef.current = false;
      listenersSetupRef.current = false;
    };
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

  // 使用 useMemo 確保在數據變化時重新計算，但避免無限循環
  const mockSummary = useMemo(() => {
    console.log('🔄 DashboardScreen 重新計算財務摘要, 數據長度:', {
      transactions: transactions?.length || 0,
      assets: assets?.length || 0,
      liabilities: liabilities?.length || 0
    });
    return calculateSummary();
  }, [transactions, assets, liabilities]); // 移除 forceRefresh 依賴

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

  // 計算正確的資產淨值（考慮交易影響）
  const calculateCorrectNetWorth = (safeTransactions: any[], safeAssets: any[], safeLiabilities: any[]) => {
    let adjustedTotalAssets = 0;

    console.log('🔍 開始計算資產淨值...');
    console.log(`📊 資產數量: ${safeAssets.length}, 交易數量: ${safeTransactions.length}, 負債數量: ${safeLiabilities.length}`);

    safeAssets.forEach(asset => {
      let assetValue = asset?.current_value || 0;

      // 計算該資產相關的所有交易影響
      const assetTransactions = safeTransactions.filter(t =>
        t.account === asset.name || t.from_account === asset.name || t.to_account === asset.name
      );

      let transactionImpact = 0;
      let incomeTotal = 0;
      let expenseTotal = 0;
      let transferInTotal = 0;
      let transferOutTotal = 0;

      assetTransactions.forEach(t => {
        if (t.account === asset.name) {
          // 直接使用該資產的交易
          if (t.type === 'income') {
            const amount = t.amount || 0;
            transactionImpact += amount;
            incomeTotal += amount;
          } else if (t.type === 'expense') {
            const amount = t.amount || 0;
            transactionImpact -= amount;
            expenseTotal += amount;
          }
        } else if (t.type === 'transfer') {
          // 轉帳交易
          if (t.from_account === asset.name) {
            const amount = t.amount || 0;
            transactionImpact -= amount;
            transferOutTotal += amount;
          } else if (t.to_account === asset.name) {
            const amount = t.amount || 0;
            transactionImpact += amount;
            transferInTotal += amount;
          }
        }
      });

      const finalAssetValue = assetValue + transactionImpact;
      adjustedTotalAssets += finalAssetValue;

      console.log(`💰 資產 "${asset.name}": 初始值 ${assetValue}, 收入 +${incomeTotal}, 支出 -${expenseTotal}, 轉入 +${transferInTotal}, 轉出 -${transferOutTotal}, 交易影響 ${transactionImpact}, 最終值 ${finalAssetValue}`);
    });

    const totalLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
    const netWorth = adjustedTotalAssets - totalLiabilities;

    console.log(`📊 計算結果: 總資產 ${adjustedTotalAssets}, 總負債 ${totalLiabilities}, 淨值 ${netWorth}`);

    return netWorth;
  };

  // 修復年度變化：生成正確的資產變化數據
  const netWorthData = useMemo(() => {
    try {
      console.log('📊 修復年度變化：開始生成圖表數據...');
      const startTime = Date.now();

      const currentDate = new Date();
      const labels: string[] = [];
      const data: number[] = [];

      // 確保數據存在且為陣列
      const safeTransactions = Array.isArray(transactions) ? transactions : [];
      const safeAssets = Array.isArray(assets) ? assets : [];
      const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];

      // 修復：使用簡單的總資產計算，不考慮複雜的交易影響
      const totalAssets = safeAssets.reduce((sum, asset) => sum + (asset?.current_value || asset?.value || 0), 0);
      const totalLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
      const currentNetWorth = totalAssets - totalLiabilities;

      console.log('📊 修復年度變化：當前淨值計算', {
        totalAssets,
        totalLiabilities,
        currentNetWorth
      });

      // 修復：找到最早的資產創建時間
      let earliestAssetDate = currentDate;
      if (safeAssets.length > 0) {
        safeAssets.forEach(asset => {
          if (asset.created_at || asset.createdAt || asset.last_updated) {
            const assetDate = new Date(asset.created_at || asset.createdAt || asset.last_updated);
            if (assetDate < earliestAssetDate) {
              earliestAssetDate = assetDate;
            }
          }
        });
      }

      console.log('📊 修復年度變化：最早資產創建時間', earliestAssetDate.toISOString());

      // 生成近12個月的標籤和數據
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        labels.push(`${month}月`);

        // 當前月份使用實際值
        const isCurrentMonth = date.getFullYear() === currentDate.getFullYear() &&
                              date.getMonth() === currentDate.getMonth();

        if (isCurrentMonth) {
          // 修復：當前月份使用實際計算的淨值
          data.push(Math.round(currentNetWorth));
          console.log(`📊 修復年度變化：${month}月(當前) = ${Math.round(currentNetWorth)}`);
        } else {
          // 修復：過去月份的處理邏輯
          if (date < earliestAssetDate) {
            // 修復：如果該月份早於最早資產創建時間，圓柱歸零
            data.push(0);
            console.log(`📊 修復年度變化：${month}月 早於資產創建時間，圓柱歸零`);
          } else if (currentNetWorth <= 0) {
            // 修復：如果當前淨值為0或負數，過去也為0
            data.push(0);
            console.log(`📊 修復年度變化：${month}月 當前淨值≤0，圓柱歸零`);
          } else {
            // 修復：該月份有資產，使用實際數字計算歷史值
            const monthsFromEarliest = (currentDate.getFullYear() - earliestAssetDate.getFullYear()) * 12 +
                                     (currentDate.getMonth() - earliestAssetDate.getMonth());
            const monthsFromCurrent = i;

            if (monthsFromEarliest <= 1) {
              // 修復：如果資產創建不到一個月，使用當前值
              const value = Math.round(currentNetWorth);
              data.push(value);
              console.log(`📊 修復年度變化：${month}月 資產創建<1月，使用當前值 = ${value}`);
            } else {
              // 修復：根據時間比例計算歷史值，使用實際數字
              const timeRatio = Math.max(0.1, (monthsFromEarliest - monthsFromCurrent) / monthsFromEarliest);
              const estimatedValue = Math.round(currentNetWorth * timeRatio);
              data.push(estimatedValue);
              console.log(`📊 修復年度變化：${month}月 估算值 = ${estimatedValue} (比例: ${timeRatio.toFixed(2)})`);
            }
          }
        }
      }

      const endTime = Date.now();
      console.log(`📊 圖表數據生成完成，耗時: ${endTime - startTime}ms`);

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
      console.error('❌ 圖表數據生成失敗:', error);
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
  }, [transactions, assets, liabilities]); // 只在數據變化時重新計算

  // netWorthData 現在是 useMemo 的結果，包含圖表數據

  // 計算真實的財務摘要數據（使用統一的計算邏輯）
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

    // 修復：使用與資產負債頁面相同的總資產計算邏輯
    const totalAssets = safeAssets.reduce((sum, asset) => sum + (asset?.current_value || asset?.value || 0), 0);
    const totalLiabilities = safeLiabilities.reduce((sum, liability) => sum + (liability?.balance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    console.log('🔧 修復：使用正確的總資產計算邏輯');
    console.log('- 原始資產值求和:', totalAssets);
    console.log('- 不再使用複雜的交易影響計算');

    console.log('📊 修復後財務摘要計算結果:');
    console.log('- 總資產:', totalAssets);
    console.log('- 總負債:', totalLiabilities);
    console.log('- 淨值:', netWorth);

    return {
      monthlyIncome,
      monthlyExpenses,
      totalAssets: totalAssets,
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

  // 防止連續刷新的 ref
  const lastRefreshTime = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onRefresh = async () => {
    const now = Date.now();

    // 防止連續快速刷新（500ms 內只允許一次）
    if (now - lastRefreshTime.current < 500) {
      console.log('⚠️ 刷新過於頻繁，已忽略');
      return;
    }

    lastRefreshTime.current = now;

    // 清除之前的超時
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    setRefreshing(true);
    console.log('🔄 DashboardScreen 手動刷新所有數據');

    try {
      setTransactions(transactionDataService.getTransactions());
      setAssets(assetTransactionSyncService.getAssets());
      setLiabilities(liabilityService.getLiabilities());

      // 設置超時來停止刷新狀態
      refreshTimeoutRef.current = setTimeout(() => {
        setRefreshing(false);
        refreshTimeoutRef.current = null;
      }, 1000);

    } catch (error) {
      console.error('❌ 刷新數據失敗:', error);
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 開始登出流程...');

      // 調用 auth store 的登出方法
      await signOut();

      console.log('✅ 登出成功');

      // 可選：清除本地數據（如果需要）
      // await clearAllStorage();

    } catch (error) {
      console.error('❌ 登出失敗:', error);
    }
  };

  // 用戶名稱編輯相關函數
  const handleEditName = () => {
    setEditingName(userProfile?.displayName || '小富翁');
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      console.error('❌ 名稱不能為空');
      return;
    }

    const success = await userProfileService.updateDisplayName(editingName.trim());
    if (success) {
      setUserProfile(userProfileService.getProfile());
      setShowEditNameModal(false);
      console.log('✅ 名稱已更新');
    } else {
      console.error('❌ 更新失敗，請重試');
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
      console.error('❌ 請輸入電子郵件和密碼');
      return;
    }

    clearError();

    try {
      if (isRegistering) {
        if (loginPassword !== confirmPassword) {
          console.error('❌ 密碼確認不一致');
          return;
        }
        if (loginPassword.length < 6) {
          console.error('❌ 密碼長度至少需要6個字符');
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
          console.error('❌ 登錄/註冊失敗:', currentError);
        }
      }, 500);

    } catch (error) {
      console.error('💥 登錄/註冊異常:', error);
      console.error('❌ 登錄過程中發生錯誤，請稍後再試');
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

  // 強制刷新用戶數據（使用三種方法確保修復）
  const handleForceRefreshData = async () => {
    try {
      console.log('🔄 開始三重修復數據...');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ 用戶未登錄，無法刷新數據');
        Alert.alert('錯誤', '用戶未登錄，無法刷新數據');
        return;
      }

      // 使用綜合修復服務
      const fixResult = await assetDisplayFixService.comprehensiveFix();

      // 同時刷新交易數據
      await transactionDataService.forceRefreshUserData();

      // 獲取最終統計
      const transactionStats = transactionDataService.getDataStats();
      const validation = await assetDisplayFixService.validateAssetData();

      console.log('📊 三重修復完成，最終統計:', {
        transactions: transactionStats.transactions,
        accounts: transactionStats.accounts,
        assets: validation.serviceCount,
        supabaseAssets: validation.supabaseCount
      });

      // 顯示詳細結果
      const resultMessage = `修復結果：

✅ 方法1 (直接加載): ${fixResult.methods.method1.success ? '成功' : '失敗'} - ${fixResult.methods.method1.count} 個資產
✅ 方法2 (服務重載): ${fixResult.methods.method2.success ? '成功' : '失敗'} - ${fixResult.methods.method2.count} 個資產
✅ 方法3 (同步帳戶): ${fixResult.methods.method3.success ? '成功' : '失敗'} - ${fixResult.methods.method3.count} 個資產

最終統計：
• 交易: ${transactionStats.transactions} 筆
• 帳戶: ${transactionStats.accounts} 個
• 資產: ${validation.serviceCount} 個
• Supabase資產: ${validation.supabaseCount} 個
• 數據一致性: ${validation.consistent ? '✅' : '❌'}`;

      Alert.alert(
        fixResult.success ? '修復成功' : '修復失敗',
        resultMessage,
        [{ text: '確定' }]
      );

    } catch (error) {
      console.error('❌ 三重修復失敗:', error);
      Alert.alert('修復失敗', `錯誤: ${error.message}`);
    }
  };

  // 🚀 全新上傳邏輯：使用統一數據管理器
  const handleSyncToSupabase = async () => {
    try {
      console.log('🚀 全新上傳：開始使用統一數據管理器上傳...');

      // 檢查用戶是否已登錄
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('錯誤', '請先登錄才能上傳數據');
        return;
      }

      console.log('✅ 全新上傳：用戶已登錄，開始上傳流程');

      // 顯示上傳進度
      Alert.alert('上傳中', '正在上傳本地數據到雲端，請稍候...', [], { cancelable: false });

      // 初始化統一數據管理器
      await unifiedDataManager.initialize();

      // 使用統一數據管理器上傳
      const result = await unifiedDataManager.uploadAllToCloud();

      console.log('🎯 全新上傳：上傳結果:', result);

      if (result.errors.length === 0) {
        // 上傳成功
        Alert.alert(
          '上傳成功！',
          `已成功上傳 ${result.uploaded} 筆數據到雲端！\n\n數據已安全保存到雲端存儲。`,
          [{ text: '確定', onPress: () => console.log('✅ 全新上傳：用戶確認上傳成功') }]
        );
      } else {
        // 部分失敗
        Alert.alert(
          '上傳部分成功',
          `成功上傳：${result.uploaded} 筆\n錯誤：${result.errors.length} 個\n\n錯誤詳情：\n${result.errors.join('\n')}`,
          [{ text: '確定', onPress: () => console.log('⚠️ 全新上傳：用戶確認部分成功') }]
        );
      }

    } catch (error) {
      console.error('❌ 全新上傳：上傳失敗:', error);
      Alert.alert(
        '上傳失敗',
        `上傳過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        [{ text: '確定', onPress: () => console.log('❌ 全新上傳：用戶確認上傳錯誤') }]
      );
    }
  };

  // 診斷 Supabase 表結構
  const handleDiagnoseSupabase = async () => {
    console.log('🔥 診斷按鈕被點擊！');
    Alert.alert('診斷按鈕測試', '診斷按鈕正常工作！');

    try {
      console.log('🚨 開始超級診斷和修復...');
      Alert.alert('開始診斷', '正在執行超級修復，請查看控制台日誌...');

      // 步驟 0: 檢查用戶登錄狀態
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log('👤 用戶狀態:', currentUser ? `已登錄 (${currentUser.email})` : '未登錄');

      if (!currentUser) {
        Alert.alert('錯誤', '請先登錄');
        return;
      }

      console.log('🔍 步驟 1: 檢查 Supabase 連接...');

      // 步驟 1: 測試基本連接
      try {
        const { count, error: testError } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        if (testError) {
          console.error('❌ Supabase 連接測試失敗:', testError);
          Alert.alert('連接失敗', `Supabase 連接有問題: ${testError.message}`);
          return;
        }
        console.log('✅ Supabase 連接正常，資產數量:', count);
      } catch (connectionError) {
        console.error('❌ 連接測試異常:', connectionError);
        Alert.alert('連接異常', '無法連接到 Supabase');
        return;
      }

      console.log('🔍 步驟 2: 獲取資產數據...');

      // 步驟 2: 獲取資產數據
      const { data: supabaseAssets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', currentUser.id);

      if (assetsError) {
        console.error('❌ 獲取資產失敗:', assetsError);
        Alert.alert('獲取失敗', `無法獲取資產數據: ${assetsError.message}`);
        return;
      }

      console.log(`📊 從 Supabase 獲得 ${supabaseAssets?.length || 0} 項資產`);

      if (supabaseAssets && supabaseAssets.length > 0) {
        console.log('📋 原始資產數據:', supabaseAssets);

        console.log('🔍 步驟 3: 轉換資產格式...');

        // 步驟 3: 轉換為本地格式
        const localAssets = supabaseAssets.map((asset: any, index: number) => {
          const converted = {
            id: asset.id,
            name: asset.name || `資產${index + 1}`,
            type: asset.type || 'bank',
            quantity: Number(asset.quantity) || 1,
            cost_basis: Number(asset.cost_basis || asset.value || asset.current_value || 0),
            current_value: Number(asset.current_value || asset.value || asset.cost_basis || 0),
            stock_code: asset.stock_code,
            purchase_price: Number(asset.purchase_price || 0),
            current_price: Number(asset.current_price || 0),
            last_updated: asset.updated_at || asset.created_at,
            sort_order: Number(asset.sort_order) || index
          };
          console.log(`✅ 轉換資產 ${index + 1}: ${converted.name} = ${converted.current_value}`);
          return converted;
        });

        console.log('🔍 步驟 4: 保存到本地存儲...');

        // 步驟 4: 保存到本地存儲 - 使用正確的鍵名
        await AsyncStorage.setItem('@FinTranzo:assets', JSON.stringify(localAssets));
        console.log('✅ 已保存到本地存儲 (使用正確鍵名: @FinTranzo:assets)');

        console.log('🔍 步驟 5: 直接更新 UI 狀態...');

        // 步驟 5: 直接更新狀態，不依賴任何服務
        setAssets(localAssets);
        setForceRefresh(prev => prev + 1);

        console.log('🔍 步驟 6: 發送事件通知...');

        // 步驟 6: 跳過事件通知，避免導入錯誤
        console.log('⚠️ 跳過事件發送，避免導入錯誤');

        console.log('🔍 步驟 7: 強制刷新數據...');

        // 步驟 7: 強制重新加載資產服務並更新狀態
        await assetTransactionSyncService.forceReload();
        setTransactions(transactionDataService.getTransactions());
        setAssets(assetTransactionSyncService.getAssets());
        setLiabilities(liabilityService.getLiabilities());
        setForceRefresh(prev => prev + 1);

        console.log('✅ 資產服務已強制重新加載');

        const totalValue = localAssets.reduce((sum, asset) => sum + asset.current_value, 0);
        console.log(`✅ 超級修復完成！總價值: ${totalValue}`);

        // 步驟 8: 驗證同步結果
        console.log('🔍 步驟 8: 驗證同步結果...');
        const verifyAssets = assetTransactionSyncService.getAssets();
        console.log('📊 驗證結果: 資產服務中的資產數量:', verifyAssets.length);
        console.log('📊 驗證結果: 資產服務中的總價值:', verifyAssets.reduce((sum, asset) => sum + asset.current_value, 0));

        Alert.alert(
          '超級修復成功！',
          `已成功獲取並設置 ${localAssets.length} 項資產。\n總價值: ${totalValue.toLocaleString()} 元\n\n資產服務驗證: ${verifyAssets.length} 項資產\n\n請檢查資產負債表是否正確顯示。`
        );

      } else {
        console.log('📝 Supabase 中沒有找到資產數據');

        // 檢查是否有其他表的數據
        console.log('🔍 檢查其他表的數據...');
        try {
          const { count: transactionCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id);

          const { count: liabilityCount } = await supabase
            .from('liabilities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUser.id);

          console.log('📊 其他數據統計:', {
            transactions: transactionCount,
            liabilities: liabilityCount
          });
        } catch (checkError) {
          console.log('⚠️ 檢查其他表失敗:', checkError);
        }

        Alert.alert(
          '沒有資產數據',
          'Supabase 中沒有找到您的資產數據。\n\n請先在資產負債頁面添加一些資產，然後再嘗試同步。'
        );
      }

    } catch (error) {
      console.error('❌ 超級修復失敗:', error);
      Alert.alert(
        '修復失敗',
        `修復過程中發生錯誤：\n${error.message || '未知錯誤'}\n\n請查看控制台日誌了解詳細信息。`
      );
    }
  };

  // 🗑️ 可靠刪除：使用可靠刪除服務
  const handleClearAllData = async () => {
    console.log('🗑️ 可靠刪除：清空按鈕被點擊');

    Alert.alert(
      '確定刪除所有資料？',
      '此操作將永久刪除：\n• 所有交易記錄\n• 所有資產\n• 所有負債\n\n此操作會同時清空本地和雲端數據，無法撤銷！',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '確定刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              // 使用可靠刪除服務
              const result = await ReliableDeleteService.clearAllData({
                verifyDeletion: true,
                retryCount: 3,
                timeout: 15000
              });

              if (result.success) {
                console.log('✅ 可靠刪除：清空成功');

                // 重新加載數據
                await loadDashboardData();

                Alert.alert(
                  '刪除成功',
                  `已成功刪除 ${result.deletedCount} 筆數據\n\n本地存儲: ${result.details.localStorage ? '✅' : '❌'}\n雲端存儲: ${result.details.cloudStorage ? '✅' : '❌'}\n驗證結果: ${result.details.verification ? '✅' : '❌'}`,
                  [{ text: '確定' }]
                );
              } else {
                console.error('❌ 可靠刪除：清空失敗:', result.errors);
                Alert.alert(
                  '刪除失敗',
                  `刪除過程中發生錯誤：\n${result.errors.join('\n')}`,
                  [{ text: '確定' }]
                );
              }
            } catch (error) {
              console.error('❌ 可靠刪除：操作異常:', error);
              Alert.alert(
                '刪除失敗',
                `操作過程中發生錯誤：${error.message}`,
                [{ text: '確定' }]
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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
          {/* 同步狀態指示器 */}
          <SyncStatusIndicator style={styles.syncIndicator} />

          {/* 上傳按鈕 - 只在已登錄時顯示 */}
          {user && (
            <TouchableOpacity onPress={handleSyncToSupabase} style={styles.uploadButton}>
              <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              <Text style={{ fontSize: 10, color: '#007AFF' }}>上傳</Text>
            </TouchableOpacity>
          )}

          {/* 刷新數據按鈕 - 只在已登錄時顯示 */}
          {user && (
            <TouchableOpacity onPress={handleForceRefreshData} style={[styles.uploadButton, { marginLeft: 8 }]}>
              <Ionicons name="refresh-outline" size={20} color="#34C759" />
              <Text style={{ fontSize: 10, color: '#34C759' }}>刷新</Text>
            </TouchableOpacity>
          )}

          {/* 登出按鈕 - 取代診斷按鈕，永遠顯示 */}
          <TouchableOpacity
            onPress={user ? handleSignOut : () => console.log('未登錄')}
            style={[styles.signOutButton, { opacity: user ? 1 : 0.3 }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF9500" />
            <Text style={{ fontSize: 10, color: '#FF9500' }}>
              {user ? '登出' : '未登錄'}
            </Text>
          </TouchableOpacity>

          {/* 診斷按鈕 - 只在已登錄時顯示 */}
          {user && (
            <DiagnosticButton style={styles.diagnoseButton} />
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
              if (netWorthData.labels.length === 0 || netWorthData.datasets[0].data.length === 0) {
                return (
                  <View style={styles.chartPlaceholder}>
                    <Text style={styles.chartPlaceholderText}>暫無資產變化數據</Text>
                    <Text style={styles.chartPlaceholderSubtext}>
                      開始記帳後將顯示資產變化趨勢
                    </Text>
                  </View>
                );
              }

              // 精準修復：年度變化計算邏輯（根據資產創建時間）
              const latestValue = netWorthData.datasets[0].data[netWorthData.datasets[0].data.length - 1];
              const firstValue = netWorthData.datasets[0].data[0];
              const change = latestValue - firstValue;

              console.log('📊 精準修復：年度變化計算');
              console.log('- 當前值:', latestValue);
              console.log('- 一年前值:', firstValue);
              console.log('- 變化:', change);

              // 緊急修復：根據實際數據情況計算年度變化
              let displayLabel, displayValue, changePercent, isFirstMonth;

              // 緊急修復：檢查是否有足夠的歷史數據
              const hasHistoricalData = netWorthData.datasets[0].data.some((value, index) =>
                index < netWorthData.datasets[0].data.length - 1 && value > 0
              );

              if (!hasHistoricalData || firstValue === 0) {
                // 緊急修復：沒有歷史數據或一年前為0，顯示當前總資產
                displayLabel = '當前總資產';
                displayValue = latestValue;
                changePercent = 0;
                isFirstMonth = true; // 緊急修復：定義 isFirstMonth 變數
                console.log('📊 緊急修復：無歷史數據，顯示當前總資產');
              } else {
                // 緊急修復：有歷史數據，計算年度變化
                displayLabel = '年度變化';
                displayValue = change;
                isFirstMonth = false; // 緊急修復：定義 isFirstMonth 變數

                if (firstValue === 0) {
                  // 緊急修復：從0開始，成長率為無限大（0→100萬顯示+100萬(∞%)）
                  changePercent = '∞';
                  console.log('📊 緊急修復：從0成長，顯示∞%');
                } else {
                  // 緊急修復：正確計算成長率
                  // 當月資產/一年前的資產 - 1 = 成長率
                  // 例如：500萬/100萬 - 1 = 4 = 400%
                  changePercent = Math.round(((latestValue / firstValue) - 1) * 100);
                  console.log('📊 緊急修復：計算成長率:', `${latestValue}/${firstValue} - 1 = ${changePercent}%`);
                }
              }

              return (
                <View style={styles.chartDataContainer}>
                  <View style={styles.chartSummaryRow}>
                    <Text style={styles.chartSummaryLabel}>
                      {displayLabel}
                    </Text>
                    <Text style={[
                      styles.chartSummaryValue,
                      isFirstMonth ? styles.neutralChange : (change >= 0 ? styles.positiveChange : styles.negativeChange)
                    ]}>
                      {isFirstMonth ?
                        formatCurrency(displayValue) :
                        `${change >= 0 ? '+' : ''}${formatCurrency(displayValue)} (${changePercent}${changePercent === '∞' ? '' : '%'})`
                      }
                    </Text>
                  </View>
                  <View style={styles.chartTrendContainer}>
                    {netWorthData.datasets[0].data.map((value, index) => {
                      // 終極修復：過去金額為零時圓柱完全歸零，使用實際數字
                      const maxValue = Math.max(...netWorthData.datasets[0].data.map(v => Math.abs(v || 0)));
                      const safeValue = value || 0;

                      console.log(`📊 終極修復：柱狀圖第${index}個值: ${safeValue}, 最大值: ${maxValue}`);

                      // 終極修復：如果值為0，高度就是0（圓柱完全歸零）
                      let height;
                      if (safeValue === 0) {
                        height = 0;
                        console.log(`📊 終極修復：第${index}個柱子值為0，高度設為0`);
                      } else if (maxValue > 0) {
                        height = Math.max(2, Math.abs(safeValue) / maxValue * 40);
                        console.log(`📊 終極修復：第${index}個柱子計算高度: ${height}`);
                      } else {
                        height = 2;
                        console.log(`📊 終極修復：第${index}個柱子使用默認高度: ${height}`);
                      }

                      // 確保高度是有效數字
                      const finalHeight = isNaN(height) ? 0 : height;

                      return (
                        <View
                          key={index}
                          style={[
                            styles.chartBar,
                            {
                              height: finalHeight,
                              backgroundColor: safeValue >= 0 ? '#34C759' : '#FF3B30',
                              // 終極修復：當高度為0時，完全不顯示（不設置minHeight）
                              opacity: finalHeight === 0 ? 0 : 1
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.chartLabelsContainer}>
                    <Text style={styles.chartLabel}>{netWorthData.labels[0]}</Text>
                    <Text style={styles.chartLabel}>{netWorthData.labels[Math.floor(netWorthData.labels.length / 2)]}</Text>
                    <Text style={styles.chartLabel}>{netWorthData.labels[netWorthData.labels.length - 1]}</Text>
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

                  {/* 登出按鈕已移到 header，這裡不需要重複 */}
                </View>
              ) : (
                // 未登錄狀態
                <View>
                  {/* Google 登錄按鈕 - 強制啟用 */}
                  <TouchableOpacity
                    onPress={handleGoogleLogin}
                    style={[styles.googleLoginButton, { opacity: 1 }]}
                    disabled={false}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.googleLoginText}>
                      🔥 Google 登錄 (已啟用)
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
    alignItems: 'center',
    gap: 12,
  },
  syncIndicator: {
    marginRight: 8,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5E6',
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
  neutralChange: {
    color: '#007AFF',
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
  // 移除重複的登出按鈕樣式，使用 header 中的樣式
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
