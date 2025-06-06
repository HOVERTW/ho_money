import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentDayPickerProps {
  visible: boolean;
  selectedDay: number | null;
  onSelect: (day: number) => void;
  onClose: () => void;
}

export default function PaymentDayPicker({
  visible,
  selectedDay,
  onSelect,
  onClose,
}: PaymentDayPickerProps) {
  const [tempSelectedDay, setTempSelectedDay] = useState<number | null>(selectedDay);

  // 生成1-31日的選項
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleConfirm = () => {
    if (tempSelectedDay) {
      onSelect(tempSelectedDay);
    }
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedDay(selectedDay);
    onClose();
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

  const getDisplayText = (day: number): string => {
    if (day <= 28) {
      return `${day}日`;
    } else if (day === 29) {
      const febDays = getCurrentFebruaryDays();
      if (febDays === 29) {
        return `${day}日 (平年2月為28日)`;
      } else {
        return `${day}日 (2月為28日)`;
      }
    } else if (day === 30) {
      const febDays = getCurrentFebruaryDays();
      return `${day}日 (2月為${febDays}日)`;
    } else if (day === 31) {
      return `${day}日 (月底最後一天)`;
    }
    return `${day}日`;
  };

  const getHintText = (day: number): string => {
    if (day <= 28) {
      return '每月固定此日期';
    } else if (day === 29) {
      const febDays = getCurrentFebruaryDays();
      if (febDays === 29) {
        return '平年2月調整為28日，閏年正常執行';
      } else {
        return '2月調整為28日';
      }
    } else if (day === 30) {
      const febDays = getCurrentFebruaryDays();
      return `2月調整為${febDays}日`;
    } else if (day === 31) {
      return '自動調整為每月最後一天';
    }
    return '';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>

          <Text style={styles.title}>選擇月還款日期</Text>

          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmButton, !tempSelectedDay && styles.disabledButton]}
            disabled={!tempSelectedDay}
          >
            <Text style={[styles.confirmButtonText, !tempSelectedDay && styles.disabledText]}>
              確認
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
          <Text style={styles.infoText}>
            選擇29、30、31日時，系統會自動調整為該月的最後一天
          </Text>
        </View>

        {/* Day Picker */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {days.map((day) => {
            const isSelected = tempSelectedDay === day;
            const isSpecialDay = day >= 29;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayItem,
                  isSelected && styles.selectedDayItem,
                  isSpecialDay && styles.specialDayItem,
                ]}
                onPress={() => setTempSelectedDay(day)}
                activeOpacity={0.7}
              >
                <View style={styles.dayContent}>
                  <View style={styles.dayHeader}>
                    <Text style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isSpecialDay && styles.specialDayText,
                    ]}>
                      {getDisplayText(day)}
                    </Text>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </View>

                  {isSpecialDay && (
                    <Text style={[
                      styles.hintText,
                      isSelected && styles.selectedHintText,
                    ]}>
                      {getHintText(day)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Day Preview */}
        {tempSelectedDay && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>預覽</Text>
            <Text style={styles.previewText}>
              每月 {tempSelectedDay} 日自動扣款
            </Text>
            {tempSelectedDay >= 29 && (
              <Text style={styles.previewHint}>
                ⚠️ {getHintText(tempSelectedDay)}
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledText: {
    color: '#999',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  selectedDayItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  specialDayItem: {
    borderColor: '#FF9500',
  },
  dayContent: {
    padding: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedDayText: {
    color: '#007AFF',
  },
  specialDayText: {
    color: '#FF9500',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  selectedHintText: {
    color: '#007AFF',
  },
  previewContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  previewHint: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
});
