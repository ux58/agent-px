# Agent 学堂 · AI Agent 开发系统课

一个面向程序员的 AI Agent 系统化学习站点：**6 个进阶阶段 · 18 节系统课 · 7 个可交互模拟器 · 45 条术语表**，从大模型直觉一路学到企业级落地，每课配即时判分练习，学习进度自动保存并同步到 Rust 后端。

## 功能一览

| 模块 | 说明 |
|------|------|
| 阶段式课程 | 新手村 → 核心机制 → 标准协议 → 系统进阶 → 生产化 → 企业级落地，每课 12~20 分钟 |
| 互动练习 | 单选 / 填空 / 排序 / 连线四种题型，即时判分，答错可重试，按题记录进度 |
| 互动模拟器 | Agent 循环、MCP 握手、Skill 渐进加载、提示词体检、多智能体协作、上下文窗口、模型路由成本，共 7 个 |
| 图文并茂 | 17 张原创 SVG 机制图，全部适配明暗主题 |
| 企业实践板块 | 全站 15+ 处「🏭 企业实践」：生产级配置与代码（网关限流/编排追踪/审计 Schema/CI 门禁）、上线检查清单（可勾选持久化）、企业级记忆/缓存/灰度方案 |
| 进度同步 | localStorage 即时保存 + Rust 后端同步（文件持久化，重启不丢，顶栏绿点指示） |
| 阅读体验 | 顶部阅读进度条、←/→ 键盘翻课、移动端目录抽屉、继续学习引导、返回顶部 |
| 术语表 | 45 条中英术语，支持实时搜索 |

## 课程大纲

1. **阶段 1 新手村**：LLM 工作原理 / 提示词工程 / Agent 是什么
2. **阶段 2 核心机制**：Agent 循环 / 工具调用 / 上下文工程
3. **阶段 3 标准协议**：MCP / Skill / 记忆机制
4. **阶段 4 系统进阶**：多智能体 / RAG / 规划与任务分解
5. **阶段 5 生产化**：评测驱动开发 / 安全与失控防护 / 毕业项目
6. **阶段 6 企业级落地**：平台架构 / 成本与性能工程 / 落地全案

## 快速开始

```bash
# 方式一：一键启动（推荐，需 Rust + Node）
make dev            # 后端 :8787 + 前端 :5173（热更新）

# 方式二：生产模式（后端托管前端构建产物）
make build && make serve   # 打开 http://127.0.0.1:8787

# 方式三：Docker Compose
docker compose up --build
```

> 没装 Rust 也能玩：`cd web && npm run build && npx vite preview`，进度将仅保存在浏览器本地。

## 目录结构

```
agent-px/
├── server/          # Rust + Axum 后端：进度 API + 静态资源托管
│   ├── Cargo.toml
│   └── src/main.rs
├── web/             # React 19 + Vite + TypeScript 前端
│   └── src/
│       ├── data/          # 课程内容（stage1~6.ts + 术语表）
│       ├── components/    # 页面组件 + 练习 + 模拟器
│       ├── diagrams.tsx   # SVG 图示库（17 图）
│       ├── hooks.ts       # 路由 / 进度 / 主题
│       └── types.ts       # 课程数据结构定义
├── docs/            # 归档文档：架构 / 开发 / 部署
├── Makefile         # 常用命令入口
├── Dockerfile       # 多阶段构建（Node 构建 + Rust 运行时）
└── compose.yaml     # 一键容器化部署
```

## 归档文档

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 技术架构、前后端职责、数据流、关键设计决策
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) —— 环境准备、日常开发、如何新增课程/图示/模拟器/练习
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) —— 本地 / Docker / 云端部署，Nginx 反代与 HTTPS 参考

## 技术栈

- **前端**：React 19 · Vite 7 · TypeScript 5.8 · lucide-react 图标 · 原生 CSS 设计系统（暗/亮主题）
- **后端**：Rust · Axum 0.8 · Tokio · tower-http（CORS / 静态托管 / 追踪）
