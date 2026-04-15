# WxEditor API 契约文档

> 版本: v2.1  
> 更新日期: 2026-04-15  
> Base URL: `/api`  
> 后端: `server/`（Clean Architecture）  
> 数据库: MySQL（Knex + mysql2）

---

## 目录

1. [通用规范](#1-通用规范)
2. [认证模块 (Auth)](#2-认证模块-auth)
3. [AI 助手模块 (AI)](#3-ai-助手模块-ai)
4. [文档/内容模块 (Content)](#4-文档内容模块-content)
5. [协作模块 (Collab)](#5-协作模块-collab)
6. [模板模块 (Templates)](#6-模板模块-templates)
7. [素材模块 (Materials)](#7-素材模块-materials)
8. [会员模块 (Membership)](#8-会员模块-membership)
9. [团队模块 (Team)](#9-团队模块-team)
10. [微信公众号模块 (WeChat)](#10-微信公众号模块-wechat)
11. [草稿/微信发布模块 (Draft)](#11-草稿微信发布模块-draft)
12. [UEditor 上传模块](#12-ueditor-上传模块)
13. [管理后台模块 (Admin)](#13-管理后台模块-admin)
14. [AI 配置管理 (AI Config)](#14-ai-配置管理-ai-config)
15. [多公众号管理 (Wechat Accounts)](#15-多公众号管理-wechat-accounts)
16. [定时发布 (Scheduled Posts)](#16-定时发布-scheduled-posts)
17. [评论批注 (Comments)](#17-评论批注-comments)
18. [图文合集 (Article Batches)](#18-图文合集-article-batches)
19. [AI Agent](#19-ai-agent)
20. [数据模型参考](#20-数据模型参考)

---

## 1. 通用规范

### 1.1 认证方式

除标注 `[Public]` 的接口外，所有请求需携带 JWT Token：

```
Authorization: Bearer <token>
```

### 1.2 统一响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

错误响应：

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 1.3 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |

分页响应：

```json
{
  "list": [],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 1.4 HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 2. 认证模块 Auth

基础路径: `/api/auth`

### 2.1 用户注册

```
POST /api/auth/register
```

**请求体:**

| 字段 | 类型 | 必填 | 校验 | 说明 |
|------|------|------|------|------|
| username | string | Y | 2-32字符 | 用户名 |
| email | string | Y | 邮箱格式 | 邮箱 |
| password | string | Y | 6-128字符 | 密码 |

**响应:** `201`

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "username": "test", "email": "test@example.com", "role": "user" },
    "token": "jwt-token-string",
    "refreshToken": "refresh-token-string"
  }
}
```

### 2.2 用户登录

```
POST /api/auth/login
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | Y | 用户名或邮箱 |
| password | string | Y | 密码 |

**响应:** `200`

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "username": "test", "role": "user", "nickname": "", "avatar": "", "settings": {} },
    "token": "jwt-token-string",
    "refreshToken": "refresh-token-string"
  }
}
```

### 2.3 退出登录

```
POST /api/auth/logout
```

**响应:** `200`

```json
{ "success": true, "message": "已退出登录" }
```

### 2.4 获取当前用户信息

```
GET /api/auth/me
```

**需要认证**

**响应:**

```json
{
  "success": true,
  "data": {
    "id": 1, "username": "test", "email": "test@example.com",
    "nickname": "昵称", "avatar": "url", "role": "user",
    "status": "active", "settings": { "membership": { "type": "free", "isActive": false } }
  }
}
```

### 2.5 更新个人资料

```
PUT /api/auth/profile
```

**需要认证**

**请求体:**

| 字段 | 类型 | 说明 |
|------|------|------|
| nickname | string | 昵称 |
| avatar | string | 头像URL |
| settings | object | 用户设置 |

### 2.6 修改密码

```
POST /api/auth/change-password
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | Y | 旧密码 |
| newPassword | string | Y | 新密码 (6-128字符) |

### 2.7 刷新 Token

```
POST /api/auth/refresh
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | Y | 刷新令牌 |

---

## 3. AI 助手模块 AI

基础路径: `/api/ai`

### 3.1 AI 对话 (SSE 流式)

```
POST /api/ai/chat
```

**需要认证**  
**Content-Type:** `multipart/form-data`

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | Y | 用户消息 (最大10000字符) |
| documentId | string | N | 关联文档ID |
| context | string | N | 当前文章上下文 |
| history | string (JSON) | N | 历史消息数组，最多20条 |
| file | File | N | 附件文件 |

**响应:** `Content-Type: text/event-stream`

SSE 数据格式：

```
data: {"content": "部分内容"}
data: {"content": "更多内容"}
data: [DONE]
```

### 3.2 AI 内容改写

```
POST /api/ai/rewrite
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | Y | 原始内容 |
| action | string | Y | 动作: `polish` / `simplify` / `expand` / `shorten` |
| customPrompt | string | N | 自定义提示词 |

**响应:**

```json
{
  "success": true,
  "data": { "result": "改写后的内容" }
}
```

### 3.3 获取 AI 对话历史

```
GET /api/ai/history/:documentId
```

**需要认证**

**响应:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "document_id": "doc1", "role": "user", "content": "...", "created_at": "..." },
    { "id": 2, "document_id": "doc1", "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

---

## 4. 文档/内容模块 Content

基础路径: `/api/content`

### 4.1 获取公开内容列表

```
GET /api/content/public
```

**[Public]**

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页数量 |
| category | string | | 分类过滤 |

### 4.2 获取会员内容

```
GET /api/content/members
```

**[OptionalAuth]** - 需要会员权限

**查询参数:** 同上

### 4.3 获取 VIP 内容

```
GET /api/content/vip
```

**[OptionalAuth]** - 需要 VIP 权限

### 4.4 获取我的文档

```
GET /api/content/my
```

**需要认证**

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | |
| limit | number | 10 | |
| status | string | | `draft`/`published`/`archived` |

### 4.5 获取内容分类

```
GET /api/content/categories
```

**[Public]**

### 4.6 获取文档详情

```
GET /api/content/:id
```

**[OptionalAuth]** - 根据文档可见性检查权限

### 4.7 创建文档

```
POST /api/content/
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | Y | 标题 |
| content | string | N | 内容 |
| summary | string | N | 摘要 |
| cover_image | string | N | 封面图 |
| status | string | N | 状态: `draft`/`published` |
| visibility | string | N | `public`/`private`/`members_only`/`vip_only` |
| category | string | N | 分类 |
| tags | array | N | 标签 |

### 4.8 更新文档

```
PUT /api/content/:id
```

**需要认证** - 仅作者或协作者可编辑

**请求体:** 同创建，所有字段可选

### 4.9 删除文档

```
DELETE /api/content/:id
```

**需要认证** - 仅作者可删除

### 4.10 添加协作者

```
POST /api/content/:id/collaborators
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | number | Y | 用户ID |
| role | string | Y | `viewer`/`editor`/`admin` |

---

## 5. 协作模块 Collab

基础路径: `/api/collab`

### 5.1 创建文档

```
POST /api/collab/documents
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | Y | 标题 |
| content | string | N | 内容 |
| summary | string | N | 摘要 |

### 5.2 获取文档列表

```
GET /api/collab/documents
```

**需要认证**

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | |
| limit | number | 12 | |
| search | string | | 搜索关键词 |
| status | string | | 状态过滤 |

### 5.3 获取文档详情

```
GET /api/collab/documents/:documentId
```

### 5.4 更新文档

```
PUT /api/collab/documents/:documentId
```

**请求体:**

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 标题 |
| content | string | 内容 |
| summary | string | 摘要 |
| cover_image | string | 封面图 |
| status | string | 状态 |
| tags | array | 标签 |

### 5.5 删除文档

```
DELETE /api/collab/documents/:documentId
```

### 5.6 获取文档版本历史

```
GET /api/collab/documents/:documentId/history
```

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | |
| limit | number | 20 | |

### 5.7 分享文档

```
POST /api/collab/documents/:documentId/share
```

**响应:**

```json
{
  "success": true,
  "data": { "shareUrl": "/shared/doc-id" }
}
```

---

## 6. 模板模块 Templates

基础路径: `/api/templates`

### 6.1 获取模板列表

```
GET /api/templates/
```

**[OptionalAuth]**

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | |
| limit | number | 20 | |
| category | string | | 分类过滤 |
| search | string | | 搜索 |
| isPublic | string | | `true`/`false` |

### 6.2 获取模板分类

```
GET /api/templates/categories
```

### 6.3 获取模板详情

```
GET /api/templates/:id
```

### 6.4 创建模板

```
POST /api/templates/
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 模板名称 |
| description | string | N | 描述 |
| category | string | N | 分类 |
| content | string | Y | 模板内容 (HTML/SVG) |
| preview_image | string | N | 预览图 |
| tags | array | N | 标签 |
| is_public | boolean | N | 是否公开 |

### 6.5 更新模板

```
PUT /api/templates/:id
```

### 6.6 删除模板

```
DELETE /api/templates/:id
```

### 6.7 使用模板 (计数+1)

```
POST /api/templates/:id/use
```

### 6.8 克隆模板

```
POST /api/templates/:id/clone
```

**需要认证**

---

## 7. 素材模块 Materials

基础路径: `/api/materials`

### 7.1 获取素材列表

```
GET /api/materials/
```

**需要认证**

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | |
| limit | number | 30 | |
| type | string | | `image`/`video`/`audio`/`file` |
| folderId | number | | 文件夹ID |
| search | string | | 搜索 |

### 7.2 上传素材

```
POST /api/materials/upload
```

**Content-Type:** `multipart/form-data`

**字段:** `file` + 可选的 `folderId`, `isPublic`

**限制:**
- 最大 100MB
- 允许类型: jpeg/png/gif/webp/svg+xml/mp4/webm/mpeg/wav/pdf

### 7.3 批量上传

```
POST /api/materials/upload-batch
```

**字段:** `files[]` (最多20个文件)

### 7.4 获取素材详情

```
GET /api/materials/:id
```

### 7.5 删除素材

```
DELETE /api/materials/:id
```

### 7.6 批量删除素材

```
DELETE /api/materials/batch
```

**请求体:** `{ "ids": [1, 2, 3] }`

### 7.7 移动素材到文件夹

```
PUT /api/materials/:id/folder
```

**请求体:** `{ "folderId": 5 }`

### 7.8 获取素材用量统计

```
GET /api/materials/stats/usage
```

### 7.9 创建文件夹

```
POST /api/materials/folders
```

**请求体:** `{ "name": "文件夹名", "parentId": 0 }`

### 7.10 获取文件夹列表

```
GET /api/materials/folders/list
```

**查询参数:** `parentId` (可选)

### 7.11 删除文件夹

```
DELETE /api/materials/folders/:id
```

---

## 8. 会员模块 Membership

基础路径: `/api/membership`

### 8.1 获取会员套餐

```
GET /api/membership/plans
```

**[Public]**

**响应:**

```json
{
  "success": true,
  "data": {
    "plans": {
      "basic": { "monthly": 29, "quarterly": 79, "yearly": 199 },
      "pro": { "monthly": 99, "quarterly": 269, "yearly": 799 },
      "enterprise": { "monthly": 299, "quarterly": 799, "yearly": 1999 }
    },
    "currency": "CNY"
  }
}
```

### 8.2 获取会员状态

```
GET /api/membership/status
```

**需要认证**

### 8.3 订阅/下单

```
POST /api/membership/subscribe
```

**需要认证**

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | Y | `basic`/`pro`/`enterprise` |
| period | string | Y | `monthly`/`quarterly`/`yearly` |
| paymentMethod | string | Y | `alipay`/`wechat` |
| discountCode | string | N | 优惠码 |

### 8.4 支付回调验证

```
POST /api/membership/verify-payment
```

**请求体:**

| 字段 | 类型 | 说明 |
|------|------|------|
| orderNo | string | 订单号 |
| transactionId | string | 交易流水号 |
| status | string | `success`/`failed` |

### 8.5 获取订单列表

```
GET /api/membership/orders
```

**需要认证**

**查询参数:** `page`, `limit`, `paymentStatus`

### 8.6 取消自动续费

```
POST /api/membership/cancel
```

### 8.7 使用激活码

```
POST /api/membership/apply-code
```

**请求体:** `{ "code": "ACTIVATION-CODE" }`

### 8.8 获取会员统计 (管理端)

```
GET /api/membership/stats
```

**需要认证** - 仅 admin/superadmin

---

## 9. 团队模块 Team

基础路径: `/api`

**所有接口需要认证**

### 9.1 获取我的团队列表

```
GET /api/teams
```

### 9.2 创建团队

```
POST /api/teams
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 团队名称 |
| description | string | N | 描述 |

### 9.3 获取团队详情

```
GET /api/teams/:id
```

### 9.4 更新团队

```
PUT /api/teams/:id
```

### 9.5 解散团队

```
DELETE /api/teams/:id
```

### 9.6 邀请成员

```
POST /api/teams/:id/invite
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | Y | 被邀请者邮箱 |
| role | string | N | `admin`/`member` |

### 9.7 接受邀请

```
POST /api/invitations/:code/accept
```

**请求体:** `{ "userEmail": "user@example.com" }`

### 9.8 拒绝邀请

```
POST /api/invitations/:code/reject
```

### 9.9 获取我的邀请列表

```
GET /api/invitations
```

### 9.10 更新成员角色

```
PUT /api/teams/:id/members/:memberId
```

**请求体:** `{ "role": "admin" }`

### 9.11 移除成员

```
DELETE /api/teams/:id/members/:memberId
```

---

## 10. 微信公众号模块 WeChat

基础路径: `/api/wechat`

### 10.1 扫码登录微信公众号

```
POST /api/wechat/login
```

**响应:**

```json
{
  "success": true,
  "sessionId": "1700000000000",
  "message": "登录成功"
}
```

> 注意: 此接口使用 Puppeteer 启动无头浏览器模拟扫码登录

### 10.2 退出微信登录

```
POST /api/wechat/logout
```

**请求体:** `{ "sessionId": "..." }`

### 10.3 获取已登录公众号列表

```
GET /api/wechat/accounts
```

### 10.4 检查登录状态

```
GET /api/wechat/check-login?sessionId=xxx
```

---

## 11. 草稿/微信发布模块 Draft

基础路径: `/api/drafts`

### 11.1 上传草稿到微信公众号

```
POST /api/drafts/upload
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | Y | 微信登录会话ID |
| title | string | Y | 文章标题 |
| content | string | Y | 文章内容 (HTML) |
| author | string | N | 作者 |
| digest | string | N | 摘要 |
| coverImage | string | N | 封面 media_id |
| contentSourceUrl | string | N | 原文链接 |
| showCoverPic | number | N | 是否显示封面 (0/1) |
| needOpenComment | number | N | 是否开启评论 (0/1) |
| onlyFansCanComment | number | N | 仅粉丝可评论 (0/1) |

### 11.2 预览/过滤微信 HTML

```
POST /api/drafts/preview
```

**请求体:** `{ "content": "<html>..." }`

### 11.3 获取微信草稿列表

```
GET /api/drafts/list?sessionId=xxx&offset=0&count=20
```

---

## 12. UEditor 上传模块

基础路径: `/api/ueditor`

### 12.1 获取 UEditor 配置

```
GET /api/ueditor?action=config
```

### 12.2 上传图片

```
POST /api/ueditor/uploadimage
```

**字段:** `upfile`  
**限制:** 最大 4MB, png/jpg/jpeg/gif/webp

### 12.3 上传视频

```
POST /api/ueditor/uploadvideo
```

**字段:** `upfile`  
**限制:** 最大 100MB, mp4/webm/ogg

### 12.4 上传文件

```
POST /api/ueditor/uploadfile
```

### 12.5 通用上传

```
POST /api/ueditor/upload
```

---

## 13. 管理后台模块 Admin

基础路径: `/api/admin`

**所有接口需要 admin 或 superadmin 角色**

### 13.1 系统概览

```
GET /api/admin/dashboard
```

### 13.2 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/users | 用户列表 (page/limit/search/role/status) |
| GET | /api/admin/users/:id | 用户详情 |
| PUT | /api/admin/users/:id | 更新用户信息 |
| POST | /api/admin/users/:id/ban | 封禁用户 |
| POST | /api/admin/users/:id/unban | 解封用户 |

### 13.3 文档管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/documents | 文档列表 |
| DELETE | /api/admin/documents/:id | 删除文档 |

### 13.4 订单管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/orders | 订单列表 |
| POST | /api/admin/orders/:id/refund | 退款 |

### 13.5 系统设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/settings | 获取所有设置 |
| PUT | /api/admin/settings | 批量更新设置 |

---

## 14. AI 配置管理 AI Config

基础路径: `/api/admin/ai-configs`

### 14.1 获取当前活跃配置 (普通用户可用)

```
GET /api/admin/ai-configs/active
```

**需要认证**

### 14.2 获取所有配置列表

```
GET /api/admin/ai-configs/
```

**需要 admin/superadmin**

### 14.3 获取配置详情

```
GET /api/admin/ai-configs/:id
```

### 14.4 创建配置

```
POST /api/admin/ai-configs/
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 配置名称 |
| provider | string | Y | 供应商 (openai/qwen/zhipu等) |
| api_key | string | Y | API密钥 |
| base_url | string | Y | API地址 |
| model | string | Y | 模型名称 |
| temperature | number | N | 温度 (默认0.7) |
| max_tokens | number | N | 最大token (默认4096) |
| top_p | number | N | Top-P (默认0.95) |
| extra_params | object | N | 额外参数 |

### 14.5 更新配置

```
PUT /api/admin/ai-configs/:id
```

### 14.6 激活配置

```
POST /api/admin/ai-configs/:id/activate
```

### 14.7 删除配置

```
DELETE /api/admin/ai-configs/:id
```

> 不可删除当前活跃配置

---

## 15. 多公众号管理 Wechat Accounts

基础路径: `/api/wechat-accounts`

**所有接口需要认证**

### 15.1 获取公众号列表

```
GET /api/wechat-accounts
```

### 15.2 添加公众号

```
POST /api/wechat-accounts
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| app_id | string | Y | 微信 AppID |
| app_secret | string | Y | 微信 AppSecret |
| name | string | Y | 公众号名称 |

### 15.3 更新公众号

```
PUT /api/wechat-accounts/:id
```

### 15.4 删除公众号

```
DELETE /api/wechat-accounts/:id
```

### 15.5 验证公众号

```
POST /api/wechat-accounts/:id/verify
```

---

## 16. 定时发布 Scheduled Posts

基础路径: `/api/scheduled-posts`

**所有接口需要认证**

### 16.1 获取定时任务列表

```
GET /api/scheduled-posts
```

### 16.2 创建定时任务

```
POST /api/scheduled-posts
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| document_id | string | Y | 文档 ID |
| account_id | number | Y | 公众号 ID |
| title | string | Y | 任务标题 |
| scheduled_at | string | Y | 计划发布时间 (ISO 8601) |

### 16.3 更新定时任务

```
PUT /api/scheduled-posts/:id
```

### 16.4 取消定时任务

```
DELETE /api/scheduled-posts/:id
```

### 16.5 立即执行

```
POST /api/scheduled-posts/:id/execute
```

---

## 17. 评论批注 Comments

基础路径: `/api/comments`

### 17.1 获取文档评论（树形）

```
GET /api/comments/document/:docId
```

### 17.2 创建评论

```
POST /api/comments
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| document_id | string | Y | 文档 ID |
| content | string | Y | 评论内容 |
| parent_id | number | N | 父评论 ID（回复时） |

### 17.3 更新评论

```
PUT /api/comments/:id
```

### 17.4 删除评论

```
DELETE /api/comments/:id
```

---

## 18. 图文合集 Article Batches

基础路径: `/api/article-batches`

**所有接口需要认证**

### 18.1 获取合集列表

```
GET /api/article-batches
```

### 18.2 创建合集

```
POST /api/article-batches
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | Y | 合集标题 |
| account_id | number | N | 关联公众号 |

### 18.3 获取合集详情

```
GET /api/article-batches/:id
```

### 18.4 更新合集

```
PUT /api/article-batches/:id
```

### 18.5 删除合集

```
DELETE /api/article-batches/:id
```

---

## 19. AI Agent

基础路径: `/api/ai-agent`

**所有接口需要认证**

### 19.1 获取提示词模板列表

```
GET /api/ai-agent/prompts
```

**响应:**

```json
{
  "success": true,
  "data": [
    { "id": "polish", "label": "文章润色", "prompt": "...", "needsContent": true },
    { "id": "title", "label": "标题生成", "prompt": "...", "needsContent": true }
  ]
}
```

---

## 待开发接口

以下接口为路线图中规划的功能，当前尚未实现。

### 支付集成

```
POST /api/payment/alipay/create    # 创建支付宝订单
POST /api/payment/alipay/notify    # 支付宝异步通知
POST /api/payment/wechat/create    # 创建微信支付订单
POST /api/payment/wechat/notify    # 微信支付异步通知
GET  /api/payment/status/:orderNo  # 查询支付状态
```

### 数据分析

```
GET /api/analytics/overview        # 总览数据
GET /api/analytics/articles        # 文章分析
GET /api/analytics/users           # 用户分析
GET /api/analytics/revenue         # 收入分析
POST /api/analytics/events         # 上报事件
```

### API 开放平台

```
POST   /api/open/tokens            # 创建 API Token
GET    /api/open/tokens            # Token 列表
DELETE /api/open/tokens/:id        # 删除 Token
GET    /api/open/documents         # 开放API: 文档列表
POST   /api/open/documents         # 开放API: 创建文档
POST   /api/open/publish/:id       # 开放API: 发布文档
```

---

## 20. 数据模型参考

### 21张数据库表

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| users | 用户表 | id, username, email, password, role, status, settings |
| roles | 角色表 | id, name, permissions (JSON) |
| permissions | 权限表 | id, resource, action |
| user_roles | 用户角色关联 | user_id, role_id |
| documents | 文档表 | id(64), title, content, status, visibility, wechat_media_id |
| document_versions | 文档版本 | id, document_id, version, content, changed_by |
| collaborators | 协作者 | id, document_id, user_id, role |
| ai_chats | AI对话记录 | id, document_id, user_id, role, content |
| templates | 模板表 | id, name, category, content, is_public, use_count |
| materials | 素材表 | id, filename, file_type, file_path, url, uploader_id |
| material_folders | 素材文件夹 | id, name, parent_id, user_id |
| article_groups | 图文消息组 | id, title, article_count, wechat_media_id |
| group_articles | 组内文章 | id, group_id, document_id, sort_order |
| teams | 团队 | id(64), name, owner_id |
| team_members | 团队成员 | id, team_id, user_id, role |
| team_invitations | 团队邀请 | id, team_id, email, status |
| orders | 订单表 | id(64), user_id, membership_type, amount, payment_status |
| activation_codes | 激活码 | id, code, membership_type, days, status |
| ai_configs | AI配置 | id, name, provider, api_key, model, is_active |
| system_settings | 系统设置 | id, key, value, group |
| analytics_events | 分析事件 | id, user_id, event_name, properties (JSON) |

### 会员等级与限额

| 等级 | 文档数 | 存储空间 | 协作者 | API调用/天 | 月价 | 季价 | 年价 |
|------|--------|----------|--------|------------|------|------|------|
| Free | 3 | 100MB | 2 | 100 | - | - | - |
| Basic | 50 | 1GB | 10 | 1,000 | ¥29 | ¥79 | ¥199 |
| Pro | 200 | 5GB | 50 | 10,000 | ¥99 | ¥269 | ¥799 |
| Enterprise | 无限 | 无限 | 无限 | 无限 | ¥299 | ¥799 | ¥1,999 |
