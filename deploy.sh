#!/bin/bash

# 部署脚本 - 用于在阿里云服务器上一键部署英语四级学习应用

echo "开始部署英语四级学习应用..."

# 1. 更新系统
echo "正在更新系统..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. 安装Docker
echo "正在安装Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 3. 安装Docker Compose
echo "正在安装Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 克隆代码库（假设代码已上传至GitHub）
echo "正在拉取代码..."
git clone https://github.com/yourusername/english_cet4_app.git
cd english_cet4_app

# 5. 生成随机JWT密钥
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s/your_jwt_secret_key/$JWT_SECRET/g" docker-compose.yml

# 6. 构建并启动容器
echo "正在构建并启动应用..."
sudo docker-compose up -d --build

echo "部署完成！应用已在 http://服务器IP:3000 上运行。"
echo "请确保阿里云服务器的安全组已开放3000端口。"