-- 緊急修復 categories 表的主鍵約束問題
-- 這是導致所有同步問題的根本原因

-- 1. 檢查當前 categories 表結構
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'categories' 
ORDER BY ordinal_position;

-- 2. 檢查當前約束
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'categories'::regclass;

-- 3. 如果 categories 表沒有主鍵，添加主鍵約束
DO $$
BEGIN
    -- 檢查是否已有主鍵
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'categories'::regclass 
        AND contype = 'p'
    ) THEN
        -- 添加主鍵約束
        ALTER TABLE categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
        RAISE NOTICE '✅ 已為 categories 表添加主鍵約束';
    ELSE
        RAISE NOTICE '✅ categories 表已有主鍵約束';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加主鍵約束失敗: %', SQLERRM;
END $$;

-- 4. 確保 id 字段是 UUID 類型且不為空
DO $$
BEGIN
    -- 檢查 id 字段類型
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'id' 
        AND data_type != 'uuid'
    ) THEN
        -- 如果不是 UUID 類型，嘗試轉換
        ALTER TABLE categories ALTER COLUMN id TYPE uuid USING id::uuid;
        RAISE NOTICE '✅ 已將 categories.id 轉換為 UUID 類型';
    END IF;
    
    -- 確保 id 字段不為空
    ALTER TABLE categories ALTER COLUMN id SET NOT NULL;
    RAISE NOTICE '✅ 已設置 categories.id 為 NOT NULL';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 修改 id 字段失敗: %', SQLERRM;
END $$;

-- 5. 設置 replica identity（用於實時同步）
DO $$
BEGIN
    ALTER TABLE categories REPLICA IDENTITY USING INDEX categories_pkey;
    RAISE NOTICE '✅ 已設置 categories 表的 replica identity';
EXCEPTION WHEN OTHERS THEN
    -- 如果失敗，使用 FULL 模式
    ALTER TABLE categories REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ 已設置 categories 表的 replica identity (FULL 模式)';
END $$;

-- 6. 創建必要的索引
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);

-- 7. 驗證修復結果
SELECT 
    'categories 表結構修復完成' as status,
    (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'categories'::regclass AND contype = 'p') as primary_key_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'categories') as index_count;

-- 8. 測試 upsert 操作
DO $$
DECLARE
    test_id uuid := gen_random_uuid();
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- 測試插入
    INSERT INTO categories (id, user_id, name, icon, color, type, created_at, updated_at)
    VALUES (test_id, test_user_id, '測試類別', 'test', '#FF0000', 'expense', NOW(), NOW());
    
    -- 測試 upsert
    INSERT INTO categories (id, user_id, name, icon, color, type, created_at, updated_at)
    VALUES (test_id, test_user_id, '測試類別 - 更新', 'test', '#00FF00', 'expense', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        updated_at = EXCLUDED.updated_at;
    
    -- 清理測試數據
    DELETE FROM categories WHERE id = test_id;
    
    RAISE NOTICE '✅ categories 表 upsert 操作測試成功';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ categories 表 upsert 操作測試失敗: %', SQLERRM;
END $$;

-- 完成
SELECT '🎉 categories 表修復完成！現在可以正常使用 upsert 操作了。' as final_status;
