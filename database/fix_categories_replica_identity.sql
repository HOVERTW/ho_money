-- 修復 categories 表的 replica identity 問題
-- 這個問題會導致刪除操作失敗

-- 為 categories 表設置 replica identity
ALTER TABLE categories REPLICA IDENTITY USING INDEX categories_pkey;

-- 如果上面的命令失敗，使用這個替代方案
-- ALTER TABLE categories REPLICA IDENTITY FULL;

-- 驗證設置
SELECT schemaname, tablename, hasindexes, hasrules, hastriggers 
FROM pg_tables 
WHERE tablename = 'categories';

-- 檢查 replica identity 設置
SELECT c.relname, c.relreplident
FROM pg_class c
WHERE c.relname = 'categories';

-- 完成
SELECT '✅ Categories 表 replica identity 修復完成！' as status;
