import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { RecurringFrequency } from '../types';

// 1.5個垃圾桶寬度
const DELETE_BUTTON_WIDTH = 120;

interface SwipeableTransactionItemProps {
  item: any;
  account: any;
  category: any;
  isFutureTransaction: boolean;
  onDelete: (item: any, deleteType?: 'single' | 'future' | 'all') => void;
  onEdit?: (item: any) => void;
  formatCurrency: (amount: number) => string;
}

export default function SwipeableTransactionItem({
  item,
  account,
  category,
  isFutureTransaction,
  onDelete,
  onEdit,
  formatCurrency,
}: SwipeableTransactionItemProps) {

  const handleDelete = () => {
    console.log('🗑️ 終極修復：滑動刪除被觸發，交易ID:', item.id);
    console.log('🗑️ 終極修復：交易詳情:', JSON.stringify(item, null, 2));

    if (!onDelete) {
      console.error('❌ 終極修復：onDelete回調函數未定義');
      Alert.alert('錯誤', '刪除功能暫時不可用');
      return;
    }

    if (item.is_recurring) {
      // 循環交易顯示三個選項
      Alert.alert(
        '刪除循環交易',
        `確定要刪除循環交易 "${item.description}" 嗎？`,
        [
          {
            text: '單次刪除',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶選擇單次刪除');
              try {
                onDelete(item, 'single');
                console.log('✅ 終極修復：單次刪除調用成功');
              } catch (error) {
                console.error('❌ 終極修復：單次刪除調用失敗:', error);
              }
            },
            style: 'default',
          },
          {
            text: '向後刪除',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶選擇向後刪除');
              try {
                onDelete(item, 'future');
                console.log('✅ 終極修復：向後刪除調用成功');
              } catch (error) {
                console.error('❌ 終極修復：向後刪除調用失敗:', error);
              }
            },
            style: 'destructive',
          },
          {
            text: '全部刪除',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶選擇全部刪除');
              try {
                onDelete(item, 'all');
                console.log('✅ 終極修復：全部刪除調用成功');
              } catch (error) {
                console.error('❌ 終極修復：全部刪除調用失敗:', error);
              }
            },
            style: 'destructive',
          },
          {
            text: '取消',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶取消刪除');
            },
            style: 'cancel',
          },
        ]
      );
    } else {
      // 普通交易直接刪除
      Alert.alert(
        '刪除交易',
        `確定要刪除交易 "${item.description}" 嗎？此操作無法撤銷。`,
        [
          {
            text: '取消',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶取消刪除');
            },
            style: 'cancel',
          },
          {
            text: '刪除',
            onPress: () => {
              console.log('🗑️ 終極修復：用戶確認刪除，調用onDelete');
              try {
                onDelete(item);
                console.log('✅ 終極修復：普通交易刪除調用成功');
              } catch (error) {
                console.error('❌ 終極修復：普通交易刪除調用失敗:', error);
                Alert.alert('刪除失敗', '交易刪除時發生錯誤，請重試');
              }
            },
            style: 'destructive',
          },
        ]
      );
    }
  };

  // 終極修復：渲染右滑刪除按鈕（增強事件處理）
  const renderRightActions = () => {
    console.log('🗑️ 終極修復：渲染右側刪除按鈕');

    return (
      <Animated.View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            console.log('🗑️ 終極修復：刪除按鈕被點擊');
            handleDelete();
          }}
          activeOpacity={0.6} // 終極修復：增強按鈕反饋
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 終極修復：增加點擊區域
        >
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.deleteText}>刪除</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={100}
      friction={1}
    >
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => onEdit?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          <View style={[
            styles.categoryIcon,
            { backgroundColor: category?.color || '#007AFF' }
          ]}>
            <Ionicons
              name={item.type === 'transfer' ? 'swap-horizontal' : (category?.icon as any || 'card-outline')}
              size={20}
              color="#fff"
            />
          </View>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTitleRow}>
              <Text style={styles.transactionDescription}>
                {/* 修改：主要顯示類別，描述作為小字註記 */}
                {category?.name || '未分類'}
                {item.description && item.description !== (category?.name || '未分類') && (
                  <Text style={styles.descriptionNote}> {item.description}</Text>
                )}
              </Text>
              {item.is_recurring && (
                <View style={styles.recurringBadge}>
                  <Ionicons name="repeat" size={12} color="#007AFF" />
                </View>
              )}
            </View>
            <Text style={styles.transactionAccount}>
              {item.type === 'transfer'
                ? `${item.fromAccount || '未知'} → ${item.toAccount || '未知'}`
                : (account?.name || item.account || '未知帳戶')
              }
              {item.is_recurring && item.recurring_frequency && (
                <Text style={styles.recurringText}>
                  {' • '}
                  {item.recurring_frequency === RecurringFrequency.DAILY && '每日'}
                  {item.recurring_frequency === RecurringFrequency.WEEKLY && '每週'}
                  {item.recurring_frequency === RecurringFrequency.MONTHLY && '每月'}
                  {item.recurring_frequency === RecurringFrequency.YEARLY && '每年'}
                </Text>
              )}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            item.type === 'transfer' ? styles.transferAmount :
            (item.type === 'income' ? styles.incomeAmount : styles.expenseAmount)
          ]}>
            {item.type === 'transfer' ? '' : (item.type === 'income' ? '+' : '-')}
            {formatCurrency(Math.abs(item.amount))}
          </Text>

        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  // 刪除按鈕樣式（1.5個垃圾桶寬度）
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: DELETE_BUTTON_WIDTH,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
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
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  descriptionNote: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
  },
  recurringBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  transactionAccount: {
    fontSize: 14,
    color: '#666',
  },
  recurringText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  incomeAmount: {
    color: '#34C759',
  },
  expenseAmount: {
    color: '#FF3B30',
  },
  transferAmount: {
    color: '#007AFF',
  },
  transactionTime: {
    fontSize: 12,
    color: '#999',
  },

});
