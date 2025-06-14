-- 修復 categories 表的 replica identity 問題
-- 這個問題會導致更新和刪除操作失敗

-- 方法1: 嘗試使用主鍵索引設置 replica identity
DO $$
BEGIN
    BEGIN
        ALTER TABLE categories REPLICA IDENTITY USING INDEX categories_pkey;
        RAISE NOTICE '✅ 使用主鍵索引設置 replica identity 成功';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 使用主鍵索引失敗，嘗試 FULL 模式: %', SQLERRM;
        -- 方法2: 使用 FULL 模式作為備選方案
        ALTER TABLE categories REPLICA IDENTITY FULL;
        RAISE NOTICE '✅ 使用 FULL 模式設置 replica identity 成功';
    END;
END $$;

-- 驗證設置
SELECT schemaname, tablename, hasindexes, hasrules, hastriggers
FROM pg_tables
WHERE tablename = 'categories';

-- 檢查 replica identity 設置
SELECT c.relname, c.relreplident,
       CASE c.relreplident
           WHEN 'd' THEN 'default'
           WHEN 'n' THEN 'nothing'
           WHEN 'f' THEN 'full'
           WHEN 'i' THEN 'index'
       END as replica_identity_type
FROM pg_class c
WHERE c.relname = 'categories';

-- 測試更新操作
DO $$
DECLARE
    test_category_id UUID;
BEGIN
    -- 創建測試類別
    INSERT INTO categories (id, user_id, name, icon, color, type)
    VALUES (uuid_generate_v4(), uuid_generate_v4(), '測試類別', 'test', '#FF0000', 'expense')
    RETURNING id INTO test_category_id;

    -- 測試更新
    UPDATE categories SET name = '測試類別 - 已更新' WHERE id = test_category_id;

    -- 測試刪除
    DELETE FROM categories WHERE id = test_category_id;

    RAISE NOTICE '✅ Categories 表更新和刪除操作測試成功';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Categories 表操作測試失敗: %', SQLERRM;
END $$;

-- 完成
SELECT '✅ Categories 表 replica identity 修復完成！' as status;
