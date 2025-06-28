/**
 * 調試 OAuth 立即錯誤問題
 * 檢查 Supabase signInWithOAuth 是否立即返回錯誤
 */

require('dotenv').config();

// 模擬 Supabase 環境
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

console.log('🧪 調試 OAuth 立即錯誤問題');
console.log('============================');
console.log('📡 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('');

/**
 * 測試 Google OAuth 配置
 */
async function testGoogleOAuthConfig() {
  console.log('🔐 測試 Google OAuth 配置...');
  
  try {
    console.log('⏰ 調用 signInWithOAuth...');
    const startTime = Date.now();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://19930913.xyz',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ 調用耗時: ${duration}ms`);
    console.log('📝 響應分析:');
    console.log('- 有數據:', !!data);
    console.log('- 有錯誤:', !!error);
    
    if (data) {
      console.log('- 數據內容:', JSON.stringify(data, null, 2));
    }
    
    if (error) {
      console.log('- 錯誤類型:', error.constructor.name);
      console.log('- 錯誤消息:', error.message);
      console.log('- 錯誤詳情:', JSON.stringify(error, null, 2));
      
      // 分析錯誤類型
      if (error.message.includes('Provider not found')) {
        console.log('');
        console.log('💡 診斷: Google Provider 未在 Supabase 中啟用');
        console.log('🔧 解決: 前往 Supabase Dashboard > Authentication > Providers > 啟用 Google');
        return { success: false, issue: 'provider_not_enabled', immediate: duration < 1000 };
      } else if (error.message.includes('Invalid client')) {
        console.log('');
        console.log('💡 診斷: Google Client ID/Secret 配置錯誤');
        console.log('🔧 解決: 檢查 Google Cloud Console 中的 OAuth 憑證');
        return { success: false, issue: 'invalid_client', immediate: duration < 1000 };
      } else if (error.message.includes('redirect_uri')) {
        console.log('');
        console.log('💡 診斷: 重定向 URI 配置錯誤');
        console.log('🔧 解決: 在 Google Cloud Console 中添加正確的重定向 URI');
        return { success: false, issue: 'redirect_uri_mismatch', immediate: duration < 1000 };
      } else {
        console.log('');
        console.log('💡 診斷: 其他 OAuth 配置問題');
        console.log('🔧 解決: 檢查 Supabase 和 Google Cloud Console 配置');
        return { success: false, issue: 'other_config_error', immediate: duration < 1000 };
      }
    }
    
    if (data && data.url) {
      console.log('');
      console.log('✅ OAuth URL 已生成');
      console.log('🌐 OAuth URL:', data.url);
      
      // 分析 URL 結構
      try {
        const url = new URL(data.url);
        console.log('');
        console.log('🔍 URL 分析:');
        console.log('- 域名:', url.hostname);
        console.log('- 路徑:', url.pathname);
        console.log('- 查詢參數:');
        url.searchParams.forEach((value, key) => {
          console.log(`  - ${key}: ${value}`);
        });
      } catch (urlError) {
        console.log('⚠️ URL 解析失敗:', urlError.message);
      }
      
      return { success: true, url: data.url, immediate: duration < 1000 };
    }
    
    console.log('⚠️ 未獲得 OAuth URL 或錯誤');
    return { success: false, issue: 'no_url_or_error', immediate: duration < 1000 };
    
  } catch (error) {
    console.error('💥 OAuth 測試異常:', error);
    return { success: false, issue: 'exception', error: error.message, immediate: true };
  }
}

/**
 * 檢查 Supabase 基礎連接
 */
async function checkBasicConnection() {
  console.log('📡 檢查 Supabase 基礎連接...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Supabase 連接失敗:', error.message);
      return false;
    } else {
      console.log('✅ Supabase 連接正常');
      return true;
    }
  } catch (error) {
    console.log('❌ Supabase 連接異常:', error.message);
    return false;
  }
}

/**
 * 檢查認證設置
 */
async function checkAuthSettings() {
  console.log('🔐 檢查認證設置...');
  
  try {
    // 嘗試獲取當前會話
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log('📝 會話檢查:');
    console.log('- 有會話:', !!sessionData.session);
    console.log('- 有錯誤:', !!sessionError);
    
    if (sessionError) {
      console.log('- 錯誤:', sessionError.message);
    }
    
    // 檢查認證配置
    console.log('');
    console.log('🔧 認證配置:');
    console.log('- autoRefreshToken:', supabase.auth.autoRefreshToken);
    console.log('- persistSession:', supabase.auth.persistSession);
    console.log('- detectSessionInUrl:', supabase.auth.detectSessionInUrl);
    
    return true;
  } catch (error) {
    console.error('❌ 認證設置檢查失敗:', error);
    return false;
  }
}

/**
 * 主診斷函數
 */
async function runDiagnosis() {
  console.log('🚀 開始診斷...');
  console.log('');
  
  try {
    // 1. 檢查基礎連接
    const connectionOk = await checkBasicConnection();
    console.log('');
    
    if (!connectionOk) {
      console.log('❌ 基礎連接失敗，停止診斷');
      return false;
    }
    
    // 2. 檢查認證設置
    await checkAuthSettings();
    console.log('');
    
    // 3. 測試 Google OAuth 配置
    const oauthResult = await testGoogleOAuthConfig();
    console.log('');
    
    // 4. 分析結果
    console.log('📊 診斷結果:');
    console.log('=============');
    
    if (oauthResult.success) {
      console.log('✅ Google OAuth 配置正常');
      console.log('🌐 OAuth URL 已成功生成');
      console.log('⏱️ 響應時間:', oauthResult.immediate ? '立即' : '正常');
    } else {
      console.log('❌ Google OAuth 配置有問題');
      console.log('🎯 問題類型:', oauthResult.issue);
      console.log('⏱️ 錯誤類型:', oauthResult.immediate ? '立即錯誤' : '延遲錯誤');
      
      if (oauthResult.immediate) {
        console.log('');
        console.log('🔍 立即錯誤分析:');
        console.log('這表示 Supabase 在調用 signInWithOAuth 時立即返回錯誤');
        console.log('通常是由於配置問題導致的，而不是網路或 Google 服務問題');
        console.log('');
        
        switch (oauthResult.issue) {
          case 'provider_not_enabled':
            console.log('🔧 修復步驟:');
            console.log('1. 前往 Supabase Dashboard');
            console.log('2. 導航到 Authentication > Providers');
            console.log('3. 啟用 Google Provider');
            console.log('4. 輸入 Google Client ID 和 Secret');
            break;
            
          case 'invalid_client':
            console.log('🔧 修復步驟:');
            console.log('1. 檢查 Google Cloud Console OAuth 設置');
            console.log('2. 確認 Client ID 和 Secret 正確');
            console.log('3. 在 Supabase 中重新輸入憑證');
            break;
            
          case 'redirect_uri_mismatch':
            console.log('🔧 修復步驟:');
            console.log('1. 在 Google Cloud Console 中添加重定向 URI:');
            console.log('   - https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback');
            console.log('   - https://19930913.xyz');
            console.log('2. 確保 Supabase Site URL 設置正確');
            break;
            
          default:
            console.log('🔧 通用修復步驟:');
            console.log('1. 檢查 Supabase Google Provider 配置');
            console.log('2. 檢查 Google Cloud Console OAuth 設置');
            console.log('3. 確認所有 URL 和憑證正確');
        }
      }
    }
    
    console.log('');
    console.log('🏁 診斷完成');
    
    return oauthResult.success;
    
  } catch (error) {
    console.error('💥 診斷過程中發生錯誤:', error);
    return false;
  }
}

// 執行診斷
runDiagnosis().then(success => {
  if (success) {
    console.log('🎉 診斷通過！Google OAuth 配置正常');
  } else {
    console.log('💥 診斷失敗，需要修復配置');
  }
}).catch(error => {
  console.error('💥 診斷執行失敗:', error);
});
