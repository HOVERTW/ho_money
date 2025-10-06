/**
 * 本地版本導航器 - 無認證流程
 * 直接顯示主要功能頁面
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 導入主要頁面
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import BalanceSheetScreen from '../screens/main/BalanceSheetScreen';
import CashFlowScreen from '../screens/main/CashFlowScreen';
import ChartsScreen from '../screens/main/ChartsScreen';

// 類型定義
export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  BalanceSheet: undefined;
  CashFlow: undefined;
  Charts: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * 主標籤導航器
 */
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'BalanceSheet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'CashFlow':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Charts':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerTitle: 'Ho記帳',
        tabBarStyle: {
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: '總表',
          headerTitle: 'Ho記帳',
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: '交易',
          headerTitle: 'Ho記帳',
        }}
      />
      <Tab.Screen
        name="BalanceSheet"
        component={BalanceSheetScreen}
        options={{
          tabBarLabel: '資產負債',
          headerTitle: 'Ho記帳',
        }}
      />
      <Tab.Screen
        name="CashFlow"
        component={CashFlowScreen}
        options={{
          tabBarLabel: '現金流',
          headerTitle: 'Ho記帳',
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          tabBarLabel: '圖表',
          headerTitle: 'Ho記帳',
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * 本地版本應用導航器
 */
export default function LocalOnlyAppNavigator() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

