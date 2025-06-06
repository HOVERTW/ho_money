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
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecurringFrequency } from '../types';
import { getFrequencyDisplayName } from '../utils/recurringTransactions';
import { bankAccountService } from '../services/bankAccountService';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import { transactionDataService } from '../services/transactionDataService';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (transaction: any) => void;
  selectedDate: string; // 從月曆選中的日期
  editingTransaction?: any; // 編輯模式的交易資料
}

export default function AddTransactionModal({ visible, onClose, onAdd, selectedDate, editingTransaction }: AddTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [category, setCategory] = useState('餐飲');
  const [account, setAccount] = useState('');

  // 銀行相關狀態
  const [selectedBankId, setSelectedBankId] = useState('');

  // 資產相關狀態
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  // 轉移相關狀態
  const [fromAccount, setFromAccount] = useState(''); // 轉出帳戶
  const [toAccount, setToAccount] = useState(''); // 轉入帳戶

  // 循環交易相關狀態
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [hasOccurrenceLimit, setHasOccurrenceLimit] = useState(false);
  const [maxOccurrences, setMaxOccurrences] = useState('12');
  const [startDate, setStartDate] = useState(new Date(selectedDate));

  // 類別編輯相關狀態
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [editableCategories, setEditableCategories] = useState({
    expense: [] as string[],
    income: [] as string[],
    transfer: ['轉帳', '販售', '購買', '其他'],
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // 當選中的日期改變時，更新開始日期
  useEffect(() => {
    setStartDate(new Date(selectedDate));
  }, [selectedDate]);

  // 從 transactionDataService 獲取類別
  useEffect(() => {
    const updateCategories = () => {
      const allCategories = transactionDataService.getCategories();
      const expenseCategories = allCategories
        .filter(cat => cat.type === 'expense')
        .map(cat => cat.name);
      const incomeCategories = allCategories
        .filter(cat => cat.type === 'income')
        .map(cat => cat.name);
      const transferCategories = allCategories
        .filter(cat => cat.type === 'transfer')
        .map(cat => cat.name);

      setEditableCategories({
        expense: expenseCategories,
        income: incomeCategories,
        transfer: transferCategories.length > 0 ? transferCategories : ['轉移'],
      });

      // 如果當前類別不在新的類別列表中，設置為第一個類別
      if (type === 'expense' && expenseCategories.length > 0 && !expenseCategories.includes(category)) {
        setCategory(expenseCategories[0]);
      } else if (type === 'income' && incomeCategories.length > 0 && !incomeCategories.includes(category)) {
        setCategory(incomeCategories[0]);
      } else if (type === 'transfer' && transferCategories.length > 0 && !transferCategories.includes(category)) {
        setCategory(transferCategories[0]);
      }
    };

    // 初始化類別
    updateCategories();

    // 監聽類別變化
    transactionDataService.addListener(updateCategories);

    return () => {
      transactionDataService.removeListener(updateCategories);
    };
  }, []);

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
    if (editingTransaction) {
      setAmount(editingTransaction.amount?.toString() || '');
      setDescription(editingTransaction.description || '');
      setType(editingTransaction.type || 'expense');
      setCategory(editingTransaction.category || (editableCategories.expense.length > 0 ? editableCategories.expense[0] : '餐飲'));
      setAccount(editingTransaction.account || '');
      setSelectedBankId(editingTransaction.bank_account_id || '');
      setIsRecurring(editingTransaction.is_recurring || false);
      setRecurringFrequency(editingTransaction.recurring_frequency || RecurringFrequency.MONTHLY);
      setHasOccurrenceLimit(!!editingTransaction.max_occurrences);
      setMaxOccurrences(editingTransaction.max_occurrences?.toString() || '12');
      if (editingTransaction.date) {
        setStartDate(new Date(editingTransaction.date));
      }
    } else {
      // 重置表單
      setAmount('');
      setDescription('');
      setType('expense');
      setCategory(editableCategories.expense.length > 0 ? editableCategories.expense[0] : '餐飲');
      setAccount(availableAssets.length > 0 ? availableAssets[0].name : '');
      setSelectedBankId('');
      setIsRecurring(false);
      setRecurringFrequency(RecurringFrequency.MONTHLY);
      setHasOccurrenceLimit(false);
      setMaxOccurrences('12');
      setStartDate(new Date(selectedDate));
    }
  }, [editingTransaction, visible, selectedDate]);

  // 重置編輯狀態 - 只在Modal打開時重置
  useEffect(() => {
    if (visible) {
      setIsEditingCategories(false);
      setNewCategoryName('');
    }
  }, [visible]);

  // 資產類別標籤映射
  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cash': '現金',
      'bank': '銀行',
      'tw_stock': '台股',
      'us_stock': '美股',
      'mutual_fund': '基金',
      'cryptocurrency': '加密貨幣',
      'real_estate': '不動產',
      'vehicle': '汽車',
      'insurance': '保單',
      'precious_metal': '貴金屬',
      'other': '其他',
    };
    return labels[type] || type;
  };

  // 從資產列表生成帳戶選項
  const accountOptions = React.useMemo(() => {
    // 只使用用戶創建的資產作為帳戶選項
    const assetAccounts = availableAssets.map(asset => ({
      key: asset.name,
      label: asset.name,
      type: asset.type,
      isAsset: true,
    }));

    return assetAccounts;
  }, [availableAssets]);

  const bankAccounts = bankAccountService.getAllBankAccounts();
  const shouldShowBankSelector = account === '銀行' && bankAccountService.shouldShowBankSelector();

  // 循環頻率選項
  const frequencyOptions = [
    { key: RecurringFrequency.DAILY, label: '每日' },
    { key: RecurringFrequency.WEEKLY, label: '每週' },
    { key: RecurringFrequency.MONTHLY, label: '每月' },
    { key: RecurringFrequency.YEARLY, label: '每年' },
  ];

  // 類別編輯處理函數
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const updatedCategories = {
        ...editableCategories,
        [type]: [...editableCategories[type], newCategoryName.trim()]
      };
      setEditableCategories(updatedCategories);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    Alert.alert(
      '刪除類別',
      `確定要刪除類別「${categoryToDelete}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: () => {
            const updatedCategories = {
              ...editableCategories,
              [type]: editableCategories[type].filter(cat => cat !== categoryToDelete)
            };
            setEditableCategories(updatedCategories);
            // 如果刪除的是當前選中的類別，重置為第一個類別
            if (category === categoryToDelete && updatedCategories[type].length > 0) {
              setCategory(updatedCategories[type][0]);
            }
          }
        }
      ]
    );
  };

  const handleMoveCategory = (categoryIndex: number, direction: 'up' | 'down') => {
    const currentCategories = [...editableCategories[type]];
    const newIndex = direction === 'up' ? categoryIndex - 1 : categoryIndex + 1;

    if (newIndex >= 0 && newIndex < currentCategories.length) {
      // 交換位置
      [currentCategories[categoryIndex], currentCategories[newIndex]] =
      [currentCategories[newIndex], currentCategories[categoryIndex]];

      const updatedCategories = {
        ...editableCategories,
        [type]: currentCategories
      };
      setEditableCategories(updatedCategories);
    }
  };

  const handlePinToTop = (categoryIndex: number) => {
    const currentCategories = [...editableCategories[type]];
    const categoryToPin = currentCategories[categoryIndex];

    // 移除該類別
    currentCategories.splice(categoryIndex, 1);
    // 添加到最前面
    currentCategories.unshift(categoryToPin);

    const updatedCategories = {
      ...editableCategories,
      [type]: currentCategories
    };
    setEditableCategories(updatedCategories);
  };

  const handleSubmit = () => {
    if (!amount) {
      Alert.alert('錯誤', '請填寫金額');
      return;
    }

    // 檢查是否有可用的帳戶
    if (type !== 'transfer' && accountOptions.length === 0) {
      Alert.alert('錯誤', '請先創建資產作為交易帳戶');
      return;
    }

    // 檢查是否選擇了帳戶
    if (type !== 'transfer' && !account) {
      Alert.alert('錯誤', '請選擇交易帳戶');
      return;
    }

    // 轉移類型的特殊驗證
    if (type === 'transfer') {
      if (accountOptions.length < 2) {
        Alert.alert('錯誤', '轉移交易需要至少兩個資產帳戶');
        return;
      }
      if (fromAccount === toAccount) {
        Alert.alert('錯誤', '轉出帳戶和轉入帳戶不能相同');
        return;
      }
      if (!fromAccount || !toAccount) {
        Alert.alert('錯誤', '請選擇轉出帳戶和轉入帳戶');
        return;
      }
    }

    // 如果選擇銀行且有多個銀行，檢查是否選擇了具體銀行
    if (account === '銀行' && shouldShowBankSelector && !selectedBankId) {
      Alert.alert('錯誤', '請選擇銀行帳戶');
      return;
    }

    // 處理轉移交易
    if (type === 'transfer') {
      // 創建轉移交易，包含轉出和轉入信息
      const transferTransaction = {
        id: editingTransaction?.id || Date.now().toString(),
        amount: parseFloat(amount),
        type: 'transfer',
        description: description.trim() || '',
        category,
        fromAccount,
        toAccount,
        date: startDate.toISOString(),
        // 循環交易相關欄位
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : undefined,
        max_occurrences: isRecurring && hasOccurrenceLimit ? parseInt(maxOccurrences) : undefined,
        start_date: isRecurring ? startDate : undefined,
        // 保留原有的創建時間
        created_at: editingTransaction?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onAdd(transferTransaction);
    } else {
      // 處理一般收入/支出交易
      // 如果沒有填寫描述，使用空白而不是預設值
      const finalDescription = description.trim();

      // 確定最終的帳戶名稱
      let finalAccount = account;
      if (account === '銀行') {
        if (shouldShowBankSelector && selectedBankId) {
          const selectedBank = bankAccountService.getBankAccountById(selectedBankId);
          finalAccount = selectedBank ? selectedBank.name : '銀行';
        } else if (!shouldShowBankSelector) {
          // 如果只有一個銀行，使用該銀行名稱
          const defaultBank = bankAccountService.getDefaultBankAccount();
          finalAccount = defaultBank ? defaultBank.name : '銀行';
        }
      }

      const transaction = {
        id: editingTransaction?.id || Date.now().toString(),
        amount: parseFloat(amount),
        type,
        description: finalDescription,
        category,
        account: finalAccount,
        bank_account_id: account === '銀行' ? selectedBankId || bankAccountService.getDefaultBankAccount()?.id : undefined,
        date: startDate.toISOString(), // 使用選中的日期，不管是單次還是循環交易
        // 循環交易相關欄位
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : undefined,
        max_occurrences: isRecurring && hasOccurrenceLimit ? parseInt(maxOccurrences) : undefined,
        start_date: isRecurring ? startDate : undefined,
        // 保留原有的創建時間
        created_at: editingTransaction?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onAdd(transaction);
    }

    // 重置表單
    setAmount('');
    setDescription('');
    setType('expense');
    setCategory(editableCategories.expense.length > 0 ? editableCategories.expense[0] : '餐飲');
    setAccount(availableAssets.length > 0 ? availableAssets[0].name : '');
    setSelectedBankId('');
    setFromAccount(availableAssets.length > 0 ? availableAssets[0].name : '');
    setToAccount(availableAssets.length > 1 ? availableAssets[1].name : '');
    setIsRecurring(false);
    setRecurringFrequency(RecurringFrequency.MONTHLY);
    setHasOccurrenceLimit(false);
    setMaxOccurrences('12');
    setStartDate(new Date(selectedDate)); // 重置為當前選中的日期

    onClose();
    const successMessage = type === 'transfer' ? '轉移交易已添加' : (editingTransaction ? '交易記錄已更新' : (isRecurring ? '循環交易已設定' : '交易記錄已添加'));
    Alert.alert('成功', successMessage);
  };

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
            <Text style={styles.title}>{editingTransaction ? '編輯交易' : '新增交易'}</Text>
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
            keyboardShouldPersistTaps="handled"
          >
          {/* 交易類型選擇 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>交易類型</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'expense' && styles.activeTypeButton]}
                onPress={() => setType('expense')}
              >
                <Ionicons name="arrow-up" size={20} color={type === 'expense' ? '#fff' : '#FF3B30'} />
                <Text style={[styles.typeButtonText, type === 'expense' && styles.activeTypeButtonText]}>
                  支出
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'income' && styles.activeTypeButton]}
                onPress={() => setType('income')}
              >
                <Ionicons name="arrow-down" size={20} color={type === 'income' ? '#fff' : '#34C759'} />
                <Text style={[styles.typeButtonText, type === 'income' && styles.activeTypeButtonText]}>
                  收入
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'transfer' && styles.activeTypeButton]}
                onPress={() => setType('transfer')}
              >
                <Ionicons name="swap-horizontal" size={20} color={type === 'transfer' ? '#fff' : '#007AFF'} />
                <Text style={[styles.typeButtonText, type === 'transfer' && styles.activeTypeButtonText]}>
                  轉移
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 金額輸入 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>金額</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* 描述輸入 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>描述 (可選)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="輸入交易描述"
              placeholderTextColor="#999"
            />
          </View>

          {/* 類別選擇 */}
          <View style={styles.section}>
            <View style={styles.categoryHeader}>
              <Text style={styles.sectionTitle}>類別</Text>
              <TouchableOpacity
                style={styles.editCategoryButton}
                onPress={() => setIsEditingCategories(!isEditingCategories)}
              >
                <Ionicons
                  name={isEditingCategories ? "checkmark" : "create-outline"}
                  size={20}
                  color="#007AFF"
                />
              </TouchableOpacity>
            </View>

            {!isEditingCategories ? (
              // 正常顯示模式 - 一行5個固定大小
              <View style={styles.categoryGrid}>
                {editableCategories[type].map((cat, index) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryGridButton, category === cat && styles.activeCategoryButton]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryButtonText, category === cat && styles.activeCategoryButtonText]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // 編輯模式
              <View style={styles.categoryEditContainer}>
                {/* 新增類別 */}
                <View style={styles.addCategoryContainer}>
                  <TextInput
                    style={styles.addCategoryInput}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="輸入新類別名稱"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={handleAddCategory}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* 類別列表 - 可編輯 */}
                <ScrollView style={styles.categoryEditList}>
                  {editableCategories[type].map((cat, index) => (
                    <View key={cat} style={styles.categoryEditItem}>
                      <Text style={styles.categoryEditText}>{cat}</Text>
                      <View style={styles.categoryEditActions}>
                        {/* 置頂按鈕 */}
                        <TouchableOpacity
                          style={[styles.categoryActionButton, index === 0 && styles.disabledButton]}
                          onPress={() => handlePinToTop(index)}
                          disabled={index === 0}
                        >
                          <Ionicons name="arrow-up-circle-outline" size={16} color={index === 0 ? "#ccc" : "#007AFF"} />
                        </TouchableOpacity>

                        {/* 上移按鈕 */}
                        <TouchableOpacity
                          style={[styles.categoryActionButton, index === 0 && styles.disabledButton]}
                          onPress={() => handleMoveCategory(index, 'up')}
                          disabled={index === 0}
                        >
                          <Ionicons name="chevron-up" size={16} color={index === 0 ? "#ccc" : "#666"} />
                        </TouchableOpacity>

                        {/* 下移按鈕 */}
                        <TouchableOpacity
                          style={[styles.categoryActionButton, index === editableCategories[type].length - 1 && styles.disabledButton]}
                          onPress={() => handleMoveCategory(index, 'down')}
                          disabled={index === editableCategories[type].length - 1}
                        >
                          <Ionicons name="chevron-down" size={16} color={index === editableCategories[type].length - 1 ? "#ccc" : "#666"} />
                        </TouchableOpacity>

                        {/* 刪除按鈕 */}
                        <TouchableOpacity
                          style={styles.categoryDeleteButton}
                          onPress={() => handleDeleteCategory(cat)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* 轉移帳戶選擇 (僅轉移類型顯示) */}
          {type === 'transfer' && (
            <>
              {accountOptions.length < 2 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>轉移帳戶</Text>
                  <View style={styles.emptyAccountContainer}>
                    <Text style={styles.emptyAccountText}>轉移交易需要至少兩個資產帳戶</Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* 轉出帳戶 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>轉出帳戶</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {accountOptions.map((acc) => (
                        <TouchableOpacity
                          key={acc.key}
                          style={[styles.categoryButton, fromAccount === acc.key && styles.activeCategoryButton]}
                          onPress={() => setFromAccount(acc.key)}
                        >
                          <Text style={[styles.categoryButtonText, fromAccount === acc.key && styles.activeCategoryButtonText]}>
                            {acc.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 轉入帳戶 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>轉入帳戶</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {accountOptions.map((acc) => (
                        <TouchableOpacity
                          key={acc.key}
                          style={[styles.categoryButton, toAccount === acc.key && styles.activeCategoryButton]}
                          onPress={() => setToAccount(acc.key)}
                        >
                          <Text style={[styles.categoryButtonText, toAccount === acc.key && styles.activeCategoryButtonText]}>
                            {acc.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </>
          )}

          {/* 帳戶選擇 (非轉移類型顯示) */}
          {type !== 'transfer' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>帳戶</Text>
              {accountOptions.length === 0 ? (
                <View style={styles.emptyAccountContainer}>
                  <Text style={styles.emptyAccountText}>請先創建資產</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {accountOptions.map((acc) => (
                    <TouchableOpacity
                      key={acc.key}
                      style={[styles.categoryButton, account === acc.key && styles.activeCategoryButton]}
                      onPress={() => {
                        setAccount(acc.key);
                        if (acc.key !== '銀行') {
                          setSelectedBankId('');
                        }
                      }}
                    >
                      <Text style={[styles.categoryButtonText, account === acc.key && styles.activeCategoryButtonText]}>
                        {acc.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

            {/* 銀行選擇器 (當選擇銀行且有多個銀行時顯示) */}
            {shouldShowBankSelector && (
              <View style={styles.bankSelectorContainer}>
                <Text style={styles.bankSelectorTitle}>選擇銀行</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {bankAccounts.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[styles.bankSelectorButton, selectedBankId === bank.id && styles.activeBankSelectorButton]}
                      onPress={() => setSelectedBankId(bank.id)}
                    >
                      <Text style={[styles.bankSelectorButtonText, selectedBankId === bank.id && styles.activeBankSelectorButtonText]}>
                        {bank.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 單一銀行提示 */}
            {account === '銀行' && !shouldShowBankSelector && bankAccounts.length === 1 && (
              <View style={styles.singleBankInfo}>
                <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
                <Text style={styles.singleBankText}>
                  將使用: {bankAccounts[0].name}
                </Text>
              </View>
            )}
            </View>
          )}

          {/* 循環交易設定 */}
          <View style={styles.section}>
            <View style={styles.recurringHeader}>
              <View style={styles.recurringTitleContainer}>
                <Ionicons name="repeat" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>循環</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor={isRecurring ? '#fff' : '#f4f3f4'}
              />
            </View>

            {isRecurring && (
              <View style={styles.recurringOptions}>
                <Text style={styles.recurringSubtitle}>循環頻率</Text>
                <View style={styles.frequencySelector}>
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === option.key && styles.activeFrequencyButton
                      ]}
                      onPress={() => setRecurringFrequency(option.key)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        recurringFrequency === option.key && styles.activeFrequencyButtonText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 開始日期設定 */}
                <View style={styles.startDateSection}>
                  <Text style={styles.recurringSubtitle}>
                    {isRecurring ? '開始日期' : '交易日期'}
                  </Text>
                  <View style={styles.dateDisplayContainer}>
                    <View style={styles.dateDisplay}>
                      <Text style={styles.dateDisplayText}>
                        {startDate.toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long',
                        })}
                      </Text>
                      <Ionicons name="calendar" size={16} color="#007AFF" />
                    </View>
                    <Text style={styles.dateHint}>
                      {isRecurring ? '循環交易將從此日期開始' : '交易將記錄在此日期'}
                      {isRecurring && startDate.getDate() >= 29 && (
                        '\n⚠️ 注意：當月份沒有此日期時，將自動調整為該月最後一天'
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.changeDateButton}
                      onPress={() => {
                        Alert.alert(
                          '更改日期',
                          '您可以在月曆上點選其他日期，或選擇以下選項：',
                          [
                            {
                              text: '今天',
                              onPress: () => setStartDate(new Date()),
                            },
                            {
                              text: '明天',
                              onPress: () => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setStartDate(tomorrow);
                              },
                            },
                            {
                              text: '取消',
                              style: 'cancel',
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.changeDateButtonText}>更改日期</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 重複次數設定 */}
                <View style={styles.occurrenceSection}>
                  <View style={styles.occurrenceHeader}>
                    <Text style={styles.recurringSubtitle}>重複次數</Text>
                    <Switch
                      value={hasOccurrenceLimit}
                      onValueChange={setHasOccurrenceLimit}
                      trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                      thumbColor={hasOccurrenceLimit ? '#fff' : '#f4f3f4'}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>

                  {hasOccurrenceLimit && (
                    <View style={styles.occurrenceInputContainer}>
                      <Text style={styles.occurrenceLabel}>重複</Text>
                      <TextInput
                        style={styles.occurrenceInput}
                        value={maxOccurrences}
                        onChangeText={setMaxOccurrences}
                        placeholder="12"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.occurrenceLabel}>次</Text>
                    </View>
                  )}

                  {!hasOccurrenceLimit && (
                    <Text style={styles.unlimitedText}>無限重複</Text>
                  )}
                </View>

                <View style={styles.recurringInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#666" />
                  <Text style={styles.recurringInfoText}>
                    設定後將在每{getFrequencyDisplayName(recurringFrequency).replace('每', '')}自動記錄此交易
                    {hasOccurrenceLimit && ` (共${maxOccurrences}次)`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          </ScrollView>
        </SafeAreaView>
      </View>
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
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  activeTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: '#fff',
  },
  // 類別編輯樣式
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editCategoryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 6,
  },
  categoryGridButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    width: '18%', // 固定寬度，一行5個 (18% * 5 + gap)
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  categoryEditContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  addCategoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  addCategoryInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addCategoryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEditList: {
    maxHeight: 300, // 增加高度讓用戶能看到5個類別 (每個項目約60px高度)
  },
  categoryEditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryEditText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  categoryEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  disabledButton: {
    backgroundColor: '#F8F8F8',
  },
  categoryDeleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFE5E5',
  },
  // 循環交易樣式
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  recurringSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  activeFrequencyButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFrequencyButtonText: {
    color: '#fff',
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
  },
  recurringInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // 銀行選擇器樣式
  bankSelectorContainer: {
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  bankSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bankSelectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
  },
  activeBankSelectorButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  bankSelectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeBankSelectorButtonText: {
    color: '#fff',
  },
  singleBankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    gap: 8,
  },
  singleBankText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // 開始日期樣式
  startDateSection: {
    marginTop: 16,
  },
  dateDisplayContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  dateHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  changeDateButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  changeDateButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  // 重複次數樣式
  occurrenceSection: {
    marginTop: 16,
  },
  occurrenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  occurrenceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  occurrenceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  occurrenceInput: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 60,
  },
  unlimitedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // 空帳戶狀態樣式
  emptyAccountContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  emptyAccountText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
});
