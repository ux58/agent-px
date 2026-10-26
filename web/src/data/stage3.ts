import type { Stage } from "../types";

export const STAGE3: Stage = {
  id: 3,
  title: "标准协议：接入大生态",
  tagline: "MCP、Skill、记忆、协议生态——用开放标准把 Agent 接入工具与知识的大陆",
  outcome: "毕业标准：能为一个真实系统设计 MCP 工具层、Skill 资产库与记忆分层方案",
  lessons: [
    {
      key: "mcp",
      title: "MCP：一次接入，处处可用",
      minutes: 16,
      blocks: [
        { type: "p", text: "Agent 要干活就得接工具：接数据库、接文件系统、接企业内部 API。每家 Agent 应用 × 每个数据源都写一遍胶水代码，是 M×N 的集成地狱。MCP（Model Context Protocol，模型上下文协议）把它变成 M+N：工具方写一次 Server，所有支持 MCP 的 Host（Claude Desktop、Cursor、各类企业 Agent 平台）都能直接用。" },
        { type: "svg", name: "mcp", caption: "M×N 集成问题 → M+N：工具方与 Agent 方各自只对接协议" },
        { type: "h3", text: "三个角色：Host、Client、Server" },
        { type: "ul", items: [
          "Host（宿主）：用户面对的 AI 应用，负责管理连接、鉴权与权限确认——它是企业数据的守门人。",
          "Client（客户端）：宿主内每个 Server 连接的协议端点（2026-07-28 版规范起转向无状态请求，会话式长连接不再是强制要求）。",
          "Server（服务器）：封装某外部系统能力的轻量程序，暴露 tools / resources / prompts 三类原语。",
        ] },
        { type: "p", text: "通信走 JSON-RPC 2.0。经典会话式握手长这样（存量部署最广的形态）：" },
        { type: "code", lang: "json", code: `// 1) initialize —— 握手：交换协议版本与能力
{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-11-25",
   "capabilities":{"tools":{"listChanged":true}},
   "clientInfo":{"name":"claude-desktop","version":"1.2.3"}}}

// 2) tools/call —— 真正干活：按名字调用，参数走 JSON Schema
{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"get_order","arguments":{"orderId":"8841"}}}` },
        { type: "p", text: "2026-07-28 版规范是分水岭：协议核心转向无状态——取消了 initialize 握手与会话 ID，每个请求自带版本与能力元数据，远程 Server 可以像普通 HTTP 服务一样水平扩容；同时新增多轮往返请求（MRTR）与扩展机制，Sampling / Roots 等客户端能力标记弃用。SDK 正在过渡，两种形态会在生产里共存一段时间——你握手要会读，无状态新范式也要心里有数。" },
        { type: "sim", name: "mcp" },
        { type: "h3", text: "三类原语，各管一摊" },
        { type: "table", head: ["原语", "是什么", "典型用法"], rows: [
          ["tools", "模型可调用的函数（有副作用）", "查订单、建工单、发邮件"],
          ["resources", "可读取的数据（只读）", "文件内容、数据库行、日志片段"],
          ["prompts", "预置的提示词模板", "标准化的分析 / 总结工作流"],
        ] },
        { type: "p", text: "选型直觉：会改世界的是 tool，只读的是 resource。很多团队把只读查询也写成 tool，功能上没错，但丢掉了资源类的权限语义（资源可以按 URI 做细粒度授权）。" },
        { type: "work", title: "企业 MCP 网关：注册、健康、权限、审计四合一", text: "直接让每个 Agent 连一堆裸 Server 是运维灾难。成熟做法是加一层 MCP 网关（社区已有 open-gateway 类开源实现），统一管理企业内部全部 Server：", lang: "yaml", code: `# mcp-gateway.yaml —— 企业内部 Server 注册表
servers:
  - name: orders
    transport: streamable-http          # 本地 stdio / 远程 HTTP 统一纳管
    endpoint: http://orders-svc:8080/mcp
    auth: oauth2_client_credentials      # 网关到服务的鉴权统一收口
    health: { interval: 15s, fails: 3 }  # 探活，连续失败自动摘除
    scopes: [orders:read, orders:write]  # 能力声明，供 RBAC 匹配
  - name: knowledge-base
    endpoint: http://kb-svc:8080/mcp
    scopes: [kb:read]

policy:
  default: deny
  rules:
    - role: support_agent
      allow: [orders:read, kb:read]      # 客服 Agent 只读
    - role: ops_agent
      allow: [orders:read, orders:write] # 运维 Agent 可写，走审批`, list: [
          "每次 tools/call 经过网关落审计：谁、哪个 Server、什么参数、结果状态、trace_id",
          "版本治理：Server 的 tool schema 变更走评审，网关保留旧版本 30 天过渡",
          "限流按 Server × 租户双维度，防止某个 Agent 循环把下游打挂",
        ] },
        { type: "quote", text: "一句话理解 MCP：它不是模型能力，是「USB 接口」——设备（工具）和电脑（Agent）各自只造一次接口，插上就能用。生态价值大于技术价值。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "MCP 把 M×N 集成问题变成 M+N，本质原因是？",
          options: [
            "MCP 让模型变得更聪明了",
            "双方各自只对接一个开放协议：Agent 实现一次客户端，工具方实现一次服务器，即可任意组合",
            "MCP 规定了必须用哪家模型",
            "MCP 把所有工具打包成了一个巨型 API",
          ],
          answer: 1,
          explain: "协议标准化解耦了两侧：集成工作量从 M×N 份胶水代码降到 M+N 份标准实现。这也是 USB、LSP 等经典协议的同款逻辑。",
        } },
        { type: "exercise", ex: {
          kind: "order",
          q: "MCP 客户端与 Server 建立会话的标准握手顺序：",
          steps: [
            "客户端发送 initialize（协议版本 + 双方能力）",
            "服务端回复自身能力与版本信息",
            "客户端发 initialized 通知，握手完成",
            "客户端调 tools/list 拿到工具清单",
            "模型决策后客户端发 tools/call 执行",
          ],
        } },
      ],
    },
    {
      key: "skills",
      title: "Skill 开发：教 Agent 一套做事方法",
      minutes: 14,
      blocks: [
        { type: "p", text: "工具给 Agent 手脚，Skill 给 Agent 方法论。一个 Skill 就是一个含 SKILL.md 的文件夹：把某类任务的「老手经验」写成模型可读的操作手册，需要时加载，不需要时不占上下文。它和提示词模板的区别在于渐进式加载（progressive disclosure）——这是它省 token 的关键设计。" },
        { type: "svg", name: "skill", caption: "三级渐进加载：名字常驻 → 正文按需 → 附件再按需" },
        { type: "h3", text: "一个 SKILL.md 长什么样" },
        { type: "code", lang: "markdown", code: `---
name: incident-report
description: 生产事故复盘报告撰写规范。当用户要求写事故报告、
  postmortem、复盘时使用；日常周报勿用。
---

# 事故复盘报告规范

## 撰写流程
1. 先收集：告警时间线、变更记录、影响面数据
2. 按「事实 → 根因 → 行动项」三段式撰写，禁止甩锅措辞
3. 行动项必须带 owner 与截止日期

## 格式要求
- 标题：【P级】系统名 · 一句话摘要
- 时间线用 UTC，精确到秒
- 根因分析用 5-Why，至少问到第 3 层

## 参考附件（按需读取，勿预先加载）
- templates/postmortem.md —— 标准模板
- examples/2024-payment-incident.md —— 优秀范例` },
        { type: "p", text: "注意 frontmatter 里 description 的写法：既说了什么时候用，也说了什么时候别用——和工具描述的写法同理，模型靠它做路由决策。" },
        { type: "sim", name: "skill" },
        { type: "h3", text: "为什么渐进式加载是关键" },
        { type: "ul", items: [
          "第一级（常驻）：所有 Skill 的名字 + 一句话描述，通常合计不到 1k token——这是「知道有什么」的成本。",
          "第二级（按需）：模型判断任务匹配后读取 SKILL.md 正文，通常 1~3k token。",
          "第三级（再按需）：模板、范例等重附件仅在真正要参考时读取——80% 的任务到不了这一级。",
          "对比暴力方案：把全部方法论塞进系统提示，几十个 Skill 直接吃掉数万 token，且互相干扰。",
        ] },
        { type: "work", title: "企业 Skill 资产库：让个人经验变成组织资产", text: "Skill 的企业价值在于沉淀：把「团队里最能干的人的做法」固化成可复用、可评审、可度量的资产。成熟团队的 Skill 管理规范：", list: [
          "入库评审：SKILL.md 走 PR 评审，重点审 description（路由准确性）与流程可执行性，像审代码一样审",
          "版本与度量：每个 Skill 记录「被路由命中次数 / 命中后任务成功率」，低命中高失败的定期下架",
          "命名空间：按部门前缀隔离（finance/、support/），跨部门共享的放 shared/ 并双 owner",
          "测试基线：每个 Skill 配 3~5 条触发用例 + 3 条不应触发用例，纳入 CI 回归（防 description 改动破坏路由）",
          "回收机制：季度复审，过时方法论（如旧模型时代的技巧）及时归档，防止「僵尸 Skill」污染路由",
        ], code: `# Skill 仓库结构（Git 管理，评审入库）
skills/
  shared/
    incident-report/SKILL.md + templates/ + examples/
    code-review/SKILL.md
  finance/
    month-end-close/SKILL.md      # 每个目录一个方法论
  support/
    escalation/SKILL.md
META.json                          # 命中率与成功率统计（CI 更新）`, lang: "text" },
        { type: "quote", text: "判断该建工具还是该建 Skill：动作交给工具（调 API、查库），判断力和流程交给 Skill（先做什么后做什么、什么算好）。二者组合，才是完整的「岗位培训」。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "Skill 相比「把所有方法论写进系统提示」，最大的架构优势是？",
          options: [
            "写 Markdown 比写系统提示更简单",
            "渐进式加载：名字常驻、正文与附件按需读取，上下文成本从数万 token 降到数百 token 起步",
            "Skill 可以调用工具，系统提示不行",
            "Skill 不需要维护",
          ],
          answer: 1,
          explain: "三级加载让「知识广度」不再与「上下文成本」线性绑定。系统提示塞满方法论是长上下文时代之前的旧习惯。",
        } },
        { type: "exercise", ex: {
          kind: "blank",
          q: "Skill「名字常驻 → 正文按需 → 附件再按需」的加载设计，术语叫渐进式加载，英文是_____（注意拼写）。",
          answers: ["progressive disclosure", "progressivedisclosure"],
        } },
      ],
    },
    {
      key: "memory",
      title: "记忆机制：让 Agent 记住该记住的",
      minutes: 15,
      blocks: [
        { type: "p", text: "「Agent 没记性」是个误解：模型的参数记忆改不了，但工程上可以把信息在正确的时机放回上下文。所谓记忆机制，就是一套「存什么、何时取、怎么忘」的外部系统。分清三类记忆，设计就不乱了。" },
        { type: "svg", name: "memory", caption: "三类记忆：情景（对话历史）、语义（RAG 知识）、程序性（文件与规则）" },
        { type: "h3", text: "三类记忆，三个系统" },
        { type: "table", head: ["类型", "存什么", "典型载体", "生命周期"], rows: [
          ["情景记忆", "这次任务发生过什么", "消息历史 / 会话摘要", "会话级，可压缩"],
          ["语义记忆", "领域知识与事实", "向量库 + RAG", "长期，随文档更新"],
          ["程序性记忆", "做事的方法与偏好", "CLAUDE.md / AGENTS.md / Skill", "长期，人工评审维护"],
        ] },
        { type: "p", text: "用户偏好（「帮我代码一律用 TypeScript」）属于程序性记忆：跨会话生效、需要显式确认后写入。把偏好混进情景记忆（对话历史）是最常见的实现错误——换个会话就忘了。" },
        { type: "h3", text: "工程上已经收敛的实践：记忆文件" },
        { type: "p", text: "编码类 Agent 已把「项目记忆」收敛为约定文件：CLAUDE.md、AGENTS.md 一类，放在仓库根目录，每次会话自动注入。它同时服务人和 Agent——这很重要：能被人类评审的记忆才敢放进生产。" },
        { type: "code", lang: "markdown", code: `# AGENTS.md —— 项目级程序性记忆（进版本库，走评审）

## 技术栈与约定
- 包管理只用 pnpm；Node >= 20
- 测试跑 vitest，禁止快照测试

## Agent 行为约束
- 改动 src/ 后必须跑 pnpm test 再提交
- 不许直接改 generated/ 目录（构建产物）
- 提交信息用约定式格式（feat:/fix:/chore:）

## 本项目易错点
- 时间处理一律 dayjs，勿引入 date-fns（历史包袱）` },
        { type: "work", title: "企业记忆分层：会话级 / 用户级 / 组织级 + 遗忘策略", text: "跨会话记忆是企业级产品的刚需（客服 Agent 得记得用户上次的问题），但不能做成「什么都存」。生产方案按作用域分三层，每层独立治理：", list: [
          "会话级（默认开）：消息历史 + 摘要，随会话过期（如 30 天），用户可随时查看与删除——合规底线",
          "用户级（默认关，显式授权）：偏好与关键事实（「对花生过敏」），写入前模型先复述确认，防止记错",
          "组织级（管理员治理）：团队术语表、客户档案、SLA 规则——由数据Owner 维护，Agent 只读",
          "遗忘策略：每条记忆带 TTL 与来源；用户删除请求须在承诺时限内级联清除（GDPR 类法规要求「无不当延迟」，业界通常承诺 30 天内全链路生效）；被引用过的记忆删除时要检查下游摘要",
          "隔离红线：用户级记忆严禁跨租户检索命中——语义检索必须带 tenant 过滤，这与语义缓存同款要求",
        ], code: `// 用户级记忆写入前的确认流（防记错 + 可审计）
async function saveFact(userId: string, fact: string, ctx: Ctx) {
  const confirmed = await askUser(\`我记下这条偏好：\${fact}，对吗？\`);
  if (!confirmed) return;
  await memstore.put({
    scope: "user", tenant: ctx.tenant, userId,
    fact, source: "conversation", traceId: ctx.traceId,
    ttl: "365d", confidence: "confirmed",
  });
}`, lang: "typescript" },
        { type: "quote", text: "记忆系统的第一设计问题不是「怎么记住」，而是「怎么忘」：没有遗忘和作用域的记忆，会从资产慢慢变成污染源与合规炸弹。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "用户说「以后我的代码都用 TypeScript」。正确的记忆实现是？",
          options: [
            "存进当前对话历史，下次会话自然还在",
            "显式确认后写入用户级程序性记忆（跨会话、可查看、可删除），会话注入时生效",
            "写进系统提示，每次会话手动复制",
            "微调进模型参数里",
          ],
          answer: 1,
          explain: "跨会话偏好属于程序性/用户级记忆，需显式确认 + 用户可控。对话历史换会话即失效；改系统提示无法按用户隔离；微调是杀鸡用牛刀且不实时。",
        } },
        { type: "exercise", ex: {
          kind: "match",
          q: "把记忆需求连到正确的记忆类型：",
          pairs: [
            { left: "本次任务的工具调用历史", right: "情景记忆（会话内消息/摘要）" },
            { left: "公司退款政策文档", right: "语义记忆（RAG 知识库）" },
            { left: "「该用户偏好简洁回复」", right: "程序性记忆（用户级偏好文件）" },
            { left: "「本仓库禁用 date-fns」", right: "程序性记忆（项目 AGENTS.md）" },
          ],
        } },
      ],
    },
    {
      key: "protocol-ecosystem",
      title: "协议生态：MCP 之外，Agent 怎么互联",
      minutes: 13,
      blocks: [
        { type: "p", text: "MCP 解决的是 Agent ↔ 工具的连接。但当你的公司里有多个 Agent——客服 Agent、数据 Agent、运维 Agent——它们之间怎么互相发现、互相委托任务？答案是 A2A（Agent2Agent）：2025 年由 Google 发起并捐赠给 Linux Foundation，2026 年已演进到 1.0，成为 Agent 互联的事实标准；配套的还有描述 Agent 能力的标准「名片」Agent Card。" },
        { type: "h3", text: "两条协议轴：别混为一谈" },
        { type: "table", head: ["协议", "连接的是", "解决什么"], rows: [
          ["MCP", "Agent ↔ 工具/数据", "给 Agent 接入手脚：files、API、数据库"],
          ["A2A", "Agent ↔ Agent", "给 Agent 接入同事：发现、委托、协作"],
          ["（对照）HTTP", "服务 ↔ 服务", "通用传输层，上面两个都基于它的现代形态"],
        ] },
        { type: "p", text: "A2A 由 Google 发起、已捐赠给 Linux Foundation 做中立治理，与 MCP 是互补而非竞争关系：一个 Agent 完全可以既用 MCP 接工具、又用 A2A 接同行。核心概念有三个：" },
        { type: "ul", items: [
          "Agent Card：Agent 的自描述 JSON 文档（端点、能力、鉴权方式），挂在 /.well-known/agent-card.json（0.3 版起，旧路径 agent.json 已废弃）——发现的前提是先拿到名片。",
          "Task：跨 Agent 委托的工作单元，有生命周期（提交→处理→完成/失败），长任务可流式上报进度——比「一次 RPC」更贴合 Agent 工作形态。",
          "Artifact：任务产物（文档、数据集），与消息流分离，方便落盘与审计。",
        ] },
        { type: "code", lang: "json", code: `// /.well-known/agent-card.json —— Agent Card 示意（A2A v1.0）
{
  "name": "refund-processor",
  "description": "处理订单退款审批：校验政策、执行退款、记录审计",
  "url": "https://agents.internal/refund",
  "protocolVersion": "1.0",
  "capabilities": { "streaming": true, "pushNotifications": true },
  "skills": [
    { "id": "refund", "name": "订单退款",
      "inputModes": ["text"], "outputModes": ["text"] }
  ],
  "securitySchemes": {
    "corporate": { "type": "openIdConnect",
      "openIdConnectUrl": "https://sso.internal/.well-known/openid-configuration" }
  },
  "security": [{ "corporate": ["openid", "profile"] }]
}` },
        { type: "h3", text: "什么时候真的需要 A2A" },
        { type: "p", text: "冷静判断：大多数团队现阶段只需要 MCP + 内部编排（第 4 阶段的编排者-工人模式，跑在同一进程或同一队列里）。A2A 的价值出现在「跨组织边界」或「异构 Agent 平台」场景：采购方 Agent 对接供应商 Agent、集团内不同事业部的 Agent 互访。先问三个问题：" },
        { type: "ul", items: [
          "对方 Agent 是别的团队/公司的资产，你无法把它拉进你的编排进程吗？——是，才考虑 A2A。",
          "双方需要运行时动态发现（今天新增一个合作方，明天下线一个）吗？——是，Agent Card 目录才有意义。",
          "任务确实需要长周期、多轮、可中断恢复吗？——是，A2A 的 Task 模型比裸 HTTP 回调省心。",
        ] },
        { type: "work", title: "企业 Agent 目录：内部互联的落地形态", text: "大组织内部的实践参考：建一个内部 Agent 目录服务（相当于 Agent 的 HR 系统），所有对外提供能力的 Agent 注册 Agent Card，消费方按目录发现 + 按 OAuth2 scope 授权调用：", list: [
          "注册项：Agent Card + 责任团队 + SLA 等级 + 数据分类级别（决定它能被谁调用）",
          "鉴权：目录签发的客户端凭证 + 短时效 token，scope 对应 Card 里的 skills——最小权限同样适用于 Agent 间调用",
          "治理：调用方与提供方双向评分（成功率/延迟/合规），连续违规的 Agent 从目录摘除",
          "审计：跨 Agent 委托的 Task 全程带 trace_id 透传，一条链路串起两个团队的可观测性体系",
        ] },
        { type: "quote", text: "选型口诀：接工具用 MCP，跨边界连 Agent 用 A2A，同进程协作用编排。协议是为组织结构服务的——康威定律在 Agent 时代依然生效。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "你的客服 Agent 需要调用兄弟团队（不同事业部）的「订单风控 Agent」，且对方会动态上新能力。最合适的接入方式是？",
          options: [
            "把对方代码复制进自己的编排进程",
            "通过 Agent Card 目录发现对方，按 A2A 任务模型委托，OAuth2 scope 授权",
            "让用户在两个 Agent 之间手动复制粘贴",
            "给对方每个新能力都写一个 MCP Server",
          ],
          answer: 1,
          explain: "跨组织边界 + 动态发现 + 长任务委托正是 A2A 的目标场景。MCP 面向工具连接，不适合 Agent 对 Agent 的对等协作治理。",
        } },
        { type: "exercise", ex: {
          kind: "match",
          q: "把连接需求连到合适的协议/模式：",
          pairs: [
            { left: "Agent 读写公司知识库文档", right: "MCP（工具/资源原语）" },
            { left: "跨事业部 Agent 委托风控审查", right: "A2A（Agent Card + Task）" },
            { left: "同一服务内的编排者派工人", right: "内部编排（无需对外协议）" },
            { left: "声明「本 Agent 支持流式返回」", right: "Agent Card 的 capabilities 字段" },
          ],
        } },
      ],
    },
  ],
};
