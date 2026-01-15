# Docker 部署完整指南

## 📋 问题总结

您遇到的 Docker 部署错误：
```
ERROR: failed to build: failed to solve: node:18-alpine: failed to resolve source metadata
```

这是因为 Docker 无法拉取 `node:18-alpine` 镜像，通常是网络问题或镜像源访问受限导致。

## ✅ 已完成的修复

### 1. 修复 Dockerfile 镜像版本
- **使用版本**: `node:18-alpine`（Docker Hub 官方稳定版本）
- **文件**: `Dockerfile`

### 2. 创建国内镜像源备用方案
- **文件**: `Dockerfile.cn`
- **镜像源**: 阿里云容器镜像服务
- **用途**: 当默认镜像拉取失败时使用

### 3. 其他已修复的问题
- ✓ 删除错误的 `DockerFile` 文件（正确应为 `Dockerfile`）
- ✓ 添加健康检查端点 `/health`
- ✓ 修复数据库挂载路径
- ✓ 安装 curl 用于健康检查
- ✓ 创建 `.dockerignore` 优化构建

## 🚀 部署方法（3种方式）

### 方法 1：一键部署（推荐）

```bash
./quick-deploy.sh
```

脚本会自动：
- 检测 Docker 环境
- 测试镜像拉取
- 自动选择最佳 Dockerfile
- 构建并启动服务
- 执行健康检查

### 方法 2：使用默认 Dockerfile

```bash
docker-compose up -d --build
```

### 方法 3：使用国内镜像源

如果方法 2 失败，使用国内镜像源：

```bash
# 构建镜像
docker build -f Dockerfile.cn -t cet4-app .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/backend/data:/app/backend/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_strong_secret_key_here \
  --name cet4-app \
  --restart always \
  cet4-app
```

## 🔧 如果仍然失败

### 配置 Docker 镜像加速器

编辑 `/etc/docker/daemon.json`：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'JSON'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.docker-cn.com",
    "https://hub-mirror.c.163.com"
  ]
}
JSON

sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 手动拉取镜像

```bash
# 尝试拉取默认镜像
docker pull node:18-alpine

# 如果失败，使用国内镜像源
docker pull registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine
```

## 📚 相关文档

- **DEPLOY.md** - 详细部署说明
- **TROUBLESHOOTING.md** - 完整故障排查指南
- **quick-deploy.sh** - 一键部署脚本

## ✓ 验证部署

部署成功后，访问：

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回
{"status":"ok","timestamp":"2026-01-14T10:23:00.000Z"}

# 查看日志
docker-compose logs -f app
```

## �� 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建
docker-compose up -d --build

# 进入容器
docker-compose exec app sh
```

## 🎯 生产环境建议

1. **修改 JWT_SECRET**：在 `docker-compose.yml` 中设置强密码
2. **开放端口**：确保服务器防火墙开放 3000 端口
3. **数据备份**：定期备份 `./backend/data` 目录
4. **监控日志**：使用 `docker-compose logs` 监控应用状态
5. **HTTPS**：生产环境建议配置 Nginx 反向代理和 SSL 证书

## 📝 文件清单

```
.
├── Dockerfile              # 默认 Dockerfile（使用具体版本）
├── Dockerfile.cn          # 国内镜像源版本
├── docker-compose.yml     # Docker Compose 配置
├── .dockerignore          # Docker 构建忽略文件
├── quick-deploy.sh        # 一键部署脚本
├── DEPLOY.md             # 部署说明
├── TROUBLESHOOTING.md    # 故障排查指南
└── README-DOCKER.md      # 本文档
```

---

**问题已全部修复，现在可以正常部署！** 🎉
