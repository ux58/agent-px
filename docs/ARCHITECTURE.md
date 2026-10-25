# 架构归档 · ARCHITECTURE

> 本文归档 Agent 学堂的整体架构、职责边界、数据流与关键设计决策。

## 1. 总体架构

```
┌────────────────────────┐        ┌─────────────────────────────┐
│  浏览器                 │        │  agent-school-server (Rust)  │
│  React 19 SPA          │  HTTP  │  Axum 0.8 + Tokio           │
│                        │──────▶ │                             │
│  · hash 路由（无路由库） │        │  /api/health                │
│  · 进度: localStorage  │◀────── │  /api/progress/{profile}    │
│  · 课程内容编译进 bundle│        │  /  (web/dist 静态托管+SPA  │
└────────────────────────┘        │      fallback)              │
                                  └─────────────────────────────┘
```

**单进程生产形态**：`vite build` 产物由 Rust 后端直接托管（`--dist web/dist`），
前端与 API 同源，天然无跨域问题；开发态由 Vite dev server 承担页面，
`/api` 通过 Vite proxy 转发到后端（见 `web/vite.config.ts`）。

## 2. 前端架构（web/）

| 层 | 文件 | 职责 |
|----|------|------|
| 入口 | `src/main.tsx` | 挂载 React 根节点 |
| 应用 | `src/App.tsx` | hash 路由解析 → 顶栏 + 页面分发 + 页脚 |
| 状态 | `src/hooks.ts` | `useProgress`（localStorage + 服务端同步/合并）、`useTheme`、`useHashRoute` |
| 数据 | `src/types.ts` | 课程数据结构（Stage/Lesson/Block/Exercise）与索引 |
| 内容 | `src/data/stage1~6.ts` | 18 课的纯数据内容（块化结构） |
| 图示 | `src/diagrams.tsx` | 17 个纯 SVG 组件，颜色走 CSS 变量 |
| 交互 | `src/components/Exercise.tsx` | 四种题型组件，即时判分 |
| 模拟器 | `src/components/Simulators.tsx` | 7 个自包含模拟器（定时器驱动的脚本化演出） |
| 页面 | `Home / Course / Sandbox / Glossary / Lab` | 首页、课程页（含侧栏 TOC）、沙盒、术语表、进度 |

### 关键设计决策

1. **课程即数据**：课程内容是强类型的块数组（`Block`），不是 Markdown 字符串。
   优点：类型安全、渲染零解析开销、组件（图示/模拟器/练习）可作为块内联出现。
2. **极简依赖**：不用组件库/路由库/状态库，仅 lucide-react 提供 SVG 图标
   （tree-shaking 按需打包）。hash 路由 + CSS 变量设计系统（v3：中性灰阶 +
   发丝线边框 + 单强调色），包体 396KB（gzip 134KB），构建稳定可维护。
   渲染性能关键点：阅读进度条与「回到顶部」按钮均通过 rAF + ref 直写 DOM，
   滚动零 React 重渲染；课程正文 `LessonBlocks` memo 化，翻页/其他课打点不触发重渲染。
3. **进度模型**：`ProgressMap = Record<lessonKey, {page?, quiz?, sim?, done?}>`。
   写路径：本地立刻写 → fire-and-forget PUT 到后端；读路径：启动时 GET，
   与本地按 key 合并（并集），后端不可用时静默降级纯本地。
4. **主题适配**：全部颜色经由 CSS 变量（`:root[data-theme=dark|light]`），
   SVG 图示内部同样引用变量，切换主题时图示自动跟随。
5. **练习即组件**：四种题型是独立受控组件，判分逻辑本地完成；
   `onSolved` 回调向上打点进度（quiz 字段）。

## 3. 后端架构（server/）

单二进制，两个职责：

1. **进度同步 API**（文件持久化存储，`--data-dir` 指定目录，默认 `./data`）
   - `GET /api/health` — 健康检查（返回版本号、存储类型与 profile 数）
   - `GET /api/progress/{profile_id}` — 读进度
   - `PUT /api/progress/{profile_id}` — 写进度（body: `{ "data": "<json 字符串>" }`）
   - `DELETE /api/progress/{profile_id}` — 清空
   - 存储说明：每个 profile 一个 JSON 文件（`{data-dir}/{profile_id}.json`），启动时全量
     加载进内存，写入先落盘（临时文件 + rename 原子替换）再更新内存，重启不丢。
     `profile_id` 仅允许 `[A-Za-z0-9_-]`（1~64 位），同时充当文件名白名单。
     `data/` 目录即备份单元：整体拷贝/同步即完成备份。
2. **静态托管 + SPA fallback**（`--dist` 指定时启用）
   - 自实现文件服务：MIME 推断、目录穿越防护、未命中路径 fallback 到 index.html。
   - 生产建议置于 Nginx/负载均衡之后，见 DEPLOYMENT.md。

## 4. 数据流（进度同步）

```
作答/打卡动作
  → useProgress.mark()
  → setState + localStorage.setItem        （即时，离线可用）
  → fetch PUT /api/progress/default        （best-effort，失败静默）
页面加载
  → GET /api/progress/default
  → 成功：remote 与 local 按 key 合并写回   （多端续学）
  → 失败：顶栏同步点变灰，纯本地模式
```

## 5. 目录树

```
server/
├── Cargo.toml           # 依赖：axum/tokio/tower-http/serde/tracing
├── src/main.rs          # 路由、进度存储、静态托管、fallback
└── data/                # 进度 JSON 文件（运行时生成，--data-dir 可改）

web/
├── index.html
├── package.json         # react/react-dom + vite/typescript
├── vite.config.ts       # /api 代理到 127.0.0.1:8787
├── tsconfig.json
└── src/…                # 见第 2 节
```
