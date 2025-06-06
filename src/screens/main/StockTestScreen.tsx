/**
 * 股票測試畫面
 * 使用 SimpleStockSearch 組件測試股票功能
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleStockSearch from '../../../components/SimpleStockSearch';

const StockTestScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <SimpleStockSearch />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
});

export default StockTestScreen;
