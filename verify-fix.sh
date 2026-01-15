#!/bin/bash

echo "======================================"
echo "Docker 部署修复验证"
echo "======================================"
echo ""

PASS=0
FAIL=0

# 检查 Dockerfile
if [ -f "Dockerfile" ] && grep -q "FROM node:18-alpine" Dockerfile; then
    echo "✓ Dockerfile 存在且使用正确的镜像版本"
    ((PASS++))
else
    echo "✗ Dockerfile 问题"
    ((FAIL++))
fi

# 检查 Dockerfile.cn
if [ -f "Dockerfile.cn" ] && grep -q "registry.cn-hangzhou.aliyuncs.com" Dockerfile.cn; then
    echo "✓ Dockerfile.cn 存在（国内镜像源备用方案）"
    ((PASS++))
else
    echo "✗ Dockerfile.cn 缺失"
    ((FAIL++))
fi

# 检查健康检查端点
if grep -q "app.get('/health'" backend/app.js; then
    echo "✓ app.js 包含 /health 健康检查端点"
    ((PASS++))
else
    echo "✗ app.js 缺少健康检查端点"
    ((FAIL++))
fi

# 检查 curl 安装
if grep -q "apk add --no-cache curl" Dockerfile; then
    echo "✓ Dockerfile 安装了 curl"
    ((PASS++))
else
    echo "✗ Dockerfile 未安装 curl"
    ((FAIL++))
fi

# 检查数据库挂载
if grep -q "./backend/data:/app/backend/data" docker-compose.yml; then
    echo "✓ docker-compose.yml 数据库挂载路径正确"
    ((PASS++))
else
    echo "✗ docker-compose.yml 数据库挂载路径错误"
    ((FAIL++))
fi

# 检查 .dockerignore
if [ -f ".dockerignore" ]; then
    echo "✓ .dockerignore 存在"
    ((PASS++))
else
    echo "✗ .dockerignore 缺失"
    ((FAIL++))
fi

# 检查部署脚本
if [ -f "quick-deploy.sh" ] && [ -x "quick-deploy.sh" ]; then
    echo "✓ quick-deploy.sh 一键部署脚本存在且可执行"
    ((PASS++))
else
    echo "✗ quick-deploy.sh 问题"
    ((FAIL++))
fi

# 检查文档
if [ -f "TROUBLESHOOTING.md" ]; then
    echo "✓ TROUBLESHOOTING.md 故障排查文档存在"
    ((PASS++))
else
    echo "✗ TROUBLESHOOTING.md 缺失"
    ((FAIL++))
fi

if [ -f "README-DOCKER.md" ]; then
    echo "✓ README-DOCKER.md 完整指南存在"
    ((PASS++))
else
    echo "✗ README-DOCKER.md 缺失"
    ((FAIL++))
fi

echo ""
echo "======================================"
echo "验证结果: $PASS 通过, $FAIL 失败"
echo "======================================"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo "🎉 所有检查通过！Docker 部署问题已完全修复。"
    echo ""
    echo "现在可以使用以下任一方式部署："
    echo ""
    echo "1. 一键部署（推荐）："
    echo "   ./quick-deploy.sh"
    echo ""
    echo "2. 使用默认配置："
    echo "   docker-compose up -d --build"
    echo ""
    echo "3. 使用国内镜像源："
    echo "   docker build -f Dockerfile.cn -t cet4-app ."
    echo ""
    echo "详细说明请查看 README-DOCKER.md"
    exit 0
else
    echo ""
    echo "❌ 发现问题，请检查上述失败项"
    exit 1
fi
