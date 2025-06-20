import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  showModal?: boolean;
  onPress?: () => void;
  onClose?: () => void;
}

interface NotificationManagerProps {
  children: React.ReactNode;
}

interface NotificationState extends NotificationConfig {
  id: string;
  visible: boolean;
}

// 全局通知管理器
class GlobalNotificationManager {
  private listeners: ((notification: NotificationConfig) => void)[] = [];
  private modalListeners: ((notification: NotificationConfig) => void)[] = [];

  // 顯示通知
  show(config: NotificationConfig) {
    console.log('📢 顯示通知:', config.title, config.message);
    
    if (config.showModal) {
      this.modalListeners.forEach(listener => listener(config));
    } else {
      this.listeners.forEach(listener => listener(config));
    }
  }

  // 顯示成功通知
  success(title: string, message: string, showModal: boolean = false) {
    this.show({
      type: 'success',
      title,
      message,
      showModal,
      duration: showModal ? undefined : 3000,
    });
  }

  // 顯示錯誤通知
  error(title: string, message: string, showModal: boolean = true) {
    this.show({
      type: 'error',
      title,
      message,
      showModal,
      duration: showModal ? undefined : 4000,
    });
  }

  // 顯示警告通知
  warning(title: string, message: string, showModal: boolean = false) {
    this.show({
      type: 'warning',
      title,
      message,
      showModal,
      duration: showModal ? undefined : 3500,
    });
  }

  // 顯示信息通知
  info(title: string, message: string, showModal: boolean = false) {
    this.show({
      type: 'info',
      title,
      message,
      showModal,
      duration: showModal ? undefined : 3000,
    });
  }

  // 註冊監聽器
  addListener(listener: (notification: NotificationConfig) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 註冊模態監聽器
  addModalListener(listener: (notification: NotificationConfig) => void) {
    this.modalListeners.push(listener);
    return () => {
      const index = this.modalListeners.indexOf(listener);
      if (index > -1) {
        this.modalListeners.splice(index, 1);
      }
    };
  }
}

// 創建全局實例
export const notificationManager = new GlobalNotificationManager();

// Toast 通知組件
const ToastNotification: React.FC<{ notification: NotificationState; onHide: () => void }> = ({
  notification,
  onHide,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (notification.visible) {
      // 顯示動畫
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 自動隱藏
      if (notification.duration) {
        const timer = setTimeout(() => {
          hideNotification();
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    }
  }, [notification.visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
      notification.onClose?.();
    });
  };

  const getIconName = () => {
    switch (notification.type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#2196F3';
    }
  };

  if (!notification.visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          top: insets.top + 10,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={() => {
          notification.onPress?.();
          hideNotification();
        }}
        activeOpacity={0.9}
      >
        <Ionicons
          name={getIconName()}
          size={24}
          color={getIconColor()}
          style={styles.toastIcon}
        />
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle}>{notification.title}</Text>
          <Text style={styles.toastMessage}>{notification.message}</Text>
        </View>
        <TouchableOpacity onPress={hideNotification} style={styles.toastCloseButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 模態通知組件
const ModalNotification: React.FC<{ notification: NotificationState; onHide: () => void }> = ({
  notification,
  onHide,
}) => {
  const getIconName = () => {
    switch (notification.type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#2196F3';
    }
  };

  const handleClose = () => {
    onHide();
    notification.onClose?.();
  };

  const handlePress = () => {
    notification.onPress?.();
    handleClose();
  };

  return (
    <Modal
      visible={notification.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons
              name={getIconName()}
              size={48}
              color={getIconColor()}
              style={styles.modalIcon}
            />
          </View>
          
          <Text style={styles.modalTitle}>{notification.title}</Text>
          <Text style={styles.modalMessage}>{notification.message}</Text>
          
          <View style={styles.modalButtons}>
            {notification.onPress && (
              <TouchableOpacity style={styles.modalButton} onPress={handlePress}>
                <Text style={styles.modalButtonText}>確定</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSecondary]} 
              onPress={handleClose}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                {notification.onPress ? '取消' : '確定'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 主要通知管理器組件
export const NotificationManager: React.FC<NotificationManagerProps> = ({ children }) => {
  const [toastNotifications, setToastNotifications] = useState<NotificationState[]>([]);
  const [modalNotification, setModalNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    // 註冊 Toast 通知監聽器
    const unsubscribeToast = notificationManager.addListener((config) => {
      const notification: NotificationState = {
        ...config,
        id: Date.now().toString(),
        visible: true,
      };

      setToastNotifications(prev => [...prev, notification]);
    });

    // 註冊模態通知監聽器
    const unsubscribeModal = notificationManager.addModalListener((config) => {
      const notification: NotificationState = {
        ...config,
        id: Date.now().toString(),
        visible: true,
      };

      setModalNotification(notification);
    });

    return () => {
      unsubscribeToast();
      unsubscribeModal();
    };
  }, []);

  const hideToastNotification = (id: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  const hideModalNotification = () => {
    setModalNotification(null);
  };

  return (
    <>
      {children}

      {/* Toast 通知 */}
      {toastNotifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onHide={() => hideToastNotification(notification.id)}
        />
      ))}

      {/* 模態通知 */}
      {modalNotification && (
        <ModalNotification
          notification={modalNotification}
          onHide={hideModalNotification}
        />
      )}
    </>
  );
};

// 便捷的 Hook
export const useNotification = () => {
  return {
    success: notificationManager.success.bind(notificationManager),
    error: notificationManager.error.bind(notificationManager),
    warning: notificationManager.warning.bind(notificationManager),
    info: notificationManager.info.bind(notificationManager),
    show: notificationManager.show.bind(notificationManager),
  };
};

const styles = StyleSheet.create({
  // Toast 樣式
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  toastContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  toastIcon: {
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  toastCloseButton: {
    padding: 4,
    marginLeft: 8,
  },

  // 模態樣式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalIcon: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonTextSecondary: {
    color: '#666',
  },
});

export default NotificationManager;
