import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { userDataSyncService } from '../services/userDataSyncService';
import { RootStackParamList, MainTabParamList, AuthStackParamList } from '../types';

// Import screens (we'll create these next)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import BalanceSheetScreen from '../screens/main/BalanceSheetScreen';
import CashFlowScreen from '../screens/main/CashFlowScreen';
import ChartsScreen from '../screens/main/ChartsScreen';

// import StockManagementScreen from '../screens/StockManagementScreen'; // 已移除

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'BalanceSheet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'CashFlow':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Charts':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;

            // case 'StockManagement': // 已移除
            //   iconName = focused ? 'trending-up' : 'trending-up-outline';
            //   break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 60,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#000',
        },
      })}
    >
      <MainTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Ho記帳',
          tabBarLabel: '總表'
        }}
      />
      <MainTab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Ho記帳',
          tabBarLabel: '記帳'
        }}
      />
      <MainTab.Screen
        name="BalanceSheet"
        component={BalanceSheetScreen}
        options={{
          title: 'Ho記帳',
          tabBarLabel: '資產'
        }}
      />
      <MainTab.Screen
        name="CashFlow"
        component={CashFlowScreen}
        options={{
          title: 'Ho記帳',
          tabBarLabel: '收支分析'
        }}
      />
      <MainTab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          title: 'Ho記帳',
          tabBarLabel: '圖表分析'
        }}
      />

      {/* <MainTab.Screen
        name="StockManagement"
        component={StockManagementScreen}
        options={{ title: '台股管理' }}
      /> */}
    </MainTab.Navigator>
  );
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff'
    }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, setUser, setSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        } else if (session) {
          setUser(session.user);
          setSession(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);

        if (session && session.user) {
          // 用戶登錄成功
          console.log('✅ 設置用戶狀態:', session.user.email);
          setUser(session.user);
          setSession(session);

          // 🔧 檢查是否是 Google OAuth 重定向過程中的中間狀態
          const isOAuthRedirect = typeof window !== 'undefined' &&
            (window.location.search.includes('access_token') ||
             window.location.search.includes('code=') ||
             window.location.search.includes('state='));

          if (isOAuthRedirect) {
            console.log('🌐 檢測到 OAuth 重定向，跳過用戶數據初始化');
            return;
          }

          // 延遲初始化用戶數據，避免阻塞啟動
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // 使用 setTimeout 延遲執行，不阻塞主線程
            setTimeout(async () => {
              try {
                console.log('🔄 後台初始化用戶數據...');
                await userDataSyncService.initializeUserData(session.user);
                const { transactionDataService } = await import('../services/transactionDataService');
                await transactionDataService.reloadUserData(session.user.id);
                console.log('✅ 用戶數據初始化完成');
              } catch (error) {
                console.error('❌ 用戶數據初始化失敗:', error);
              }
            }, 100); // 100ms 延遲，讓應用先完成啟動
          }
        } else {
          // 用戶登出
          console.log('🚪 用戶登出，清除狀態');
          setUser(null);
          setSession(null);
        }

        console.log('🔄 設置 loading 為 false');
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // 空依賴數組，避免無限循環

  if (isLoading) {
    return <LoadingScreen />;
  }

  console.log('🎯 AppNavigator 渲染 - 新的儀表板優先流程');
  console.log('👤 用戶狀態:', user ? `已登錄: ${user.email}` : '未登錄');
  console.log('🔄 載入狀態:', isLoading);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* 總是顯示主應用，不管是否登錄 */}
        <RootStack.Screen name="Main" component={MainNavigator} />
        {/* 認證頁面作為 Modal 顯示 */}
        <RootStack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{
            presentation: 'modal',
            headerShown: false
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
