import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
  currentDate?: string;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  currentDate = new Date().toISOString(),
}: DatePickerModalProps) {
  // 安全的日期處理
  const getSafeDate = (dateString: string) => {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const current = getSafeDate(currentDate);
  const [selectedYear, setSelectedYear] = useState(current.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(current.getMonth() + 1);

  // 當 currentDate 改變時更新選中的年月
  useEffect(() => {
    const newCurrent = getSafeDate(currentDate);
    setSelectedYear(newCurrent.getFullYear());
    setSelectedMonth(newCurrent.getMonth() + 1);
  }, [currentDate]);

  // 生成年份列表（當前年份前後各10年）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // 月份列表
  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ];

  const handleConfirm = () => {
    console.log('DatePickerModal: Selected year:', selectedYear, 'month:', selectedMonth);
    onSelect(selectedYear, selectedMonth);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>選擇年月</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmButton}>確定</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Year Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionTitle}>年份</Text>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.selectedItem
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[
                      styles.pickerText,
                      selectedYear === year && styles.selectedText
                    ]}>
                      {year}年
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionTitle}>月份</Text>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.pickerItem,
                      selectedMonth === month.value && styles.selectedItem
                    ]}
                    onPress={() => setSelectedMonth(month.value)}
                  >
                    <Text style={[
                      styles.pickerText,
                      selectedMonth === month.value && styles.selectedText
                    ]}>
                      {month.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: screenWidth * 0.8,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    padding: 20,
  },
  pickerSection: {
    flex: 1,
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedItem: {
    backgroundColor: '#007AFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
});
