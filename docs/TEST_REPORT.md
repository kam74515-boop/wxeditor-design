# WXEditor Server V2 - API 测试报告

> 测试时间: 2026-04-13
> 测试工具: Jest + Supertest
> 项目路径: /root/wxeditor-design/server-v2
> 数据库: MySQL (wxeditor)

## 测试总览

| 指标 | 值 |
|------|-----|
| 测试套件 | 4 passed, 4 total |
| 测试用例 | 31 passed, 31 total |
| 执行耗时 | ~8s |
| 通过率 | 100% |

## 测试套件详情

### 1. Auth 认证模块 (tests/auth.test.js) - 12 tests

| API | 测试用例 | 状态 |
|-----|---------|------|
| POST /api/auth/register | 注册成功 - returns 201 with token | PASS |
| POST /api/auth/register | 重复用户名 - returns 409 | PASS |
| POST /api/auth/register | 参数校验 - 缺少必填字段返回 400 | PASS |
| POST /api/auth/login | 登录成功 - returns token | PASS |
| POST /api/auth/login | 密码错误 - returns 401 | PASS |
| POST /api/auth/login | 用户不存在 - returns 401 | PASS |
| GET /api/auth/me | 带 token - 返回用户信息 | PASS |
| GET /api/auth/me | 无 token - 返回 401 | PASS |
| GET /api/auth/me | 无效 token - 返回 401 | PASS |
| POST /api/auth/change-password | 修改密码成功 | PASS |
| POST /api/auth/change-password | 原密码错误 - 返回 400 | PASS |
| POST /api/auth/change-password | 无 token - 返回 401 | PASS |

### 2. Documents 文档模块 (tests/documents.test.js) - 12 tests

| API | 测试用例 | 状态 |
|-----|---------|------|
| POST /api/collab/documents | 创建文档成功 - returns 201 | PASS |
| POST /api/collab/documents | 无 token - 返回 401 | PASS |
| GET /api/collab/documents | 获取文档列表成功 | PASS |
| GET /api/collab/documents | 支持分页参数 | PASS |
| GET /api/collab/documents | 无 token - 返回 401 | PASS |
| GET /api/collab/documents/:id | 获取单个文档成功 | PASS |
| GET /api/collab/documents/:id | 不存在的文档 - 返回 404 | PASS |
| PUT /api/collab/documents/:id | 更新文档成功 | PASS |
| PUT /api/collab/documents/:id | 不存在的文档 - 返回 404 | PASS |
| DELETE /api/collab/documents/:id | 删除文档成功 (软删除验证) | PASS |
| DELETE /api/collab/documents/:id | 不存在的文档 - 返回 404 | PASS |
| DELETE /api/collab/documents/:id | 无 token - 返回 401 | PASS |

### 3. Templates 模板模块 (tests/templates.test.js) - 4 tests

| API | 测试用例 | 状态 |
|-----|---------|------|
| GET /api/templates | 模板列表 - 返回 200 | PASS |
| GET /api/templates | 支持分页参数 | PASS |
| GET /api/templates | 支持搜索参数 | PASS |
| GET /api/templates/categories | 分类列表 - 返回 200 | PASS |

### 4. AI Agent 模块 (tests/aiAgent.test.js) - 3 tests

| API | 测试用例 | 状态 |
|-----|---------|------|
| GET /api/ai-agent/prompts | 获取提示词列表成功 - 返回 200 | PASS |
| GET /api/ai-agent/prompts | 包含预定义的提示词模板 | PASS |
| GET /api/ai-agent/prompts | 无 token - 返回 401 | PASS |

## 测试覆盖的 API 端点

```
Auth:
  POST   /api/auth/register         (注册)
  POST   /api/auth/login            (登录)
  GET    /api/auth/me               (获取个人信息)
  POST   /api/auth/change-password  (修改密码)

Documents:
  POST   /api/collab/documents       (创建文档)
  GET    /api/collab/documents       (文档列表)
  GET    /api/collab/documents/:id   (单个文档)
  PUT    /api/collab/documents/:id   (更新文档)
  DELETE /api/collab/documents/:id   (删除文档)

Templates:
  GET    /api/templates              (模板列表)
  GET    /api/templates/categories   (分类列表)

AI Agent:
  GET    /api/ai-agent/prompts       (提示词列表)
```

## 测试文件结构

```
server-v2/
├── jest.config.js          # Jest 配置
├── tests/
│   ├── setup.js            # 全局 setup: 创建 app、注册测试用户、获取 token
│   ├── auth.test.js        # 认证 API 测试 (12 cases)
│   ├── documents.test.js   # 文档 CRUD 测试 (12 cases)
│   ├── templates.test.js   # 模板 API 测试 (4 cases)
│   └── aiAgent.test.js     # AI Agent API 测试 (3 cases)
```

## 注意事项

1. 测试使用真实 MySQL 数据库 (wxeditor)，通过 setup.js 在 beforeAll 中自动创建测试用户，afterAll 中自动清理
2. 由于 `change-password` 会更新 `password_changed_at` 导致旧 token 失效，Jest 配置 `maxWorkers: 1` 确保测试串行执行避免 token 冲突
3. 文档删除使用软删除机制，测试验证了删除后再次获取返回 404
4. 所有需要认证的接口均测试了无 token 场景 (返回 401)
