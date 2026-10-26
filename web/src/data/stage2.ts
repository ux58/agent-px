import type { Stage } from "../types";

export const STAGE2: Stage = {
  id: 2,
  title: "核心机制：Agent 的发动机",
  tagline: "循环、工具、上下文——拆开每个 Agent，里面都是这三样",
  outcome: "毕业标准：能手写一个带工具调用和自我纠错的最小 Agent 循环",
  lessons: [
    {
      key: "agent-loop",
      title: "Agent 循环：思考、行动、观察",
      minutes: 16,
      blocks: [
        { type: "p", text: "剥掉所有营销话术，Agent 的运行时核心只有十行左右的循环。本课先看图，再亲手在模拟器里驱动它，最后读一段真实代码。" },
        { type: "svg", name: "loop", caption: "Agent 核心循环：Plan → Act → Observe → Check，直到目标达成" },
        { type: "h3", text: "循环的四要素" },
        { type: "ul", items: [
          "停止条件：什么时候结束？通常三选一——模型自己说「做完了」；触发步数/预算上限；命中人工确认点。没有停止条件的 Agent 是定时炸弹。",
          "工具结果回填：工具执行结果必须作为消息追加进上下文，模型才能「看到」自己上一刀砍出了什么效果。",
          "错误也是信息：工具报错不是终止信号，而是把报错文本喂回模型，大多数情况下它能自我纠正——这是 Agent 可靠性的隐形功臣。",
          "每轮决策都重新开始：模型没有「内心状态」，所谓状态就是当前消息列表。列表里有什么，它就知道什么。",
        ] },
        { type: "sim", name: "loop" },
        { type: "h3", text: "最小 Agent 循环（可直接抄走跑）" },
        { type: "code", lang: "typescript", code: `async function runAgent(goal: string, maxSteps = 10) {\n  const messages = [{ role: "user", content: goal }];\n\n  for (let step = 0; step < maxSteps; step++) {\n    const res = await client.messages.create({\n      model: "claude-sonnet-5-5",\n      max_tokens: 1024,\n      system: SYSTEM_PROMPT,\n      tools: TOOLS,               // 工具定义，下一课细讲\n      messages,\n    });\n\n    messages.push({ role: "assistant", content: res.content });\n\n    // 模型不再要工具 → 它认为任务完成\n    if (res.stop_reason !== "tool_use") {\n      return res.content[0].text; // 最终答案\n    }\n\n    // 执行模型点名的每一个工具，结果回填\n    const toolResults = [];\n    for (const block of res.content) {\n      if (block.type === "tool_use") {\n        const result = await executeTool(block.name, block.input);\n        toolResults.push({\n          type: "tool_result",\n          tool_use_id: block.id,\n          content: String(result),   // 报错也如实回填\n        });\n      }\n    }\n    messages.push({ role: "user", content: toolResults });\n  }\n\n  return "已达步数上限，任务未完成"; // 护栏兜底\n}` },
        { type: "work", title: "生产级循环加固：重试、超时、追踪一个都不能少", text: "课程示例是教学版；生产循环至少要包上这四层。真实现长这样：", lang: "typescript", code: `// 每步工具调用统一走这个包装器
async function callToolSafe(name: string, input: unknown, ctx: RunCtx) {
  return withSpan(\`tool:\${name}\`, async () => {            // 1) 追踪：每步一个 span
    return await retry(                                       // 2) 重试：指数退避 + 抖动
      () => withTimeout(executors[name](input, ctx), 10_000), // 3) 超时：防止工具挂死循环
      { times: 3, backoffMs: 500, jitter: 0.3, onlyOn: RETRYABLE },
    );
  });
}
// 4) 循环级护栏：maxSteps + 预算双闸，触顶时把已完成工作写成 checkpoint 返回`,
        list: [
          "可重试错误（超时/限流 429）才重试；业务错误（参数非法）直接喂回模型自纠，重试只会浪费钱",
          "同参数同工具连续失败 2 次即熔断该工具本轮使用，并提示模型换路径",
          "每次循环结束记录 span 属性：step、tokens、latency——线上排查全靠它",
        ] },
        { type: "quote", text: "读三遍这段代码：市面上 90% 的 Agent 框架，剥掉封装后就是这 30 行。框架提供的是工程便利（沙箱、权限、日志），不是魔法。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "Agent 执行工具时报错了（比如文件不存在）。工程上正确的处理是？",
          options: [
            "立刻终止整个任务，返回失败",
            "把错误信息作为 tool_result 回填给模型，让它决策重试/换路径/放弃",
            "静默忽略，假装成功",
            "自动重试 100 次",
          ],
          answer: 1,
          explain: "错误文本是决策信息。模型看到 ENOENT 常会换路径（如先列目录）。静默忽略和硬终止都浪费了这种自我纠错能力。",
        } },
        { type: "exercise", ex: {
          kind: "blank",
          q: "为了防止 Agent 失控空转，循环里必须设置最大步数（或 token 预算），术语叫_____护栏（填写中文两个字）。",
          answers: ["护栏", "熔断", "安全", "guardrail", "budget"],
        } },
      ],
    },
    {
      key: "tool-use",
      title: "工具调用：让模型长出手脚",
      minutes: 15,
      blocks: [
        { type: "p", text: "模型只有嘴，工具给它手脚。工具定义写得好不好，直接决定 Agent 的成败——很多「Agent 不聪明」的问题，本质是工具说明书写烂了。" },
        { type: "h3", text: "工具定义三件套：名字、描述、参数" },
        { type: "code", lang: "typescript", code: `const TOOLS = [\n  {\n    name: "get_weather",\n    description:\n      "查询指定城市当前天气。适用于『今天/现在』的天气问题；"\n      + "若用户问未来多天，请改用 get_forecast。",\n    input_schema: {\n      type: "object",\n      properties: {\n        city:     { type: "string", description: "城市名，如：上海" },\n        units:    { type: "string", enum: ["celsius", "fahrenheit"],\n                    description: "温度单位，默认 celsius" },\n      },\n      required: ["city"],\n    },\n  },\n];` },
        { type: "p", text: "注意 description 的写法：不仅说了做什么，还说了什么时候不该用它（改用 get_forecast）。模型选工具全靠读这些文字——把它们当成写给新同事的操作手册来写。" },
        { type: "h3", text: "工具设计的四条军规" },
        { type: "ul", items: [
          "少而精：5 个清晰工具 > 20 个重叠工具。工具越多，模型选错概率越高，token 开销也越大。",
          "返回值对模型友好：返回 50KB 的 JSON 等于糊它一脸。宁可返回摘要 + 一个「详情请调 get_detail(id)」的钩子。",
          "错误信息说人话：返回「文件不存在，现有文件：a.ts b.ts」远好于「Error: -2」。后者模型只能瞎猜。",
          "副作用工具要隔离：读（read_*）随便调，写（write_*/delete_*）必须有确认或白名单。把危险操作藏进普通工具里是事故之源。",
        ] },
        { type: "work", title: "工具注册中心：RBAC + 审计 + 大小闸门", text: "企业里工具不是散落的函数，而是带元数据集中注册、按上下文动态注入的资源：", lang: "typescript", code: `// 工具定义（注册中心的一条记录）
const getOrder = defineTool({
  name: "get_order",
  schema: z.object({ orderId: z.string() }),
  roles: ["agent", "support"],        // RBAC：哪些角色可见
  danger: "read",                     // read | write | dangerous
  timeoutMs: 5_000,
  handler: async (i, ctx) => audit(ctx, async () => fetchOrder(i.orderId, ctx.tenant)),
});

// 每次会话注入工具时：按角色过滤 + 按租户过滤 + 大结果截断到 4KB（超出的落盘给路径）`,
        list: [
          "写类工具（write/dangerous）默认不注入，需要任务级声明 + 审批流配合（见安全课）",
          "所有调用进审计日志：who / when / tool / args摘要 / 结果状态 / trace_id",
          "工具版本化：schema 变更走评审，旧版本保留过渡期，避免所有 Agent 同时翻车",
        ] },
        { type: "table", head: ["场景", "差的设计", "好的设计"], rows: [
          ["查订单", "query_all_data() 返回全库转储", "get_order(id) 按需查单条"],
          ["写文件", "edit_file() 传入整份新内容", "str_replace(old, new) 精准替换"],
          ["执行命令", "execute(anything) 万能入口", "白名单命令 + 参数校验"],
          ["报错", "Error code -2", "『未找到用户 42，现有用户：7, 19』"],
        ] },
        { type: "quote", text: "一个诊断技巧：Agent 行为怪异时，先打印它「看到的工具定义」和「工具返回的原文」。八成问题出在这两处，而不是模型本身。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "你的 Agent 有 18 个工具，模型经常选错。最优先的改进是？",
          options: [
            "换更强的模型",
            "合并/删除重叠工具，把 description 写清「何时用/何时不用」，理想规模 5~8 个",
            "把 18 个工具的 description 全部加长三倍",
            "在系统提示里骂模型「请仔细选择工具」",
          ],
          answer: 1,
          explain: "工具数量和重叠度是选错率的主因。收敛工具集的收益通常大于换模型，且立刻生效、零成本。",
        } },
        { type: "exercise", ex: {
          kind: "match",
          q: "把工具设计原则和它防住的事故连起来：",
          pairs: [
            { left: "读写分离 + 确认", right: "Agent 误删生产数据库" },
            { left: "返回摘要而非全量", right: "一次查询吃光上下文窗口" },
            { left: "错误信息带上下文", right: "模型盲猜报错原因反复失败" },
            { left: "参数 enum 约束", right: "模型传了不存在的单位值" },
          ],
        } },
      ],
    },
    {
      key: "context-engineering",
      title: "上下文工程：窗口是稀缺资源",
      minutes: 14,
      blocks: [
        { type: "p", text: "2025 年起，「上下文工程（context engineering）」取代提示词工程成为主流说法。原因很简单：提示词只管开头一段，而 Agent 一跑几十轮，上下文会被历史、工具结果、日志迅速吃满。管理一个会不断膨胀的窗口，成了 Agent 开发的第一工程问题。" },
        { type: "svg", name: "context", caption: "上下文的消耗结构，以及四种治理手段" },
        { type: "h3", text: "窗口满了会发生什么" },
        { type: "p", text: "两件事，都很糟：其一，最老的指令被裁掉，模型「忘记」最初的约束；其二，中间内容稀释注意力，模型开始答非所问。长对话质量下滑，多半不是模型变笨，而是上下文被污染了。" },
        { type: "sim", name: "contextwin" },
        { type: "h3", text: "四种治理手段，按性价比排序" },
        { type: "ul", items: [
          "写入文件（offload）：大结果落盘，上下文只留一行路径引用。一劳永逸，工程上首选。",
          "历史压缩（compaction）：把旧对话摘要成一段「已完成工作纪要」，替换原文。Claude Code 的 /compact 就是这个；2026 年起 Claude API 也原生提供 compaction（Opus 4.6+ 可让模型自行摘要上下文）。",
          "裁剪（trimming）：按策略丢弃最老或最大的消息。实现最简单，但可能丢关键信息。",
          "子代理隔离（sub-agent isolation）：派一个子 Agent 去做脏活（读 20 个文件），只把 300 字结论带回来。牺牲 token 换主上下文洁净。",
        ] },
        { type: "work", title: "上下文预算表：给每类内容定「户口」", text: "成熟的 Agent 团队会给窗口里每种内容设预算上限，就像给程序设内存配额。一张真实项目的预算表长这样（以 128k 档为例；2026 年主流窗口已是 200k~1M，预算思路不变、余量更宽）：", list: [
          "系统提示 + 工具定义：≤ 8k（提示缓存覆盖，现金成本低但要占窗口）",
          "任务目标 + 计划 Todo：≤ 2k（常驻，压缩时必须保留）",
          "对话历史：≤ 20k，超限触发摘要压缩（保留结论 + 最近 5 轮原文）",
          "工具结果：单个 ≤ 4k（超出落盘），累计 ≤ 60k",
          "预留生成空间：≥ 8k（别把窗口塞满到生成时才爆）",
        ], code: `// 压缩策略的优先级（Claude Code 的实践）
// 1. 丢：已被落盘引用的大结果原文
// 2. 摘：旧对话 → 一段「已完成工作 + 关键结论 + 文件路径」纪要
// 3. 保：任务目标、计划、最近 2 轮完整原文 —— 用户刚说的话一个字都不能摘`, lang: "text" },
        { type: "quote", text: "检验你上下文工程水平的一道面试题：工具返回了 8000 token 的日志，接下来三步你怎么设计？——参考答案：落盘存全文 → 上下文写「已存 /tmp/x.log，共 8000 行，前 10 行见下」→ 需要细节时按行号读取。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "长任务中 Agent 开始无视第一轮定下的约束。最可能的原因和首选修复是？",
          options: [
            "模型能力不够，换更大模型",
            "上下文过长导致早期指令被裁/稀释——压缩历史并重申关键约束",
            "用户没说清楚，重新提问",
            "温度太高，降到 0",
          ],
          answer: 1,
          explain: "「遗忘早期指令」是上下文过载的典型症状。修复顺序：压缩/落盘腾空间 → 在系统提示或新消息里重申关键约束。",
        } },
        { type: "exercise", ex: {
          kind: "order",
          q: "收到一个 8000 token 的工具结果时，成本最优的处理顺序是：",
          steps: [
            "全文写入本地文件持久化",
            "上下文中只保留一行摘要与文件路径",
            "继续任务，模型按需用工具读取片段",
            "任务结束前把关键结论写进进度纪要",
          ],
        } },
      ],
    },
  ],
};
