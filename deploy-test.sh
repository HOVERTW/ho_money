#!/bin/bash

# 認證和通知系統修復部署測試腳本

echo "🚀 開始部署認證和通知系統修復..."

# 檢查 Node.js 和 npm
echo "📋 檢查環境..."
node --version
npm --version

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 檢查 TypeScript 編譯
echo "🔍 檢查 TypeScript 編譯..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo "❌ TypeScript 編譯失敗"
    exit 1
fi

# 檢查 ESLint
echo "🔍 檢查代碼質量..."
npx eslint src/ --ext .ts,.tsx --max-warnings 0

if [ $? -ne 0 ]; then
    echo "⚠️ ESLint 檢查發現問題，但繼續部署"
fi

# 構建 Web 版本
echo "🌐 構建 Web 版本..."
npx expo export:web

if [ $? -ne 0 ]; then
    echo "❌ Web 構建失敗"
    exit 1
fi

echo "✅ 認證和通知系統修復部署完成！"
echo ""
echo "🧪 測試指南："
echo "1. 啟動開發服務器: npm start"
echo "2. 在瀏覽器控制台執行: testNotifications.all()"
echo "3. 測試登錄/註冊流程"
echo "4. 檢查通知是否正確顯示"
echo ""
echo "📋 修復內容："
echo "- ✅ 統一通知系統"
echo "- ✅ 登錄成功/失敗通知"
echo "- ✅ Google 登錄通知"
echo "- ✅ 註冊通知"
echo "- ✅ 錯誤處理改進"
