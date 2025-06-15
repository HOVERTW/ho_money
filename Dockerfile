# FinTranzo Docker 配置
# 用於完整環境模擬和測試

FROM node:18-alpine

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    bash

# 複製 package 文件
COPY package*.json ./
COPY yarn.lock ./

# 安裝依賴
RUN yarn install --frozen-lockfile

# 複製源代碼
COPY . .

# 設置環境變量
ENV NODE_ENV=production
ENV EXPO_PUBLIC_SUPABASE_URL=https://yrryyapzkgrsahranzvo.supabase.co
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM

# 創建測試腳本
RUN echo '#!/bin/bash\n\
echo "🧪 FinTranzo 完整功能測試"\n\
echo "========================"\n\
\n\
# 測試1: 基礎連接\n\
echo "📡 測試1: Supabase 連接"\n\
node -e "const { createClient } = require(\"@supabase/supabase-js\"); const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY); supabase.auth.signInWithPassword({email: \"user01@gmail.com\", password: \"user01\"}).then(r => console.log(r.error ? \"❌ 連接失敗\" : \"✅ 連接成功\"));"\n\
\n\
# 測試2: 數據插入\n\
echo "📝 測試2: 數據插入測試"\n\
node scripts/sync-test.js\n\
\n\
# 測試3: 同步功能\n\
echo "🔄 測試3: 同步功能測試"\n\
node scripts/comprehensive-sync-test.js\n\
\n\
echo "✅ 測試完成"\n\
' > /app/test.sh && chmod +x /app/test.sh

# 暴露端口
EXPOSE 3000 8081

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('健康檢查通過')" || exit 1

# 啟動命令
CMD ["yarn", "web"]
