# 多階段構建 Dockerfile for FinTranzo
# 支持 Web 和 iOS 開發

# ===== 基礎階段 =====
FROM node:18-alpine AS base
WORKDIR /app

# 安裝系統依賴
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# 複製 package 文件
COPY package*.json ./
COPY yarn.lock* ./

# ===== 依賴安裝階段 =====
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# ===== 開發依賴階段 =====
FROM base AS dev-deps
RUN npm ci && npm cache clean --force

# ===== 構建階段 =====
FROM dev-deps AS builder

# 複製源代碼
COPY . .

# 設置環境變量
ENV NODE_ENV=production
ENV EXPO_PUBLIC_PLATFORM=web

# 構建 Web 版本
RUN npx expo export:web

# ===== Web 生產階段 =====
FROM nginx:alpine AS web-production

# 複製構建結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 配置
COPY docker/nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ===== 開發階段 =====
FROM dev-deps AS development

# 安裝 Expo CLI
RUN npm install -g @expo/cli

# 複製源代碼
COPY . .

# 暴露端口
EXPOSE 19006 19000 19001 19002

# 設置開發環境變量
ENV NODE_ENV=development
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# 開發命令
CMD ["npx", "expo", "start", "--web", "--host", "0.0.0.0"]

# ===== 測試階段 =====
FROM dev-deps AS testing

# 安裝測試工具
RUN npm install -g jest @testing-library/react-native

# 複製源代碼
COPY . .

# 運行測試
CMD ["npm", "test"]

# ===== iOS 開發階段 =====
FROM dev-deps AS ios-dev

# 安裝 iOS 開發工具
RUN npm install -g @expo/cli eas-cli

# 複製源代碼
COPY . .

# 暴露端口
EXPOSE 19000 19001 19002

# iOS 開發命令
CMD ["npx", "expo", "start", "--ios", "--host", "0.0.0.0"]
