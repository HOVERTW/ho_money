import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 條件性導入，避免 Web 平台的問題
let Haptics: any = null;
let DeviceMotion: any = null;
let Calendar: any = null;

// 只在非 Web 平台導入這些模組
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
    DeviceMotion = require('expo-sensors').DeviceMotion;
    Calendar = require('react-native-calendars').Calendar;
  } catch (error) {
    console.log('⚠️ 某些模組在當前平台不可用:', error);
  }
}

import AddTransactionModal from '../../components/AddTransactionModal';
import SwipeableTransactionItem from '../../components/SwipeableTransactionItem';
import DatePickerModal from '../../components/DatePickerModal';
import { transactionDataService } from '../../services/transactionDataService';
import { recurringTransactionService } from '../../services/recurringTransactionService';
import { assetTransactionSyncService } from '../../services/assetTransactionSyncService';
import { liabilityService } from '../../services/liabilityService';
import { liabilityTransactionSyncService } from '../../services/liabilityTransactionSyncService';
import { eventEmitter, EVENTS } from '../../services/eventEmitter';

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [futureRecurringTransactions, setFutureRecurringTransactions] = useState<any[]>([]);

  // 動畫相關
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 搖動檢測相關
  const [shakeCount, setShakeCount] = useState(0);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastShakeTime = useRef(0);
  const lastShakeDetectionTime = useRef(0);

  // 防抖狀態
  const [isNavigating, setIsNavigating] = useState(false);

  // 監控 currentMonth 變化
  useEffect(() => {
    console.log('Current month state changed to:', currentMonth);
  }, [currentMonth]);

  // 翻頁動畫效果
  const playPageFlipAnimation = () => {
    // 觸覺反饋（僅在支援的平台）
    if (Haptics && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('⚠️ 觸覺反饋不可用:', error);
      }
    }

    // 視覺動畫序列
    Animated.sequence([
      // 1. 輕微縮放和淡出
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // 2. 恢復正常
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 滑動效果
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 回到當前月份的函數
  const goToCurrentMonth = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('🔄 搖晃檢測：回到當前月份:', today);

    // 觸覺反饋（僅在支援的平台）
    if (Haptics && Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('⚠️ 觸覺反饋不可用:', error);
      }
    }

    setCurrentMonth(today);
    setSelectedDate(today);

    // 播放翻頁動畫
    playPageFlipAnimation();

    console.log('🔄 已回到當前月份');
  }, []);

  // 搖動檢測邏輯
  const handleShake = useCallback(() => {
    console.log('🔄 搖晃檢測觸發');

    const now = Date.now();
    const timeDiff = now - lastShakeTime.current;

    console.log('🔄 搖動檢測，時間差:', timeDiff, '當前計數:', shakeCount);

    // 如果距離上次搖動超過1.5秒，重置計數
    if (timeDiff > 1500) {
      console.log('🔄 重置搖動計數');
      setShakeCount(1);
      lastShakeTime.current = now;

      // 設置超時重置計數
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
      shakeTimeoutRef.current = setTimeout(() => {
        console.log('🔄 超時：重置搖動計數');
        setShakeCount(0);
      }, 1500);
    } else {
      // 在短時間內的第二次搖動
      console.log('🔄 檢測到第二次搖動！執行回到當前月份');
      setShakeCount(0);
      goToCurrentMonth();

      // 清除超時
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    }

    lastShakeTime.current = now;
  }, [shakeCount, goToCurrentMonth]);

  // 設置搖動檢測（僅在非 Web 平台）
  useEffect(() => {
    if (Platform.OS === 'web' || !DeviceMotion) {
      console.log('🔄 跳過搖動檢測設置（Web 平台）');
      return;
    }

    let subscription: any;

    const setupShakeDetection = async () => {
      try {
        // 檢查設備運動傳感器是否可用
        const isAvailable = await DeviceMotion.isAvailableAsync();
        if (!isAvailable) {
          console.log('🔄 設備運動傳感器不可用');
          return;
        }

        console.log('🔄 設置搖動檢測');

        // 設置更新間隔
        DeviceMotion.setUpdateInterval(100);

        // 訂閱設備運動事件
        subscription = DeviceMotion.addListener((motionData: any) => {
          const { acceleration } = motionData;
          if (acceleration) {
            const { x, y, z } = acceleration;

            // 計算總加速度
            const totalAcceleration = Math.sqrt(x * x + y * y + z * z);

            // 搖動閾值（加速度 8 以上才啟動功能，只在記帳頁面生效）
            const shakeThreshold = 8.0;

            if (totalAcceleration > shakeThreshold) {
              const now = Date.now();
              // 防抖：至少間隔500ms才能觸發下一次搖動檢測（降低敏感度）
              if (now - lastShakeDetectionTime.current > 500) {
                lastShakeDetectionTime.current = now;
                console.log('🔄 檢測到搖動，加速度:', totalAcceleration.toFixed(2));
                handleShake();
              }
            }
          }
        });
      } catch (error) {
        console.error('❌ 搖動檢測設置失敗:', error);
      }
    };

    setupShakeDetection();

    // 清理函數
    return () => {
      if (subscription) {
        subscription.remove();
        console.log('🔄 清理搖動檢測');
      }
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, [handleShake]);

  // 初始化交易資料服務和處理循環交易的生成
  useEffect(() => {
    console.log('✅ 開始初始化交易數據');

    // 直接獲取已初始化的交易資料
    setTransactions(transactionDataService.getTransactions());

    // 添加監聽器來同步資料
    const handleTransactionsUpdate = () => {
      setTransactions(transactionDataService.getTransactions());
    };
    transactionDataService.addListener(handleTransactionsUpdate);

    const processRecurringTransactions = () => {
      const newTransactions = recurringTransactionService.processRecurringTransactions();
      if (newTransactions.length > 0) {
        // 將新的循環交易添加到服務中
        newTransactions.forEach(async (transaction: any) => {
          await transactionDataService.addTransaction(transaction);
        });
      }
    };

    const updateFutureRecurringTransactions = () => {
      console.log('🔄 更新未來循環交易...');
      const futureTransactions = recurringTransactionService.generateFutureRecurringTransactions(12);
      console.log('📊 未來循環交易數量:', futureTransactions.length);
      setFutureRecurringTransactions(futureTransactions);
    };

    // 監聽循環交易創建事件
    const handleRecurringTransactionCreated = (data: any) => {
      console.log('📡 收到循環交易創建事件:', data);
      console.log('🔄 強制刷新未來循環交易...');
      updateFutureRecurringTransactions();
    };

    // 負債添加事件監聽器
    const handleLiabilityAdded = (liability: any) => {
      console.log('🔥 TransactionsScreen 收到負債添加事件:', liability.name);
      console.log('🔥 立即刷新交易數據');

      // 立即刷新
      setTransactions(transactionDataService.getTransactions());
      updateFutureRecurringTransactions();

      // 延遲再次刷新
      setTimeout(() => {
        console.log('🔥 延遲刷新交易數據');
        setTransactions(transactionDataService.getTransactions());
        updateFutureRecurringTransactions();
      }, 500);
    };

    const handleForceRefreshAll = (data: any) => {
      console.log('🔥 TransactionsScreen 收到強制刷新事件:', data);
      console.log('🔥 立即刷新交易數據');

      setTransactions(transactionDataService.getTransactions());
      updateFutureRecurringTransactions();

      // 延遲再次刷新
      setTimeout(() => {
        console.log('🔥 延遲刷新交易數據');
        setTransactions(transactionDataService.getTransactions());
        updateFutureRecurringTransactions();
      }, 300);
    };

    eventEmitter.on(EVENTS.RECURRING_TRANSACTION_CREATED, handleRecurringTransactionCreated);
    eventEmitter.on(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
    eventEmitter.on(EVENTS.LIABILITY_DELETED, handleLiabilityAdded);
    eventEmitter.on(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
    eventEmitter.on(EVENTS.FORCE_REFRESH_TRANSACTIONS, handleForceRefreshAll);

    // 確保基本資產存在
    assetTransactionSyncService.ensureBasicAssets();

    console.log('📝 交易頁面已初始化，從空白狀態開始');

    // 每天檢查一次循環交易
    processRecurringTransactions();
    // 更新未來的循環交易
    updateFutureRecurringTransactions();

    // 設定定時器，每天午夜檢查
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      processRecurringTransactions();
      updateFutureRecurringTransactions();

      // 設定每24小時執行一次
      const intervalId = setInterval(() => {
        processRecurringTransactions();
        updateFutureRecurringTransactions();
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(intervalId);
    }, timeUntilMidnight);

    return () => {
      clearTimeout(timeoutId);
      transactionDataService.removeListener(handleTransactionsUpdate);
      eventEmitter.off(EVENTS.RECURRING_TRANSACTION_CREATED, handleRecurringTransactionCreated);
      eventEmitter.off(EVENTS.LIABILITY_ADDED, handleLiabilityAdded);
      eventEmitter.off(EVENTS.LIABILITY_DELETED, handleLiabilityAdded);
      eventEmitter.off(EVENTS.FORCE_REFRESH_ALL, handleForceRefreshAll);
      eventEmitter.off(EVENTS.FORCE_REFRESH_TRANSACTIONS, handleForceRefreshAll);
    };
  }, []);

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleUpdateTransaction = async (updatedTransaction: any) => {
    if (editingTransaction) {
      // 更新現有交易
      await transactionDataService.updateTransaction(editingTransaction.id, updatedTransaction);
      setEditingTransaction(null);
    } else {
      // 添加新交易
      await handleAddTransaction(updatedTransaction);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(null);
  };

  const handleAddTransaction = async (newTransaction: any) => {
    // 處理交易對資產的影響
    assetTransactionSyncService.processTransaction(newTransaction);

    // 如果是循環交易，創建循環交易模板並立即生成第一筆交易
    if (newTransaction.is_recurring) {
      // 確保 startDate 是 Date 對象
      const startDate = newTransaction.start_date instanceof Date
        ? newTransaction.start_date
        : new Date(newTransaction.start_date || newTransaction.date);

      // 創建循環交易模板
      recurringTransactionService.createRecurringTransaction({
        amount: newTransaction.amount,
        type: newTransaction.type,
        description: newTransaction.description,
        category: newTransaction.category,
        account: newTransaction.account,
        frequency: newTransaction.recurring_frequency,
        maxOccurrences: newTransaction.max_occurrences,
        startDate: startDate,
      });

      // 立即生成第一筆交易記錄
      const firstTransaction = {
        ...newTransaction,
        id: `first_${Date.now()}`, // 確保ID唯一
      };
      await transactionDataService.addTransaction(firstTransaction);

      // 處理循環交易，生成後續的交易記錄（如果有到期的）
      const generatedTransactions = recurringTransactionService.processRecurringTransactions();
      if (generatedTransactions.length > 0) {
        for (const transaction of generatedTransactions) {
          await transactionDataService.addTransaction(transaction as any);
        }
      }

      // 更新未來的循環交易
      const futureTransactions = recurringTransactionService.generateFutureRecurringTransactions(12);
      setFutureRecurringTransactions(futureTransactions);
    } else {
      // 普通交易直接添加到服務中
      await transactionDataService.addTransaction(newTransaction);
    }
  };

  const handleDeleteTransaction = async (item: any, deleteType?: 'single' | 'future' | 'all') => {
    console.log('🗑️ 開始刪除交易:', {
      id: item.id,
      description: item.description,
      amount: item.amount,
      category: item.category,
      is_recurring: item.is_recurring,
      deleteType
    });

    if (item.is_recurring && deleteType) {
      // 檢查是否為負債相關的循環交易
      const isLiabilityTransaction = item.category === '還款';

      switch (deleteType) {
        case 'single':
          // 單次刪除：只刪除這一筆交易記錄
          console.log('🗑️ 單次刪除循環交易');
          assetTransactionSyncService.reverseTransaction(item);
          await transactionDataService.deleteTransaction(item.id);
          setFutureRecurringTransactions(prev => prev.filter(t => t.id !== item.id));
          break;

        case 'future':
          // 向後刪除：刪除包含這個月之後的所有相關交易
          console.log('🗑️ 向後刪除循環交易');

          if (!item || !item.date) {
            console.log('❌ 交易沒有有效日期，跳過刪除');
            break;
          }

          const itemDate = new Date(item.date);
          if (isNaN(itemDate.getTime())) {
            console.log('❌ 交易日期無效，跳過刪除');
            break;
          }

          const itemMonth = itemDate.getFullYear() * 12 + itemDate.getMonth();

          // 如果是負債交易，需要特殊處理
          if (isLiabilityTransaction) {
            console.log('🗑️ 處理負債循環交易的向後刪除');
            const liabilities = liabilityService.getLiabilities();
            const relatedLiability = liabilities.find(l => l.name === item.description);
            if (relatedLiability) {
              console.log('🗑️ 找到相關負債，停用循環交易:', relatedLiability.name);
              const recurringTransactionId = liabilityTransactionSyncService.getRecurringTransactionId(relatedLiability.id);
              if (recurringTransactionId) {
                recurringTransactionService.deactivateRecurringTransaction(recurringTransactionId);
              }
            }
          }

          // 找到對應的循環交易模板
          const recurringTemplate = recurringTransactionService.getRecurringTransactions()
            .find(rt => rt.description === item.description && rt.amount === item.amount);

          if (recurringTemplate) {
            console.log('🗑️ 找到循環交易模板，停用:', recurringTemplate.id);
            recurringTransactionService.deactivateRecurringTransaction(recurringTemplate.id);

            // 刪除當前月份及之後的所有相關交易
            const currentTransactions = transactionDataService.getTransactions();
            for (const t of currentTransactions) {
              if (t.description === item.description && t.amount === item.amount) {
                if (!t || !t.date) continue;

                const tDate = new Date(t.date);
                if (isNaN(tDate.getTime())) continue;

                const tMonth = tDate.getFullYear() * 12 + tDate.getMonth();
                if (tMonth >= itemMonth) {
                  console.log('🗑️ 刪除相關交易:', t.id);
                  await transactionDataService.deleteTransaction(t.id);
                }
              }
            }

            // 刪除未來的相關交易
            setFutureRecurringTransactions(prev => prev.filter(t => {
              if (t.description !== item.description || t.amount !== item.amount) return true;

              if (!t || !t.date) return false;

              const tDate = new Date(t.date);
              if (isNaN(tDate.getTime())) return false;

              const tMonth = tDate.getFullYear() * 12 + tDate.getMonth();
              return tMonth < itemMonth;
            }));
          }
          break;

        case 'all':
          // 全部刪除：刪除所有相關的交易記錄和循環交易模板
          console.log('🗑️ 全部刪除循環交易');

          if (isLiabilityTransaction) {
            console.log('🗑️ 處理負債循環交易的全部刪除');
            const liabilities = liabilityService.getLiabilities();
            const relatedLiability = liabilities.find(l => l.name === item.description);
            if (relatedLiability) {
              console.log('🗑️ 找到相關負債，刪除所有相關交易:', relatedLiability.name);
              await liabilityTransactionSyncService.deleteLiabilityRecurringTransaction(relatedLiability.id);
              console.log('✅ 負債循環交易刪除完成');
              return;
            }
          }

          const allRecurringTemplate = recurringTransactionService.getRecurringTransactions()
            .find(rt => rt.description === item.description && rt.amount === item.amount);

          if (allRecurringTemplate) {
            console.log('🗑️ 找到循環交易模板，完全刪除:', allRecurringTemplate.id);
            recurringTransactionService.deleteRecurringTransaction(allRecurringTemplate.id);

            // 刪除所有相關的交易記錄
            const allTransactions = transactionDataService.getTransactions();
            for (const t of allTransactions) {
              if (t.description === item.description && t.amount === item.amount && t.is_recurring) {
                console.log('🗑️ 刪除相關交易:', t.id);
                await transactionDataService.deleteTransaction(t.id);
              }
            }

            // 刪除所有相關的未來交易
            setFutureRecurringTransactions(prev => prev.filter(t =>
              !(t.description === item.description && t.amount === item.amount)
            ));
          }
          break;
      }
    } else {
      // 普通交易直接刪除
      console.log('🗑️ 刪除普通交易');
      assetTransactionSyncService.reverseTransaction(item);
      await transactionDataService.deleteTransaction(item.id);
    }

    console.log('✅ 交易刪除完成');
  };

  const getTransactionsForDate = (date: string) => {
    // 合併實際交易和未來的循環交易，但避免重複
    const actualTransactions = transactions.filter(t => t.date.split('T')[0] === date);
    const futureTransactions = futureRecurringTransactions.filter(t => t.date.split('T')[0] === date);

    // 去重：如果實際交易中已經有相同的循環交易記錄，就不包含未來交易
    const filteredFutureTransactions = futureTransactions.filter(ft =>
      !actualTransactions.some(at =>
        at.description === ft.description &&
        at.amount === ft.amount &&
        at.is_recurring
      )
    );

    return [...actualTransactions, ...filteredFutureTransactions];
  };

  const getDayTransactionSummary = (date: string) => {
    const dayTransactions = getTransactionsForDate(date);
    const income = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, count: dayTransactions.length };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 格式化收支總額顯示 (簡潔版本適合月曆)
  const formatNetAmount = (amount: number) => {
    if (amount === 0) return '';
    const absAmount = Math.abs(amount);

    // 簡化顯示：超過萬元顯示萬，否則顯示完整數字
    let formattedAmount: string;
    if (absAmount >= 10000) {
      const wanAmount = Math.round(absAmount / 1000) / 10; // 保留一位小數
      formattedAmount = wanAmount % 1 === 0 ? `${Math.round(wanAmount)}萬` : `${wanAmount}萬`;
    } else {
      formattedAmount = new Intl.NumberFormat('zh-TW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(absAmount);
    }

    return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  // 切換到前一個月
  const goToPreviousMonth = useCallback(() => {
    if (isNavigating) {
      console.log('🔙 防抖：正在導航中，忽略重複點擊');
      return;
    }

    console.log('🔙 左箭頭點擊 - 切換到前一個月');
    console.log('🔙 當前月份:', currentMonth);

    setIsNavigating(true);

    const [year, month, day] = currentMonth.split('-').map(Number);
    console.log('🔙 解析結果 - 年:', year, '月:', month, '日:', day);

    // 計算前一個月
    let newYear = year;
    let newMonth = month - 1;

    // 處理跨年情況
    if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }

    // 格式化為 YYYY-MM-DD
    const dateString = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;

    console.log('🔙 計算結果 - 新年:', newYear, '新月:', newMonth);
    console.log('🔙 目標月份:', dateString);

    // 觸覺反饋（僅在支援的平台）
    if (Haptics && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('⚠️ 觸覺反饋不可用:', error);
      }
    }

    setCurrentMonth(dateString);
    setSelectedDate(dateString);

    // 播放翻頁動畫
    playPageFlipAnimation();

    console.log('🔙 前一個月切換完成');

    // 延遲解除防抖
    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  }, [currentMonth, isNavigating]);

  // 切換到下一個月
  const goToNextMonth = useCallback(() => {
    if (isNavigating) {
      console.log('🔜 防抖：正在導航中，忽略重複點擊');
      return;
    }

    console.log('🔜 右箭頭點擊 - 切換到下一個月');
    console.log('🔜 當前月份:', currentMonth);

    setIsNavigating(true);

    const [year, month, day] = currentMonth.split('-').map(Number);
    console.log('🔜 解析結果 - 年:', year, '月:', month, '日:', day);

    // 計算下一個月
    let newYear = year;
    let newMonth = month + 1;

    // 處理跨年情況
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    }

    // 格式化為 YYYY-MM-DD
    const dateString = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;

    console.log('🔜 計算結果 - 新年:', newYear, '新月:', newMonth);
    console.log('🔜 目標月份:', dateString);

    // 觸覺反饋（僅在支援的平台）
    if (Haptics && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('⚠️ 觸覺反饋不可用:', error);
      }
    }

    setCurrentMonth(dateString);
    setSelectedDate(dateString);

    // 播放翻頁動畫
    playPageFlipAnimation();

    console.log('🔜 下一個月切換完成');

    // 延遲解除防抖
    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  }, [currentMonth, isNavigating]);

  const handleDatePickerSelect = (year: number, month: number) => {
    // 播放選擇反饋（僅在支援的平台）
    if (Haptics && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('⚠️ 觸覺反饋不可用:', error);
      }
    }

    // 創建新的日期字符串，確保格式正確
    const monthStr = month.toString().padStart(2, '0');
    const dateString = `${year}-${monthStr}-01`;

    console.log('Jumping to date:', dateString);

    // 先關閉模態框
    setShowDatePicker(false);

    // 使用 setTimeout 確保狀態更新順序
    setTimeout(() => {
      setCurrentMonth(dateString);
      setSelectedDate(dateString);

      // 播放翻頁動畫
      playPageFlipAnimation();
    }, 100);
  };

  const renderTransactionItem = ({ item }: { item: any }) => {
    // 修復帳戶顯示邏輯：直接使用交易記錄中的account字段
    const account = { name: item.account };
    const category = transactionDataService.getCategoryByName(item.category);
    const isFutureTransaction = futureRecurringTransactions.some(ft => ft.id === item.id);

    return (
      <SwipeableTransactionItem
        item={item}
        account={account}
        category={category}
        isFutureTransaction={isFutureTransaction}
        onDelete={handleDeleteTransaction}
        onEdit={handleEditTransaction}
        formatCurrency={formatCurrency}
      />
    );
  };

  // 渲染自定義月曆
  const renderCustomCalendar = () => {
    const currentDate = new Date(currentMonth);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 獲取當月第一天是星期幾
    const firstDay = new Date(year, month, 1).getDay();
    // 獲取當月天數
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let currentWeek = [];

    // 添加空白天數
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    // 添加當月天數
    for (let day = 1; day <= daysInMonth; day++) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const summary = getDayTransactionSummary(dateString);
      const netAmount = summary.income - summary.expense;

      currentWeek.push({
        day,
        dateString,
        netAmount,
        hasTransactions: summary.count > 0,
      });
    }

    // 添加最後一週
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    const today = new Date().toISOString().split('T')[0];

    return (
      <View>
        {weeks.map((week, weekIndex) => (
          <View key={`calendar-week-${weekIndex}`} style={{
            flexDirection: 'row',
            marginBottom: 8,
          }}>
            {week.map((dayData, dayIndex) => (
              <TouchableOpacity
                key={`calendar-day-${weekIndex}-${dayIndex}`}
                style={{
                  flex: 1,
                  height: 60,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: dayData?.dateString === selectedDate ? '#007AFF' :
                                 dayData?.dateString === today ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                  marginHorizontal: 2,
                }}
                onPress={() => dayData && setSelectedDate(dayData.dateString)}
                disabled={!dayData}
              >
                {dayData && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: dayData.dateString === selectedDate || dayData.dateString === today ? 'bold' : '500',
                      color: dayData.dateString === selectedDate ? '#ffffff' :
                             dayData.dateString === today ? '#007AFF' : '#2d4150',
                      marginBottom: 2,
                    }}>
                      {dayData.day}
                    </Text>

                    {dayData.hasTransactions && (
                      <Text style={{
                        fontSize: 9,
                        fontWeight: '600',
                        color: dayData.dateString === selectedDate ? '#ffffff' :
                               dayData.netAmount >= 0 ? '#34C759' : '#FF3B30',
                        textAlign: 'center',
                      }}>
                        {dayData.netAmount >= 0 ? '+' : ''}{Math.abs(dayData.netAmount) >= 10000 ? `${Math.round(dayData.netAmount/1000)}k` : dayData.netAmount.toLocaleString()}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100), // 確保底部有足夠空間
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateX: slideAnim }
            ]
          }}
        >
          {/* 自定義月曆 */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 16,
            margin: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            {/* 搖晃說明文字 */}
            <View style={styles.shakeHintContainer}>
              <Text style={styles.shakeHintText}>搖搖手機，回到當前月份</Text>
            </View>

            {/* 自定義標題 */}
            <View style={styles.customHeader}>
              {/* 左箭頭 */}
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={goToPreviousMonth}
              >
                <Ionicons name="chevron-back" size={20} color="#2d4150" />
              </TouchableOpacity>

              {/* 月份標題 */}
              <TouchableOpacity
                style={styles.monthTitle}
                onPress={() => {
                  // 觸覺反饋（僅在支援的平台）
                  if (Haptics && Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (error) {
                      console.log('⚠️ 觸覺反饋不可用:', error);
                    }
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.headerText}>
                  {new Date(currentMonth).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#2d4150" />
              </TouchableOpacity>

              {/* 右箭頭 */}
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={goToNextMonth}
              >
                <Ionicons name="chevron-forward" size={20} color="#2d4150" />
              </TouchableOpacity>
            </View>

            {/* 星期標題 */}
            <View style={{
              flexDirection: 'row',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f0',
              marginBottom: 8,
            }}>
              {['週日', '週一', '週二', '週三', '週四', '週五', '週六'].map((day, index) => (
                <View key={`weekday-${day}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#b6c1cd',
                  }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* 自定義日期網格 */}
            {renderCustomCalendar()}
          </View>
        </Animated.View>

        {/* 當日金額顯示 */}
        {selectedDate && (() => {
          const summary = getDayTransactionSummary(selectedDate);
          const netAmount = summary.income - summary.expense;
          const hasTransactions = summary.count > 0;

          if (!hasTransactions) return null;

          return (
            <View style={{
              backgroundColor: '#F8F9FA',
              padding: 12,
              marginHorizontal: 16,
              marginTop: 8,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: netAmount > 0 ? '#34C759' : '#FF3B30',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 4,
              }}>
                {selectedDate === new Date().toISOString().split('T')[0] ? '今日' : selectedDate} 收支總額
              </Text>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: netAmount > 0 ? '#34C759' : '#FF3B30',
              }}>
                {formatNetAmount(netAmount)}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#999999',
                marginTop: 2,
              }}>
                收入 {summary.income.toLocaleString()} • 支出 {summary.expense.toLocaleString()}
              </Text>
            </View>
          );
        })()}

        {/* Selected Date Transactions */}
        <View style={styles.selectedDateSection}>
          <View style={styles.dateHeader}>
            <Text style={styles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {getTransactionsForDate(selectedDate).length > 0 ? (
            getTransactionsForDate(selectedDate).map((item, index) => (
              <View key={`transaction-${item.id}-${index}`}>
                {renderTransactionItem({ item })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>此日期沒有交易記錄</Text>
          )}
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={handleCloseModal}
        onAdd={handleUpdateTransaction}
        selectedDate={selectedDate}
        editingTransaction={editingTransaction}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDatePickerSelect}
        currentDate={currentMonth}
      />
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
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  shakeHintContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  shakeHintText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  arrowButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  monthTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d4150',
    marginRight: 8,
  },
});
