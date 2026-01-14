# Docker 部署故障排查指南

## 问题：node:18-alpine 镜像拉取失败

### 错误信息
```
ERROR: failed to build: failed to solve: node:18-alpine: failed to resolve source metadata
```

### 解决方案

#### 方案 1：使用具体版本的镜像（推荐）
默认 Dockerfile 已更新为使用 `node:18.19-alpine3.18`，这是一个更稳定的版本。

```bash
docker-compose up -d --build
```

#### 方案 2：配置 Docker 镜像加速器

**阿里云镜像加速器**（推荐国内用户）：

1. 创建或编辑 `/etc/docker/daemon.json`：
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.docker-cn.com",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
```

2. 重启 Docker 服务：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

3. 验证配置：
```bash
docker info | grep -A 5 "Registry Mirrors"
```

#### 方案 3：使用国内镜像源的 Dockerfile

使用 `Dockerfile.cn` 文件，它使用阿里云镜像源：

```bash
# 使用国内镜像源构建
docker build -f Dockerfile.cn -t cet4-app .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/backend/data:/app/backend/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_jwt_secret_key \
  --name cet4-app \
  cet4-app
```

或修改 docker-compose.yml：
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.cn
    # ... 其他配置
```

#### 方案 4：手动拉取镜像

先手动拉取镜像，再构建：

```bash
# 尝试拉取镜像
docker pull node:18.19-alpine3.18

# 如果失败，使用国内镜像源
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/node:18.19-alpine3.18

# 然后重新构建
docker-compose up -d --build
```

#### 方案 5：检查网络和 DNS

```bash
# 检查 Docker 是否能访问外网
docker run --rm alpine ping -c 4 docker.io

# 检查 DNS 解析
docker run --rm alpine nslookup docker.io

# 如果 DNS 有问题，配置 DNS
sudo tee -a /etc/docker/daemon.json <<-'EOF'
{
  "dns": ["8.8.8.8", "114.114.114.114"]
}
EOF

sudo systemctl restart docker
```

## 其他常见问题

### 问题：权限被拒绝

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

### 问题：端口已被占用

```bash
# 查看端口占用
sudo lsof -i :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:3000"  # 将主机端口改为 8080
```

### 问题：数据库权限错误

```bash
# 确保数据目录有正确的权限
sudo chown -R 1001:1001 backend/data
```

### 问题：容器启动后立即退出

```bash
# 查看容器日志
docker-compose logs app

# 或
docker logs cet4-app
```

## 验证部署成功

```bash
# 检查容器状态
docker-compose ps

# 检查健康状态
curl http://localhost:3000/health

# 应该返回
# {"status":"ok","timestamp":"2026-01-14T10:21:00.000Z"}

# 查看实时日志
docker-compose logs -f app
```

## 完全重新部署

如果遇到问题，可以完全清理后重新部署：

```bash
# 停止并删除容器
docker-compose down

# 删除镜像（可选）
docker rmi cet4-app

# 清理构建缓存（可选）
docker builder prune -a

# 重新构建
docker-compose up -d --build
```
