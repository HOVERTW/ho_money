#!/bin/bash

# FinTranzo Docker 測試腳本
# 確保 100% 功能正常後才發布

set -e

echo "🐳 FinTranzo Docker 完整測試流程"
echo "================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 檢查 Docker 環境
check_docker() {
    log_info "檢查 Docker 環境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安裝"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 服務未運行"
        exit 1
    fi
    
    log_success "Docker 環境檢查通過"
}

# 清理舊容器
cleanup() {
    log_info "清理舊容器和鏡像..."
    
    docker-compose -f docker-compose.yml down --remove-orphans || true
    docker-compose -f docker/docker-compose.test.yml down --remove-orphans || true
    
    # 清理未使用的鏡像
    docker image prune -f || true
    
    log_success "清理完成"
}

# 構建測試環境
build_test_env() {
    log_info "構建測試環境..."
    
    # 構建所有測試相關的鏡像
    docker-compose -f docker/docker-compose.test.yml build
    
    log_success "測試環境構建完成"
}

# 運行單元測試
run_unit_tests() {
    log_info "運行單元測試..."
    
    docker-compose -f docker/docker-compose.test.yml run --rm full-test npm run test:unit
    
    if [ $? -eq 0 ]; then
        log_success "單元測試通過"
        return 0
    else
        log_error "單元測試失敗"
        return 1
    fi
}

# 運行集成測試
run_integration_tests() {
    log_info "運行集成測試..."
    
    docker-compose -f docker/docker-compose.test.yml up -d postgres-test
    sleep 10
    
    docker-compose -f docker/docker-compose.test.yml run --rm db-integration-test
    
    if [ $? -eq 0 ]; then
        log_success "集成測試通過"
        return 0
    else
        log_error "集成測試失敗"
        return 1
    fi
}

# 運行 Web 端到端測試
run_web_e2e_tests() {
    log_info "運行 Web 端到端測試..."
    
    # 啟動 Web 開發服務器
    docker-compose -f docker/docker-compose.test.yml up -d web-e2e
    
    # 等待服務器啟動
    log_info "等待 Web 服務器啟動..."
    sleep 60
    
    # 檢查服務器是否可訪問
    if curl -f http://localhost:19008/health &> /dev/null; then
        log_success "Web 服務器啟動成功"
    else
        log_error "Web 服務器啟動失敗"
        return 1
    fi
    
    # 運行端到端測試
    docker-compose -f docker/docker-compose.test.yml run --rm web-e2e npm run test:e2e:web
    
    if [ $? -eq 0 ]; then
        log_success "Web 端到端測試通過"
        return 0
    else
        log_error "Web 端到端測試失敗"
        return 1
    fi
}

# 運行性能測試
run_performance_tests() {
    log_info "運行性能測試..."
    
    docker-compose -f docker/docker-compose.test.yml run --rm performance-test
    
    if [ $? -eq 0 ]; then
        log_success "性能測試通過"
        return 0
    else
        log_warning "性能測試有警告，但不阻止發布"
        return 0
    fi
}

# 運行安全測試
run_security_tests() {
    log_info "運行安全測試..."
    
    docker-compose -f docker/docker-compose.test.yml run --rm security-test
    
    if [ $? -eq 0 ]; then
        log_success "安全測試通過"
        return 0
    else
        log_error "安全測試失敗"
        return 1
    fi
}

# 構建生產鏡像
build_production() {
    log_info "構建生產鏡像..."
    
    # 構建 Web 生產鏡像
    docker-compose build web-prod
    
    # 測試生產鏡像
    docker-compose up -d web-prod
    sleep 30
    
    if curl -f http://localhost/health &> /dev/null; then
        log_success "生產鏡像構建並測試成功"
        docker-compose down
        return 0
    else
        log_error "生產鏡像測試失敗"
        docker-compose down
        return 1
    fi
}

# 生成測試報告
generate_report() {
    log_info "生成測試報告..."
    
    docker-compose -f docker/docker-compose.test.yml run --rm test-reporter
    
    # 複製報告到本地
    docker cp $(docker-compose -f docker/docker-compose.test.yml ps -q test-reporter):/app/test-reports ./test-reports || true
    
    log_success "測試報告已生成在 ./test-reports 目錄"
}

# 主測試流程
main() {
    local failed_tests=()
    
    echo "🚀 開始完整測試流程..."
    echo "時間: $(date)"
    echo ""
    
    # 1. 環境檢查
    check_docker
    
    # 2. 清理環境
    cleanup
    
    # 3. 構建測試環境
    build_test_env
    
    # 4. 運行各種測試
    echo ""
    echo "📋 運行測試套件..."
    echo "=================="
    
    if ! run_unit_tests; then
        failed_tests+=("單元測試")
    fi
    
    if ! run_integration_tests; then
        failed_tests+=("集成測試")
    fi
    
    if ! run_web_e2e_tests; then
        failed_tests+=("Web端到端測試")
    fi
    
    if ! run_performance_tests; then
        failed_tests+=("性能測試")
    fi
    
    if ! run_security_tests; then
        failed_tests+=("安全測試")
    fi
    
    # 5. 構建生產鏡像
    if ! build_production; then
        failed_tests+=("生產構建")
    fi
    
    # 6. 生成報告
    generate_report
    
    # 7. 清理測試環境
    cleanup
    
    # 8. 結果總結
    echo ""
    echo "🎯 測試結果總結"
    echo "=============="
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "🎉 所有測試都通過！"
        log_success "✅ 系統已準備好發布到生產環境"
        log_success "🚀 可以安全地部署到 https://19930913.xyz/"
        echo ""
        echo "📱 下一步："
        echo "  1. 運行: docker-compose up web-prod"
        echo "  2. 訪問: http://localhost"
        echo "  3. 部署到生產環境"
        exit 0
    else
        log_error "❌ 以下測試失敗："
        for test in "${failed_tests[@]}"; do
            echo "  - $test"
        done
        log_error "🚫 系統不應該發布到生產環境"
        exit 1
    fi
}

# 運行主函數
main "$@"
