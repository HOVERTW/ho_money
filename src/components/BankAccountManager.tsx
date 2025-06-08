import React, { useState } from 'react';
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
// import { bankAccountService } from '../services/bankAccountService'; // 已移除
// import { BankAccount, BankAccountType } from '../types'; // 簡化

// 簡化的銀行帳戶類型定義
interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
}

interface BankAccountManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function BankAccountManager({ visible, onClose }: BankAccountManagerProps) {
  // 簡化的銀行帳戶管理
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: 'default_bank', name: '預設銀行', account_number: '123456789' }
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  // 表單狀態
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const refreshBankAccounts = () => {
    // 簡化：不需要刷新，因為使用靜態數據
    console.log('銀行帳戶已刷新');
  };

  const resetForm = () => {
    setBankName('');
    setAccountNumber('');
    setEditingBank(null);
    setShowAddForm(false);
  };

  const handleAddBank = () => {
    if (!bankName.trim()) {
      Alert.alert('錯誤', '請填寫銀行名稱');
      return;
    }

    // 簡化的銀行帳戶管理
    if (editingBank) {
      // 編輯模式
      const updatedAccounts = bankAccounts.map(bank =>
        bank.id === editingBank.id
          ? { ...bank, name: bankName.trim(), account_number: accountNumber.trim() || undefined }
          : bank
      );
      setBankAccounts(updatedAccounts);
      Alert.alert('成功', '銀行帳戶已更新');
    } else {
      // 新增模式
      const newBank: BankAccount = {
        id: `bank_${Date.now()}`,
        name: bankName.trim(),
        account_number: accountNumber.trim() || undefined,
      };
      setBankAccounts([...bankAccounts, newBank]);
      Alert.alert('成功', '銀行帳戶已添加');
    }

    resetForm();
  };

  const handleEditBank = (bank: BankAccount) => {
    setBankName(bank.name);
    setAccountNumber(bank.account_number || '');
    setEditingBank(bank);
    setShowAddForm(true);
  };

  const handleDeleteBank = (bank: BankAccount) => {
    Alert.alert(
      '確認刪除',
      `確定要刪除 "${bank.name}" 嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: () => {
            const updatedAccounts = bankAccounts.filter(b => b.id !== bank.id);
            setBankAccounts(updatedAccounts);
            Alert.alert('成功', '銀行帳戶已刪除');
          },
        },
      ]
    );
  };

  const renderBankItem = ({ item }: { item: BankAccount }) => (
    <View style={styles.bankItem}>
      <View style={styles.bankLeft}>
        <View style={styles.bankIcon}>
          <Text style={styles.bankIconText}>🏦</Text>
        </View>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{item.name}</Text>
          {item.account_number && (
            <Text style={styles.bankNumber}>****{item.account_number.slice(-4)}</Text>
          )}
        </View>
      </View>
      <View style={styles.bankActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditBank(item)}
        >
          <Ionicons name="pencil" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteBank(item)}
        >
          <Ionicons name="trash" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>銀行帳戶管理</Text>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* 統計信息 */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              總共 {bankAccounts.length} 個銀行帳戶
            </Text>
          </View>

          {/* 銀行帳戶列表 */}
          <FlatList
            data={bankAccounts}
            renderItem={renderBankItem}
            keyExtractor={(item) => item.id}
            style={styles.bankList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>暫無銀行帳戶</Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => setShowAddForm(true)}
                >
                  <Text style={styles.emptyAddButtonText}>添加第一個銀行帳戶</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        {/* 添加/編輯表單 */}
        <Modal
          visible={showAddForm}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={resetForm}
        >
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>
                {editingBank ? '編輯銀行帳戶' : '新增銀行帳戶'}
              </Text>
              <TouchableOpacity onPress={handleAddBank} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent}>
              {/* 銀行名稱 */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>銀行名稱</Text>
                <TextInput
                  style={styles.formInput}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="例如: 玉山銀行"
                  placeholderTextColor="#999"
                />
              </View>

              {/* 帳號 (可選) */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>帳號 (可選)</Text>
                <TextInput
                  style={styles.formInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="輸入帳號後四位或完整帳號"
                  placeholderTextColor="#999"
                />
              </View>


            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
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
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bankList: {
    flex: 1,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankIconText: {
    fontSize: 20,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },

  bankNumber: {
    fontSize: 12,
    color: '#999',
  },
  bankActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // 表單樣式
  formContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  formTitle: {
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
  formContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

});
