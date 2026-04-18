# Hermes Web UI - 功能迁移进度

> 本文件记录从源项目迁移功能到 hermes-web-ui 的进度，供后续开发参考。

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
| Workspace 传递到 Agent | ✅ 完成 | `proxy-handler.ts` injectWorkspaceIntoRun | 通过 instructions + input 前缀注入 |
| 文件浏览器 | ✅ 完成 | `WorkspacePanel.vue` 内嵌 | 目录浏览、文件下载、上传 |
| 模型选择器 | ✅ 完成 | `ModelSelector.vue` | 顶部下拉选择 |
| 设置页面 | ✅ 完成 | `SettingsView.vue` | 显示/Agent/记忆/隐私/API Server |

### 从 hermes-agent（Agent 内置面板）迁移

| 功能 | 状态 | 对应文件 | 备注 |
|------|------|----------|------|
| Config 管理（config.yaml） | ✅ 完成 | `hermes-config.ts`(后端), `ConfigPanel.vue` + `AutoField.vue`(前端) | 180 字段、15 分类、搜索、YAML 模式 |
| Keys 管理（.env） | ✅ 完成 | `env.ts`(后端), `KeysPanel.vue` + `EnvVarRow.vue`(前端) | 116 环境变量、脱敏、揭示、速率限制 |
| Config Schema 提取 | ✅ 完成 | `shared/hermes-schema.json`, `hermes-defaults.json`, `hermes-env-vars.json` | 从 Python 动态 schema 提取为静态 JSON |

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
| 缺少 Export Config | 低 | 下载 `hermes-config.json` 文件（Blob API） | ✅ 已实现：Export 按钮下载 JSON | ✅ |
| 缺少 Import Config | 低 | 上传 JSON 文件替换整个 config（FileReader） | ✅ 已实现：Import 按钮上传 JSON | ✅ |
| Reset Defaults 行为不同 | 中 | `structuredClone(defaults)` 替换全部字段 | ✅ 已修复：全量替换 defaults | ✅ |
| 搜索范围有限 | 中 | 搜索 field key + human label + category + description | ✅ 已修复：搜索 key + description + category | ✅ |
| 缺少 textarea 字段类型 | 低 | 支持多行文本输入 | ✅ 已修复：启发式检测 multiline 字段 | ✅ |
| 缺少 object 字段类型 | 低 | 支持嵌套对象渲染 | ✅ 已实现：嵌套对象展开为子 key 输入框 | ✅ |
| Model 归一化字段名不同 | 低 | 用 `model.default` 读取模型名 | ✅ 已修复：`model.default` 优先 | ✅ |
| Dirty 追踪 | ✅ 目标更好 | 源项目无 dirty 追踪，Save 按钮始终可用 | 有 dirty 追踪，未修改时禁用 Save | — |
| 配置备份 | ✅ 都有 | 两者都在保存前创建 `.bak` 备份 | 同 | — |

### Keys 页面 vs hermes-agent EnvPage.tsx

| 差异 | 优先级 | 源项目行为 | 当前行为 | 状态 |
|------|--------|-----------|---------|------|
| Provider 分组方式不同 | 中 | 硬编码 `PROVIDER_GROUPS`（18 组，有优先级排序） | ✅ 已实现：硬编码 PROVIDER_GROUPS + 优先级排序 | ✅ |
| Advanced 默认状态相反 | 低 | 默认**显示**所有（含 advanced） | ✅ 已修复：`ref(true)` | ✅ |
| 值脱敏格式不同 | 低 | `sk-ant1234...abcd`（用 `...` 分隔） | ✅ 已修复：使用 `...` | ✅ |
| Reveal 无切换隐藏 | 低 | 点击 Reveal 显示，再点隐藏 | ✅ 已修复：toggle 行为 | ✅ |
| 未设置变量显示不同 | 中 | 已设置和未设置变量分离，未设置变量折叠在 "X not configured" 下 | ✅ 已修复：分离显示 + 可折叠 | ✅ |
| 操作反馈不含 key 名 | 低 | `showToast("DEEPSEEK_API_KEY saved")` | ✅ 已修复：含 key 名 | ✅ |
| Delete 不返回 404 | 低 | key 不存在时返回 404 | ✅ 已修复：返回 404 | ✅ |
| 搜索功能 | ✅ 目标更好 | 源项目无搜索功能 | 已实现按 key + description 搜索 | — |
| Advanced 切换 | ✅ 已实现 | 源项目有 show/hide toggle | 已实现 | — |
| 行内编辑 UX | ✅ 一致 | 点击 Edit → 输入框 + Save/Cancel | 同样的模式 | — |
| URL 链接 | ✅ 都有 | 行级 + 组级链接 | 行级 + 组级链接 | — |

### Workspace 功能 vs hermes-webui

| 差异 | 优先级 | 源项目行为 | 当前行为 | 状态 |
|------|--------|-----------|---------|------|
| 缺少文件/文件夹删除 | 中 | 有 delete 按钮和端点 | ✅ 已实现：后端 + 前端 delete | ✅ |
| 缺少文件重命名 | 低 | 有 rename 功能和端点 | ✅ 已实现：后端 + 前端 rename | ✅ |
| 缺少拖拽上传 | 低 | 支持拖拽文件到聊天区域 | ✅ 已实现：拖拽到文件列表区域 | ✅ |
| 缺少 Git 状态显示 | 低 | 显示分支名、修改数、ahead/behind 计数 | ✅ 已实现：后端 git 命令 + 前端状态栏 | ✅ |
| 缺少展开状态持久化 | 低 | `_saveExpandedDirs()` 保存到 localStorage | 不适用（使用面包屑导航而非树形展开） | — |
| 目录浏览器 UI 组件 | 低 | 无此功能 | ✅ 已实现：DirectoryBrowser.vue 模态组件 | ✅ |
| Workspace 消息传递 | ✅ 一致 | 每条消息带 workspace → system prompt + input 前缀 | 同（proxy-handler.ts injectWorkspaceIntoRun） | — |
| 文件浏览/导航 | ✅ 一致 | 目录树、面包屑、点击导航 | 同 | — |
| 文件创建/下载/保存 | ✅ 一致 | 创建文件/文件夹、下载、保存编辑 | 同 | — |

### 行为一致性说明

#### Config/Keys 保存后不自动重启 Gateway

源项目 hermes-agent 的 Web 面板保存 config.yaml 或 .env 后，**不会**自动重启 Gateway 或通知任何进程。配置变更需要用户手动重启才能生效（仅 MCP servers 有 5 秒自动热加载，其他都不支持）。

本项目保持一致：Config 页面和 Keys 页面保存后只写文件，不自动重启 Gateway。
> 注意：`config.ts`（旧版 Platform Settings 页面）的 `PUT /api/hermes/config` 在修改 platform 相关配置时会调用 `restartGateway()`，这是已有行为，保留不变。

#### Models 页面与 Keys 页面的 API Key 功能重叠

Models 页面添加 Provider 时会同时写入 `.env`、`auth.json`、`config.yaml` 三个位置。Keys 页面直接编辑 `.env`。两者都能设置 LLM 提供商的 API key 到 Hermes Agent 的环境变量，但侧重点不同：
- **Models 页面**：以模型为中心，选模型时顺便配 provider（写入 3 个位置）
- **Keys 页面**：以环境变量为中心，批量管理所有密钥（只写 `.env`）

---

## 当源项目更新时如何同步

### hermes-agent 更新 Config Schema

1. 检查 `hermes-agent/hermes_cli/config.py` 中的 `DEFAULT_CONFIG`、`_SCHEMA_OVERRIDES`、`_CATEGORY_ORDER` 是否变化
2. 检查 `hermes-agent/hermes_cli/env.py` 中的 `OPTIONAL_ENV_VARS` 是否变化
3. 如果有变化，重新运行提取脚本：
   ```bash
   cd hermes-web-ui
   python scripts/extract-hermes-schema.py
   ```
   或手动更新 `packages/server/src/shared/` 下的三个 JSON 文件

### hermes-agent 更新 Gateway API

1. 检查 `hermes-agent/gateway/platforms/api_server.py` 的端点变化
2. 更新 `packages/server/src/routes/hermes/proxy-handler.ts` 的路径重写逻辑
3. 更新 `packages/client/src/api/hermes/chat.ts` 的接口定义

### hermes-webui 更新功能

1. 对比 `hermes-webui/static/js/` 中的 JS 逻辑
2. 检查 `hermes-webui/server.py` 的 API 端点变化
3. 在 hermes-web-ui 对应的 Vue 组件/Store/API 中同步

### 关键文件映射

| 源项目文件 | 本项目对应 |
|------------|-----------|
| `hermes-agent/web/src/pages/ConfigPage.tsx` | `components/hermes/config/ConfigPanel.vue` |
| `hermes-agent/web/src/pages/EnvPage.tsx` | `components/hermes/keys/KeysPanel.vue` |
| `hermes-agent/hermes_cli/config.py` (schema) | `server/src/shared/hermes-schema.json` |
| `hermes-agent/hermes_cli/env.py` (OPTIONAL_ENV_VARS) | `server/src/shared/hermes-env-vars.json` |
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
│   │   └── proxy-handler.ts    # 含 workspace 注入逻辑
│   └── shared/
│       ├── hermes-schema.json  # 180 config 字段定义
│       ├── hermes-defaults.json # 默认配置值
│       └── hermes-env-vars.json # 116 环境变量元数据
├── client/src/
│   ├── api/hermes/
│   │   ├── hermes-config.ts    # Config API 函数
│   │   └── env.ts              # Env API 函数
│   ├── stores/hermes/
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
│   │   └── keys/
│   │       ├── KeysPanel.vue   # 主面板（分组折叠 + 搜索 + advanced 切换）
│   │       └── EnvVarRow.vue   # 单行（显示/编辑/揭示/删除）
│   └── views/hermes/
│       ├── ConfigView.vue      # Config 页面
│       └── KeysView.vue        # Keys 页面
```
