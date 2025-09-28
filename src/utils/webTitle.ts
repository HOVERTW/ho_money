/**
 * 網頁標題管理工具
 * 用於在Web環境中動態設置頁面標題
 */

import { Platform } from 'react-native';

/**
 * 設置網頁標題
 * @param title 要設置的標題，默認為"Ho記帳"
 */
export const setWebTitle = (title: string = 'Ho記帳'): void => {
  // 只在Web環境中執行
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      document.title = title;
      console.log(`📄 網頁標題已設置為: ${title}`);
    } catch (error) {
      console.warn('⚠️ 設置網頁標題失敗:', error);
    }
  }
};

/**
 * 獲取當前網頁標題
 * @returns 當前標題或默認標題
 */
export const getWebTitle = (): string => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return document.title || 'Ho記帳';
  }
  return 'Ho記帳';
};

/**
 * 重置網頁標題為默認值
 */
export const resetWebTitle = (): void => {
  setWebTitle('Ho記帳');
};
