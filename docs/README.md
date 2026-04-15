# WXEditor 文档索引

> 这份索引用于统一 `docs/` 的阅读入口，减少“同一件事在多份文档里重复说”的情况。
>
> 更新日期：2026-04-15

## 1. 推荐阅读顺序

### 产品与业务

1. `PRD.md`：产品定位、核心功能与范围
2. `pages.md`：页面信息架构与交互流
3. `COMMERCIAL.md` / `GTM.md`：商业化与增长规划

### 开发与架构

1. `PROJECT_STRUCTURE.md`：仓库结构与关键链路总览
2. `TECH_STACK.md`：技术栈与运行环境
3. `FRONTEND_ARCHITECTURE.md` / `BACKEND_ARCHITECTURE.md`：前后端实现细节
4. `DATABASE.md`：数据模型与迁移
5. `API_CONTRACT.md`：接口契约
6. `DEPLOYMENT.md`：本地开发与部署方式

### AI 相关

1. `AI_INTEGRATION.md`：当前已经落地的 AI 主链路
2. `AI_AGENT_ARCHITECTURE.md`：AI 的务实演进路线

### 历史记录

1. `CHANGELOG.md`：版本变更记录
2. `TEST_REPORT.md`：阶段性测试快照
3. `plans/`：阶段性实施计划

## 2. 文档分组

| 分组 | 文档 | 用途 |
|------|------|------|
| 产品 | `PRD.md` | 明确产品目标、范围与功能边界 |
| 产品 | `pages.md` | 补充页面层面的结构与交互 |
| 产品 | `navigation-system.md` | 导航组件与导航行为约定 |
| 架构 | `PROJECT_STRUCTURE.md` | 从仓库层面理解系统组成 |
| 架构 | `TECH_STACK.md` | 查看依赖、版本与运行环境 |
| 架构 | `FRONTEND_ARCHITECTURE.md` | 前端模块、路由、Store 与构建说明 |
| 架构 | `BACKEND_ARCHITECTURE.md` | 后端分层、路由、服务与调度说明 |
| 架构 | `DATABASE.md` | 数据库、迁移与核心表结构 |
| 架构 | `API_CONTRACT.md` | REST API 契约与数据模型 |
| 架构 | `DEPLOYMENT.md` | 环境变量、启动、部署与运维建议 |
| AI | `AI_INTEGRATION.md` | 当前 AI 功能如何接入和运行 |
| AI | `AI_AGENT_ARCHITECTURE.md` | AI 后续能力的分阶段路线 |
| 业务 | `COMMERCIAL.md` | 定价、收入与转化模型 |
| 业务 | `GTM.md` | 获客、推广与增长方案 |
| 历史 | `CHANGELOG.md` | 版本演进记录 |
| 历史 | `TEST_REPORT.md` | 测试结果快照，不代表实时状态 |
| 历史 | `plans/` | 阶段性落地计划与任务拆分 |

## 3. 本次整理结果

- 删除了重复且偏愿景化的 `AI智能体优化方案.md`
- AI 文档现在只保留两层：
  - `AI_INTEGRATION.md`：讲当前实现
  - `AI_AGENT_ARCHITECTURE.md`：讲下一步怎么演进
- 根目录 `README.md` 不再重复列出全部文档，统一由本文件做总入口

## 4. 维护约定

1. 新增文档前，先判断现有文档是否可以扩充，避免再造一份平行文档。
2. AI 相关内容只放在两类文档里：
   - 当前实现放 `AI_INTEGRATION.md`
   - 路线与取舍放 `AI_AGENT_ARCHITECTURE.md`
3. `TEST_REPORT.md` 只保留阶段性测试快照；实时状态应以实际测试命令结果为准。
4. `plans/` 只放阶段性计划，不写长期架构说明。
