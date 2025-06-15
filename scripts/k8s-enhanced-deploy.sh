#!/bin/bash

# Kubernetes 增強部署腳本
# 提高成功率的完整部署方案

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置
NAMESPACE="fintranzo"
APP_NAME="fintranzo-web-enhanced"
DEPLOYMENT_TIMEOUT="600s"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

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

log_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

# 檢查依賴
check_dependencies() {
    log_header "檢查 Kubernetes 依賴"
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安裝"
        exit 1
    fi
    
    # 檢查 kubectl 連接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "無法連接到 Kubernetes 集群"
        exit 1
    fi
    
    log_success "Kubernetes 依賴檢查完成"
}

# 創建命名空間
create_namespace() {
    log_header "創建命名空間"
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_info "命名空間 $NAMESPACE 已存在"
    else
        kubectl create namespace $NAMESPACE
        log_success "命名空間 $NAMESPACE 已創建"
    fi
    
    # 設置默認命名空間
    kubectl config set-context --current --namespace=$NAMESPACE
}

# 部署配置和密鑰
deploy_configs() {
    log_header "部署配置和密鑰"
    
    # 應用基礎配置
    kubectl apply -f k8s/namespace.yaml
    log_success "基礎配置已應用"
    
    # 應用增強配置
    kubectl apply -f k8s/enhanced-deployment.yaml
    log_success "增強配置已應用"
    
    # 等待配置生效
    sleep 5
}

# 部署應用
deploy_application() {
    log_header "部署應用"
    
    # 檢查是否存在舊的部署
    if kubectl get deployment $APP_NAME -n $NAMESPACE &> /dev/null; then
        log_info "檢測到現有部署，執行滾動更新..."
        kubectl rollout restart deployment/$APP_NAME -n $NAMESPACE
    else
        log_info "創建新部署..."
    fi
    
    # 等待部署完成
    log_info "等待部署完成（最多 ${DEPLOYMENT_TIMEOUT}）..."
    
    if kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=$DEPLOYMENT_TIMEOUT; then
        log_success "部署完成"
    else
        log_error "部署超時"
        return 1
    fi
}

# 檢查 Pod 狀態
check_pods() {
    log_header "檢查 Pod 狀態"
    
    # 獲取 Pod 列表
    kubectl get pods -n $NAMESPACE -l app=$APP_NAME
    
    # 檢查 Pod 是否都在運行
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME --field-selector=status.phase=Running --no-headers | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME --no-headers | wc -l)
    
    log_info "Pod 狀態: $ready_pods/$total_pods 運行中"
    
    if [ $ready_pods -eq $total_pods ] && [ $total_pods -gt 0 ]; then
        log_success "所有 Pod 都在正常運行"
        return 0
    else
        log_warning "部分 Pod 未正常運行"
        
        # 顯示問題 Pod 的詳細信息
        kubectl get pods -n $NAMESPACE -l app=$APP_NAME --field-selector=status.phase!=Running
        
        return 1
    fi
}

# 檢查服務
check_services() {
    log_header "檢查服務"
    
    # 檢查服務狀態
    kubectl get services -n $NAMESPACE
    
    # 檢查 Ingress
    kubectl get ingress -n $NAMESPACE
    
    log_success "服務檢查完成"
}

# 健康檢查
health_check() {
    log_header "執行健康檢查"
    
    local service_name="${APP_NAME}-service"
    local port=80
    
    # 端口轉發進行健康檢查
    log_info "啟動端口轉發進行健康檢查..."
    
    kubectl port-forward service/$service_name $port:$port -n $NAMESPACE &
    local port_forward_pid=$!
    
    # 等待端口轉發啟動
    sleep 5
    
    # 執行健康檢查
    local health_check_passed=false
    
    for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
        log_info "健康檢查嘗試 $i/$HEALTH_CHECK_RETRIES..."
        
        if curl -f http://localhost:$port/health &> /dev/null; then
            log_success "健康檢查通過"
            health_check_passed=true
            break
        else
            log_warning "健康檢查失敗，等待 ${HEALTH_CHECK_INTERVAL}s 後重試..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    # 停止端口轉發
    kill $port_forward_pid &> /dev/null || true
    
    if [ "$health_check_passed" = true ]; then
        log_success "應用健康檢查通過"
        return 0
    else
        log_error "應用健康檢查失敗"
        return 1
    fi
}

# 功能測試
function_test() {
    log_header "執行功能測試"
    
    # 創建測試 Pod
    local test_pod_name="fintranzo-function-test"
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: $test_pod_name
  namespace: $NAMESPACE
spec:
  restartPolicy: Never
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ["/bin/sh"]
    args:
      - -c
      - |
        echo "🧪 開始功能測試..."
        
        # 測試主頁
        if curl -f http://${APP_NAME}-service/; then
          echo "✅ 主頁訪問成功"
        else
          echo "❌ 主頁訪問失敗"
          exit 1
        fi
        
        # 測試健康檢查
        if curl -f http://${APP_NAME}-service/health; then
          echo "✅ 健康檢查成功"
        else
          echo "❌ 健康檢查失敗"
          exit 1
        fi
        
        echo "🎉 功能測試完成"
EOF

    # 等待測試完成
    kubectl wait --for=condition=Ready pod/$test_pod_name -n $NAMESPACE --timeout=60s
    
    # 獲取測試結果
    local test_logs=$(kubectl logs $test_pod_name -n $NAMESPACE)
    echo "$test_logs"
    
    # 檢查測試是否成功
    if echo "$test_logs" | grep -q "🎉 功能測試完成"; then
        log_success "功能測試通過"
        local test_passed=true
    else
        log_error "功能測試失敗"
        local test_passed=false
    fi
    
    # 清理測試 Pod
    kubectl delete pod $test_pod_name -n $NAMESPACE &> /dev/null || true
    
    if [ "$test_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# 顯示部署信息
show_deployment_info() {
    log_header "部署信息"
    
    echo ""
    echo "📋 Kubernetes 資源:"
    kubectl get all -n $NAMESPACE
    
    echo ""
    echo "🌐 服務端點:"
    kubectl get ingress -n $NAMESPACE
    
    echo ""
    echo "📊 Pod 詳細狀態:"
    kubectl get pods -n $NAMESPACE -o wide
    
    echo ""
    echo "📝 最近事件:"
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
    
    echo ""
    echo "🔗 訪問信息:"
    echo "  - 內部訪問: http://${APP_NAME}-service.$NAMESPACE.svc.cluster.local"
    echo "  - 外部訪問: https://19930913.xyz"
    echo "  - 健康檢查: https://19930913.xyz/health"
}

# 故障排除
troubleshoot() {
    log_header "故障排除"
    
    echo ""
    echo "🔍 Pod 日誌:"
    kubectl logs -l app=$APP_NAME -n $NAMESPACE --tail=50
    
    echo ""
    echo "🔍 Pod 描述:"
    kubectl describe pods -l app=$APP_NAME -n $NAMESPACE
    
    echo ""
    echo "🔍 服務描述:"
    kubectl describe service ${APP_NAME}-service -n $NAMESPACE
    
    echo ""
    echo "🔍 Ingress 描述:"
    kubectl describe ingress ${APP_NAME}-ingress -n $NAMESPACE
}

# 清理資源
cleanup() {
    log_header "清理資源"
    
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    log_success "資源清理完成"
}

# 主函數
main() {
    echo "🚀 FinTranzo Kubernetes 增強部署"
    echo "================================="
    echo "時間: $(date)"
    echo "命名空間: $NAMESPACE"
    echo "應用: $APP_NAME"
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            create_namespace
            deploy_configs
            deploy_application
            
            if check_pods && check_services; then
                if health_check && function_test; then
                    show_deployment_info
                    log_success "🎉 部署完全成功！"
                    echo ""
                    echo "📱 現在可以測試五大核心功能："
                    echo "1. 訪問 https://19930913.xyz"
                    echo "2. 登錄 user01@gmail.com / user01"
                    echo "3. 測試所有功能"
                    exit 0
                else
                    log_error "健康檢查或功能測試失敗"
                    troubleshoot
                    exit 1
                fi
            else
                log_error "Pod 或服務檢查失敗"
                troubleshoot
                exit 1
            fi
            ;;
        "status")
            show_deployment_info
            ;;
        "health")
            health_check
            ;;
        "test")
            function_test
            ;;
        "troubleshoot")
            troubleshoot
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "用法: $0 [deploy|status|health|test|troubleshoot|cleanup]"
            echo ""
            echo "命令:"
            echo "  deploy       - 執行完整部署"
            echo "  status       - 顯示部署狀態"
            echo "  health       - 執行健康檢查"
            echo "  test         - 執行功能測試"
            echo "  troubleshoot - 故障排除"
            echo "  cleanup      - 清理所有資源"
            exit 1
            ;;
    esac
}

# 運行主函數
main "$@"
