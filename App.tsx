import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { appInitializationService } from './src/services/appInitializationService';

// Import screens directly
import DashboardScreen from './src/screens/main/DashboardScreen';
import TransactionsScreen from './src/screens/main/TransactionsScreen';
import BalanceSheetScreen from './src/screens/main/BalanceSheetScreen';
import CashFlowScreen from './src/screens/main/CashFlowScreen';
import ChartsScreen from './src/screens/main/ChartsScreen';

const Tab = createBottomTabNavigator();

// 內部組件來使用 useSafeAreaInsets
function AppContent() {
  const insets = useSafeAreaInsets();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // 初始化應用服務
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await appInitializationService.initializeApp();
        setIsInitialized(true);
      } catch (error) {
        console.error('應用初始化失敗:', error);
        setInitError(error instanceof Error ? error.message : '初始化失敗');
      }
    };

    initializeApp();
  }, []);

  // 顯示載入畫面
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {initError ? `初始化失敗: ${initError}` : '正在載入...'}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
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
              paddingBottom: Math.max(insets.bottom + 5, 25), // 動態底部間距
              paddingTop: 5,
              height: Math.max(insets.bottom + 60, 80), // 動態高度
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
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: '儀表板' }}
          />
          <Tab.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={{ title: '記帳' }}
          />
          <Tab.Screen
            name="BalanceSheet"
            component={BalanceSheetScreen}
            options={{ title: '資產負債' }}
          />
          <Tab.Screen
            name="CashFlow"
            component={CashFlowScreen}
            options={{ title: '收支分析' }}
          />
          <Tab.Screen
            name="Charts"
            component={ChartsScreen}
            options={{ title: '圖表分析' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
