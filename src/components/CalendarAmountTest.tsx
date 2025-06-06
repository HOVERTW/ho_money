/**
 * 月曆收支總額顯示測試組件
 * 用於驗證日期下方的 +/- 總額顯示功能
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { transactionDataService } from '../services/transactionDataService';
import { testCalendarAmounts, addTestTransactions, validateCalendarDisplay } from '../utils/testCalendarAmounts';

interface CalendarAmountTestProps {
  onClose?: () => void;
}

export const CalendarAmountTest: React.FC<CalendarAmountTestProps> = ({ onClose }) => {
  
  const handleAddTestData = () => {
    try {
      const testTransactions = addTestTransactions();
      Alert.alert(
        '✅ 測試資料已添加',
        `已添加 ${testTransactions.length} 筆測試交易\n\n請前往記帳頁面查看月曆顯示效果：\n\n6月2日: -9,050 (紅色)\n6月15日: +6,314 (綠色)\n6月16日: -776 (紅色)\n6月25日: +1,252 (綠色)\n6月27日: -786 (紅色)\n6月30日: -679 (紅色)`,
        [{ text: '確定' }]
      );
    } catch (error) {
      Alert.alert('❌ 錯誤', '添加測試資料失敗');
    }
  };

  const handleValidateLogic = () => {
    try {
      const isValid = validateCalendarDisplay();
      if (isValid) {
        Alert.alert(
          '🎉 驗證通過',
          '月曆收支顯示邏輯正確！\n\n✅ 有交易的日期顯示 +/- 總額\n✅ 沒有交易的日期保持空白\n✅ 收入>支出顯示綠色\n✅ 支出>收入顯示紅色',
          [{ text: '確定' }]
        );
      } else {
        Alert.alert('❌ 驗證失敗', '月曆收支顯示邏輯有問題');
      }
    } catch (error) {
      Alert.alert('❌ 錯誤', '驗證過程中發生錯誤');
    }
  };

  const handleShowCurrentData = () => {
    try {
      const dailySummary = testCalendarAmounts();
      const dates = Object.keys(dailySummary).sort();
      
      if (dates.length === 0) {
        Alert.alert('📅 無資料', '目前沒有任何交易記錄');
        return;
      }
      
      let message = '當前月曆顯示預覽：\n\n';
      dates.slice(0, 10).forEach(date => { // 只顯示前10個日期
        const summary = dailySummary[date];
        const netAmount = summary.income - summary.expense;
        const formattedNet = formatNetAmount(netAmount);
        const color = netAmount > 0 ? '(綠色)' : netAmount < 0 ? '(紅色)' : '(無色)';
        
        message += `${date}: ${formattedNet || '(空白)'} ${color}\n`;
      });
      
      if (dates.length > 10) {
        message += `\n... 還有 ${dates.length - 10} 個日期`;
      }
      
      Alert.alert('📊 當前資料', message, [{ text: '確定' }]);
    } catch (error) {
      Alert.alert('❌ 錯誤', '獲取資料失敗');
    }
  };

  // 格式化收支總額顯示 (與 TransactionsScreen 一致)
  const formatNetAmount = (amount: number) => {
    if (amount === 0) return '';
    const absAmount = Math.abs(amount);
    
    let formattedAmount: string;
    if (absAmount >= 10000) {
      const wanAmount = Math.round(absAmount / 1000) / 10;
      formattedAmount = wanAmount % 1 === 0 ? `${Math.round(wanAmount)}萬` : `${wanAmount}萬`;
    } else {
      formattedAmount = new Intl.NumberFormat('zh-TW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(absAmount);
    }
    
    return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 月曆收支總額測試</Text>
      <Text style={styles.description}>
        測試月曆日期下方顯示收支總額功能
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleAddTestData}>
          <Text style={styles.buttonText}>🧪 添加測試資料</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleShowCurrentData}>
          <Text style={styles.buttonText}>📊 查看當前資料</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleValidateLogic}>
          <Text style={styles.buttonText}>🔍 驗證顯示邏輯</Text>
        </TouchableOpacity>
        
        {onClose && (
          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
            <Text style={[styles.buttonText, styles.closeButtonText]}>關閉</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>📋 功能說明：</Text>
        <Text style={styles.infoText}>• 有收入/支出的日期會在日期下方顯示 +/- 總額</Text>
        <Text style={styles.infoText}>• 沒有交易的日期下方保持空白</Text>
        <Text style={styles.infoText}>• 收入大於支出顯示綠色 +金額</Text>
        <Text style={styles.infoText}>• 支出大於收入顯示紅色 -金額</Text>
        <Text style={styles.infoText}>• 超過萬元的金額會簡化顯示 (如 1.5萬)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
    lineHeight: 20,
  },
});

export default CalendarAmountTest;
