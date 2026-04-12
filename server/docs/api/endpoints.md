# WXEditor — API 端点文档

> 本文档列出后端全部 API 端点、请求/响应格式及认证要求。

## 认证方式

- 统一使用 **JWT**（Bearer Token）认证
- 请求头：`Authorization: Bearer <token>`
- Token 过期时返回 `401 Unauthorized`

## 统一响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": "操作说明"
}
```

## 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 参数校验失败 |
| 401 | 未认证或 Token 无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如邮箱已注册） |
| 500 | 服务器内部错误 |

---

## 用户认证 `/api/auth`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 否 | 用户注册 |
| POST | `/api/auth/login` | 否 | 用户登录 |
| POST | `/api/auth/refresh` | 否 | 刷新 Token |
| GET | `/api/auth/me` | 是 | 获取当前用户信息 |
| PUT | `/api/auth/profile` | 是 | 更新个人资料 |
| POST | `/api/auth/forgot-password` | 否 | 找回密码 |
| POST | `/api/auth/reset-password` | 否 | 重置密码 |

### 注册
```
POST /api/auth/register
Body: { "username": "user1", "email": "user@example.com", "password": "P@ssw0rd!" }
Response 201: { "success": true, "data": { "id": 1, "username": "user1", "email": "..." } }
```

### 登录
```
POST /api/auth/login
Body: { "email": "user@example.com", "password": "P@ssw0rd!" }
Response 200: { "success": true, "data": { "accessToken": "...", "refreshToken": "...", "user": {...} } }
```

### Token 刷新
```
POST /api/auth/refresh
Body: { "refreshToken": "..." }
Response 200: { "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }
```

---

## AI 功能 `/api/ai`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/ai/chat` | 否* | AI 对话 |
| POST | `/api/ai/rewrite` | 否* | 文章改写/润色 |
| GET | `/api/ai/history/:documentId` | 否* | 获取聊天历史 |

### AI 对话
```
POST /api/ai/chat
Body: {
  "message": "帮我写一段开头",
  "documentId": "doc_123",
  "context": "<p>文章内容...</p>",
  "history": [{ "role": "user", "content": "..." }]
}
Response 200: { "success": true, "data": { "reply": "AI 回复内容", "usage": { "total_tokens": 150 } } }
```

### 文章改写
```
POST /api/ai/rewrite
Body: {
  "content": "<p>需要改写的内容</p>",
  "action": "polish|simplify|expand|title|summary",
  "customPrompt": "自定义提示词（可选）"
}
Response 200: { "success": true, "data": { "result": "改写后内容", "action": "polish" } }
```

---

## UEditor 接口 `/api/ueditor`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/ueditor?action=config` | 否 | 获取编辑器配置 |
| POST | `/api/ueditor?action=uploadimage` | 否 | 上传图片 |
| POST | `/api/ueditor?action=uploadvideo` | 否 | 上传视频 |
| POST | `/api/ueditor?action=uploadfile` | 否 | 上传文件 |

---

## 协作文档 `/api/collab`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/collab/documents` | 否* | 创建协作文档 |
| GET | `/api/collab/documents` | 否* | 获取文档列表 |
| GET | `/api/collab/documents/:id` | 否* | 获取文档详情 |
| PUT | `/api/collab/documents/:id` | 否* | 更新文档 |
| DELETE | `/api/collab/documents/:id` | 否* | 删除文档 |
| GET | `/api/collab/documents/:id/stats` | 否* | 获取协作统计 |
| GET | `/api/collab/documents/:id/history` | 否* | 获取版本历史 |
| POST | `/api/collab/documents/:id/share` | 否* | 生成分享链接 |

---

## 微信内容 `/api/wechat-content`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/wechat-content/convert` | 否* | HTML 转微信格式 |
| POST | `/api/wechat-content/copy` | 否* | 复制到公众号 |

---

## 模板管理 `/api/templates`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/templates` | 是 | 获取模板列表 |
| POST | `/api/templates` | 是 | 创建模板 |
| GET | `/api/templates/:id` | 是 | 获取模板详情 |
| PUT | `/api/templates/:id` | 是 | 更新模板 |
| DELETE | `/api/templates/:id` | 是 | 删除模板 |

---

## 素材管理 `/api/materials`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/materials` | 是 | 获取素材列表 |
| POST | `/api/materials/upload` | 是 | 上传素材 |
| DELETE | `/api/materials/:id` | 是 | 删除素材 |
| GET | `/api/materials/folders` | 是 | 获取文件夹列表 |
| POST | `/api/materials/folders` | 是 | 创建文件夹 |

---

## 团队管理 `/api/teams`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/teams` | 是 | 创建团队 |
| GET | `/api/teams` | 是 | 获取团队列表 |
| GET | `/api/teams/:id` | 是 | 获取团队详情 |
| PUT | `/api/teams/:id` | 是 | 更新团队信息 |
| DELETE | `/api/teams/:id` | 是 | 解散团队 |
| GET | `/api/teams/:id/members` | 是 | 获取成员列表 |
| POST | `/api/teams/:id/invite` | 是 | 邀请成员 |
| POST | `/api/teams/:id/accept` | 是 | 接受邀请 |
| PUT | `/api/teams/:id/members/:memberId` | 是 | 更新成员权限 |
| DELETE | `/api/teams/:id/members/:memberId` | 是 | 移除成员 |

---

## 会员管理 `/api/membership`

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/membership/plans` | 否 | 获取套餐列表 |
| GET | `/api/membership/current` | 是 | 获取当前订阅 |
| POST | `/api/membership/subscribe` | 是 | 创建订阅 |
| POST | `/api/membership/checkout` | 是 | 发起结算 |
| POST | `/api/membership/upgrade` | 是 | 升级套餐 |
| DELETE | `/api/membership/cancel` | 是 | 取消订阅 |

---

> **标注说明**：`否*` 表示当前代码中未强制认证中间件，但生产环境建议添加。
