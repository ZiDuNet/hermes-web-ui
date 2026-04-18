# Hermes Web UI - 功能迁移进度

> 本文件记录从源项目迁移功能到 hermes-web-ui 的进度，以及所有开发注意事项、架构决策和关键逻辑。

---

## 三个项目说明

| 项目 | 路径 | 说明 | 技术栈 |
|------|------|------|--------|
| **hermes-agent** | `C:\Users\Administrator\Desktop\hermesweb\hermes-agent` | Hermes Agent 核心项目，包含 CLI、Gateway、Python Web 面板。自带 React 前端管理 Config/Keys。 | Python + FastAPI + React |
| **hermes-webui** | `C:\Users\Administrator\Desktop\hermesweb\hermes-webui` | 旧版 Web UI（第一代），基于 Vanilla JS + Python Flask。提供聊天、工作区、文件管理等基础功能。 | Python Flask + Vanilla JS |
| **hermes-web-ui** | `C:\Users\Administrator\Desktop\hermesweb\hermes-web-ui` | **本项目** — 新版 Web UI，基于 Vue 3 + TypeScript + Koa。合并前两个项目的功能。 | Vue 3 + Naive UI + Pinia + Koa |

---

## 已迁移功能

### 从 hermes-webui（旧版 Web UI）迁移

| 功能 | 状态 | 对应文件 | 备注 |
|------|------|----------|------|
| 聊天界面 + SSE 流式 | ✅ 完成 | `chat.ts`, `ChatPanel.vue`, `ChatInput.vue`, `MessageList.vue` | 支持文本/工具调用/思考事件 |
| 会话管理（创建/删除/重命名） | ✅ 完成 | `sessions.ts`, `ChatPanel.vue` | 侧边栏会话列表 |
| 工作区管理 | ✅ 完成 | `workspaces.ts`, `WorkspacePanel.vue` | 添加/切换/浏览/上传 |
| Workspace 传递到 Agent | ✅ 完成 | `stores/hermes/chat.ts` 前端注入 | 通过 instructions + input 前缀注入，不修改 proxy |
| 文件浏览器 | ✅ 完成 | `WorkspacePanel.vue` 内嵌 | 目录浏览、文件下载、上传 |
| 模型选择器 | ✅ 完成 | `ModelSelector.vue` | 顶部下拉选择 |
| 设置页面 | ✅ 完成 | `SettingsView.vue` | 显示/Agent/记忆/隐私/API Server |

### 从 hermes-agent（Agent 内置面板）迁移

| 功能 | 状态 | 对应文件 | 备注 |
|------|------|----------|------|
| Config 管理（config.yaml） | ✅ 完成 | `hermes-config.ts`(后端), `ConfigPanel.vue` + `AutoField.vue`(前端) | 180 字段、15 分类、搜索、YAML 模式 |
| Keys 管理（.env） | ✅ 完成 | `env.ts`(后端), `KeysPanel.vue` + `EnvVarRow.vue`(前端) | 116 环境变量、脱敏、揭示、速率限制 |
| Config Schema 提取 | ✅ 完成 | `shared/hermes-defaults.ts`, `hermes-schema-meta.ts`, `hermes-env-vars.ts` | 从 Python 源码内联为 TS 文件（不依赖外部 API） |
| MCP Servers 管理 | ✅ 完成 | `mcp-servers.ts`(后端), `McpServersPanel.vue` + `McpServerCard.vue` + `McpServerFormModal.vue`(前端) | Level 1 纯配置管理，支持 stdio/http 类型 |

### hermes-web-ui 自有功能

| 功能 | 状态 | 对应文件 |
|------|------|----------|
| 定时任务（Jobs） | ✅ 已有 | `JobsView.vue`, `jobs.ts` |
| 模型提供商管理 | ✅ 已有 | `ModelsView.vue`, `models.ts` |
| Profile 管理 | ✅ 已有 | `ProfilesView.vue`, `profiles.ts` |
| Gateway 管理 | ✅ 已有 | `GatewaysView.vue`, `gateways.ts` |
| 技能管理（Skills） | ✅ 已有 | `SkillsView.vue`, `skills.ts` |
| 记忆管理（Memory） | ✅ 已有 | `MemoryView.vue` |
| 日志查看（Logs） | ✅ 已有 | `LogsView.vue`, `logs.ts` |
| 使用统计（Usage） | ✅ 已有 | `UsageView.vue`, `usage.ts` |
| 渠道管理（Channels） | ✅ 已有 | `ChannelsView.vue` |
| 终端（Terminal） | ✅ 已有 | `TerminalView.vue`, `terminal.ts` |
| i18n 中英文 | ✅ 已有 | `en.ts`, `zh.ts` |

---

## 待完善 / 已知差异

### Config 页面 vs hermes-agent ConfigPage.tsx

| 差异 | 优先级 | 源项目行为 | 当前行为 | 状态 |
|------|--------|-----------|---------|------|
| Export Config | — | 下载 `hermes-config.json` | ✅ Export 按钮下载 JSON | ✅ |
| Import Config | — | 上传 JSON 替换整个 config | ✅ Import 按钮上传 JSON | ✅ |
| Reset Defaults | 中 | `structuredClone(defaults)` 替换全部字段 | ✅ 全量替换 defaults | ✅ |
| 搜索范围 | 中 | key + label + category + description | ✅ key + description + category | ✅ |
| textarea 字段 | 低 | 支持多行文本 | ✅ 启发式检测 multiline | ✅ |
| object 字段 | 低 | 支持嵌套对象 | ✅ 嵌套对象展开为子 key | ✅ |
| Model 归一化 | 低 | `model.default` 读取 | ✅ `model.default` 优先 | ✅ |
| Dirty 追踪 | ✅ 目标更好 | 无 dirty 追踪 | 有 dirty 追踪 | — |
| 配置备份 | ✅ 都有 | 保存前 `.bak` | 同 | — |

### Keys 页面 vs hermes-agent EnvPage.tsx

| 差异 | 优先级 | 源项目行为 | 当前行为 | 状态 |
|------|--------|-----------|---------|------|
| Provider 分组 | 中 | 硬编码 PROVIDER_GROUPS 18 组 | ✅ 硬编码 + 优先级排序 | ✅ |
| Advanced 默认 | 低 | 默认显示所有 | ✅ `ref(true)` | ✅ |
| 值脱敏格式 | 低 | `...` 分隔 | ✅ 使用 `...` | ✅ |
| Reveal toggle | 低 | 显示/隐藏切换 | ✅ toggle 行为 | ✅ |
| 未设置变量 | 中 | 分离显示 + 折叠 | ✅ 分离 + 折叠 | ✅ |
| 操作反馈 | 低 | 含 key 名 | ✅ 含 key 名 | ✅ |
| Delete 404 | 低 | key 不存在返回 404 | ✅ 返回 404 | ✅ |
| 搜索 | ✅ 目标更好 | 无 | 已实现 | — |

### Workspace 功能 vs hermes-webui

| 差异 | 优先级 | 源项目行为 | 当前行为 | 状态 |
|------|--------|-----------|---------|------|
| 文件删除 | 中 | delete 按钮和端点 | ✅ 后端 + 前端 delete | ✅ |
| 文件重命名 | 低 | rename 端点 | ✅ 后端 + 前端 rename | ✅ |
| 拖拽上传 | 低 | 拖拽到聊天区域 | ✅ 拖拽到文件列表区域 | ✅ |
| Git 状态显示 | 低 | 分支名、修改数 | ✅ 后端 git + 前端状态栏 | ✅ |
| 目录浏览器 | ✅ 目标更好 | 无 | ✅ DirectoryBrowser.vue | ✅ |
| Workspace 注入 | ⚠️ 细微差异 | 进程内 `persist_user_message` | Gateway API，LLM 一致，持久化消息带前缀 | — |

---

## 架构决策 & 开发注意事项

### 0. 技术选型反思：Python 后端可能更合适

hermes-agent 和 hermes-webui 都是 Python 项目。本项目用 Node.js/Koa 做后端，导致所有摩擦点都来自语言不统一：

| 问题 | Python 后端 | Node.js 后端（当前） |
|------|-----------|-------------|
| Config/Keys 元数据 | `from config import DEFAULT_CONFIG` 直接用 | 手动提取 Python 常量成 TS 文件 |
| Workspace 注入 | `agent.run_conversation(persist_user_message=...)` 完整支持 | 只能用 Gateway 有限的 API 参数 |
| system_prompt | `system_message` 持久化到 session | `ephemeral_system_prompt` 不持久化 |
| hermes-agent 更新 | import 自动拿到最新 | 每次都要重新提取 TS 文件 |
| 架构 | 一个进程，直接调用函数 | 两个进程，HTTP API 桥接 |

如果后端用 Python（如 FastAPI），前端 Vue 3 不变，就能直接 import hermes-agent 模块，不需要 Gateway 中转，也不需要内联数据。当前方案功能完整但维护成本更高。

---

### 1. Gateway 启动策略：只检测不自动启动

源项目（hermes-webui）启动时**不自动启动 gateway**，只读取 PID 文件和 config.yaml 检测运行状态。用户需手动启动。

本项目保持一致：`initGatewayManager()` 只调用 `detectAllOnStartup()`，不调用 `startAll()`。

> 此前目标项目会自动启动所有未运行的 gateway，导致 banner.txt ENOENT、端口冲突自动改写 config.yaml 等问题。

**相关文件：** `packages/server/src/index.ts` 的 `initGatewayManager()`

---

### 2. Config/Keys 数据来源：Python 源码内联为 TS 文件

Config 和 Keys 页面的所有元数据从 hermes-agent Python 源码中提取，内联为 TypeScript 文件，不依赖任何外部 API 或静态 JSON 文件。

| 数据 | Python 源 | 内联 TS 文件 |
|------|----------|-------------|
| Config defaults | `hermes_cli/config.py` DEFAULT_CONFIG | `shared/hermes-defaults.ts` |
| Config schema 元数据 | `hermes_cli/web_server.py` SCHEMA_OVERRIDES/CATEGORY_MERGE/CATEGORY_ORDER | `shared/hermes-schema-meta.ts` |
| Env vars 定义 | `hermes_cli/config.py` OPTIONAL_ENV_VARS | `shared/hermes-env-vars.ts` |

**原因：**
- 这些数据是 Python 常量，不在 config.yaml 里
- Gateway (`api_server.py` 端口 8642) 没有这些端点
- `web_server.py`（端口 9119）有，但它是独立服务，不一定在跑
- 之前用静态 JSON 文件，但 tsc 不复制 JSON 到 dist/ 导致 ENOENT
- 改为 TS 文件内联后编译正常，不依赖外部服务

**hermes-agent 更新后需要重新提取三个 TS 文件。** 自动化方案：加 `scripts/extract-config.ts` 脚本，读 Python 源文件自动生成 TS 文件，更新后跑 `npx ts-node scripts/extract-config.ts` 即可。

**相关文件：** `packages/server/src/routes/hermes/hermes-config.ts`、`packages/server/src/routes/hermes/env.ts`

---

### 3. Workspace 注入方式：前端注入，proxy 纯透传

Workspace 信息在**前端** `stores/hermes/chat.ts` 中注入，不在 proxy 层修改请求体。

**注入方式：**
- `input`: `[Workspace: /path]\n用户消息` — 带前缀发给 API
- `instructions`: workspace 说明 system prompt — 通过 `ephemeral_system_prompt` 注入
- `inputText`（显示用）: 保持原样，不带前缀 — 用户在 UI 看不到 workspace 标签

**源项目差异：** 源项目是 Python 进程内调用 `agent.run_conversation()`，支持 `persist_user_message` 参数（持久化不带前缀的干净消息）。我们通过 Gateway HTTP API 不支持此参数，持久化消息会带前缀。LLM 看到的内容一致，不影响功能。

**注意：** `proxy-handler.ts` 中已删除 `injectWorkspaceIntoRun()` 函数，proxy 层是纯透传。

**相关文件：** `packages/client/src/stores/hermes/chat.ts`、`packages/server/src/routes/hermes/proxy-handler.ts`

---

### 4. Terminal WebSocket：dev 模式直连后端端口

Terminal WebSocket 在 dev 模式下直连 `${location.hostname}:8648`，不走 Vite 代理。Vite 代理的 WebSocket 转发不稳定，直连更可靠。

Production 模式用 `location.host`（同一端口）。

**相关文件：** `packages/client/src/views/hermes/TerminalView.vue` 的 `buildWsUrl()`

---

### 5. Config/Keys 保存后不自动重启 Gateway

源项目 hermes-agent 的 Web 面板保存 config.yaml 或 .env 后，**不会**自动重启 Gateway。配置变更需用户手动重启。仅 MCP servers 有 5 秒自动热加载，其他配置都不支持。

本项目保持一致：Config 和 Keys 页面保存后只写文件，不自动重启。

> 注意：`config.ts`（旧版 Platform Settings）的 `PUT /api/hermes/config` 在修改 platform 配置时会调用 `restartGateway()`，这是已有行为，保留不变。

---

### 6. hermes-agent 两个服务的区别

hermes-agent 有两个独立的 HTTP 服务：

| 服务 | 文件 | 默认端口 | 用途 |
|------|------|---------|------|
| **Gateway (api_server)** | `gateway/platforms/api_server.py` | 8642 | `/v1/runs`、`/health`、`/v1/models` — AI 对话 API |
| **Web Server (web_server)** | `hermes_cli/web_server.py` | 9119 | `/api/config/*`、`/api/env`、`/api/sessions` — 管理面板 API |

Gateway 由 `hermes gateway start` 启动，Web Server 由 `hermes web` 启动。本项目替代了 Web Server 的角色，但只使用 Gateway 的 API。

---

### 7. Models 页面与 Keys 页面的 API Key 功能重叠

- **Models 页面**：以模型为中心，选模型时配 provider（写入 `.env`、`auth.json`、`config.yaml` 三个位置）
- **Keys 页面**：以环境变量为中心，批量管理所有密钥（只写 `.env`）

---

### 8. 路由注册顺序

自定义 API 端点必须注册在 `hermesRoutes.routes()` 之前。proxy 路由 `proxyRoutes.all('/api/hermes/{*any}')` 匹配所有 `/api/hermes/*`，之后注册的中间件永远不会被执行。

**相关文件：** `packages/server/src/index.ts` 的 `bootstrap()`

---

## 当源项目更新时如何同步

### hermes-agent 更新 Config Schema

1. 检查 `hermes_cli/config.py` 中的 `DEFAULT_CONFIG`、`OPTIONAL_ENV_VARS` 是否变化
2. 检查 `hermes_cli/web_server.py` 中的 `_SCHEMA_OVERRIDES`、`_CATEGORY_MERGE`、`_CATEGORY_ORDER` 是否变化
3. 如果有变化，运行提取脚本：
   ```bash
   cd hermes-web-ui
   npx ts-node scripts/extract-config.ts
   ```
   或手动更新 `packages/server/src/shared/` 下的三个 TS 文件：
   - `hermes-defaults.ts` ← `config.py` DEFAULT_CONFIG
   - `hermes-schema-meta.ts` ← `web_server.py` SCHEMA_OVERRIDES + CATEGORY_MERGE + CATEGORY_ORDER
   - `hermes-env-vars.ts` ← `config.py` OPTIONAL_ENV_VARS

### hermes-agent 更新 Gateway API

1. 检查 `gateway/platforms/api_server.py` 的端点变化
2. 更新 `packages/server/src/routes/hermes/proxy-handler.ts` 的路径重写逻辑
3. 更新 `packages/client/src/api/hermes/chat.ts` 的接口定义

### hermes-webui 更新功能

1. 对比 `hermes-webui/static/js/` 中的 JS 逻辑
2. 检查 `hermes-webui/server.py` 的 API 端点变化
3. 在 hermes-web-ui 对应的 Vue 组件/Store/API 中同步

---

## 关键文件映射

| 源项目文件 | 本项目对应 |
|------------|-----------|
| `hermes-agent/web/src/pages/ConfigPage.tsx` | `components/hermes/config/ConfigPanel.vue` |
| `hermes-agent/web/src/pages/EnvPage.tsx` | `components/hermes/keys/KeysPanel.vue` |
| `hermes-agent/hermes_cli/config.py` (DEFAULT_CONFIG) | `server/src/shared/hermes-defaults.ts` |
| `hermes-agent/hermes_cli/config.py` (OPTIONAL_ENV_VARS) | `server/src/shared/hermes-env-vars.ts` |
| `hermes-agent/hermes_cli/web_server.py` (SCHEMA_OVERRIDES etc.) | `server/src/shared/hermes-schema-meta.ts` |
| `hermes-agent/gateway/platforms/api_server.py` | `server/src/routes/hermes/proxy-handler.ts` |
| `hermes-webui/static/js/app.js` (chat) | `stores/hermes/chat.ts` + `ChatPanel.vue` |
| `hermes-webui/static/js/workspace.js` | `stores/hermes/workspaces.ts` + `WorkspacePanel.vue` |
| `hermes-webui/server.py` (API) | `server/src/routes/hermes/*.ts` |

---

## 文件结构（新增部分）

```
packages/
├── server/src/
│   ├── routes/hermes/
│   │   ├── hermes-config.ts    # Config CRUD API (6 endpoints)
│   │   ├── env.ts              # Env var CRUD API (4 endpoints)
│   │   ├── mcp-servers.ts      # MCP Servers CRUD API (4 endpoints)
│   │   └── proxy-handler.ts    # 纯透传代理，无 workspace 注入
│   └── shared/
│       ├── hermes-defaults.ts    # DEFAULT_CONFIG 内联数据
│       ├── hermes-schema-meta.ts # SCHEMA_OVERRIDES + CATEGORY_MERGE + CATEGORY_ORDER
│       └── hermes-env-vars.ts    # OPTIONAL_ENV_VARS 116 环境变量定义
├── client/src/
│   ├── api/hermes/
│   │   ├── hermes-config.ts    # Config API 函数
│   │   ├── env.ts              # Env API 函数
│   │   └── mcp-servers.ts      # MCP Servers API 函数
│   ├── stores/hermes/
│   │   ├── chat.ts             # 含 workspace 注入逻辑（前端侧）
│   │   ├── hermes-config.ts    # Config Pinia store
│   │   └── keys.ts             # Keys Pinia store
│   ├── shared/
│   │   └── nested.ts           # getNestedValue/setNestedValue
│   ├── components/hermes/
│   │   ├── config/
│   │   │   ├── ConfigPanel.vue # 主面板（分类导航 + 字段列表）
│   │   │   ├── CategoryNav.vue # 分类侧边栏
│   │   │   ├── AutoField.vue   # 自动字段渲染（switch/select/input/number）
│   │   │   └── YamlEditor.vue  # YAML 原始编辑器
│   │   ├── keys/
│   │   │   ├── KeysPanel.vue   # 主面板（分组折叠 + 搜索 + advanced 切换）
│   │   │   └── EnvVarRow.vue   # 单行（显示/编辑/揭示/删除）
│   │   └── mcp/
│   │       ├── McpServersPanel.vue   # 主面板（服务器列表 + 添加按钮）
│   │       ├── McpServerCard.vue     # 单个服务器卡片（展开详情 + 启用开关）
│   │       └── McpServerFormModal.vue # 添加/编辑表单弹窗（stdio/http）
│   └── views/hermes/
│       ├── ConfigView.vue      # Config 页面
│       ├── KeysView.vue        # Keys 页面
│       └── McpServersView.vue  # MCP Servers 页面
```
