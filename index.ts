// Minimal polyfills for React Native
import 'react-native-url-polyfill/auto';

// Buffer polyfill for react-native-svg
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Chrome 擴展錯誤修復（在 Web 環境中）
if (typeof window !== 'undefined') {
  import('./src/utils/chromeExtensionFix').then(({ chromeExtensionFix }) => {
    chromeExtensionFix.initialize();
  });
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
