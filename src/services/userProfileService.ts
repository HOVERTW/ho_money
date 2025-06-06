/**
 * 用戶資料管理服務
 * 管理用戶顯示名稱等個人資料
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

class UserProfileService {
  private readonly STORAGE_KEY = 'user_profile';
  private profile: UserProfile | null = null;
  private listeners: Array<(profile: UserProfile) => void> = [];

  /**
   * 初始化用戶資料服務
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromStorage();
      console.log('✅ 用戶資料服務已初始化');
    } catch (error) {
      console.error('❌ 用戶資料服務初始化失敗:', error);
      // 創建默認資料
      await this.createDefaultProfile();
    }
  }

  /**
   * 從本地存儲加載用戶資料
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.profile = JSON.parse(data);
        console.log('📦 已加載用戶資料:', this.profile?.displayName);
      } else {
        await this.createDefaultProfile();
      }
    } catch (error) {
      console.error('❌ 加載用戶資料失敗:', error);
      await this.createDefaultProfile();
    }
  }

  /**
   * 保存到本地存儲
   */
  private async saveToStorage(): Promise<void> {
    try {
      if (this.profile) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.profile));
        console.log('💾 用戶資料已保存');
      }
    } catch (error) {
      console.error('❌ 保存用戶資料失敗:', error);
    }
  }

  /**
   * 創建默認用戶資料
   */
  private async createDefaultProfile(): Promise<void> {
    const now = new Date().toISOString();
    this.profile = {
      displayName: '小富翁',
      email: 'demo@fintranzo.com',
      createdAt: now,
      updatedAt: now,
    };
    await this.saveToStorage();
    console.log('✅ 已創建默認用戶資料');
  }

  /**
   * 獲取用戶資料
   */
  getProfile(): UserProfile | null {
    return this.profile;
  }

  /**
   * 獲取顯示名稱
   */
  getDisplayName(): string {
    return this.profile?.displayName || '小富翁';
  }

  /**
   * 更新顯示名稱
   */
  async updateDisplayName(newName: string): Promise<boolean> {
    try {
      if (!newName.trim()) {
        console.warn('⚠️ 顯示名稱不能為空');
        return false;
      }

      if (this.profile) {
        this.profile.displayName = newName.trim();
        this.profile.updatedAt = new Date().toISOString();
        await this.saveToStorage();
        
        // 通知監聽器
        this.notifyListeners();
        
        console.log('✅ 顯示名稱已更新:', newName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 更新顯示名稱失敗:', error);
      return false;
    }
  }

  /**
   * 重置為默認名稱
   */
  async resetToDefault(): Promise<void> {
    await this.updateDisplayName('小富翁');
  }

  /**
   * 添加監聽器
   */
  addListener(listener: (profile: UserProfile) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除監聽器
   */
  removeListener(listener: (profile: UserProfile) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(): void {
    if (this.profile) {
      this.listeners.forEach(listener => {
        try {
          listener(this.profile!);
        } catch (error) {
          console.error('❌ 監聽器執行失敗:', error);
        }
      });
    }
  }

  /**
   * 清除所有資料（用於測試）
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.profile = null;
      console.log('🗑️ 用戶資料已清除');
    } catch (error) {
      console.error('❌ 清除用戶資料失敗:', error);
    }
  }

  /**
   * 獲取統計資訊
   */
  getStats() {
    return {
      hasProfile: !!this.profile,
      displayName: this.getDisplayName(),
      email: this.profile?.email || 'N/A',
      createdAt: this.profile?.createdAt || 'N/A',
      updatedAt: this.profile?.updatedAt || 'N/A',
      listenersCount: this.listeners.length,
    };
  }
}

// 創建單例實例
export const userProfileService = new UserProfileService();
