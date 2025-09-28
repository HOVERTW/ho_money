// iOS 安全 polyfills
import 'react-native-url-polyfill/auto';

// iOS 安全模式：暫時移除可能導致閃退的 polyfills
// import { Buffer } from 'buffer';
// global.Buffer = Buffer;

// Chrome 擴展錯誤修復（僅在 Web 環境中）
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  try {
    import('./src/utils/chromeExtensionFix').then(({ chromeExtensionFix }) => {
      chromeExtensionFix.initialize();
    }).catch(error => {
      console.log('⚠️ Chrome 擴展修復載入失敗:', error);
    });
  } catch (error) {
    console.log('⚠️ Chrome 擴展修復初始化失敗:', error);
  }
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
