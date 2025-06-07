import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

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

import StockManagementScreen from '../screens/StockManagementScreen';

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

            case 'StockManagement':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
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
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
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
        options={{ title: '儀表板' }}
      />
      <MainTab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: '記帳' }}
      />
      <MainTab.Screen
        name="BalanceSheet"
        component={BalanceSheetScreen}
        options={{ title: '資產負債' }}
      />
      <MainTab.Screen
        name="CashFlow"
        component={CashFlowScreen}
        options={{ title: '收支分析' }}
      />
      <MainTab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{ title: '圖表分析' }}
      />

      <MainTab.Screen
        name="StockManagement"
        component={StockManagementScreen}
        options={{ title: '台股管理' }}
      />
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
        console.log('Auth state changed:', event, session?.user?.email);

        if (session && session.user) {
          // 用戶登錄成功
          setUser(session.user);
          setSession(session);

          // 初始化用戶數據（僅在首次登錄或新用戶時）
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              await userDataSyncService.initializeUserData(session.user);
              console.log('✅ 用戶數據初始化完成');
            } catch (error) {
              console.error('❌ 用戶數據初始化失敗:', error);
              // 不阻止用戶繼續使用應用
            }
          }
        } else {
          // 用戶登出
          setUser(null);
          setSession(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
