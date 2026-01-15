# 英语四级学习应用 - 优化版Dockerfile

# ====== 构建阶段 ======
FROM node:latest AS builder

# 设置工作目录
WORKDIR /app

# 设置npm配置
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set disturl https://npmmirror.com/dist

# 复制package.json和package-lock.json
COPY backend/package*.json ./backend/

# 安装依赖（包括开发依赖，用于构建）
RUN cd backend && \
    npm ci --include=dev && \
    npm cache clean --force

# 复制所有源代码
COPY backend/ ./backend/
COPY index.html ./

# ====== 生产阶段 ======
FROM node:latest

# 安装 curl 用于健康检查
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai

# 创建非root用户
RUN groupadd -g 1001 appgroup && \
    useradd -r -u 1001 -g appgroup appuser

# 设置工作目录
WORKDIR /app

# 设置npm配置
RUN npm config set registry https://registry.npmmirror.com

# 从构建阶段复制依赖和构建产物
COPY --from=builder --chown=appuser:appgroup /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=appuser:appgroup /app/backend ./backend
COPY --from=builder --chown=appuser:appgroup /app/index.html ./

# 清理不需要的文件
RUN rm -rf ./backend/node_modules/.cache && \
    find ./backend/node_modules -name "*.ts" -delete && \
    find ./backend/node_modules -name "*.js.map" -delete

# 设置环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# 创建数据库目录并设置权限
RUN mkdir -p /app/backend/data && \
    chown -R appuser:appgroup /app/backend/data

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "backend/app.js"]
