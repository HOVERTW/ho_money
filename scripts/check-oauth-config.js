#!/usr/bin/env node

/**
 * 檢查 OAuth 配置腳本
 * 測試 Google OAuth 是否正確配置
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔍 檢查 OAuth 配置');
console.log('==================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 測試 Google OAuth 完整流程
 */
async function testGoogleOAuthComplete() {
  console.log('🔐 測試 Google OAuth 完整配置...');
  
  try {
    // 嘗試啟動 Google OAuth 流程
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

    console.log('📝 OAuth 流程結果:');
    console.log('- 有數據:', !!data);
    console.log('- 有錯誤:', !!error);
    
    if (error) {
      console.log('❌ OAuth 錯誤:', error.message);
      return { success: false, error: error.message };
    }

    if (data && data.url) {
      console.log('✅ OAuth URL 已生成');
      console.log('🌐 OAuth URL:', data.url);
      
      // 解析 OAuth URL 來檢查配置
      try {
        const url = new URL(data.url);
        const params = new URLSearchParams(url.search);
        
        console.log('');
        console.log('📋 OAuth URL 分析:');
        console.log('- 域名:', url.hostname);
        console.log('- 路徑:', url.pathname);
        
        // 檢查是否是 Supabase OAuth URL
        if (url.hostname.includes('supabase.co')) {
          console.log('✅ 使用 Supabase OAuth 端點');
          
          // 檢查重定向參數
          const redirectTo = params.get('redirect_to');
          console.log('- 重定向到:', redirectTo);
          
          if (redirectTo) {
            console.log('✅ 重定向 URL 已設置');
          } else {
            console.log('⚠️ 重定向 URL 未設置');
          }
          
          return { 
            success: true, 
            url: data.url,
            redirectTo: redirectTo,
            isSupabaseOAuth: true
          };
        } else if (url.hostname.includes('accounts.google.com')) {
          console.log('✅ 直接重定向到 Google OAuth');
          
          // 檢查 Google OAuth 參數
          const clientId = params.get('client_id');
          const redirectUri = params.get('redirect_uri');
          const scope = params.get('scope');
          
          console.log('- Client ID:', clientId ? '已設置' : '未設置');
          console.log('- Redirect URI:', redirectUri);
          console.log('- Scope:', scope);
          
          if (clientId) {
            console.log('🎉 Google Client ID 已正確配置！');
            return { 
              success: true, 
              url: data.url,
              clientId: !!clientId,
              redirectUri: redirectUri,
              isGoogleOAuth: true
            };
          } else {
            console.log('❌ Google Client ID 未設置');
            return { 
              success: false, 
              error: 'Google Client ID 未設置' 
            };
          }
        } else {
          console.log('⚠️ 未知的 OAuth 端點:', url.hostname);
          return { 
            success: false, 
            error: '未知的 OAuth 端點' 
          };
        }
        
      } catch (urlError) {
        console.log('❌ OAuth URL 解析失敗:', urlError.message);
        return { 
          success: false, 
          error: 'OAuth URL 解析失敗' 
        };
      }
    } else {
      console.log('❌ 未生成 OAuth URL');
      return { 
        success: false, 
        error: '未生成 OAuth URL' 
      };
    }

  } catch (error) {
    console.error('💥 OAuth 測試異常:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * 提供配置建議
 */
function showConfigurationAdvice(testResult) {
  console.log('');
  console.log('💡 配置建議');
  console.log('============');
  console.log('');
  
  if (testResult.success) {
    if (testResult.isGoogleOAuth && testResult.clientId) {
      console.log('🎉 恭喜！Google OAuth 已完全配置');
      console.log('✅ Google Client ID 已設置');
      console.log('✅ 重定向 URI 已配置');
      console.log('✅ OAuth 流程可以正常工作');
      console.log('');
      console.log('🧪 建議測試:');
      console.log('1. 訪問 https://19930913.xyz');
      console.log('2. 點擊 Google 登錄按鈕');
      console.log('3. 應該會重定向到 Google 授權頁面');
      console.log('4. 授權後應該成功登錄');
    } else if (testResult.isSupabaseOAuth) {
      console.log('⚠️ 使用 Supabase OAuth 端點');
      console.log('💡 這表示 Google Provider 已啟用，但可能需要進一步配置');
      console.log('');
      console.log('🔧 需要檢查:');
      console.log('1. 在 Supabase Dashboard 中確認 Google Client ID 已輸入');
      console.log('2. 確認 Google Client Secret 已輸入');
      console.log('3. 確認重定向 URL 設置正確');
    } else {
      console.log('✅ OAuth 基礎配置正常');
      console.log('🔧 建議進一步測試實際登錄流程');
    }
  } else {
    console.log('❌ OAuth 配置有問題');
    console.log('錯誤:', testResult.error);
    console.log('');
    
    if (testResult.error.includes('Provider not found')) {
      console.log('🔧 解決方案:');
      console.log('1. 在 Supabase Dashboard 中啟用 Google Provider');
      console.log('2. 輸入 Google Client ID 和 Secret');
    } else if (testResult.error.includes('Client ID')) {
      console.log('🔧 解決方案:');
      console.log('1. 在 Supabase Dashboard 中輸入 Google Client ID');
      console.log('2. 確認 Client ID 來自 Google Cloud Console');
    } else {
      console.log('🔧 通用解決方案:');
      console.log('1. 檢查 Supabase Google Provider 設置');
      console.log('2. 檢查 Google Cloud Console OAuth 配置');
      console.log('3. 確認重定向 URL 一致');
    }
  }
}

/**
 * 主檢查函數
 */
async function runOAuthCheck() {
  console.log('🚀 開始 OAuth 配置檢查...');
  console.log('');
  
  try {
    // 測試 Google OAuth 配置
    const testResult = await testGoogleOAuthComplete();
    
    // 顯示配置建議
    showConfigurationAdvice(testResult);
    
    console.log('');
    console.log('🏁 檢查完成');
    
    return testResult.success;
    
  } catch (error) {
    console.error('💥 檢查過程中發生錯誤:', error);
    return false;
  }
}

// 執行檢查
runOAuthCheck().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 檢查執行失敗:', error);
  process.exit(1);
});
