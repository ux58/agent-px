import type { Stage } from "../types";

export const STAGE4: Stage = {
  id: 4,
  title: "系统进阶：从单体到舰队",
  tagline: "多智能体协作、RAG 检索增强、任务规划——复杂系统的三块积木",
  outcome: "毕业标准：能为一个真实需求设计多智能体分工与检索方案",
  lessons: [
    {
      key: "multi-agent",
      title: "多智能体：让 Agent 带团队",
      minutes: 16,
      blocks: [
        { type: "p", text: "单个 Agent 干复杂任务会撞三堵墙：上下文装不下全部中间结果；单线程太慢；没有第二双眼睛把关。多智能体（multi-agent）是应对这三堵墙的架构答案——本质是「把大上下文拆成小上下文，再加一个管理者」。" },
        { type: "svg", name: "multi", caption: "编排者-工人模式：Anthropic 多 Agent 研究系统采用的拓扑" },
        { type: "h3", text: "三种常见拓扑" },
        { type: "table", head: ["拓扑", "结构", "适用"], rows: [
          ["编排者-工人", "一个 lead 动态拆解、派发、汇总", "开放任务：研究、开发、数据分析"],
          ["流水线 pipeline", "A 的输出是 B 的输入，固定顺序", "阶段明确的任务：抓取→清洗→写作"],
          ["辩论/评审 debate", "多个 Agent 独立作答，一个裁判汇总", "需要交叉验证的高风险结论"],
        ] },
        { type: "sim", name: "multiagent" },
        { type: "h3", text: "上多智能体前，先问三个问题" },
        { type: "ul", items: [
          "Token 成本能扛吗？Anthropic 披露过：多 Agent 系统的 token 消耗约为单 Agent 聊天的 15 倍。三个工人各自带全套工具跑循环，成本是三倍起步。",
          "任务真的可并行吗？串行依赖强的任务拆给多 Agent 只增加协调开销，不如一个 Agent + 清晰计划。",
          "失败路径设计了吗？工人超时、评审连续打回、编排者拿到半成品——每种都要有兜底策略。",
        ] },
        { type: "p", text: "工程要点：工人之间不直接通信，全部通过编排者交换结论；给每个工人独立的系统提示和最小工具集；编排者上下文里只放结论性摘要，不放过程——否则它自己先撑爆。" },
        { type: "work", title: "生产编排：队列 + 幂等 + 状态机", text: "「编排者-工人」在生产环境的落地形态是任务队列 + 独立 worker 进程，而不是内存里同时跑三个循环：", lang: "typescript", code: `// 派发：编排者把子任务投递到队列（每个子任务带幂等键）
await queue.publish("research", {
  jobId: crypto.randomUUID(),
  idempotencyKey: \`\${task.id}:research\`,   // 重试不重复执行
  payload: { question, scope, parentTrace: span.traceId },
  ttl: 300_000,                              // 子任务 5 分钟超时自动失败
});

// 工人：独立部署、独立扩容、崩溃后消息回队列重投
// 编排者只收结论摘要 + 引用列表，过程日志走 OTel 不进上下文`,
        list: [
          "子任务失败按类型处理：可重试的回队列（带退避），不可重试的直接降级（该线索标注失败继续汇总）",
          "状态机落库：task → dispatching → partial → reviewing → done/failed，每步可查可恢复",
          "并发上限按供应商 RPM 配置（令牌桶），多 worker 共享限流器，避免集体触发 429",
        ] },
        { type: "quote", text: "类比管理：多智能体架构就是把「团队管理原则」搬给 AI——清晰的岗位说明书（系统提示）、最小授权（最小工具集）、只听汇报不听过程（上下文隔离）、必须有验收（评审环节）。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "多智能体系统中，「工人的过程输出不进入编排者上下文」的主要原因是？",
          options: [
            "保密需要",
            "编排者上下文有限，只需要结论；过程全量回流会迅速撑爆窗口并稀释注意力",
            "加快网络传输",
            "避免工人偷懒",
          ],
          answer: 1,
          explain: "上下文隔离是多智能体的第一原则：每个工人独立上下文干活，编排者只消费压缩后的结论。",
        } },
        { type: "exercise", ex: {
          kind: "blank",
          q: "Anthropic 实测多 Agent 系统的 token 消耗约为单 Agent 对话的_____倍（阿拉伯数字）。",
          answers: ["15", "15倍", "十五"],
        } },
      ],
    },
    {
      key: "rag",
      title: "RAG：让 Agent 开卷考试",
      minutes: 15,
      blocks: [
        { type: "p", text: "RAG（Retrieval-Augmented Generation，检索增强生成）一句话：回答前先去知识库里翻资料，把翻到的片段塞进上下文，再让模型作答。它同时治两个病——知识过时（训练截止后的事）和私域知识（模型没见过的内部文档），并且能给出处、可溯源。" },
        { type: "svg", name: "rag", caption: "RAG 数据流：切分 → 向量化 → 检索 → 拼接 → 生成" },
        { type: "h3", text: "搭建一条 RAG 流水线的五个决策点" },
        { type: "ul", items: [
          "切分（chunking）：按语义边界切（标题/段落），300~800 token 一块，相邻块重叠 10~20%。切太碎丢语境，切太大检索不精。",
          "嵌入（embedding）：文本 → 向量。选一个与语料语言匹配的嵌入模型，建库时和查询时必须用同一个。",
          "检索（retrieval）：向量相似度召回 Top-K；对专有名词、工单号类查询，混合「关键词 + 向量」双路召回效果显著更好。",
          "重排（rerank）：粗召回几十条 → 重排模型精排出 3~5 条。这是性价比最高的精度提升手段。",
          "生成（generation）：把片段连同出处编号拼进提示词，要求「只依据资料回答，资料不足就说不足」。",
        ] },
        { type: "code", lang: "typescript", code: `// RAG 检索伪代码：混合召回 + 重排\nconst queryVec = await embed(question);\nconst vecHits  = await vectorDb.search(queryVec, { topK: 30 });\nconst kwHits   = await keywordIndex.search(question, { topK: 30 });\n\nconst merged   = dedupeById([...vecHits, ...kwHits]);\nconst reranked = await reranker.rerank(question, merged, { topK: 4 });\n\nconst context = reranked\n  .map((h, i) => \`[\${i + 1}] (\${h.source}) \\n\${h.text}\`)\n  .join("\\n\\n");\n\nconst answer = await llm.chat([\n  { role: "system", content: "只依据下列资料回答，标注出处编号；资料不足时明确说明。" },\n  { role: "user", content: \`资料：\\n\${context}\\n\\n问题：\${question}\` },\n]);` },
        { type: "work", title: "生产 RAG 的三件日常脏活：增量索引、权限过滤、新鲜度", list: [
          "增量索引：文档变更事件（webhook/CDC）驱动单文档重建，别每晚全量重刷——百万级文档全量重建既贵又慢",
          "权限过滤：检索前先按用户权限收窄到可见文档集（或检索后过滤再重排）；「先检索后过滤」会把配额浪费在看不了的内容上",
          "新鲜度：chunk 带 doc_updated_at，时效敏感场景（价格/政策）检索结果过期即拒答并触发重取",
          "缓存：embedding 结果缓存（同问句指纹命中直接复用），重排结果短 TTL 缓存，检索 P99 从秒级压到百毫秒级",
          "评测：每周跑检索命中率（hit@5）与答案引用准确率，文档改版后必须回归",
        ] },
        { type: "quote", text: "RAG 失败八成不在模型在检索：要么切分切烂了，要么该混合检索没用，要么缺重排。调优顺序永远是：先看检索命中率，再动生成端。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "RAG 系统经常「引用了正确的文档却答错」。按课程给出的排查顺序，第一步查什么？",
          options: [
            "直接换更强的生成模型",
            "查检索环节：命中片段是否真的包含答案（切分/混合召回/重排），再动生成端",
            "把 Top-K 调到 50 全塞进去",
            "在提示词里要求模型「认真一点」",
          ],
          answer: 1,
          explain: "课程结论：失败八成在检索端。Top-K 调大反而稀释注意力、增加 token 成本。",
        } },
        { type: "exercise", ex: {
          kind: "order",
          q: "把 RAG 的离线建库与在线问答流程排正确：",
          steps: [
            "文档按语义边界切分成 chunk",
            "离线：全部 chunk 向量化并入库",
            "在线：用户问题向量化",
            "双路召回 + 重排选出 3~5 条",
            "片段带出处拼入提示词，生成带引用的回答",
          ],
        } },
      ],
    },
    {
      key: "planning",
      title: "规划与任务分解：把大象装进冰箱",
      minutes: 13,
      blocks: [
        { type: "p", text: "「帮我重构整个模块」「做一份竞品分析报告」——这类任务的共同点是：任何单步行动都无法直接推进目标。会不会把模糊目标变成可执行计划，是 Agent 从「玩具」到「生产」的分水岭。本课给两个已被验证有效的模式。" },
        { type: "h3", text: "模式一：计划-执行分离（plan-then-execute）" },
        { type: "p", text: "先让模型在「只读」状态下产出一份结构化计划（允许它探索代码/资料，但不许动手改），人审核计划后，再切换到执行模式逐步落地。把「想清楚」和「做出来」拆成两个上下文，避免边想边做导致的短视。" },
        { type: "code", lang: "text", code: `[阶段 1 · 只读规划]\n目标：重构 src/order 模块，对外 API 不变\n产出计划：\n  1. 通读 6 个文件，列出所有导出函数 → 写进 plan.md\n  2. 每个函数标注调用方（grep）\n  3. 设计新的目录结构，写迁移映射表\n  4. 风险点：X 函数被 12 处调用，需保留兼容层\n等待人工确认…\n\n[阶段 2 · 逐项执行]\n□ 步骤 1 → 完成，发现第 7 个隐藏依赖\n□ 步骤 2 → …（每步完成即勾选并纪要）` },
        { type: "h3", text: "模式二：Todo-as-Context（任务清单即上下文）" },
        { type: "ul", items: [
          "计划落成一份可编辑的清单文件（或 Todo 工具），每个条目 = 一句话 + 完成标准；",
          "每完成一项，立刻更新状态并写一行「发现了什么」，这份清单随上下文流动；",
          "它同时解决两个问题：长任务中途「忘了目标」（计划常驻），以及压缩历史时「丢进度」（进度有纪要）。",
        ] },
        { type: "table", head: ["任务特征", "推荐策略"], rows: [
          ["步骤 ≤ 3，路径清晰", "直接做，别规划，规划是开销"],
          ["步骤多但路径固定", "Workflow 脚本写死，不上 Agent 规划"],
          ["目标模糊、路径未知", "只读规划 → 人审 → 执行 + Todo 纪要"],
          ["需要大量探索", "先派子 Agent 侦察，回来再定计划"],
        ] },
        { type: "work", title: "计划即交付物：计划模板直接进团队 Wiki", text: "成熟团队把「计划文档」标准化为 artifact，人和 Agent 都按同一模板产出：", lang: "markdown", code: `# 重构计划 · order 模块
目标：对外 API 不变的前提下拆分 order 模块 ｜ 预算：$1.5 / 40k tokens
风险点：getHistory 被 12 处调用（需兼容层）；订单测试数据在影子库

| # | 步骤 | 完成标准 | 验证方式 |
|---|------|----------|----------|
| 1 | 梳理导出面 | 导出清单+调用方映射表 | grep 全覆盖核对 |
| 2 | 新目录骨架 | 类型编译通过 | tsc --noEmit |
| 3 | 迁移+兼容层 | 全量测试绿 | pnpm test |
| 4 | 清理旧代码 | 死代码扫描 0 命中 | knip |

回滚方案：feature flag order_v2，任何一步失败即切回 v1`,
        list: [
          "每步必须有「可验证的完成标准」，写不出验证方式的步骤 = 还没想清楚，禁止动手",
          "计划落盘（plan.md）随任务存档，执行中断后新会话靠它续跑，而不是靠翻聊天记录",
        ] },
        { type: "quote", text: "规划的本质不是「列出所有步骤」，而是「暴露未知」：好计划会明确写出风险点和验证方法，坏计划假装一切都已确定。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "「计划-执行分离」中，规划阶段强制只读（不许改文件）的目的是？",
          options: [
            "节省 token",
            "防止模型过早行动锁死路径，先把探索信息收集全、暴露风险点，人审后再投入执行",
            "避免模型报错",
            "让用户少打几个字",
          ],
          answer: 1,
          explain: "过早行动 = 在信息不全时就产生不可逆副作用。只读规划保证「先暴露未知，再动手」。",
        } },
        { type: "exercise", ex: {
          kind: "match",
          q: "任务特征 → 推荐策略，连一连：",
          pairs: [
            { left: "三步以内、路径清晰", right: "直接执行，规划反而是开销" },
            { left: "步骤多但完全固定", right: "写成 Workflow 脚本，不靠模型规划" },
            { left: "目标模糊路径未知", right: "只读规划 + 人审 + Todo 纪要" },
            { left: "需要大量前期探索", right: "先派子 Agent 侦察再定计划" },
          ],
        } },
      ],
    },
  ],
};
