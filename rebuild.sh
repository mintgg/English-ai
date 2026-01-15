#!/bin/bash

echo "清理 Docker 构建缓存并重新构建..."

# 停止并删除旧容器
docker-compose down 2>/dev/null || true

# 删除旧镜像
docker rmi cet4-app 2>/dev/null || true
docker rmi english_cet4_app-app 2>/dev/null || true

# 清理构建缓存
docker builder prune -f

# 使用 --no-cache 重新构建
echo ""
echo "开始重新构建（不使用缓存）..."
docker-compose build --no-cache

echo ""
echo "构建完成！现在可以启动服务："
echo "  docker-compose up -d"
