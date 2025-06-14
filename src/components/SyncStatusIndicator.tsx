/**
 * 同步狀態指示器組件
 * 顯示即時同步狀態和進度
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { eventEmitter, EVENTS } from '../services/eventEmitter';
import { instantSyncService } from '../services/instantSyncService';

interface SyncStatusIndicatorProps {
  style?: any;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ style }) => {
  const [syncStatus, setSyncStatus] = useState(instantSyncService.getSyncStatus());
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // 監聽同步狀態變化
    const handleSyncStatusChange = (status: any) => {
      setSyncStatus(status);
    };

    // 監聽同步成功
    const handleSyncSuccess = (data: any) => {
      setLastSyncMessage(`✅ ${data.operation}`);
      showMessage();
    };

    // 監聽同步錯誤
    const handleSyncError = (data: any) => {
      setLastSyncMessage(`❌ ${data.operation} 失敗`);
      showMessage();
    };

    // 顯示消息動畫
    const showMessage = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLastSyncMessage('');
      });
    };

    eventEmitter.on(EVENTS.SYNC_STATUS_CHANGED, handleSyncStatusChange);
    eventEmitter.on(EVENTS.SYNC_SUCCESS, handleSyncSuccess);
    eventEmitter.on(EVENTS.SYNC_ERROR, handleSyncError);

    return () => {
      eventEmitter.off(EVENTS.SYNC_STATUS_CHANGED, handleSyncStatusChange);
      eventEmitter.off(EVENTS.SYNC_SUCCESS, handleSyncSuccess);
      eventEmitter.off(EVENTS.SYNC_ERROR, handleSyncError);
    };
  }, [fadeAnim]);

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return '#ff4444';
    if (syncStatus.syncInProgress) return '#ff9500';
    if (syncStatus.pendingOperations > 0) return '#ffcc00';
    return '#00cc44';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return '離線';
    if (syncStatus.syncInProgress) return '同步中...';
    if (syncStatus.pendingOperations > 0) return `待同步 ${syncStatus.pendingOperations}`;
    return '已同步';
  };

  return (
    <View style={[styles.container, style]}>
      {/* 同步狀態指示器 */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* 最後同步時間 */}
      {syncStatus.lastSyncTime && (
        <Text style={styles.lastSyncText}>
          {syncStatus.lastSyncTime.toLocaleTimeString()}
        </Text>
      )}

      {/* 同步消息 */}
      {lastSyncMessage && (
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.messageText}>{lastSyncMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 10,
    color: '#666',
  },
  messageContainer: {
    position: 'absolute',
    top: -25,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  messageText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default SyncStatusIndicator;
