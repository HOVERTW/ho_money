-- 手動確認用戶郵箱的 SQL 腳本
-- 在 Supabase SQL Editor 中執行

-- 1. 查看未確認的用戶
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 2. 確認特定用戶的郵箱（替換為您的郵箱）
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'dh0031898@gmail.com' 
AND email_confirmed_at IS NULL;

-- 3. 確認所有未確認的用戶（可選）
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL;

-- 4. 驗證確認結果
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'dh0031898@gmail.com';

-- 5. 查看所有用戶的確認狀態
SELECT 
    email,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '未確認'
        ELSE '已確認'
    END as 確認狀態,
    email_confirmed_at,
    created_at
FROM auth.users 
ORDER BY created_at DESC;
