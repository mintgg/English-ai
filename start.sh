#!/bin/bash

# 启动脚本 - 用于开发环境启动前后端服务

echo "============================================"
echo "CET-4 英语四级学习助手 - 开发环境启动脚本"
echo "============================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到Node.js。请先安装Node.js (https://nodejs.org/)"
    exit 1
fi

echo "✓ Node.js已安装"

# 创建数据目录（如果不存在）
mkdir -p backend/data

# 启动后端服务
echo "正在启动后端服务..."
cd backend

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "正在安装后端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 安装后端依赖失败"
        exit 1
    fi
    echo "✓ 后端依赖安装成功"
    
    # 初始化数据库
    echo "正在初始化数据库..."
    npm run init-db
    if [ $? -ne 0 ]; then
        echo "错误: 初始化数据库失败"
        exit 1
    fi
    echo "✓ 数据库初始化成功"
fi

# 在后台启动后端服务
echo "启动后端服务 (http://localhost:3000)..."
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端服务启动
sleep 3

# 检查后端服务是否成功启动
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "错误: 后端服务启动失败"
    echo "请查看日志: backend.log"
    exit 1
fi

echo "✓ 后端服务启动成功 (PID: $BACKEND_PID)"

# 返回项目根目录
cd ..

# 启动前端服务（使用Python的简单HTTP服务器）
echo "正在启动前端服务..."

# 检查是否有Python3
if command -v python3 &> /dev/null; then
    echo "使用Python3启动前端服务 (http://localhost:8000)..."
    python3 -m http.server 8000 > frontend.log 2>&1 &
    FRONTEND_PID=$!
elif command -v python &> /dev/null; then
    echo "使用Python启动前端服务 (http://localhost:8000)..."
    python -m SimpleHTTPServer 8000 > frontend.log 2>&1 &
    FRONTEND_PID=$!
else
    echo "警告: 未检测到Python。请手动启动前端服务。"
    FRONTEND_PID=0
fi

# 等待前端服务启动
if [ $FRONTEND_PID -ne 0 ]; then
    sleep 2
    
    if ! ps -p $FRONTEND_PID > /dev/null; then
        echo "错误: 前端服务启动失败"
        echo "请查看日志: frontend.log"
    else
        echo "✓ 前端服务启动成功 (PID: $FRONTEND_PID)"
    fi
fi

echo ""
echo "============================================"
echo "服务启动完成！"
echo "--------------------------------------------"
echo "后端API: http://localhost:3000"
echo "前端页面: http://localhost:8000"
echo "--------------------------------------------"
echo "使用说明:"
echo "1. 打开浏览器访问 http://localhost:8000"
echo "2. 使用以下测试账号登录:"
echo "   - 邮箱: test@example.com"
echo "   - 密码: password123"
echo "--------------------------------------------"
echo "停止服务: 按 Ctrl+C"
echo "============================================"

# 等待用户输入以保持脚本运行
wait $BACKEND_PID $FRONTEND_PID