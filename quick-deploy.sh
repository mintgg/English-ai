#!/bin/bash

# 英语四级学习应用 - 一键部署脚本
# 自动检测并解决 Docker 镜像拉取问题

set -e

echo "======================================"
echo "英语四级学习应用 - 一键部署"
echo "======================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

echo "✓ Docker 已安装"

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✓ Docker Compose 已安装"
echo ""

# 尝试拉取镜像
echo "正在测试 Docker 镜像拉取..."
if docker pull node:18-alpine &> /dev/null; then
    echo "✓ 镜像拉取成功，使用默认 Dockerfile"
    DOCKERFILE="Dockerfile"
else
    echo "⚠️  默认镜像拉取失败，切换到国内镜像源"
    DOCKERFILE="Dockerfile.cn"
    
    # 尝试拉取国内镜像
    if ! docker pull registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine &> /dev/null; then
        echo ""
        echo "❌ 镜像拉取失败，可能的原因："
        echo "  1. 网络连接问题"
        echo "  2. Docker 服务未正常运行"
        echo "  3. 需要配置 Docker 镜像加速器"
        echo ""
        echo "请查看 TROUBLESHOOTING.md 文档获取详细解决方案"
        exit 1
    fi
fi

echo ""
echo "======================================"
echo "开始构建和部署..."
echo "======================================"

# 停止旧容器（如果存在）
if docker-compose ps | grep -q "app"; then
    echo "停止旧容器..."
    docker-compose down
fi

# 使用选定的 Dockerfile 构建
if [ "$DOCKERFILE" = "Dockerfile.cn" ]; then
    echo "使用国内镜像源构建..."
    docker build -f Dockerfile.cn -t cet4-app .
    
    # 手动运行容器
    echo "启动容器..."
    docker run -d \
      -p 3000:3000 \
      -v $(pwd)/backend/data:/app/backend/data \
      -e NODE_ENV=production \
      -e JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)} \
      --name cet4-app \
      --restart always \
      cet4-app
else
    echo "使用默认配置构建..."
    docker-compose up -d --build
fi

echo ""
echo "======================================"
echo "部署完成！"
echo "======================================"
echo ""

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 健康检查
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "✓ 服务健康检查通过"
    echo ""
    echo "应用已成功部署！"
    echo "访问地址: http://localhost:3000"
    echo "健康检查: http://localhost:3000/health"
else
    echo "⚠️  健康检查失败，查看日志："
    if [ "$DOCKERFILE" = "Dockerfile.cn" ]; then
        docker logs cet4-app
    else
        docker-compose logs app
    fi
fi

echo ""
echo "常用命令："
echo "  查看日志: docker-compose logs -f app"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
