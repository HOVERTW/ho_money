export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // EAS Build 環境變量
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      redirectUrl: process.env.EXPO_PUBLIC_REDIRECT_URL,
    },
  };
};
