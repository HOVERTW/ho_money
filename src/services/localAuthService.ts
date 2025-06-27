/**
 * 本地認證服務
 * 完全繞過 Supabase 認證，使用本地存儲
 * 確保 100% 可以工作的認證系統
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 本地用戶數據結構
export interface LocalUser {
  id: string;
  email: string;
  password: string; // 在實際應用中應該加密
  created_at: string;
  confirmed: boolean;
}

// 本地會話數據結構
export interface LocalSession {
  user: LocalUser;
  access_token: string;
  expires_at: string;
}

// 認證響應結構
export interface LocalAuthResponse {
  data: {
    user: LocalUser | null;
    session: LocalSession | null;
  };
  error: Error | null;
}

class LocalAuthService {
  private readonly USERS_KEY = 'local_users';
  private readonly CURRENT_SESSION_KEY = 'current_session';
  private readonly DEFAULT_USERS_KEY = 'default_users';

  constructor() {
    this.initializeDefaultUsers();
  }

  /**
   * 初始化默認用戶
   */
  private async initializeDefaultUsers() {
    try {
      const defaultUsers: LocalUser[] = [
        {
          id: 'user01-local-id',
          email: 'user01@gmail.com',
          password: 'user01',
          created_at: new Date().toISOString(),
          confirmed: true
        },
        {
          id: 'test-local-id',
          email: 'test@example.com',
          password: 'test123',
          created_at: new Date().toISOString(),
          confirmed: true
        }
      ];

      // 檢查是否已經初始化
      const initialized = await this.getStorageItem(this.DEFAULT_USERS_KEY);
      if (!initialized) {
        // 添加默認用戶
        for (const user of defaultUsers) {
          await this.addUser(user);
        }
        await this.setStorageItem(this.DEFAULT_USERS_KEY, 'initialized');
        console.log('✅ LocalAuth: 默認用戶已初始化');
      }
    } catch (error) {
      console.error('💥 LocalAuth: 初始化默認用戶失敗:', error);
    }
  }

  /**
   * 存儲操作（跨平台兼容）
   */
  private async setStorageItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, jsonValue);
      } else {
        await AsyncStorage.setItem(key, jsonValue);
      }
    } catch (error) {
      console.error('💥 LocalAuth: 存儲失敗:', error);
      throw error;
    }
  }

  /**
   * 讀取操作（跨平台兼容）
   */
  private async getStorageItem(key: string): Promise<any> {
    try {
      let jsonValue: string | null;
      if (Platform.OS === 'web') {
        jsonValue = localStorage.getItem(key);
      } else {
        jsonValue = await AsyncStorage.getItem(key);
      }
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('💥 LocalAuth: 讀取失敗:', error);
      return null;
    }
  }

  /**
   * 獲取所有用戶
   */
  private async getUsers(): Promise<LocalUser[]> {
    const users = await this.getStorageItem(this.USERS_KEY);
    return users || [];
  }

  /**
   * 添加用戶
   */
  private async addUser(user: LocalUser): Promise<void> {
    const users = await this.getUsers();
    const existingIndex = users.findIndex(u => u.email === user.email);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user; // 更新現有用戶
    } else {
      users.push(user); // 添加新用戶
    }
    
    await this.setStorageItem(this.USERS_KEY, users);
  }

  /**
   * 生成訪問令牌
   */
  private generateAccessToken(): string {
    return `local_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成用戶ID
   */
  private generateUserId(): string {
    return `local_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 登錄
   */
  async signIn(email: string, password: string): Promise<LocalAuthResponse> {
    console.log('🔐 LocalAuth: 開始登錄:', email);

    try {
      const users = await this.getUsers();
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        console.log('❌ LocalAuth: 用戶不存在或密碼錯誤');
        return {
          data: { user: null, session: null },
          error: new Error('電子郵件或密碼不正確')
        };
      }

      if (!user.confirmed) {
        console.log('❌ LocalAuth: 用戶未確認');
        return {
          data: { user: null, session: null },
          error: new Error('帳號尚未確認')
        };
      }

      // 創建會話
      const session: LocalSession = {
        user,
        access_token: this.generateAccessToken(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小時後過期
      };

      // 保存當前會話
      await this.setStorageItem(this.CURRENT_SESSION_KEY, session);

      console.log('✅ LocalAuth: 登錄成功:', user.email);
      return {
        data: { user, session },
        error: null
      };

    } catch (error) {
      console.error('💥 LocalAuth: 登錄異常:', error);
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error('登錄失敗')
      };
    }
  }

  /**
   * 註冊
   */
  async signUp(email: string, password: string): Promise<LocalAuthResponse> {
    console.log('📝 LocalAuth: 開始註冊:', email);

    try {
      const users = await this.getUsers();
      const existingUser = users.find(u => u.email === email);

      if (existingUser) {
        console.log('❌ LocalAuth: 用戶已存在');
        return {
          data: { user: null, session: null },
          error: new Error('此電子郵件已被註冊')
        };
      }

      // 創建新用戶
      const newUser: LocalUser = {
        id: this.generateUserId(),
        email,
        password,
        created_at: new Date().toISOString(),
        confirmed: true // 本地認證直接確認
      };

      // 保存用戶
      await this.addUser(newUser);

      // 創建會話（自動登錄）
      const session: LocalSession = {
        user: newUser,
        access_token: this.generateAccessToken(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // 保存當前會話
      await this.setStorageItem(this.CURRENT_SESSION_KEY, session);

      console.log('✅ LocalAuth: 註冊成功並自動登錄:', newUser.email);
      return {
        data: { user: newUser, session },
        error: null
      };

    } catch (error) {
      console.error('💥 LocalAuth: 註冊異常:', error);
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error('註冊失敗')
      };
    }
  }

  /**
   * 獲取當前會話
   */
  async getSession(): Promise<LocalAuthResponse> {
    try {
      const session = await this.getStorageItem(this.CURRENT_SESSION_KEY);
      
      if (!session) {
        return {
          data: { user: null, session: null },
          error: null
        };
      }

      // 檢查會話是否過期
      if (new Date(session.expires_at) < new Date()) {
        console.log('⚠️ LocalAuth: 會話已過期');
        await this.signOut();
        return {
          data: { user: null, session: null },
          error: new Error('會話已過期')
        };
      }

      return {
        data: { user: session.user, session },
        error: null
      };

    } catch (error) {
      console.error('💥 LocalAuth: 獲取會話失敗:', error);
      return {
        data: { user: null, session: null },
        error: error instanceof Error ? error : new Error('獲取會話失敗')
      };
    }
  }

  /**
   * 登出
   */
  async signOut(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
      } else {
        await AsyncStorage.removeItem(this.CURRENT_SESSION_KEY);
      }
      console.log('✅ LocalAuth: 已登出');
    } catch (error) {
      console.error('💥 LocalAuth: 登出失敗:', error);
    }
  }

  /**
   * 清除所有數據（測試用）
   */
  async clearAllData(): Promise<void> {
    try {
      const keys = [this.USERS_KEY, this.CURRENT_SESSION_KEY, this.DEFAULT_USERS_KEY];
      
      if (Platform.OS === 'web') {
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        await AsyncStorage.multiRemove(keys);
      }
      
      console.log('✅ LocalAuth: 所有數據已清除');
    } catch (error) {
      console.error('💥 LocalAuth: 清除數據失敗:', error);
    }
  }
}

// 創建單例實例
export const localAuthService = new LocalAuthService();
export default localAuthService;
