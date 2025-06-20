import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import AddAssetModal from '../../components/AddAssetModal';
import AddLiabilityModal from '../../components/AddLiabilityModal';
import { assetTransactionSyncService, AssetData } from '../../services/assetTransactionSyncService';
import { liabilityService, LiabilityData } from '../../services/liabilityService';
import { liabilityTransactionSyncService } from '../../services/liabilityTransactionSyncService';
import { transactionDataService } from '../../services/transactionDataService';
import { eventEmitter, EVENTS } from '../../services/eventEmitter';
import { retrySyncWithBackoff, getCurrentDataState } from '../../utils/forceRefreshManager';
import { ReliableDeleteService } from '../../services/reliableDeleteService';

export default function BalanceSheetScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddLiabilityModal, setShowAddLiabilityModal] = useState(false);

  // 使用同步服務管理資產狀態
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [editingLiability, setEditingLiability] = useState<LiabilityData | null>(null);

  // 初始化資產數據和監聽器
  useEffect(() => {
    // 初始化資產服務
    const initAssets = async () => {
      await assetTransactionSyncService.initialize();
      setAssets(assetTransactionSyncService.getAssets());
    };
    initAssets();

    // 添加監聽器
    const handleAssetsUpdate = (updatedAssets: AssetData[]) => {
      setAssets(updatedAssets);
    };
    assetTransactionSyncService.addListener(handleAssetsUpdate);

    // 清理函數
    return () => {
      assetTransactionSyncService.removeListener(handleAssetsUpdate);
    };
  }, []);

  const [liabilities, setLiabilities] = useState<LiabilityData[]>([]);

  // 編輯模式狀態
  const [isAssetEditMode, setIsAssetEditMode] = useState(false);
  const [isLiabilityEditMode, setIsLiabilityEditMode] = useState(false);

  // 初始化負債數據和監聽器
  useEffect(() => {
    // 初始化負債資料
    setLiabilities(liabilityService.getLiabilities());

    // 🔥 方法6：強制刷新所有交易數據
    const forceRefreshAllData = async () => {
      console.log('🚀 方法6：強制刷新所有交易數據...');

      try {
        // 1. 初始化負債同步服務
        await liabilityTransactionSyncService.initialize();
        console.log('✅ 負債同步服務初始化完成');

        // 2. 清理重複的還款交易
        await liabilityTransactionSyncService.cleanupDuplicateDebtPayments();
        console.log('✅ 重複交易清理完成');

        // 3. 強制創建當月交易記錄
        await liabilityTransactionSyncService.forceCreateCurrentMonthTransactions();
        console.log('✅ 當月交易記錄檢查完成');

        // 4. 強制刷新所有頁面的數據
        const allTransactions = transactionDataService.getTransactions();
        console.log('🔥 方法6 - 強制刷新後的所有交易:', allTransactions.map(t => ({
          id: t.id,
          type: t.type,
          category: t.category,
          amount: t.amount,
          description: t.description,
          date: t.date
        })));

        // 5. 發射全局刷新事件
        eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, {
          type: 'force_refresh_all',
          timestamp: Date.now()
        });

        console.log('✅ 方法6：所有數據刷新完成');
      } catch (error) {
        console.error('❌ 方法6：數據刷新失敗:', error);
      }
    };

    forceRefreshAllData();

    // 添加監聽器
    const handleLiabilitiesUpdate = (updatedLiabilities: LiabilityData[]) => {
      setLiabilities(updatedLiabilities);
    };
    liabilityService.addListener(handleLiabilitiesUpdate);

    // 清理函數
    return () => {
      liabilityService.removeListener(handleLiabilitiesUpdate);
    };
  }, []);

  const handleAddAsset = async (newAsset: any) => {
    await assetTransactionSyncService.addAsset(newAsset);
  };

  const handleAddLiability = async (newLiability: any) => {
    try {
      console.log('📝 徹底修復：BalanceSheetScreen 處理新增負債:', newLiability);

      // 1. 先添加負債到本地
      await liabilityService.addLiability(newLiability);
      console.log('✅ 負債已添加到本地');

      // 2. 統一在這裡處理同步，確保只調用一次
      await liabilityTransactionSyncService.syncLiabilityToRecurringTransaction(newLiability);
      console.log('✅ 徹底修復：負債同步完成，只調用一次');

    } catch (error) {
      console.error('❌ 處理新增負債時發生錯誤:', error);
      Alert.alert('錯誤', '處理負債時發生錯誤，請重試');
    }
  };

  const handleEditAsset = (asset: AssetData) => {
    setEditingAsset(asset);
    setShowAddAssetModal(true);
  };

  const handleEditLiability = (liability: LiabilityData) => {
    setEditingLiability(liability);
    setShowAddLiabilityModal(true);
  };

  const handleUpdateAsset = async (updatedAsset: any) => {
    if (editingAsset) {
      await assetTransactionSyncService.updateAsset(editingAsset.id, updatedAsset);
      setEditingAsset(null);
    } else {
      await assetTransactionSyncService.addAsset(updatedAsset);
    }
  };

  const handleUpdateLiability = async (updatedLiability: any) => {
    try {
      console.log('🔥 徹底修復：BalanceSheetScreen 處理負債更新/添加:', updatedLiability);

      if (editingLiability) {
        console.log('📝 更新現有負債:', editingLiability.id);
        await liabilityService.updateLiability(editingLiability.id, updatedLiability);
        setEditingLiability(null);
        // 更新時需要同步
        await liabilityTransactionSyncService.syncLiabilityToRecurringTransaction(updatedLiability);
      } else {
        console.log('➕ 徹底修復：添加新負債（統一調用）');
        // 調用統一的添加方法
        await handleAddLiability(updatedLiability);
        return; // 直接返回，避免重複處理
      }

      // 🔥 方法6：使用強制刷新管理器的重試機制
      console.log('🔥 方法6 - 使用強制刷新管理器的重試機制');
      console.log('🔥 方法6 - 添加前數據狀態:', getCurrentDataState());

      const syncSuccess = await retrySyncWithBackoff(updatedLiability, 5);

      console.log('🔥 方法6 - 添加後數據狀態:', getCurrentDataState());
      console.log('🔥 方法6 - 同步結果:', syncSuccess ? '成功' : '失敗');

      // 🔥 方法4：使用立即同步函數
      console.log('🔥 方法4 - 使用立即同步函數');
      await liabilityTransactionSyncService.immediatelySync(updatedLiability);

      // 🔥 方法1：額外發射事件確保同步
      console.log('🔥 方法1 - 額外發射所有刷新事件');
      eventEmitter.emit(EVENTS.LIABILITY_ADDED, updatedLiability);
      eventEmitter.emit(EVENTS.FORCE_REFRESH_ALL, {
        type: editingLiability ? 'liability_updated' : 'liability_added',
        liability: updatedLiability,
        timestamp: Date.now()
      });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_DASHBOARD, { liability: updatedLiability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_TRANSACTIONS, { liability: updatedLiability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_CASHFLOW, { liability: updatedLiability });
      eventEmitter.emit(EVENTS.FORCE_REFRESH_CHARTS, { liability: updatedLiability });

      console.log('✅ 方法1+4+6 - 所有同步方法已執行');
    } catch (error) {
      console.error('❌ 處理負債時發生錯誤:', error);
      Alert.alert('錯誤', '處理負債時發生錯誤，請重試');
    }
  };

  const handleCloseAssetModal = () => {
    setShowAddAssetModal(false);
    setEditingAsset(null);
  };

  const handleCloseLiabilityModal = () => {
    setShowAddLiabilityModal(false);
    setEditingLiability(null);
  };

  const handleDeleteAsset = async (assetId: string) => {
    console.log('🗑️ 可靠刪除：資產刪除被觸發', assetId);

    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
      console.error('❌ 可靠刪除：找不到要刪除的資產');
      Alert.alert('錯誤', '找不到要刪除的資產');
      return;
    }

    // 🔧 WEB 環境測試：直接執行刪除，跳過確認對話框
    console.log('🗑️ 可靠刪除：WEB 環境直接執行刪除測試');
    console.log('🗑️ 可靠刪除：用戶確認刪除資產 - 開始執行');
    try {
      console.log('🗑️ 可靠刪除：進入 try 區塊');
      console.log('🗑️ 可靠刪除：ReliableDeleteService 是否存在:', typeof ReliableDeleteService);
      console.log('🗑️ 可靠刪除：deleteAsset 方法是否存在:', typeof ReliableDeleteService.deleteAsset);

      // 使用可靠刪除服務
      console.log('🗑️ 可靠刪除：準備調用 deleteAsset');
      const result = await ReliableDeleteService.deleteAsset(assetId, {
        verifyDeletion: true,
        retryCount: 3,
        timeout: 10000
      });
      console.log('🗑️ 可靠刪除：deleteAsset 調用完成');

      console.log('🗑️ 可靠刪除：deleteAsset 調用完成，結果:', result);

      if (result.success) {
        console.log('✅ 可靠刪除：資產刪除成功');

        // 從本地狀態中移除
        setAssets(prev => prev.filter(a => a.id !== assetId));

        // 強制刷新所有相關服務的數據
        console.log('🔄 可靠刪除：強制刷新資產服務數據');
        await assetTransactionSyncService.loadAssets();

        // 發送刷新事件
        console.log('🔄 可靠刪除：發送財務數據更新事件');
        eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, { source: 'asset_deleted', timestamp: Date.now() });

        console.log('✅ 可靠刪除：資產刪除完成，UI 已更新');
      } else {
        console.error('❌ 可靠刪除：資產刪除失敗:', result.errors);
      }

    } catch (error) {
      console.error('❌ 可靠刪除：資產刪除異常:', error);
    }
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    console.log('🗑️ 可靠刪除：負債刪除被觸發', liabilityId);

    const liability = liabilities.find(l => l.id === liabilityId);
    if (!liability) {
      console.error('❌ 可靠刪除：找不到要刪除的負債');
      return;
    }

    // 🔧 WEB 環境測試：直接執行刪除，跳過確認對話框
    console.log('🗑️ 可靠刪除：WEB 環境直接執行負債刪除測試');
    console.log('🗑️ 可靠刪除：用戶確認刪除負債 - 開始執行');
    try {
      console.log('🗑️ 可靠刪除：進入 try 區塊');
      console.log('🗑️ 可靠刪除：ReliableDeleteService 是否存在:', typeof ReliableDeleteService);
      console.log('🗑️ 可靠刪除：deleteLiability 方法是否存在:', typeof ReliableDeleteService.deleteLiability);

      // 使用可靠刪除服務
      console.log('🗑️ 可靠刪除：準備調用 deleteLiability');
      const result = await ReliableDeleteService.deleteLiability(liabilityId, {
        verifyDeletion: true,
        retryCount: 3,
        timeout: 10000
      });
      console.log('🗑️ 可靠刪除：deleteLiability 調用完成');

      console.log('🗑️ 可靠刪除：deleteLiability 調用完成，結果:', result);

      if (result.success) {
        console.log('✅ 可靠刪除：負債刪除成功');

        // 從本地狀態中移除
        setLiabilities(prev => prev.filter(l => l.id !== liabilityId));

        // 強制刷新所有相關服務的數據
        console.log('🔄 可靠刪除：強制刷新負債服務數據');
        await liabilityService.loadLiabilities();

        // 發送刷新事件
        console.log('🔄 可靠刪除：發送財務數據更新事件');
        eventEmitter.emit(EVENTS.FINANCIAL_DATA_UPDATED, { source: 'liability_deleted', timestamp: Date.now() });

        console.log('✅ 可靠刪除：負債刪除完成，UI 已更新');
      } else {
        console.error('❌ 可靠刪除：負債刪除失敗:', result.errors);
      }

    } catch (error) {
      console.error('❌ 可靠刪除：負債刪除異常:', error);
    }
  };

  // 處理資產排序
  const handleMoveAssetUp = async (index: number) => {
    if (index > 0) {
      const newAssets = [...assets];
      [newAssets[index], newAssets[index - 1]] = [newAssets[index - 1], newAssets[index]];
      await assetTransactionSyncService.updateAssetOrder(newAssets);
    }
  };

  const handleMoveAssetDown = async (index: number) => {
    if (index < assets.length - 1) {
      const newAssets = [...assets];
      [newAssets[index], newAssets[index + 1]] = [newAssets[index + 1], newAssets[index]];
      await assetTransactionSyncService.updateAssetOrder(newAssets);
    }
  };

  // 處理負債排序
  const handleMoveLiabilityUp = async (index: number) => {
    if (index > 0) {
      const newLiabilities = [...liabilities];
      [newLiabilities[index], newLiabilities[index - 1]] = [newLiabilities[index - 1], newLiabilities[index]];
      await liabilityService.updateLiabilityOrder(newLiabilities);
    }
  };

  const handleMoveLiabilityDown = async (index: number) => {
    if (index < liabilities.length - 1) {
      const newLiabilities = [...liabilities];
      [newLiabilities[index], newLiabilities[index + 1]] = [newLiabilities[index + 1], newLiabilities[index]];
      await liabilityService.updateLiabilityOrder(newLiabilities);
    }
  };

  // 處理置頂功能
  const handleMoveAssetToTop = async (index: number) => {
    if (index > 0) {
      const newAssets = [...assets];
      const [movedAsset] = newAssets.splice(index, 1);
      newAssets.unshift(movedAsset);
      await assetTransactionSyncService.updateAssetOrder(newAssets);
    }
  };

  const handleMoveLiabilityToTop = async (index: number) => {
    if (index > 0) {
      const newLiabilities = [...liabilities];
      const [movedLiability] = newLiabilities.splice(index, 1);
      newLiabilities.unshift(movedLiability);
      await liabilityService.updateLiabilityOrder(newLiabilities);
    }
  };



  // Calculate summary
  const totalAssets = assets.reduce((sum, asset) => sum + asset.current_value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cash': '現金',
      'bank': '銀行',
      'tw_stock': '台股',
      'us_stock': '美股',
      'mutual_fund': '共同基金',
      'cryptocurrency': '加密貨幣',
      'real_estate': '不動產',
      'vehicle': '汽車',
      'insurance': '保單',
      'precious_metal': '貴金屬',
      'other': '其他',
    };
    return labels[type] || type;
  };

  const getLiabilityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'credit_card': '信用卡',
      'personal_loan': '信用貸款',
      'mortgage': '房屋貸款',
      'car_loan': '汽車貸款',
      'other_loan': '其他貸款',
    };
    return labels[type] || type;
  };

  // 🗑️ 可靠刪除：渲染右滑刪除按鈕
  const renderRightActions = (onDelete: () => void) => {
    return (
      <Animated.View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.6}
        >
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.deleteText}>刪除</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };



  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100), // 確保底部有足夠空間
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {/* Net Worth Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>當月淨資產</Text>
          <Text style={styles.netWorthAmount}>
            {formatCurrency(netWorth)}
          </Text>

          <View style={styles.summaryBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>總資產</Text>
              <Text style={[styles.breakdownValue, styles.assetValue]}>
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>總負債</Text>
              <Text style={[styles.breakdownValue, styles.liabilityValue]}>
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>
          </View>
        </View>

        {/* Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>資產 (Assets)</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsAssetEditMode(!isAssetEditMode)}
              >
                <Ionicons
                  name={isAssetEditMode ? "checkmark" : "create-outline"}
                  size={20}
                  color={isAssetEditMode ? "#34C759" : "#007AFF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddAssetModal(true)}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {assets.length > 0 ? (
            <View>
              {assets.map((asset, index) => (
                <View key={asset.id} style={styles.itemContainer}>
                  {!isAssetEditMode ? (
                    // 🗑️ 可靠刪除：重新啟用資產滑動刪除功能
                    <Swipeable
                      renderRightActions={() => renderRightActions(() => handleDeleteAsset(asset.id))}
                      rightThreshold={100}
                      friction={1}
                    >
                      <TouchableOpacity
                        style={styles.itemCard}
                        onPress={() => handleEditAsset(asset)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleContainer}>
                            <Text style={styles.itemName}>{asset.name}</Text>
                            <Text style={styles.itemType}>{getAssetTypeLabel(asset.type)}</Text>
                          </View>
                          {/* 🔧 WEB 環境臨時刪除按鈕 - 防止事件冒泡 */}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              console.log('🗑️ 刪除按鈕被點擊 - 資產ID:', asset.id);
                              handleDeleteAsset(asset.id);
                            }}
                            style={styles.webDeleteButton}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.itemDetails}>
                          {/* 現金和銀行只顯示當前價值 */}
                          {asset.type === 'cash' || asset.type === 'bank' ? (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>當前價值</Text>
                              <Text style={styles.detailValue}>{formatCurrency(asset.current_value)}</Text>
                            </View>
                          ) : asset.type === 'real_estate' ? (
                            // 不動產顯示坪數相關信息
                            <>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>坪數</Text>
                                <Text style={styles.detailValue}>{(asset as any).area || asset.quantity}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>成本基礎</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.cost_basis)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>當前價值</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.current_value)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>損益</Text>
                                <Text style={[
                                  styles.detailValue,
                                  (asset.current_value - asset.cost_basis) >= 0 ? styles.gainText : styles.lossText
                                ]}>
                                  {(asset.current_value - asset.cost_basis) >= 0 ? '+' : ''}
                                  {formatCurrency(asset.current_value - asset.cost_basis)}
                                  ({((asset.current_value - asset.cost_basis) / asset.cost_basis * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </>
                          ) : asset.type === 'insurance' ? (
                            // 保單顯示成本基礎、當前價值、損益和壽險額度
                            <>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>成本基礎</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.cost_basis)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>當前價值</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.current_value)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>損益</Text>
                                <Text style={[
                                  styles.detailValue,
                                  (asset.current_value - asset.cost_basis) >= 0 ? styles.gainText : styles.lossText
                                ]}>
                                  {(asset.current_value - asset.cost_basis) >= 0 ? '+' : ''}
                                  {formatCurrency(asset.current_value - asset.cost_basis)}
                                  ({((asset.current_value - asset.cost_basis) / asset.cost_basis * 100).toFixed(1)}%)
                                </Text>
                              </View>
                              {(asset as any).insurance_amount && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>壽險額度</Text>
                                  <Text style={styles.detailValue}>{formatCurrency((asset as any).insurance_amount)}</Text>
                                </View>
                              )}
                            </>
                          ) : asset.type === 'vehicle' ? (
                            // 汽車不顯示持有數量
                            <>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>成本基礎</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.cost_basis)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>當前價值</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.current_value)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>損益</Text>
                                <Text style={[
                                  styles.detailValue,
                                  (asset.current_value - asset.cost_basis) >= 0 ? styles.gainText : styles.lossText
                                ]}>
                                  {(asset.current_value - asset.cost_basis) >= 0 ? '+' : ''}
                                  {formatCurrency(asset.current_value - asset.cost_basis)}
                                  ({((asset.current_value - asset.cost_basis) / asset.cost_basis * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </>
                          ) : (
                            // 其他資產顯示完整信息
                            <>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>持有數量</Text>
                                <Text style={styles.detailValue}>{asset.quantity}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>成本基礎</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.cost_basis)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>當前價值</Text>
                                <Text style={styles.detailValue}>{formatCurrency(asset.current_value)}</Text>
                              </View>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>損益</Text>
                                <Text style={[
                                  styles.detailValue,
                                  (asset.current_value - asset.cost_basis) >= 0 ? styles.gainText : styles.lossText
                                ]}>
                                  {(asset.current_value - asset.cost_basis) >= 0 ? '+' : ''}
                                  {formatCurrency(asset.current_value - asset.cost_basis)}
                                  ({((asset.current_value - asset.cost_basis) / asset.cost_basis * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                  ) : (
                    <View style={styles.editModeCard}>
                      <TouchableOpacity
                        style={styles.itemCard}
                        onPress={() => handleEditAsset(asset)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemName}>{asset.name}</Text>
                          <Text style={styles.itemType}>{getAssetTypeLabel(asset.type)}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.editControls}>
                        <TouchableOpacity
                          style={[styles.controlButton, styles.pinToTopButton, index === 0 && styles.disabledButton]}
                          onPress={() => handleMoveAssetToTop(index)}
                          disabled={index === 0}
                        >
                          <Ionicons name="arrow-up-circle" size={20} color={index === 0 ? "#CCC" : "#FF9500"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.controlButton, index === 0 && styles.disabledButton]}
                          onPress={() => handleMoveAssetUp(index)}
                          disabled={index === 0}
                        >
                          <Ionicons name="chevron-up" size={20} color={index === 0 ? "#CCC" : "#007AFF"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.controlButton, index === assets.length - 1 && styles.disabledButton]}
                          onPress={() => handleMoveAssetDown(index)}
                          disabled={index === assets.length - 1}
                        >
                          <Ionicons name="chevron-down" size={20} color={index === assets.length - 1 ? "#CCC" : "#007AFF"} />
                        </TouchableOpacity>

                        {/* 🗑️ 可靠刪除：重新啟用資產刪除按鈕 */}
                        <TouchableOpacity
                          style={[styles.controlButton, styles.deleteControlButton]}
                          onPress={() => handleDeleteAsset(asset.id)}
                        >
                          <Ionicons name="trash" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>尚未添加任何資產</Text>
              <Text style={styles.emptySubtext}>點擊右上角的 + 號開始添加</Text>
            </View>
          )}
        </View>

        {/* Liabilities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>負債 (Liabilities)</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsLiabilityEditMode(!isLiabilityEditMode)}
              >
                <Ionicons
                  name={isLiabilityEditMode ? "checkmark" : "create-outline"}
                  size={20}
                  color={isLiabilityEditMode ? "#34C759" : "#007AFF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddLiabilityModal(true)}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {liabilities.length > 0 ? (
            <View>
              {liabilities.map((liability, index) => (
                <View key={liability.id} style={styles.itemContainer}>
                  {!isLiabilityEditMode ? (
                    // 🗑️ 可靠刪除：重新啟用滑動刪除功能
                    <Swipeable
                      renderRightActions={() => renderRightActions(() => handleDeleteLiability(liability.id))}
                      rightThreshold={100}
                      friction={1}
                    >
                      <TouchableOpacity
                        style={styles.itemCard}
                        onPress={() => {
                          Alert.alert(
                            '負債管理',
                            '負債功能正在重新設計中',
                            [{ text: '確定', style: 'default' }]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleContainer}>
                            <Text style={styles.itemName}>{liability.name}</Text>
                            <Text style={styles.itemType}>{getLiabilityTypeLabel(liability.type)}</Text>
                          </View>
                          {/* 🔧 WEB 環境臨時刪除按鈕 - 防止事件冒泡 */}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              console.log('🗑️ 刪除按鈕被點擊 - 負債ID:', liability.id);
                              handleDeleteLiability(liability.id);
                            }}
                            style={styles.webDeleteButton}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.itemDetails}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>餘額</Text>
                            <Text style={[styles.detailValue, styles.liabilityAmount]}>
                              {formatCurrency(liability.balance)}
                            </Text>
                          </View>
                          {liability.interest_rate && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>利率</Text>
                              <Text style={styles.detailValue}>{liability.interest_rate}%</Text>
                            </View>
                          )}
                          {liability.monthly_payment && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>月付金</Text>
                              <Text style={styles.detailValue}>{formatCurrency(liability.monthly_payment)}</Text>
                            </View>
                          )}
                          {liability.payment_periods && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>期數</Text>
                              <Text style={styles.detailValue}>
                                {liability.remaining_periods || liability.payment_periods}/{liability.payment_periods} 期
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                  ) : (
                    <View style={styles.editModeCard}>
                      <TouchableOpacity
                        style={styles.itemCard}
                        onPress={() => handleEditLiability(liability)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemName}>{liability.name}</Text>
                          <Text style={styles.itemType}>{getLiabilityTypeLabel(liability.type)}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.editControls}>
                        <TouchableOpacity
                          style={[styles.controlButton, styles.pinToTopButton, index === 0 && styles.disabledButton]}
                          onPress={() => handleMoveLiabilityToTop(index)}
                          disabled={index === 0}
                        >
                          <Ionicons name="arrow-up-circle" size={20} color={index === 0 ? "#CCC" : "#FF9500"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.controlButton, index === 0 && styles.disabledButton]}
                          onPress={() => handleMoveLiabilityUp(index)}
                          disabled={index === 0}
                        >
                          <Ionicons name="chevron-up" size={20} color={index === 0 ? "#CCC" : "#007AFF"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.controlButton, index === liabilities.length - 1 && styles.disabledButton]}
                          onPress={() => handleMoveLiabilityDown(index)}
                          disabled={index === liabilities.length - 1}
                        >
                          <Ionicons name="chevron-down" size={20} color={index === liabilities.length - 1 ? "#CCC" : "#007AFF"} />
                        </TouchableOpacity>

                        {/* 🗑️ 可靠刪除：重新啟用刪除按鈕 */}
                        <TouchableOpacity
                          style={[styles.controlButton, styles.deleteControlButton]}
                          onPress={() => handleDeleteLiability(liability.id)}
                        >
                          <Ionicons name="trash" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>尚未添加任何負債</Text>
              <Text style={styles.emptySubtext}>點擊右上角的 + 號開始添加</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Asset Modal */}
      <AddAssetModal
        visible={showAddAssetModal}
        onClose={handleCloseAssetModal}
        onAdd={handleUpdateAsset}
        editingAsset={editingAsset}
      />

      {/* Add Liability Modal */}
      <AddLiabilityModal
        visible={showAddLiabilityModal}
        onClose={handleCloseLiabilityModal}
        onAdd={handleUpdateLiability}
        editingLiability={editingLiability}
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
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  netWorthAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  assetValue: {
    color: '#34C759',
  },
  liabilityValue: {
    color: '#FF3B30',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  gainText: {
    color: '#34C759',
  },
  lossText: {
    color: '#FF3B30',
  },
  liabilityAmount: {
    color: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
  },
  // 左滑刪除樣式
  deleteAction: {
    width: 100,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  // 拖曳相關樣式
  draggingCard: {
    backgroundColor: '#F0F8FF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  itemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dragHandle: {
    marginRight: 8,
  },
  // 拖曳手柄容器樣式
  dragHandleContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginRight: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  // DraggableFlatList 容器樣式
  flatListContainer: {
    flex: 1,
  },
  draggableList: {
    flex: 1,
  },
  // 編輯模式相關樣式
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  itemContainer: {
    marginBottom: 12,
  },
  editModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  disabledButton: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  deleteControlButton: {
    backgroundColor: '#FFF2F2',
    borderColor: '#FFE5E5',
  },
  pinToTopButton: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
  },
  webDeleteButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    marginLeft: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  itemTitleContainer: {
    flex: 1,
  },
});
