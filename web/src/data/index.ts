import type { Stage } from "../types";
import { STAGE1 } from "./stage1";
import { STAGE2 } from "./stage2";
import { STAGE3 } from "./stage3";
import { STAGE4 } from "./stage4";
import { STAGE5 } from "./stage5";
import { STAGE6 } from "./stage6";

export const STAGES: Stage[] = [STAGE1, STAGE2, STAGE3, STAGE4, STAGE5, STAGE6];

/** 术语表 */
export type Term = { term: string; en: string; def: string };

export const GLOSSARY: Term[] = [
  { term: "大语言模型", en: "LLM", def: "在海量文本上训练的概率接龙机器：给定前文，预测下一个 token。" },
  { term: "令牌", en: "Token", def: "模型的文字计量单位，中文约 1 字 ≈ 1~2 token；API 按 token 计费。" },
  { term: "上下文窗口", en: "Context Window", def: "模型单次生成能看见的文字总量，即它的全部工作记忆。" },
  { term: "幻觉", en: "Hallucination", def: "模型对不知道的事编造高概率似真的答案。靠检索与工具治本。" },
  { term: "温度", en: "Temperature", def: "控制输出随机性的参数。0 = 稳定可复现，1 = 更有创意。" },
  { term: "系统提示", en: "System Prompt", def: "每次生成都会读的顶层指令：角色、约束、流程、格式。" },
  { term: "智能体", en: "Agent", def: "在循环中自主决策使用工具以达成目标的 LLM 应用。三要素：循环、工具、自主决策。" },
  { term: "工作流", en: "Workflow", def: "人写死流程、模型填空的编排方式；比 Agent 便宜稳定，适合可预测任务。" },
  { term: "工具调用", en: "Tool Use", def: "模型按 JSON Schema 选择并调用外部函数的机制，是 Agent 的手脚。" },
  { term: "函数调用", en: "Function Calling", def: "工具调用在各家 API 中的常见别名。" },
  { term: "循环", en: "Loop", def: "Agent 运行时核心：思考 → 行动 → 观察，直到满足停止条件。" },
  { term: "停止条件", en: "Stop Condition", def: "结束循环的判据：模型自认完成 / 步数上限 / 人工确认点。" },
  { term: "上下文工程", en: "Context Engineering", def: "管理窗口内一切信息（提示、历史、工具结果）的工程学科。" },
  { term: "压缩", en: "Compaction", def: "把旧对话摘要化以腾出窗口空间的手法。" },
  { term: "模型上下文协议", en: "MCP", def: "连接 AI 应用与数据源/工具的开放标准，把 M×N 集成变成 M+N。" },
  { term: "宿主", en: "MCP Host", def: "用户面对的 AI 应用（Claude Desktop、Cursor 等），管理连接与权限。" },
  { term: "服务器", en: "MCP Server", def: "封装某外部系统能力的轻量程序，暴露 tools/resources/prompts。" },
  { term: "技能", en: "Skill", def: "一个含 SKILL.md 的文件夹：教模型某类任务的做事方法，渐进式加载省上下文。" },
  { term: "渐进式加载", en: "Progressive Disclosure", def: "名字常驻 → 正文按需 → 附件再按需的三级加载设计。" },
  { term: "检索增强生成", en: "RAG", def: "回答前先检索知识库、把片段拼进上下文再生成，可溯源、治过时知识。" },
  { term: "嵌入", en: "Embedding", def: "把文本映射为向量的技术，向量相似度 ≈ 语义相似度。" },
  { term: "重排", en: "Rerank", def: "对粗召回结果精排序的模型，RAG 精度提升性价比最高的一环。" },
  { term: "多智能体", en: "Multi-Agent", def: "多个 Agent 协作的架构：编排者-工人、流水线、辩论等拓扑。" },
  { term: "编排者", en: "Orchestrator", def: "拆解任务、派发工人、汇总结论的主控 Agent。" },
  { term: "上下文隔离", en: "Context Isolation", def: "工人各自独立上下文，编排者只消费结论摘要。" },
  { term: "评测", en: "Evals", def: "用真实案例考卷驱动迭代：改提示词/工具前先建考卷，改完全量回归。" },
  { term: "LLM 裁判", en: "LLM-as-Judge", def: "用更强模型按评分细则给开放式输出打分，需人工抽检校准。" },
  { term: "提示注入", en: "Prompt Injection", def: "把恶意指令藏进模型会读的内容里（网页/PDF/邮件）的攻击。" },
  { term: "纵深防御", en: "Defense in Depth", def: "提示词 → 工具白名单 → 运行时沙箱的三层安全设计。" },
  { term: "最小权限", en: "Least Privilege", def: "Agent 只拿完成任务所需的最小工具与数据权限。" },
  { term: "护栏", en: "Guardrail", def: "防失控的机制：步数上限、调用去重、高危确认、审计日志。" },
  { term: "计划-执行分离", en: "Plan-then-Execute", def: "先只读产出计划、人审后再执行的规划模式。" },
  { term: "提示缓存", en: "Prompt Caching", def: "稳定前缀（系统提示+工具定义）命中后按约 1 折计价的供应商机制。" },
  { term: "语义缓存", en: "Semantic Cache", def: "按问句向量相似度直接返回历史答案；必须按租户隔离。" },
  { term: "模型路由", en: "Model Routing", def: "按任务难度把请求分给轻量/标准/旗舰模型，成本工程核心手段。" },
  { term: "级联路由", en: "Cascade", def: "小模型先答并自评置信度，低置信自动升级大模型重答。" },
  { term: "幂等", en: "Idempotency", def: "同一请求重试不产生重复副作用；企业任务调度的前提。" },
  { term: "灰度发布", en: "Canary Release", def: "按 5%→20%→50%→100% 逐步放量，指标回撤一键回滚。" },
  { term: "影子模式", en: "Shadow Mode", def: "新版本离线作答不展示，与人工答案对比验证，最安全的灰度前奏。" },
  { term: "人工接手", en: "HITL", def: "Human-in-the-Loop：高危操作挂起等人工批准，超时默认拒绝。" },
  { term: "审计日志", en: "Audit Log", def: "只追加、含审批人与 trace_id 的完整操作记录，合规生命线。" },
  { term: "可观测性", en: "Observability", def: "用 trace/log/metric 三支柱还原每次 Agent 运行的全过程。" },
  { term: "熔断器", en: "Circuit Breaker", def: "供应商错误率超阈值时自动降级/排队，防止雪崩。" },
  { term: "架构决策记录", en: "ADR", def: "每个重大选型记录「选择+理由+代价」的一页文档。" },
  { term: "token 账本", en: "Token Ledger", def: "按租户×任务×模型记录每次调用成本，日报聚合出表。" },
  { term: "Agent 卡片", en: "Agent Card", def: "Agent 的自描述 JSON 文档（端点/能力/鉴权），通常挂 /.well-known/，是 A2A 发现机制的名片。" },
  { term: "智能体互联协议", en: "A2A", def: "Agent2Agent：跨组织、异构 Agent 之间发现与委托任务的开放协议，与 MCP（接工具）互补。" },
  { term: "MCP 网关", en: "MCP Gateway", def: "企业统一纳管内部 MCP Server 的中间层：注册、探活、RBAC、限流、审计四合一。" },
  { term: "评测门禁", en: "Eval Gate", def: "评测分数作为 CI 硬门禁：通过率低于阈值或新增失败用例即阻断合并。" },
  { term: "黄金四指标", en: "Golden Signals", def: "Agent 系统的核心监控四件套：成功率、P95 延迟、成本 P95、活跃会话数。" },
  { term: "平均步数", en: "Step Count", def: "一次任务的循环次数。突增是「打转/绕路」的代理指标，比成功率更早暴露问题。" },
  { term: "止损三招", en: "Incident Mitigation", def: "Agent 事故响应：切流量回滚 > 降级转人工/工作流 > 冻结高危工具（只停副作用保留问答）。" },
  { term: "子代理", en: "Subagent", def: "编排者派出的独立上下文工人：带最小工具集执行子任务，只把结论带回主线，保护主上下文洁净。" },
  { term: "计算机使用", en: "Computer Use", def: "让 Agent 看截图、动鼠标键盘操作图形界面的能力；无 API 系统的自动化最后手段，必须跑在沙箱里。" },
  { term: "钩子", en: "Hooks", def: "在工具调用等关键节点前后注入自定义校验/拦截的机制（如 PreToolUse 拦危险命令），机制级防线。" },
  { term: "键值缓存命中率", en: "KV Cache Hit Rate", def: "可缓存前缀命中比例的度量；Manus 称其为 Agent 的北极星指标——未命中意味着整段前缀重新计价重算。" },
  { term: "规格先行", en: "Spec-First", def: "先用「目标+线索+约束+验收」写清任务工单（或让 Agent 出计划人审），确认后再执行的工作范式。" },
  { term: "任务简报", en: "Task Brief", def: "编排者派给子代理的结构化工单：目标、范围、输出格式与预算——不是一句话。" },
  { term: "批处理接口", en: "Batch API", def: "供应商提供的离线批量通道：约五折、24 小时窗口；评测回归、报表、打标类任务的首选。" },
];
