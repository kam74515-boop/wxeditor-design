#!/bin/bash
# 部署脚本 - 从代码仓库构建并发布
set -e

PROJECT_DIR="/root/wxeditor-design"
DIST_DIR="/var/www/wxeditor"

echo "==> 拉取最新代码..."
cd "$PROJECT_DIR"
git pull origin main

echo "==> 构建前端..."
cd web
npm run build

echo "==> 同步到 Nginx 目录..."
sudo rm -rf "$DIST_DIR"/*
sudo cp -r dist/* "$DIST_DIR/"
sudo chown -R www-data:www-data "$DIST_DIR"
sudo chmod -R 755 "$DIST_DIR"

echo "==> 重启后端 API..."
cd "$PROJECT_DIR/server"
pm2 restart wxeditor-api

echo "==> 重载 Nginx..."
sudo systemctl reload nginx

echo ""
echo "部署完成! https://nextevo.online"
pm2 list --no-color
