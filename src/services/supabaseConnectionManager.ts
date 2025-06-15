/**
 * Supabase 連接管理器
 * 解決連接斷開和重連問題
 */

import { createClient, SupabaseClient, AuthSession } from '@supabase/supabase-js';
import Constants from 'expo-constants';

interface ConnectionState {
  isConnected: boolean;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

class SupabaseConnectionManager {
  private client: SupabaseClient | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    lastConnectedAt: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(connected: boolean) => void> = [];

  /**
   * 初始化 Supabase 客戶端
   */
  async initialize(): Promise<SupabaseClient> {
    try {
      console.log('🔌 初始化 Supabase 連接管理器...');

      // 獲取環境變量
      const supabaseUrl = this.getSupabaseUrl();
      const supabaseKey = this.getSupabaseKey();

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase 環境變量未設置');
      }

      // 創建客戶端
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'fintranzo-web',
          },
        },
      });

      // 設置連接監聽器
      this.setupConnectionListeners();

      // 開始心跳檢測
      this.startHeartbeat();

      // 測試連接
      await this.testConnection();

      console.log('✅ Supabase 連接管理器初始化成功');
      return this.client;
    } catch (error) {
      console.error('❌ Supabase 連接管理器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取 Supabase URL
   */
  private getSupabaseUrl(): string {
    return (
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.expoConfig?.extra?.supabaseUrl ||
      ''
    );
  }

  /**
   * 獲取 Supabase Key
   */
  private getSupabaseKey(): string {
    return (
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      Constants.expoConfig?.extra?.supabaseAnonKey ||
      ''
    );
  }

  /**
   * 設置連接監聽器
   */
  private setupConnectionListeners(): void {
    if (!this.client) return;

    // 監聽認證狀態變化
    this.client.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 認證狀態變化: ${event}`, session?.user?.email || 'no user');
      
      if (event === 'SIGNED_IN') {
        this.onConnected();
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        this.onDisconnected();
      }
    });

    // 監聽網絡狀態變化
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 網絡已連接');
        this.attemptReconnect();
      });

      window.addEventListener('offline', () => {
        console.log('🌐 網絡已斷開');
        this.onDisconnected();
      });
    }
  }

  /**
   * 開始心跳檢測
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      await this.checkConnection();
    }, 30000); // 每30秒檢查一次
  }

  /**
   * 檢查連接狀態
   */
  private async checkConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;

      // 嘗試獲取用戶信息
      const { data, error } = await this.client.auth.getUser();
      
      if (error) {
        console.warn('⚠️ 連接檢查失敗:', error.message);
        this.onDisconnected();
        return false;
      }

      if (!this.connectionState.isConnected) {
        this.onConnected();
      }

      return true;
    } catch (error) {
      console.error('❌ 連接檢查異常:', error);
      this.onDisconnected();
      return false;
    }
  }

  /**
   * 測試連接
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase 客戶端未初始化');
    }

    try {
      // 測試基本連接
      const { data, error } = await this.client.auth.getSession();
      
      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }

      this.onConnected();
      console.log('✅ Supabase 連接測試成功');
    } catch (error) {
      console.error('❌ Supabase 連接測試失敗:', error);
      throw error;
    }
  }

  /**
   * 連接成功處理
   */
  private onConnected(): void {
    this.connectionState.isConnected = true;
    this.connectionState.lastConnectedAt = new Date();
    this.connectionState.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.notifyListeners(true);
    console.log('✅ Supabase 連接已建立');
  }

  /**
   * 連接斷開處理
   */
  private onDisconnected(): void {
    if (this.connectionState.isConnected) {
      this.connectionState.isConnected = false;
      this.notifyListeners(false);
      console.log('❌ Supabase 連接已斷開');
      
      // 嘗試重連
      this.attemptReconnect();
    }
  }

  /**
   * 嘗試重連
   */
  private async attemptReconnect(): Promise<void> {
    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      console.error('❌ 達到最大重連次數，停止重連');
      return;
    }

    this.connectionState.reconnectAttempts++;
    const delay = this.connectionState.reconnectDelay * this.connectionState.reconnectAttempts;

    console.log(`🔄 嘗試重連 (${this.connectionState.reconnectAttempts}/${this.connectionState.maxReconnectAttempts})，${delay}ms 後重試...`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.checkConnection();
      } catch (error) {
        console.error('❌ 重連失敗:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * 獲取客戶端實例
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase 客戶端未初始化，請先調用 initialize()');
    }
    return this.client;
  }

  /**
   * 檢查是否已連接
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * 獲取連接狀態
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 添加連接狀態監聽器
   */
  addConnectionListener(listener: (connected: boolean) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除連接狀態監聽器
   */
  removeConnectionListener(listener: (connected: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(connected: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('❌ 連接狀態監聽器錯誤:', error);
      }
    });
  }

  /**
   * 強制重連
   */
  async forceReconnect(): Promise<void> {
    console.log('🔄 強制重連 Supabase...');
    this.connectionState.reconnectAttempts = 0;
    await this.attemptReconnect();
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.listeners = [];
    this.connectionState.isConnected = false;
  }
}

// 創建單例實例
export const supabaseConnectionManager = new SupabaseConnectionManager();
