#!/bin/bash

echo "======================================"
echo "Docker 配置验证脚本"
echo "======================================"

# 检查 Dockerfile 是否存在
if [ -f "Dockerfile" ]; then
    echo "✓ Dockerfile 存在"
    echo "  文件大小: $(wc -l < Dockerfile) 行"
else
    echo "✗ Dockerfile 不存在"
    exit 1
fi

# 检查 docker-compose.yml 是否存在
if [ -f "docker-compose.yml" ]; then
    echo "✓ docker-compose.yml 存在"
else
    echo "✗ docker-compose.yml 不存在"
    exit 1
fi

# 检查 .dockerignore 是否存在
if [ -f ".dockerignore" ]; then
    echo "✓ .dockerignore 存在"
else
    echo "✗ .dockerignore 不存在"
fi

# 检查 backend/data 目录是否存在
if [ -d "backend/data" ]; then
    echo "✓ backend/data 目录存在"
else
    echo "✗ backend/data 目录不存在"
    exit 1
fi

# 检查 app.js 中是否有健康检查端点
if grep -q "/health" backend/app.js; then
    echo "✓ app.js 包含 /health 端点"
else
    echo "✗ app.js 缺少 /health 端点"
    exit 1
fi

# 检查 Dockerfile 中是否安装了 curl
if grep -q "apk add --no-cache curl" Dockerfile; then
    echo "✓ Dockerfile 安装了 curl"
else
    echo "✗ Dockerfile 未安装 curl"
    exit 1
fi

# 检查 Dockerfile 中是否使用了正确的健康检查命令
if grep -q "curl -f http://localhost:3000/health" Dockerfile; then
    echo "✓ Dockerfile 使用了正确的健康检查命令"
else
    echo "✗ Dockerfile 健康检查命令不正确"
    exit 1
fi

echo ""
echo "======================================"
echo "所有检查通过！Docker 配置正确。"
echo "======================================"
echo ""
echo "可以使用以下命令部署："
echo "  docker-compose up -d --build"
echo ""
