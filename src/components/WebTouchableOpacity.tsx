/**
 * 網頁版觸控優化組件
 * 專門為網頁版優化的 TouchableOpacity
 */

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface WebTouchableOpacityProps extends TouchableOpacityProps {
  onPress?: () => void;
  children: React.ReactNode;
  debugLabel?: string;
}

const WebTouchableOpacity: React.FC<WebTouchableOpacityProps> = ({
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
      console.log(`🔄 網頁版觸控事件: ${debugLabel}`);
    }
    
    // 網頁版專用 - 添加小延遲確保事件正確處理
    setTimeout(() => {
      onPress?.();
    }, 10);
  };

  // 網頁版優化的hitSlop
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

export default WebTouchableOpacity;
