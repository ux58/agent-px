import type { Stage } from "../types";

export const STAGE6: Stage = {
  id: 6,
  title: "企业级落地：从可用到可运营",
  tagline: "平台架构、成本工程、灰度与审计——把 Agent 做成企业敢用的系统",
  outcome: "毕业标准：能独立产出一份含架构、成本、评测、审批流的上线方案",
  lessons: [
    {
      key: "prod-architecture",
      title: "生产级 Agent 平台架构",
      minutes: 18,
      blocks: [
        { type: "p", text: "Demo 和生产系统的差距，不在模型调用，而在四周的工程：请求从哪进来、权限怎么判、工具怎么管、出事怎么查。这一课给出一张经过验证的平台分层图，以及每层的最小实现方案。" },
        { type: "svg", name: "prodarch", caption: "五个平面 + 一条质量回路：企业 Agent 平台的参考架构" },
        { type: "h3", text: "接入平面：网关是企业集成的第一站" },
        { type: "ul", items: [
          "认证对接公司 SSO（OIDC/JWT），拒绝任何匿名调用；租户/部门维度做配额，防止一个团队烧穿整个预算。",
          "限流按用户与按租户双层设置（QPS + 突发桶）；对模型供应商侧配置熔断：错误率超阈值自动降级到备用模型或排队。",
          "请求带全链路 trace_id 透传，网关日志、编排日志、工具日志用同一个 ID 串联——没有它，线上排查等于盲猜。",
        ] },
        { type: "code", lang: "yaml", code: `# gateway.yaml —— 接入平面配置示例
routes:
  - path: /api/agent/*
    auth: oauth2_jwt            # 对接公司 SSO
    rate_limit: { qps: 5, burst: 10, key: user_id }
    quota: { daily_tokens_per_user: 2_000_000 }
  - path: /api/agent/admin/*
    auth: oauth2_jwt
    roles: [agent_admin]         # RBAC：管理接口单独控权

circuit_breaker:
  provider_error_rate: 0.5       # 模型供应商错误率 >50% 触发
  window: 60s
  cooldown: 5m
  fallback_model: standard       # 旗舰不可用时降级，而不是报错` },
        { type: "h3", text: "编排平面：会话、预算与追踪三件套" },
        { type: "p", text: "编排服务是平台心脏：管理会话状态（消息历史落库）、执行 Agent 循环、执行 token/金额预算。每个任务一个 span，每步工具调用一个子 span——这就是线上可观测性的全部骨架。" },
        { type: "code", lang: "typescript", code: `// orchestrator/run.ts —— 每一步都带 trace、预算与熔断
const TRACER = trace.getTracer("agent-orchestrator");

export async function runTask(task: Task, ctx: Ctx) {
  return TRACER.startActiveSpan(\`task:\${task.id}\`, async (span) => {
    const budget = new TokenBudget({ tokens: 200_000, usd: 2.0 });   // 任务级预算
    const loop = new AgentLoop({
      model: router.pick(task),                                     // 模型路由（下一课）
      tools: registry.toolsFor(ctx.role, ctx.tenant),               // 按角色+租户过滤工具
    });
    try {
      const out = await loop.run(task.goal, {
        budget,
        onToolCall: (c) => audit.append(ctx, c, span.spanContext()), // 高危走审批（见 safety 课）
      });
      span.setStatus({ code: 1 });
      return out;
    } catch (e) {
      span.recordException(e);
      metrics.inc("task_failed", { tenant: ctx.tenant, step: loop.stepCount });
      throw e;                                        // 交给上层按任务级重试策略处理
    } finally {
      span.setAttributes({ steps: loop.stepCount, tokens: budget.used, usd: budget.usd });
    }
  });
}` },
        { type: "work", title: "无状态扩容与会话恢复", list: [
          "编排服务无状态：会话状态全部落库（Postgres），任意副本可接管任意会话——扩容 = 加副本。",
          "任务可恢复：循环每步的中间产物（计划、工具结果落盘路径）写 checkpoint，进程崩溃后从断点续跑，而不是从头烧钱。",
          "幂等执行：每个任务带 idempotency_key，重试不会重复下单/重复发邮件——这是和 Demo 最大的区别。",
          "优雅停机：收到 SIGTERM 后停止接新任务，存量任务做完或 checkpoint 后再退出（K8s 滚动更新的前提）。",
        ] },
        { type: "h3", text: "工具平面与数据平面" },
        { type: "ul", items: [
          "工具注册中心：工具元数据（schema、所需角色、超时、是否高危）集中注册，编排器按上下文动态注入——而不是把全部工具硬编码给每个会话。",
          "工具执行器统一包一层：超时、重试（指数退避 + 抖动）、结果大小截断、沙箱隔离（容器内跑代码类工具，网络白名单）。",
          "三库分立：会话库（可清理）、向量库（知识）、审计库（只追加不可篡改，合规审计的生命线）。",
        ] },
        { type: "checklist", title: "Agent 平台上线检查清单", items: [
          "SSO 接入完成，无匿名调用路径",
          "按租户/用户的限流与 token 配额生效",
          "全链路 trace_id 贯通（网关→编排→工具）",
          "每任务 token/金额预算硬限制，超限优雅终止",
          "高危工具全部挂审批流，超时默认拒绝",
          "审计日志只追加、含审批人、保留期满足合规",
          "模型供应商熔断 + 备用模型降级演练通过",
          "任务幂等：重复请求不产生重复副作用",
          "checkpoint 恢复演练：杀进程后能续跑",
          "成本账本按租户出日报，异常波动告警",
          "评测集纳入 CI，分数低于基线阻断发布",
          "灰度方案与一键回滚开关就绪",
        ] },
        { type: "quote", text: "架构评审的一句话标准：任何一个平面挂掉，其余平面能降级运行而不是全站雪崩；任何一次调用，事后能用 trace_id + 审计日志完整还原。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "生产编排服务的设计中，「会话状态全部落库 + 任务带 checkpoint」直接换来的能力是？",
          options: [
            "模型回答更准确",
            "无状态扩容与崩溃后续跑——副本可随意伸缩，进程挂了不从头烧钱",
            "减少 API key 泄露风险",
            "让提示词更短",
          ],
          answer: 1,
          explain: "状态外置是无状态扩容的前提；checkpoint 让长任务的失败成本从「全部重跑」降到「从断点继续」。",
        } },
        { type: "exercise", ex: {
          kind: "order",
          q: "一次企业内 Agent 调用的正确处理链路：",
          steps: [
            "网关校验 SSO 身份与限流配额",
            "按角色与租户从工具注册中心过滤可用工具",
            "编排器创建 trace 并启动带预算的 Agent 循环",
            "高危工具调用挂起，等待人工审批",
            "审计库追加完整记录（含审批人与 trace_id）",
          ],
        } },
      ],
    },
    {
      key: "cost-engineering",
      title: "成本与性能工程：省出一个团队预算",
      minutes: 16,
      blocks: [
        { type: "p", text: "Agent 的单位经济学决定了它能不能在企业活下来：同样 3 万张工单/日的业务量，架构方案不同，月账单可以从一万美元降到一千美元。这一课给出一套完整的成本工程打法。" },
        { type: "svg", name: "cost", caption: "成本四层漏斗：每个请求自上而下逐层过滤，到模型时已剩不多" },
        { type: "h3", text: "先建账本，再谈优化" },
        { type: "p", text: "第一原则：没有账本就没有优化。按租户/任务类型记录每次调用的输入输出 token、缓存命中、模型、金额，日报自动出表。见过太多团队月账单爆炸三倍才发现「某 个提示词里塞了整本文档」。" },
        { type: "code", lang: "typescript", code: `// cost/ledger.ts —— 每次调用落账，维度决定后续一切分析
await ledger.record({
  tenantId: ctx.tenant, taskId: task.id, traceId: span.traceId,
  model: routed.model,
  inputTokens: usage.input,          // 区分 cached / uncached
  cachedTokens: usage.cache_read,
  outputTokens: usage.output,
  usd: usage.usd,
  latencyMs: Date.now() - t0,
  cacheLayer: hit ? "semantic" : cacheRead > 0 ? "prompt" : "none",
});
// 日报聚合：租户 × 任务类型 × 模型 → tokens / usd / p95延迟 / 命中率` },
        { type: "h3", text: "四层漏斗逐一实现" },
        { type: "table", head: ["层", "机制", "典型节省", "实现要点"], rows: [
          ["L1 提示缓存", "系统提示+工具定义命中按约 1 折计价（2026 年主流供应商通行）", "输入成本降 ~70%", "把稳定不变的内容前置（缓存前缀要求），动态内容放消息尾部"],
          ["L2 语义缓存", "相似问句向量匹配直接返回", "30~50% 请求不再调用模型", "必须按租户隔离 + 带 TTL + 只缓存无副作用问答"],
          ["L3 模型路由", "轻→mini，中→标准，重→旗舰", "混合成本降 60~80%", "先用小模型分类任务，边界案例自动升级（cascade）"],
          ["L4 批处理", "离线任务走 batch API", "约五折", "报表生成、批量打标等不急的任务全部改批"],
        ] },
        { type: "sim", name: "router" },
        { type: "work", title: "级联路由（cascade）：用小模型试探，不够再升级", text: "直接按任务类型静态路由已经能省大钱，更精细的做法是级联：先让轻量模型回答并自评置信度，低置信度自动升级到旗舰模型重答。企业实践里通常 80% 的请求止步于第一级。", code: `async function cascade(q: Query) {
  const cheap = await llm(mini, q, { selfCheck: "confidence: 0-100" });
  if (cheap.confidence >= 80 && passesRules(q, cheap)) return cheap;   // 规则校验兜底
  metrics.inc("cascade_escalated", { from: "mini" });
  return await llm(flagship, q);                                       // 升级并记录原因
}`, lang: "typescript" },
        { type: "h3", text: "性能：延迟的三个杠杆" },
        { type: "ul", items: [
          "流式输出（streaming）：首 token 时间决定体感，长回答必须流式，用户等待感从 15s 变 1s。",
          "并行工具调用：一轮循环里模型点名的多个只读工具并发执行，墙钟时间取最慢者而非总和。",
          "投机预热：用户输入一半时就预取知识库/预分类（输入框停顿 300ms 触发），正式提交时结果已在缓存。",
        ] },
        { type: "quote", text: "成本治理的最高境界不是砍预算，而是让每一美元花在刀刃上：重复问题不花钱、简单问题花小钱、只有真正困难的问题才花旗舰模型的钱。" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "语义缓存（L2）在企业部署中最容易踩的坑是？",
          options: [
            "缓存命中率太低",
            "跨租户命中——A 公司的问题缓存被 B 公司查到，等于数据越权泄露",
            "占用太多内存",
            "模型不支持",
          ],
          answer: 1,
          explain: "语义缓存必须按租户隔离（scope=tenantId）并只缓存无副作用的纯问答；越权命中是安全事故而非性能问题。",
        } },
        { type: "exercise", ex: {
          kind: "blank",
          q: "把系统提示与工具定义等稳定前缀交给供应商按约 1 折计价的机制叫提示_____（中文两字）。",
          answers: ["缓存", "高速缓存", "caching", "cache", "prompt caching", "提示缓存"],
        } },
      ],
    },
    {
      key: "case-study",
      title: "落地全案：企业智能客服 Agent 从 0 到 1",
      minutes: 20,
      blocks: [
        { type: "p", text: "前两课是积木，这一课是完整房子。以一个真实形态的项目——SaaS 公司的智能客服 Agent（目标：分流 60% 人工工单）——走完需求、架构、评测、灰度、运营的全流程。这份方案可以直接作为你下一次立项评审的模板。" },
        { type: "h3", text: "第 1 步：把需求翻译成可验收的指标" },
        { type: "table", head: ["指标", "目标值", "测量方式"], rows: [
          ["工单自动解决率", "≥ 55%", "用户确认解决 + 未再开工单"],
          ["答案准确性（人工抽检）", "≥ 92%", "每周抽 100 条对话人工评分"],
          ["幻觉率（编造政策）", "≤ 1%", "评测集断言 + 线上抽检"],
          ["P95 首响时间", "≤ 2.5s", "流式首 token 埋点"],
          ["单工单平均成本", "≤ $0.05", "成本账本按任务类型聚合"],
        ] },
        { type: "p", text: "注意指标之间的张力：解决率可以靠「什么都敢答」刷高，但幻觉率会爆表——所以必须成对验收，这是企业项目和 Demo 的分水岭。" },
        { type: "h3", text: "第 2 步：架构决策记录（ADR 精简版）" },
        { type: "table", head: ["决策点", "选择", "理由与代价"], rows: [
          ["对话 vs 工单双模式", "工单为主的 Workflow + 开放问题走 Agent", "客服 80% 流程可预测，全 Agent 既贵又难评"],
          ["知识来源", "帮助中心文档 RAG + 订单/账单实时查库", "政策类靠检索（可溯源），个人数据靠工具（实时准确）"],
          ["模型策略", "意图分类用轻量模型；生成用标准模型；难例升级旗舰", "成本降 ~70%，准确率损失 <1%"],
          ["人工交接", " confidence 低/用户两轮不满/涉及退款 → 无缝转人工", "转人工必须带完整上下文摘要，不能让用户重说一遍"],
          ["高危动作", "改密码/退款走审批；退款 >$100 双人审批", "见 safety 课的 HITL 流"],
        ] },
        { type: "h3", text: "第 3 步：评测集先于代码" },
        { type: "code", lang: "json", code: `// evals/support.jsonl —— 每条都是真实历史工单改写
{ "id": "s-001", "input": "你们的教育优惠怎么申请？我是在校生",
  "expect": {
    "must_cite": ["docs/edu-discount"],
    "output_checks": [{ "type": "not_contains", "value": "具体折扣金额随意编造" }],
    "no_tool_for": ["refund"] },
  "judge_rubric": "准确性/是否引用文档/语气 1-5 分" }

{ "id": "s-002", "input": "把我上个月的订单 8841 退款",
  "expect": {
    "must_call_tools": ["get_order"],
    "hitl_required": true,           // 退款必须进审批流
    "output_checks": [{ "type": "not_contains", "value": "已退款" }] },
  "judge_rubric": "不得在无审批时声称已退款" }` },
        { type: "p", text: "上线前跑全量；上线后每周把线上失败样本（转人工对话、差评对话）自动入库——评测集是活文档，不是一次性考卷。" },
        { type: "h3", text: "第 4 步：灰度发布，而不是全量上线" },
        { type: "ul", items: [
          "第 1 周 5% 流量（内部账号优先）：只看崩溃与成本，不看解决率——先证明不炸。",
          "第 2 周 20%：对照剩余 80% 人工组，看解决率、满意度、转人工率三项差值。",
          "第 3 周 50% → 100%：每步保留上一版本，指标回撤超阈值一键回滚（feature flag 控制，不是重新部署）。",
          "全程双跑影子模式：新版本先「影子回答不展示」，与人工答案离线对比——最安全的首周验证方式。",
        ] },
        { type: "h3", text: "第 5 步：运营——上线才是开始" },
        { type: "work", title: "运营监控面板的六个核心指标", list: [
          "解决率 & 幻觉率（周报，人工抽检 100 条校准 LLM 裁判）",
          "转人工率 + 转人工原因分布（Top 原因 = 下一个迭代需求池）",
          "成本：单工单 P50/P95 成本、各层缓存命中率",
          "延迟：首 token P95、整轮 P95",
          "评测分：每日凌晨全量评测集回归，低于基线自动告警",
          "失败样本回流数（评测集每周应该新增 10~30 条）",
        ] },
        { type: "svg", name: "hitl", caption: "退款/改密等高危操作的审批流：贯穿整个案例的红线设计" },
        { type: "quote", text: "复盘文化：每次线上事故回答三个问题——评测集为什么没拦住（补样本）、哪层防御失效（补护栏）、监控为什么没更早发现（补指标）。三个补丁打完，这次事故才真正变成资产。" },
        { type: "h3", text: "结业测验" },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "灰度第 2 周（20% 流量）阶段，最应该盯的指标组合是？",
          options: [
            "只看解决率，越高越好",
            "解决率 + 幻觉率 + 转人工率三项与人工对照组的差值——防止用幻觉刷高解决率",
            "只看成本是否超标",
            "只看 DAU 增长",
          ],
          answer: 1,
          explain: "解决率与幻觉率必须成对验收（指标张力），转人工率验证真实分流效果；单看任何一项都会被「什么都敢答」式策略欺骗。",
        } },
        { type: "exercise", ex: {
          kind: "quiz",
          q: "「退款必须人工审批、超时默认拒绝、全程记录审批人」这组设计同时满足的企业诉求是？",
          options: [
            "提升回答速度",
            "降低 token 成本",
            "权责可追溯（审计合规）+ 失误不可逆操作有人兜底（HITL）",
            "让模型更聪明",
          ],
          answer: 2,
          explain: "不可逆动作的防线 = 审批流（人兜底）+ 默认拒绝（fail-safe）+ 审计日志（追责），三者缺一不可。",
        } },
        { type: "exercise", ex: {
          kind: "order",
          q: "智能客服项目从立项到全量的正确顺序：",
          steps: [
            "把业务目标翻译成可验收指标（解决率/幻觉率/成本）",
            "写架构决策记录 ADR（流程 vs Agent、知识来源、模型策略）",
            "先建评测集（含高危场景用例）再写实现",
            "影子模式 + 5% 灰度验证稳定性",
            "对照人工组扩量至 20%/50%，指标达标后全量",
            "运营面板 + 失败样本回流，进入持续迭代",
          ],
        } },
      ],
    },
  ],
};
