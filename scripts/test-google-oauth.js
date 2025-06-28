#!/usr/bin/env node

/**
 * Google OAuth 診斷腳本
 * 檢查 Google OAuth 配置和連接狀態
 */

const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

console.log('🔍 Google OAuth 診斷腳本');
console.log('========================');
console.log('');

// 創建 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 檢查基礎連接
 */
async function checkBasicConnection() {
  console.log('📡 檢查 Supabase 基礎連接...');
  
  try {
    const { data, error } = await supabase.from('assets').select('count').limit(1);
    
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
 * 測試 Google OAuth 配置
 */
async function testGoogleOAuthConfig() {
  console.log('');
  console.log('🔐 測試 Google OAuth 配置...');
  
  try {
    // 嘗試初始化 Google OAuth 流程
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

    console.log('📝 Google OAuth 初始化結果:');
    console.log('- 有數據:', !!data);
    console.log('- 有錯誤:', !!error);
    
    if (error) {
      console.log('❌ Google OAuth 錯誤:', error.message);
      
      // 分析錯誤類型
      if (error.message.includes('Provider not found')) {
        console.log('💡 診斷: Google Provider 未在 Supabase 中啟用');
        console.log('🔧 解決: 前往 Supabase Dashboard > Authentication > Providers > 啟用 Google');
        return { success: false, issue: 'provider_not_enabled' };
      } else if (error.message.includes('Invalid client')) {
        console.log('💡 診斷: Google Client ID/Secret 配置錯誤');
        console.log('🔧 解決: 檢查 Google Cloud Console 中的 OAuth 憑證');
        return { success: false, issue: 'invalid_client' };
      } else if (error.message.includes('redirect_uri')) {
        console.log('💡 診斷: 重定向 URI 配置錯誤');
        console.log('🔧 解決: 在 Google Cloud Console 中添加正確的重定向 URI');
        return { success: false, issue: 'redirect_uri_mismatch' };
      } else {
        console.log('💡 診斷: 其他 OAuth 配置問題');
        return { success: false, issue: 'other_config_error' };
      }
    }

    if (data && data.url) {
      console.log('✅ Google OAuth 配置正常');
      console.log('🌐 OAuth URL 已生成:', data.url.substring(0, 100) + '...');
      return { success: true, url: data.url };
    } else {
      console.log('⚠️ Google OAuth 配置可能有問題');
      console.log('💡 沒有生成 OAuth URL');
      return { success: false, issue: 'no_oauth_url' };
    }

  } catch (error) {
    console.error('💥 Google OAuth 測試異常:', error);
    return { success: false, issue: 'exception', error: error.message };
  }
}

/**
 * 檢查 OAuth URL 結構
 */
function analyzeOAuthURL(url) {
  console.log('');
  console.log('🔍 分析 OAuth URL 結構...');
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    console.log('📋 OAuth URL 參數:');
    console.log('- 域名:', urlObj.hostname);
    console.log('- Client ID:', params.get('client_id') ? '已設置' : '未設置');
    console.log('- Redirect URI:', params.get('redirect_uri'));
    console.log('- Response Type:', params.get('response_type'));
    console.log('- Scope:', params.get('scope'));
    
    // 檢查關鍵參數
    const issues = [];
    
    if (!params.get('client_id')) {
      issues.push('Client ID 未設置');
    }
    
    if (!params.get('redirect_uri')) {
      issues.push('Redirect URI 未設置');
    } else {
      const redirectUri = params.get('redirect_uri');
      if (!redirectUri.includes('supabase.co')) {
        issues.push('Redirect URI 可能不正確');
      }
    }
    
    if (issues.length > 0) {
      console.log('⚠️ 發現問題:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      return false;
    } else {
      console.log('✅ OAuth URL 結構正常');
      return true;
    }
    
  } catch (error) {
    console.log('❌ OAuth URL 解析失敗:', error.message);
    return false;
  }
}

/**
 * 提供修復建議
 */
function showFixRecommendations(testResult) {
  console.log('');
  console.log('🔧 修復建議');
  console.log('============');
  console.log('');
  
  if (!testResult.success) {
    switch (testResult.issue) {
      case 'provider_not_enabled':
        console.log('🎯 問題: Google Provider 未啟用');
        console.log('');
        console.log('📋 修復步驟:');
        console.log('1. 前往 https://supabase.com/dashboard');
        console.log('2. 選擇您的項目');
        console.log('3. 前往 Authentication');
        console.log('4. 查找 "Providers"、"Settings" 或 "Configuration"');
        console.log('5. 找到 Google Provider 並啟用');
        break;
        
      case 'invalid_client':
        console.log('🎯 問題: Google Client 配置錯誤');
        console.log('');
        console.log('📋 修復步驟:');
        console.log('1. 前往 https://console.cloud.google.com/');
        console.log('2. 選擇或創建項目');
        console.log('3. 前往 APIs & Services > Credentials');
        console.log('4. 創建 OAuth 2.0 Client ID');
        console.log('5. 將 Client ID 和 Secret 輸入 Supabase');
        break;
        
      case 'redirect_uri_mismatch':
        console.log('🎯 問題: 重定向 URI 不匹配');
        console.log('');
        console.log('📋 修復步驟:');
        console.log('1. 在 Google Cloud Console 的 OAuth 設置中添加:');
        console.log('   - https://yrryyapzkgrsahranzvo.supabase.co/auth/v1/callback');
        console.log('   - https://19930913.xyz');
        console.log('2. 在 Supabase 中設置正確的 Site URL 和 Redirect URLs');
        break;
        
      default:
        console.log('🎯 問題: Google OAuth 配置問題');
        console.log('');
        console.log('📋 通用修復步驟:');
        console.log('1. 檢查 Google Cloud Console OAuth 設置');
        console.log('2. 檢查 Supabase Google Provider 配置');
        console.log('3. 確認重定向 URL 一致');
        console.log('4. 檢查 Client ID 和 Secret');
    }
  } else {
    console.log('✅ Google OAuth 配置看起來正常');
    console.log('');
    console.log('🧪 建議測試步驟:');
    console.log('1. 訪問 https://19930913.xyz');
    console.log('2. 點擊 Google 登錄按鈕');
    console.log('3. 檢查是否成功重定向到 Google');
    console.log('4. 完成授權後檢查是否成功登錄');
  }
  
  console.log('');
  console.log('📚 詳細修復指南: GOOGLE_OAUTH_FIX_GUIDE.md');
}

/**
 * 主診斷函數
 */
async function runGoogleOAuthDiagnosis() {
  console.log('🚀 開始 Google OAuth 診斷...');
  console.log('');
  
  try {
    // 檢查基礎連接
    const connectionOk = await checkBasicConnection();
    
    if (!connectionOk) {
      console.log('');
      console.log('❌ 基礎連接失敗，停止診斷');
      return false;
    }
    
    // 測試 Google OAuth 配置
    const oauthResult = await testGoogleOAuthConfig();
    
    // 如果有 OAuth URL，分析其結構
    if (oauthResult.success && oauthResult.url) {
      analyzeOAuthURL(oauthResult.url);
    }
    
    // 顯示修復建議
    showFixRecommendations(oauthResult);
    
    console.log('');
    console.log('🏁 診斷完成');
    
    return oauthResult.success;
    
  } catch (error) {
    console.error('💥 診斷過程中發生錯誤:', error);
    return false;
  }
}

// 執行診斷
runGoogleOAuthDiagnosis().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 診斷執行失敗:', error);
  process.exit(1);
});
