// 在瀏覽器控制台中運行此腳本來檢查登錄狀態

console.log('🔍 檢查 Google OAuth 登錄狀態');
console.log('================================');

// 檢查 URL 參數
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const refreshToken = urlParams.get('refresh_token');
const expiresIn = urlParams.get('expires_in');
const tokenType = urlParams.get('token_type');

console.log('📋 URL 參數分析:');
console.log('- Access Token:', accessToken ? '✅ 存在' : '❌ 不存在');
console.log('- Refresh Token:', refreshToken ? '✅ 存在' : '❌ 不存在');
console.log('- Expires In:', expiresIn ? `${expiresIn} 秒` : '❌ 不存在');
console.log('- Token Type:', tokenType || '❌ 不存在');

// 檢查 Supabase 會話
if (typeof supabase !== 'undefined') {
    console.log('\n🔐 檢查 Supabase 會話:');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
            console.log('❌ 會話錯誤:', error.message);
        } else if (session) {
            console.log('✅ 會話存在');
            console.log('👤 用戶信息:');
            console.log('- Email:', session.user.email);
            console.log('- Name:', session.user.user_metadata?.full_name || '未提供');
            console.log('- Provider:', session.user.app_metadata?.provider || '未知');
            console.log('- User ID:', session.user.id);
            console.log('- 創建時間:', new Date(session.user.created_at).toLocaleString());
            console.log('- 會話過期時間:', new Date(session.expires_at * 1000).toLocaleString());
        } else {
            console.log('❌ 無會話');
        }
    });
    
    // 檢查用戶
    supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error) {
            console.log('❌ 用戶錯誤:', error.message);
        } else if (user) {
            console.log('\n✅ 用戶已認證');
            console.log('📧 Email:', user.email);
            console.log('🆔 ID:', user.id);
        } else {
            console.log('\n❌ 用戶未認證');
        }
    });
} else {
    console.log('\n⚠️ Supabase 客戶端未找到');
    console.log('請確保頁面已正確加載 Supabase');
}

// 檢查本地存儲
console.log('\n💾 檢查本地存儲:');
const supabaseAuth = localStorage.getItem('sb-yrryyapzkgrsahranzvo-auth-token');
if (supabaseAuth) {
    console.log('✅ Supabase 認證令牌存在於 localStorage');
    try {
        const authData = JSON.parse(supabaseAuth);
        console.log('- 令牌類型:', authData.token_type || '未知');
        console.log('- 過期時間:', authData.expires_at ? new Date(authData.expires_at * 1000).toLocaleString() : '未知');
    } catch (e) {
        console.log('⚠️ 無法解析認證數據');
    }
} else {
    console.log('❌ 本地存儲中無 Supabase 認證令牌');
}

// 檢查應用程式狀態
console.log('\n🎯 應用程式狀態檢查:');
console.log('- 當前 URL:', window.location.href);
console.log('- 頁面標題:', document.title);

// 檢查是否有登錄指示器
const loginIndicators = [
    '已登錄',
    '您好',
    'email',
    '登出',
    'logout'
];

let foundIndicators = [];
loginIndicators.forEach(indicator => {
    if (document.body.textContent.includes(indicator)) {
        foundIndicators.push(indicator);
    }
});

if (foundIndicators.length > 0) {
    console.log('✅ 找到登錄指示器:', foundIndicators.join(', '));
} else {
    console.log('⚠️ 未找到明顯的登錄指示器');
}

console.log('\n🏁 檢查完成');
console.log('如果看到 access_token 在 URL 中，說明 Google OAuth 登錄成功！');
