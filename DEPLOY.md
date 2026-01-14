# Docker 部署说明

## 修复的问题

1. **删除了错误的 DockerFile 文件**（正确文件名应为 Dockerfile）
2. **修复了 Dockerfile 配置**：
   - 安装 curl 用于健康检查
   - 移除不存在的 assets 目录复制
   - 使用 curl 替代 wget 进行健康检查
3. **添加了健康检查端点**：在 app.js 中添加 `/health` 路由
4. **修复了数据库挂载**：docker-compose.yml 中的数据库路径与实际路径一致
5. **创建了 .dockerignore**：优化 Docker 构建过程

## 部署步骤

### 1. 使用 Docker Compose 部署（推荐）

```bash
# 构建并启动容器
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 2. 使用 Docker 命令部署

```bash
# 构建镜像
docker build -t cet4-app .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/backend/data:/app/backend/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_jwt_secret_key \
  --name cet4-app \
  cet4-app

# 查看日志
docker logs -f cet4-app
```

### 3. 健康检查

访问 `http://localhost:3000/health` 应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T10:11:00.000Z"
}
```

## 注意事项

1. **JWT_SECRET**：生产环境请修改为强密码
2. **端口**：确保服务器防火墙已开放 3000 端口
3. **数据持久化**：数据库文件保存在 `./backend/data` 目录
4. **首次运行**：数据库会自动初始化表结构
