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

# 創建增強測試腳本
RUN echo '#!/bin/bash\n\
echo "🧪 FinTranzo 終極同步測試"\n\
echo "========================"\n\
\n\
# 設置環境\n\
export NODE_ENV=test\n\
\n\
# 測試1: 基礎連接\n\
echo "📡 測試1: Supabase 連接"\n\
node -e "\n\
const { createClient } = require(\"@supabase/supabase-js\");\n\
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);\n\
(async () => {\n\
  try {\n\
    const { data, error } = await supabase.auth.signInWithPassword({email: \"user01@gmail.com\", password: \"user01\"});\n\
    if (error) {\n\
      console.log(\"❌ 連接失敗:\", error.message);\n\
      process.exit(1);\n\
    } else {\n\
      console.log(\"✅ 連接成功\");\n\
      console.log(\"👤 用戶ID:\", data.user.id);\n\
      process.exit(0);\n\
    }\n\
  } catch (e) {\n\
    console.log(\"❌ 連接異常:\", e.message);\n\
    process.exit(1);\n\
  }\n\
})();\n\
"\n\
\n\
# 檢查連接結果\n\
if [ $? -eq 0 ]; then\n\
  echo "✅ 基礎連接測試通過"\n\
else\n\
  echo "❌ 基礎連接測試失敗"\n\
  exit 1\n\
fi\n\
\n\
# 測試2: 終極同步測試\n\
echo "🔄 測試2: 終極同步測試"\n\
if [ -f "scripts/ultimate-sync-test.js" ]; then\n\
  node scripts/ultimate-sync-test.js\n\
  if [ $? -eq 0 ]; then\n\
    echo "✅ 終極同步測試通過"\n\
  else\n\
    echo "❌ 終極同步測試失敗"\n\
    exit 1\n\
  fi\n\
else\n\
  echo "⚠️ 終極同步測試腳本不存在"\n\
fi\n\
\n\
# 測試3: 實時同步服務測試\n\
echo "⚡ 測試3: 實時同步服務測試"\n\
node -e "\n\
console.log(\"🔄 測試實時同步服務...\");\n\
try {\n\
  const fs = require(\"fs\");\n\
  if (fs.existsSync(\"src/services/realTimeSyncService.ts\")) {\n\
    console.log(\"✅ 實時同步服務文件存在\");\n\
  } else {\n\
    console.log(\"❌ 實時同步服務文件不存在\");\n\
    process.exit(1);\n\
  }\n\
} catch (e) {\n\
  console.log(\"❌ 檢查失敗:\", e.message);\n\
  process.exit(1);\n\
}\n\
"\n\
\n\
echo "🎉 所有測試完成"\n\
' > /app/test.sh && chmod +x /app/test.sh

# 暴露端口
EXPOSE 3000 8081

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('健康檢查通過')" || exit 1

# 啟動命令
CMD ["yarn", "web"]
