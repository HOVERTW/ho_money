/**
 * 增強的TouchableOpacity組件
 * 專門為手機網頁版優化觸控響應
 */

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Platform } from 'react-native';

interface MobileTouchableOpacityProps extends TouchableOpacityProps {
  onPress?: () => void;
  children: React.ReactNode;
  debugLabel?: string;
}

const MobileTouchableOpacity: React.FC<MobileTouchableOpacityProps> = ({
  onPress,
  children,
  debugLabel,
  style,
  activeOpacity = 0.7,
  hitSlop,
  ...props
}) => {
  const handlePress = () => {
    if (debugLabel) {
      console.log(`🔄 手機端觸控事件: ${debugLabel}`);
    }
    
    // 添加小延遲確保事件正確處理
    if (Platform.OS === 'web') {
      setTimeout(() => {
        onPress?.();
      }, 10);
    } else {
      onPress?.();
    }
  };

  // 手機端優化的hitSlop
  const optimizedHitSlop = hitSlop || {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10
  };

  return (
    <TouchableOpacity
      {...props}
      style={style}
      onPress={handlePress}
      activeOpacity={activeOpacity}
      hitSlop={optimizedHitSlop}
      delayPressIn={0}
      delayPressOut={0}
      delayLongPress={500}
    >
      {children}
    </TouchableOpacity>
  );
};

export default MobileTouchableOpacity;
