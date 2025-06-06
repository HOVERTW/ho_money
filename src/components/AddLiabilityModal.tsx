import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { liabilityTransactionSyncService } from '../services/liabilityTransactionSyncService';
import PaymentDayPicker from './PaymentDayPicker';

interface AddLiabilityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (liability: any) => void;
  editingLiability?: any;
}

export default function AddLiabilityModal({ visible, onClose, onAdd, editingLiability }: AddLiabilityModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState('credit_card');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  // 自動還款相關狀態
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [paymentPeriods, setPaymentPeriods] = useState('');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [showPaymentDayPicker, setShowPaymentDayPicker] = useState(false);

  const liabilityTypes = [
    { key: 'credit_card', label: '信用卡', icon: '💳' },
    { key: 'personal_loan', label: '信用貸款', icon: '💰' },
    { key: 'mortgage', label: '房屋貸款', icon: '🏠' },
    { key: 'car_loan', label: '汽車貸款', icon: '🚗' },
    { key: 'other_loan', label: '其他貸款', icon: '📋' },
  ];

  // 獲取可用資產列表
  useEffect(() => {
    const updateAssets = () => {
      const assets = assetTransactionSyncService.getAssets();
      setAvailableAssets(assets);
    };

    // 初始化資產列表
    updateAssets();

    // 監聽資產變化
    assetTransactionSyncService.addListener(updateAssets);

    return () => {
      assetTransactionSyncService.removeListener(updateAssets);
    };
  }, []);

  // 編輯模式初始化
  useEffect(() => {
    if (editingLiability) {
      setName(editingLiability.name || '');
      setType(editingLiability.type || 'credit_card');
      setBalance(editingLiability.balance?.toString() || '');
      setInterestRate(editingLiability.interest_rate?.toString() || '');
      setMonthlyPayment(editingLiability.monthly_payment?.toString() || '');
      setPaymentAccount(editingLiability.payment_account || '');
      setPaymentDay(editingLiability.payment_day || null);
      setPaymentPeriods(editingLiability.payment_periods?.toString() || '');
    } else {
      // 重置表單
      setName('');
      setType('credit_card');
      setBalance('');
      setInterestRate('');
      setMonthlyPayment('');
      setPaymentAccount('');
      setPaymentDay(null);
      setPaymentPeriods('');
    }
  }, [editingLiability, visible]);

  const handleSubmit = async () => {
    if (!balance) {
      Alert.alert('錯誤', '請填寫當前餘額');
      return;
    }

    // 🔥 修復2：還款帳戶設為必要選項
    if (monthlyPayment && !paymentAccount) {
      Alert.alert('錯誤', '設定月付金時必須選擇還款帳戶');
      return;
    }

    // 使用預設名稱如果沒有填寫
    const selectedLiabilityType = liabilityTypes.find(t => t.key === type);
    const defaultName = selectedLiabilityType?.label || '負債';
    const finalName = name.trim() || defaultName;

    const liability = {
      id: editingLiability?.id || Date.now().toString(),
      name: finalName,
      type,
      balance: parseFloat(balance),
      interest_rate: interestRate ? parseFloat(interestRate) : undefined,
      monthly_payment: monthlyPayment ? parseFloat(monthlyPayment) : undefined,
      payment_account: paymentAccount || undefined,
      payment_day: paymentDay || undefined,
      payment_periods: paymentPeriods ? parseInt(paymentPeriods) : undefined,
      remaining_periods: paymentPeriods ? parseInt(paymentPeriods) : undefined,
      created_at: editingLiability?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('💾 準備保存負債:', liability);
    console.log('🔍 檢查循環交易條件:', {
      monthly_payment: liability.monthly_payment,
      payment_account: liability.payment_account,
      payment_day: liability.payment_day,
      monthly_payment_check: !!liability.monthly_payment,
      payment_account_check: !!liability.payment_account,
      payment_day_check: !!liability.payment_day,
    });

    try {
      // 添加/更新負債（同步邏輯由 BalanceSheetScreen 處理）
      await onAdd(liability);
      console.log('✅ 負債處理完成');

      // 重置表單
      setName('');
      setType('credit_card');
      setBalance('');
      setInterestRate('');
      setMonthlyPayment('');
      setPaymentAccount('');
      setPaymentDay(null);
      setPaymentPeriods('');

      onClose();

      // 根據是否創建了循環交易顯示不同的成功消息
      const hasRecurringTransaction = liability.monthly_payment && liability.payment_account && liability.payment_day;
      const message = editingLiability ? '負債已更新' : '負債已添加';
      const recurringMessage = hasRecurringTransaction ? '，並已同步到記帳區循環支出' : '';

      Alert.alert('成功', message + recurringMessage);
    } catch (error) {
      console.error('❌ 處理負債失敗:', error);
      Alert.alert('錯誤', '處理負債時發生錯誤，請重試');
    }
  };

  // 檢查是否為閏年
  const isLeapYear = (year: number): boolean => {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
  };

  // 獲取當前年份的2月天數
  const getCurrentFebruaryDays = (): number => {
    const currentYear = new Date().getFullYear();
    return isLeapYear(currentYear) ? 29 : 28;
  };

  // 獲取月還款日期的顯示文本
  const getPaymentDayDisplayText = (day: number): string => {
    if (day <= 28) {
      return `每月 ${day} 日`;
    } else if (day === 29) {
      const febDays = getCurrentFebruaryDays();
      if (febDays === 29) {
        return `每月 ${day} 日 (平年2月為28日)`;
      } else {
        return `每月 ${day} 日 (2月為28日)`;
      }
    } else if (day === 30) {
      const febDays = getCurrentFebruaryDays();
      return `每月 ${day} 日 (2月為${febDays}日)`;
    } else if (day === 31) {
      return `每月 ${day} 日 (月底最後一天)`;
    }
    return `每月 ${day} 日`;
  };

  // 處理月還款日期選擇
  const handlePaymentDaySelect = (day: number) => {
    setPaymentDay(day);
    setShowPaymentDayPicker(false);
  };

  const selectedLiabilityType = liabilityTypes.find(t => t.key === type);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>{editingLiability ? '編輯負債' : '新增負債'}</Text>
            <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom + 150, 300),
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
          {/* 負債類型選擇 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>負債類型</Text>
            <FlatList
              data={liabilityTypes}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyExtractor={(item) => item.key}
              renderItem={({ item: liabilityType }) => (
                <TouchableOpacity
                  style={[styles.typeButton, type === liabilityType.key && styles.activeTypeButton]}
                  onPress={() => setType(liabilityType.key)}
                >
                  <Text style={styles.typeIcon}>{liabilityType.icon}</Text>
                  <Text style={[styles.typeButtonText, type === liabilityType.key && styles.activeTypeButtonText]}>
                    {liabilityType.label}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.typeScrollContent}
            />
          </View>

          {/* 還款帳戶選擇 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>還款帳戶 {monthlyPayment ? '(必選)' : ''}</Text>
            <FlatList
              data={availableAssets}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyExtractor={(item) => item.id}
              renderItem={({ item: asset }) => {
                const isSelected = paymentAccount === asset.name;
                return (
                  <TouchableOpacity
                    style={[styles.typeButton, isSelected && styles.activeTypeButton]}
                    onPress={() => setPaymentAccount(asset.name)}
                  >
                    <Text style={styles.typeIcon}>
                      {asset.type === 'cash' ? '💵' :
                       asset.type === 'bank' ? '🏦' :
                       asset.type === 'tw_stock' ? '📈' :
                       asset.type === 'us_stock' ? '🇺🇸' :
                       asset.type === 'mutual_fund' ? '📊' :
                       asset.type === 'cryptocurrency' ? '₿' :
                       asset.type === 'real_estate' ? '🏠' :
                       asset.type === 'vehicle' ? '🚗' : '💼'}
                    </Text>
                    <Text style={[styles.typeButtonText, isSelected && styles.activeTypeButtonText]}>
                      {asset.name}
                    </Text>
                    <Text style={[styles.assetBalanceText, isSelected && styles.activeAssetBalanceText]}>
                      ${asset.current_value.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.typeScrollContent}
              ListEmptyComponent={
                <View style={styles.noAssetsHint}>
                  <Ionicons name="information-circle-outline" size={16} color="#999" />
                  <Text style={styles.noAssetsHintText}>無可用資產</Text>
                </View>
              }
            />
          </View>

          {/* 負債名稱 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>負債名稱 (可選)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={`輸入${selectedLiabilityType?.label}名稱 (預設: ${selectedLiabilityType?.label})`}
              placeholderTextColor="#999"
            />
          </View>

          {/* 當前餘額 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>當前餘額</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={setBalance}
              placeholder="輸入當前欠款金額"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* 年利率 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>年利率 (%) (可選)</Text>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              placeholder="輸入年利率 (可選)"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.helpText}>
              僅供紀錄參考，實際還款以月付金為主
            </Text>
          </View>

          {/* 月付金 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>月付金</Text>
            <TextInput
              style={styles.input}
              value={monthlyPayment}
              onChangeText={setMonthlyPayment}
              placeholder="輸入每月還款金額"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* 月還款日期 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>月還款日期</Text>
            <TouchableOpacity
              style={[styles.input, styles.paymentDayButton]}
              onPress={() => setShowPaymentDayPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.paymentDayButtonText,
                !paymentDay && styles.placeholderText
              ]}>
                {paymentDay ? getPaymentDayDisplayText(paymentDay) : '選擇每月還款日期'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            <Text style={styles.helpText}>
              設定後將在每月此日期自動從還款帳戶扣除月付金
            </Text>
            {paymentDay && paymentDay >= 29 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                <Text style={styles.warningText}>
                  {paymentDay === 29 && (getCurrentFebruaryDays() === 29 ? '平年2月將調整為28日，閏年正常執行' : '2月將調整為28日')}
                  {paymentDay === 30 && `2月將調整為${getCurrentFebruaryDays()}日`}
                  {paymentDay === 31 && '自動調整為每月最後一天'}
                </Text>
              </View>
            )}
          </View>

          {/* 期數 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>期數</Text>
            <TextInput
              style={styles.input}
              value={paymentPeriods}
              onChangeText={setPaymentPeriods}
              placeholder="輸入還款期數（月）"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <Text style={styles.helpText}>
              設定總還款期數，到期後自動停止扣款
            </Text>
          </View>

          {/* 提示信息 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              負債金額會從您的淨資產中扣除。請定期更新餘額以保持準確性。
            </Text>
          </View>

          </ScrollView>
        </SafeAreaView>
      </View>

      {/* 月還款日期選擇器 */}
      <PaymentDayPicker
        visible={showPaymentDayPicker}
        selectedDay={paymentDay}
        onSelect={handlePaymentDaySelect}
        onClose={() => setShowPaymentDayPicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10, // 減少頂部間距，因為SafeAreaView已經處理了安全區域
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeScrollContent: {
    paddingHorizontal: 16,
  },
  typeButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
    minWidth: 80,
  },
  activeTypeButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // 資產餘額文字樣式
  assetBalanceText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  activeAssetBalanceText: {
    color: '#FFB3B3',
  },
  // 無可用資產提示樣式
  noAssetsHint: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
    minWidth: 80,
    gap: 4,
  },
  noAssetsHintText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  // 月還款日期選擇器樣式
  paymentDayButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDayButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
});
