# 开发指南 · DEVELOPMENT

> 环境准备、日常命令、以及「如何新增课程 / 图示 / 模拟器 / 练习 / 术语」的完整路径。

## 1. 环境准备

| 依赖 | 版本 | 安装 |
|------|------|------|
| Rust | ≥ 1.85 | `brew install rust` 或 [rustup](https://rustup.rs) |
| Node.js | ≥ 20 | `brew install node` 或 nvm |
| （可选）Docker | — | Docker Desktop / colima |

验证：`cargo --version && node --version`。

## 2. 日常开发

```bash
# 终端 1：后端（API :8787）
cd server && cargo run -- --port 8787

# 终端 2：前端（Vite :5173，/api 自动代理到 8787）
cd web && npm install && npm run dev
# 打开 http://127.0.0.1:5173
```

或使用 Makefile 一键并行启动：`make dev`。

常用命令：

```bash
make dev         # 并行启动前后端（开发）
make build       # 前端 tsc+vite 构建 + 后端 cargo release 构建
make serve       # 以生产模式启动（后端托管 web/dist，:8787）
make check       # 前端类型检查 + 后端 cargo check
make clean       # 清理构建产物
```

注意事项：

- Vite dev server 的进度同步走代理，与生产行为一致。
- `tsc -b` 开启 `noUnusedLocals/Parameters`，未使用变量会构建失败。
- 进度数据双份：浏览器 localStorage（key: `agentpx.progress.v1`）+
  服务端文件（后端启动目录下 `data/`，`--data-dir` 可改）。
  开发调试可在 DevTools Application 面板清除，或删 `data/` 下的 JSON 文件。

## 3. 如何新增一节课

课程是纯数据，改 `web/src/data/` 即可：

1. 打开对应阶段文件（如 `stage2.ts`），在 `lessons` 数组追加：

```ts
{
  key: "my-new-lesson",            // 全站唯一，路由为 #/course/my-new-lesson
  title: "新课标题",
  minutes: 15,
  blocks: [
    { type: "p", text: "段落…" },
    { type: "h3", text: "小节标题" },
    { type: "ul", items: ["要点一", "要点二"] },
    { type: "quote", text: "金句/提醒" },
    { type: "code", lang: "typescript", code: "const x = 1;" },
    { type: "table", head: ["列A", "列B"], rows: [["a1", "b1"]] },
    { type: "svg", name: "loop", caption: "配图说明" },   // 见 diagrams.tsx 注册表
    { type: "sim", name: "loop" },                        // 见 Simulators.tsx 注册表
    { type: "exercise", ex: { kind: "quiz", q: "题干",
      options: ["A", "B", "C", "D"], answer: 1, explain: "解析" } },
    { type: "work", title: "🏭 企业实践板块标题",          // 生产级方案/代码/清单
      text: "引言（可选）",
      list: ["要点一", "要点二"],                          // 可选
      code: "const cfg = load();", lang: "yaml" },         // 可选
    { type: "checklist", title: "上线检查清单",            // 可勾选、本地持久化
      items: ["SSO 接入完成", "限流配额生效"] },
  ],
}
```

2. 无需注册路由 —— `types.ts` 的 `ALL_LESSONS` 会自动收录，TOC/进度/翻页自动生效。

## 4. 如何新增 SVG 图示

在 `web/src/diagrams.tsx` 里：

1. 写一个返回 `<svg viewBox=… className="diagram">` 的组件；
2. 颜色一律用 CSS 变量（`var(--box)`、`var(--acc)`、`var(--fg)`…），保证明暗主题自动适配；
3. 在底部 `Diagrams` 注册表加一行 `mychart: MyChart`；
4. 课程里用 `{ type: "svg", name: "mychart" }` 引用。

## 4.5 图标规范（lucide-react）

全站 UI 图标统一使用 [lucide-react](https://lucide.dev)（已装依赖），**不要用 emoji**：

```tsx
import { Clock, Play } from "lucide-react";

<span><Clock size={13} /> 约 12 分钟</span>   // size 按场景 12~19
```

- 带图标的文字容器交给 CSS 的 `inline-flex + gap` 对齐（样式已全局处理）；
- 新图标直接从 lucide 命名导入，构建时 tree-shaking 只打包用到的；

## 5. 如何新增练习题

直接在课程 blocks 里加 `{ type: "exercise", ex: … }`，四种题型模板
（见 `components/Exercise.tsx`）：

```ts
{ kind: "quiz",  q, options: string[], answer: number, explain? }
{ kind: "blank", q, answers: string[] }        // 多个等价答案任一命中即对（忽略大小写/空格）
{ kind: "order", q, steps: string[] }          // 正确顺序，学生上下移调序
{ kind: "match", q, pairs: { left, right }[] } // 左右连线
```

进度按题记录：`ProgressMap[lessonKey].ex` 是已通过题号数组（`markEx` 打点），
课程页头部显示「练习 n/m」，实验室页按题统计。旧字段 `quiz: true`（整课通过）仍被兼容读取。
单选/排序/连线答错后可点「再试一次」重做，重试不打点、只改本地组件状态。

## 6. 如何新增模拟器

在 `web/src/components/Simulators.tsx`：

1. 写组件，用 `SimulatorFrame` 包外壳；脚本化演出用 `timers.current` 收集
   `setTimeout`，并在 unmount 时清理（参照 `MultiAgentSim`）；
2. 在 `Course.tsx` 的 `SIM_COMPONENTS` 注册；
3. 课程里 `{ type: "sim", name: "xxx" }` 或加进 `Sandbox.tsx` 的自由试玩区。

## 7. 如何加术语

在 `web/src/data/index.ts` 的 `GLOSSARY` 数组追加 `{ term, en, def }`，
术语表页自动出现并可被搜索。

## 8. 后端修改

- 路由/存储都在 `server/src/main.rs`（单文件）。
- 新增存储后端（SQLite 等）时保持 `/api/progress/{profile_id}` 的契约不变，
  前端无需改动；`profile_id` 就是预留的多用户键。
- 日志级别由 `RUST_LOG` 控制，默认 `agent_school_server=info,tower_http=warn`。
