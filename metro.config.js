const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// EAS Build 優化配置
config.resolver.assetExts.push('bin');
config.resolver.sourceExts.push('svg');

// 確保 SVG 和圖表庫正確解析
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-svg': 'react-native-svg',
};

// 優化 bundle 大小
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
