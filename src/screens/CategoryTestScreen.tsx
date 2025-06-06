import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { transactionDataService } from '../services/transactionDataService';

export default function CategoryTestScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加載類別
  const loadCategories = () => {
    const allCategories = transactionDataService.getCategories();
    setCategories(allCategories);
    console.log('📊 當前類別數量:', allCategories.length);
    console.log('💰 支出類別:', allCategories.filter(c => c.type === 'expense').map(c => c.name));
  };

  // 強制更新類別
  const forceUpdateCategories = async () => {
    setIsLoading(true);
    try {
      await transactionDataService.forceUpdateCategories();
      loadCategories();
      Alert.alert('成功', '類別已更新到最新版本！');
    } catch (error) {
      Alert.alert('錯誤', '更新類別失敗');
      console.error('更新類別失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除所有數據
  const clearAllData = async () => {
    Alert.alert(
      '確認清除',
      '這將清除所有本地數據，確定要繼續嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await transactionDataService.clearAllData();
              // 重新初始化
              await transactionDataService.initialize();
              loadCategories();
              Alert.alert('成功', '數據已清除並重新初始化！');
            } catch (error) {
              Alert.alert('錯誤', '清除數據失敗');
              console.error('清除數據失敗:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadCategories();

    // 監聽類別變化
    const updateCategories = () => {
      loadCategories();
    };

    transactionDataService.addListener(updateCategories);

    return () => {
      transactionDataService.removeListener(updateCategories);
    };
  }, []);

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>類別測試頁面</Text>

      {/* 操作按鈕 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={forceUpdateCategories}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '更新中...' : '🔄 強制更新類別'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={loadCategories}
        >
          <Text style={styles.buttonText}>🔄 重新加載</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearAllData}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🗑️ 清除所有數據</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 支出類別 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            支出類別 ({expenseCategories.length})
          </Text>
          <View style={styles.categoryGrid}>
            {expenseCategories.map((category, index) => (
              <View key={category.id} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryId}>ID: {category.id}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 收入類別 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            收入類別 ({incomeCategories.length})
          </Text>
          <View style={styles.categoryGrid}>
            {incomeCategories.map((category, index) => (
              <View key={category.id} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryId}>ID: {category.id}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 期望的類別布局 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>期望的支出類別布局</Text>
          <Text style={styles.expectedLayout}>
            第一行：餐飲 交通 購物 娛樂 禮品{'\n'}
            第二行：學習 旅行 醫療 保險 還款{'\n'}
            第三行：家居 家庭 紅包 其他
          </Text>
        </View>

        {/* 期望的收入類別布局 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>期望的收入類別布局</Text>
          <Text style={styles.expectedLayout}>
            第一行：薪水 獎金 投資 副業 租金{'\n'}
            第二行：利息 中獎 收款 販售 其他
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  refreshButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryId: {
    fontSize: 10,
    color: '#666',
  },
  expectedLayout: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
