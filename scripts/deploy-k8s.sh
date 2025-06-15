#!/bin/bash

# FinTranzo Kubernetes 部署腳本
# 完整的生產環境部署

set -e

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

# 檢查依賴
check_dependencies() {
    log_info "檢查部署依賴..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安裝"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        log_warning "Helm 未安裝，將跳過 Helm 相關部署"
    fi
    
    log_success "依賴檢查完成"
}

# 構建 Docker 鏡像
build_images() {
    log_info "構建 Docker 鏡像..."
    
    # 構建 Web 生產鏡像
    log_info "構建 Web 生產鏡像..."
    docker build -f docker/Dockerfile.web -t fintranzo/web:latest .
    docker tag fintranzo/web:latest fintranzo/web:$(date +%Y%m%d-%H%M%S)
    
    # 構建 iOS 模擬器鏡像
    log_info "構建 iOS 模擬器鏡像..."
    docker build -f docker/Dockerfile.ios-simulator -t fintranzo/ios-simulator:latest .
    docker tag fintranzo/ios-simulator:latest fintranzo/ios-simulator:$(date +%Y%m%d-%H%M%S)
    
    log_success "Docker 鏡像構建完成"
}

# 推送鏡像到倉庫
push_images() {
    log_info "推送鏡像到倉庫..."
    
    # 這裡需要根據實際的 Docker Registry 進行配置
    # docker push fintranzo/web:latest
    # docker push fintranzo/ios-simulator:latest
    
    log_warning "鏡像推送已跳過（需要配置 Docker Registry）"
}

# 創建 Kubernetes 資源
create_k8s_resources() {
    log_info "創建 Kubernetes 資源..."
    
    # 創建命名空間和配置
    kubectl apply -f k8s/namespace.yaml
    
    # 等待命名空間創建完成
    kubectl wait --for=condition=Active namespace/fintranzo --timeout=30s
    
    # 部署 Web 應用
    kubectl apply -f k8s/web-deployment.yaml
    
    # 部署 iOS 模擬器（可選）
    if [[ "$1" == "--with-ios" ]]; then
        kubectl apply -f k8s/ios-simulator-deployment.yaml
        log_info "iOS 模擬器已部署"
    fi
    
    log_success "Kubernetes 資源創建完成"
}

# 等待部署完成
wait_for_deployment() {
    log_info "等待部署完成..."
    
    # 等待 Web 部署完成
    kubectl rollout status deployment/fintranzo-web -n fintranzo --timeout=300s
    
    # 檢查 Pod 狀態
    kubectl get pods -n fintranzo
    
    log_success "部署完成"
}

# 檢查服務健康狀態
check_health() {
    log_info "檢查服務健康狀態..."
    
    # 獲取服務 URL
    WEB_URL=$(kubectl get ingress fintranzo-web-ingress -n fintranzo -o jsonpath='{.spec.rules[0].host}')
    
    if [[ -n "$WEB_URL" ]]; then
        log_info "Web 服務 URL: https://$WEB_URL"
        
        # 檢查健康端點
        if curl -f "https://$WEB_URL/health" &> /dev/null; then
            log_success "Web 服務健康檢查通過"
        else
            log_warning "Web 服務健康檢查失敗"
        fi
    else
        log_warning "無法獲取 Web 服務 URL"
    fi
}

# 運行測試
run_tests() {
    log_info "運行部署後測試..."
    
    # 創建測試 Pod
    kubectl run fintranzo-test \
        --image=fintranzo/web:latest \
        --rm -i --tty \
        --restart=Never \
        --namespace=fintranzo \
        --command -- node scripts/simple-function-test.js
    
    log_success "測試完成"
}

# 清理資源
cleanup() {
    log_info "清理部署資源..."
    
    kubectl delete namespace fintranzo --ignore-not-found=true
    
    log_success "清理完成"
}

# 顯示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo ""
    echo "📋 Kubernetes 資源:"
    kubectl get all -n fintranzo
    echo ""
    echo "🌐 服務端點:"
    kubectl get ingress -n fintranzo
    echo ""
    echo "📊 Pod 狀態:"
    kubectl get pods -n fintranzo -o wide
    echo ""
    echo "📝 最近事件:"
    kubectl get events -n fintranzo --sort-by='.lastTimestamp' | tail -10
}

# 主函數
main() {
    echo "🚀 FinTranzo Kubernetes 部署"
    echo "============================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            build_images
            push_images
            create_k8s_resources $2
            wait_for_deployment
            check_health
            show_deployment_info
            log_success "🎉 部署完成！"
            ;;
        "test")
            run_tests
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            show_deployment_info
            ;;
        "health")
            check_health
            ;;
        *)
            echo "用法: $0 [deploy|test|cleanup|status|health] [--with-ios]"
            echo ""
            echo "命令:"
            echo "  deploy     - 部署應用到 Kubernetes"
            echo "  test       - 運行部署後測試"
            echo "  cleanup    - 清理所有資源"
            echo "  status     - 顯示部署狀態"
            echo "  health     - 檢查服務健康狀態"
            echo ""
            echo "選項:"
            echo "  --with-ios - 同時部署 iOS 模擬器環境"
            exit 1
            ;;
    esac
}

# 運行主函數
main "$@"
