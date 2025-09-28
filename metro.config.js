const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// EAS Build 優化配置
config.resolver.assetExts.push('bin');
// 暫時移除 SVG 支持以修復 iOS 閃退問題
// config.resolver.sourceExts.push('svg');

// 優化 bundle 大小
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
