# WXEditor — 部署指南

> 本文档涵盖开发环境搭建、Docker 生产部署和环境变量配置。

## 1. 开发环境

### 环境要求

| 项目 | 版本 |
|------|------|
| Node.js | >= 18 |
| npm | >= 9 |

### 安装与启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd wxeditor-server

# 2. 一键安装所有依赖
npm run install:all

# 3. 配置后端环境变量
cp server/.env.example server/.env
# 编辑 server/.env 填入所需配置

# 4. 一键启动前后端
npm run dev
```

启动后：
- **前端**：`http://localhost:5173/`
- **后端**：`http://localhost:3000`（前端已代理 `/api/` 和 `/uploads/`）

### 分别启动

```bash
# 仅启动后端
cd server && npm run dev

# 仅启动前端
cd web && npm run dev
```

---

## 2. Docker 生产部署

### 前置条件

- Docker >= 20
- Docker Compose >= 2.0

### 部署步骤

```bash
# 1. 配置环境变量
cp server/.env.example server/.env
# 编辑 .env，设置 NODE_ENV=production 和其他生产配置

# 2. 构建并启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

### Docker 架构

```
┌──────────────────────────────────────┐
│  Nginx (:80/:443)                     │
│  ├── /        → 静态前端 HTML         │
│  ├── /api/    → wxeditor-server:3000  │
│  └── /socket.io/ → wxeditor-server    │
├──────────────────────────────────────┤
│  wxeditor-server (:3000)              │
│  └── Express + Socket.IO + SQLite     │
├──────────────────────────────────────┤
│  web (构建阶段)                        │
│  └── npm run build → 生成 dist/       │
└──────────────────────────────────────┘
```

### 数据持久化

Docker Compose 配置了以下卷挂载：

| 容器路径 | 宿主机路径 | 说明 |
|----------|-----------|------|
| `/app/data` | `./server/data` | SQLite 数据库文件 |
| `/app/public/uploads` | `./server/public/uploads` | 用户上传文件 |

---

## 3. 环境变量说明

环境变量文件：`server/.env`

### 必填配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 后端服务端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `JWT_SECRET` | — | JWT 签名密钥（**必须修改**） |
| `JWT_REFRESH_SECRET` | — | Refresh Token 签名密钥（**必须修改**） |
| `JWT_EXPIRES_IN` | `7d` | Access Token 过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh Token 过期时间 |
| `SESSION_SECRET` | — | Session 加密密钥 |

### AI 功能配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENAI_API_KEY` | — | AI API 密钥（Dashscope API Key） |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | API 基础 URL（通义千问使用 `https://dashscope.aliyuncs.com/compatible-mode/v1`） |
| `OPENAI_MODEL` | `gpt-4o-mini` | AI 模型名称（通义千问使用 `qwen3.5-plus`） |

### 文件上传配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `UPLOAD_DIR` | `./public/uploads` | 上传文件存储路径 |
| `MAX_FILE_SIZE` | `10485760` | 文件大小上限（10MB） |
| `MAX_VIDEO_SIZE` | `102400000` | 视频大小上限（100MB） |

### 微信公众号配置（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WECHAT_APP_ID` | — | 微信 AppID |
| `WECHAT_APP_SECRET` | — | 微信 AppSecret |

### 支付配置（可选）

| 变量 | 说明 |
|------|------|
| `ALIPAY_APP_ID` | 支付宝应用 ID |
| `ALIPAY_PRIVATE_KEY` | 支付宝私钥 |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 |
| `WECHAT_PAY_MCH_ID` | 微信支付商户号 |
| `WECHAT_PAY_KEY` | 微信支付密钥 |

### 邮件配置（可选）

| 变量 | 说明 |
|------|------|
| `SMTP_HOST` | SMTP 服务器地址 |
| `SMTP_PORT` | SMTP 端口（默认 587） |
| `SMTP_USER` | SMTP 用户名 |
| `SMTP_PASS` | SMTP 密码 |
| `FROM_EMAIL` | 发件人地址 |

### 存储配置（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `STORAGE_TYPE` | `local` | 存储方式：`local`/`s3`/`oss` |
| `AWS_ACCESS_KEY_ID` | — | AWS S3 Access Key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS S3 Secret Key |
| `AWS_BUCKET_NAME` | — | S3 存储桶名称 |
| `AWS_REGION` | — | S3 区域 |
| `ALIYUN_ACCESS_KEY_ID` | — | 阿里云 OSS Access Key |
| `ALIYUN_ACCESS_KEY_SECRET` | — | 阿里云 OSS Secret |
| `ALIYUN_BUCKET` | — | OSS 存储桶名称 |
| `ALIYUN_REGION` | — | OSS 区域 |

---

## 4. Nginx 配置说明

Nginx 作为统一入口，配置文件：`nginx.conf`

### 路由规则

| 路径 | 代理目标 | 说明 |
|------|----------|------|
| `/` | 静态文件 | 前端 SPA（`try_files` 兜底到 `index.html`） |
| `/api/*` | `wxeditor-server:3000` | 后端 API |
| `/uploads/*` | `wxeditor-server:3000` | 上传文件 |
| `/public/*` | `wxeditor-server:3000` | 静态资源 |
| `/socket.io/*` | `wxeditor-server:3000` | WebSocket（需 `Upgrade` 头） |

### Gzip 压缩

已启用 Gzip，压缩以下类型：
- `text/plain`
- `application/json`
- `text/css`
- `application/javascript`
- `image/svg+xml`

---

## 5. 生产环境建议

### 安全

- **修改所有默认密钥**：`JWT_SECRET`、`JWT_REFRESH_SECRET`、`SESSION_SECRET`
- **限制 CORS**：生产环境移除 `cors()` 的通配符配置
- **HTTPS**：在 Nginx 中配置 SSL 证书

### 性能

- **PM2 部署**：`pm2 start server/app.js --name wxeditor`
- **Redis 缓存**：替换 Session 内存存储为 Redis
- **SQLite 备份**：定期备份 `server/data/wxeditor.db`

### 监控

- PM2 自带进程监控和日志管理
- Docker 健康检查已配置（30 秒间隔）
