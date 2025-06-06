import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface CustomPieChartProps {
  data: PieData[];
  width?: number;
  height?: number;
}

const CustomPieChart: React.FC<CustomPieChartProps> = ({
  data,
  width = screenWidth - 32,
  height = 220,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 如果沒有資料，顯示提示
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暫無資料</Text>
      </View>
    );
  }

  // 計算圓餅圖參數
  const radius = 70;
  const centerX = width / 2;
  const centerY = 90;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // 如果總數為0，顯示提示
  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暫無資料</Text>
      </View>
    );
  }

  // 計算每個扇形
  let currentAngle = -Math.PI / 2; // 從12點鐘方向開始
  const slices = data.map((item) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // 計算路徑
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  return (
    <View style={styles.container}>
      {/* SVG 圓餅圖 */}
      <View style={styles.chartContainer}>
        <Svg width={width} height={180}>
          {slices.map((slice, index) => (
            <Path
              key={`pie-slice-${slice.name}-${index}`}
              d={slice.pathData}
              fill={slice.color}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      {/* 自定義圖例 */}
      <View style={styles.legendContainer}>
        {slices.map((item, index) => (
          <View key={`pie-legend-${item.name}-${index}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.name} ${formatCurrency(item.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  chartContainer: {
    alignItems: 'center',
    width: '100%',
  },
  legendContainer: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default CustomPieChart;
