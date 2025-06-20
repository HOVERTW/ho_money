export default ({ config }) => {
  return {
    ...config,
    scheme: 'fintranzo',
    extra: {
      ...config.extra,
      // EAS Build 環境變量
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      redirectUrl: process.env.EXPO_PUBLIC_REDIRECT_URL,
    },
    // 🔧 暫時移除 expo-auth-session 插件以修復構建問題
    // Google OAuth 將使用 Supabase 的內建 OAuth 流程
  };
};
