/* 纯 SVG 图示库：全部使用 CSS 变量取色，自动适配明暗主题 */
import type { ComponentType } from "react";

const S = {
  box: { fill: "var(--box)", stroke: "var(--line)" },
  acc: { fill: "var(--acc-soft)", stroke: "var(--acc)" },
  warn: { fill: "var(--warn-soft)", stroke: "var(--warn)" },
  text: { fill: "var(--fg)" },
  dim: { fill: "var(--fg-dim)" },
};

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" fill="var(--fg-dim)" />
      </marker>
      <marker
        id={id + "-a"}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" fill="var(--acc)" />
      </marker>
    </defs>
  );
}

const line = { stroke: "var(--fg-dim)", strokeWidth: 1.6, fill: "none" };
const lineA = { stroke: "var(--acc)", strokeWidth: 2, fill: "none" };

/* 1. Agent 循环 */
function Loop() {
  const id = "ag-loop";
  return (
    <svg viewBox="0 0 640 300" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" className="svg-title">
        Agent 核心循环：Plan → Act → Observe，直到目标达成
      </text>
      <rect x="40" y="70" width="130" height="56" rx="12" style={S.acc} />
      <text x="105" y="96" textAnchor="middle" style={S.text} className="svg-t1">① 目标 Goal</text>
      <text x="105" y="114" textAnchor="middle" style={S.dim} className="svg-t2">任务 + 成功标准</text>

      <rect x="250" y="70" width="130" height="56" rx="12" style={S.box} />
      <text x="315" y="96" textAnchor="middle" style={S.text} className="svg-t1">② 思考 Plan</text>
      <text x="315" y="114" textAnchor="middle" style={S.dim} className="svg-t2">LLM 推理 / 决策</text>

      <rect x="460" y="70" width="130" height="56" rx="12" style={S.box} />
      <text x="525" y="96" textAnchor="middle" style={S.text} className="svg-t1">③ 行动 Act</text>
      <text x="525" y="114" textAnchor="middle" style={S.dim} className="svg-t2">调用工具 Tool Use</text>

      <rect x="250" y="200" width="130" height="56" rx="12" style={S.box} />
      <text x="315" y="226" textAnchor="middle" style={S.text} className="svg-t1">④ 观察 Observe</text>
      <text x="315" y="244" textAnchor="middle" style={S.dim} className="svg-t2">工具结果回填上下文</text>

      <rect x="40" y="200" width="130" height="56" rx="12" style={S.warn} />
      <text x="105" y="226" textAnchor="middle" style={S.text} className="svg-t1">⑤ 校验 Check</text>
      <text x="105" y="244" textAnchor="middle" style={S.dim} className="svg-t2">达标？还是继续</text>

      <path d="M170,98 H250" style={line} markerEnd={`url(#${id})`} />
      <path d="M380,98 H460" style={line} markerEnd={`url(#${id})`} />
      <path d="M525,126 V228 H380" style={line} markerEnd={`url(#${id})`} />
      <path d="M250,228 H170" style={line} markerEnd={`url(#${id})`} />
      <path d="M105,200 V126" style={lineA} markerEnd={`url(#${id}-a)`} />
      <text x="132" y="170" style={S.dim} className="svg-t2">未达标，继续循环</text>
      <text x="60" y="290" style={S.dim} className="svg-t2">达标 → 输出结果并结束（停止条件由模型判断或步数上限控制）</text>
    </svg>
  );
}

/* 2. Agent 解剖 */
function Anatomy() {
  return (
    <svg viewBox="0 0 640 280" className="diagram">
      <rect x="150" y="40" width="340" height="200" rx="16" style={S.acc} />
      <text x="320" y="30" textAnchor="middle" style={S.text} className="svg-title">一个 Agent 的四大组件</text>
      <rect x="175" y="65" width="290" height="40" rx="8" style={{ fill: "var(--acc)", opacity: 0.9 }} />
      <text x="320" y="90" textAnchor="middle" fill="#fff" className="svg-t1">模型 Model（大脑：推理与决策）</text>
      <rect x="175" y="115" width="140" height="36" rx="8" style={S.box} />
      <text x="245" y="138" textAnchor="middle" style={S.text} className="svg-t2">工具 Tools（手脚）</text>
      <rect x="325" y="115" width="140" height="36" rx="8" style={S.box} />
      <text x="395" y="138" textAnchor="middle" style={S.text} className="svg-t2">记忆 Memory（上下文）</text>
      <rect x="175" y="160" width="140" height="36" rx="8" style={S.box} />
      <text x="245" y="183" textAnchor="middle" style={S.text} className="svg-t2">环境 Environment</text>
      <rect x="325" y="160" width="140" height="36" rx="8" style={S.box} />
      <text x="395" y="183" textAnchor="middle" style={S.text} className="svg-t2">编排 Orchestration</text>
      <text x="320" y="222" textAnchor="middle" style={S.dim} className="svg-t2">提示词把它们粘合成一个「会办事的系统」</text>

      <text x="60" y="130" style={S.dim} className="svg-t2">← 用户</text>
      <text x="560" y="130" style={S.dim} className="svg-t2">真实世界 →</text>
    </svg>
  );
}

/* 3. LLM → Workflow → Agent 阶梯 */
function Ladder() {
  const id = "ag-ladder";
  return (
    <svg viewBox="0 0 640 300" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">控制权阶梯：模型自主性逐级上升</text>
      <rect x="40" y="60" width="170" height="70" rx="12" style={S.box} />
      <text x="125" y="90" textAnchor="middle" style={S.text} className="svg-t1">LLM 单次调用</text>
      <text x="125" y="112" textAnchor="middle" style={S.dim} className="svg-t2">问一句答一句</text>

      <rect x="240" y="60" width="170" height="70" rx="12" style={S.box} />
      <text x="325" y="90" textAnchor="middle" style={S.text} className="svg-t1">Workflow 工作流</text>
      <text x="325" y="112" textAnchor="middle" style={S.dim} className="svg-t2">人写死流程，LLM 填空</text>

      <rect x="440" y="60" width="170" height="70" rx="12" style={S.acc} />
      <text x="525" y="90" textAnchor="middle" style={S.text} className="svg-t1">Agent 智能体</text>
      <text x="525" y="112" textAnchor="middle" style={S.dim} className="svg-t2">模型自己规划步骤</text>

      <path d="M210,95 H240" style={line} markerEnd={`url(#${id})`} />
      <path d="M410,95 H440" style={line} markerEnd={`url(#${id})`} />

      <rect x="40" y="170" width="570" height="90" rx="12" style={{ fill: "var(--box)" }} />
      <text x="60" y="198" style={S.dim} className="svg-t2">选型口诀：</text>
      <text x="60" y="222" style={S.text} className="svg-t2">能预测的流程 → Workflow（便宜、稳定、好调试）</text>
      <text x="60" y="246" style={S.text} className="svg-t2">路径无法预知、需要边做边决定 → Agent（灵活，但要给护栏）</text>
    </svg>
  );
}

/* 4. MCP 架构 */
function Mcp() {
  const id = "ag-mcp";
  return (
    <svg viewBox="0 0 640 320" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">MCP 架构：Host 内含多个 Client，1:1 连接 Server</text>

      <rect x="60" y="60" width="300" height="200" rx="14" style={S.acc} />
      <text x="210" y="88" textAnchor="middle" style={S.text} className="svg-t1">宿主 Host（如 Claude / IDE）</text>

      <rect x="85" y="105" width="120" height="40" rx="8" style={{ fill: "var(--acc)", opacity: 0.85 }} />
      <text x="145" y="130" textAnchor="middle" fill="#fff" className="svg-t2">应用逻辑</text>
      <rect x="85" y="155" width="120" height="40" rx="8" style={S.box} />
      <text x="145" y="180" textAnchor="middle" style={S.text} className="svg-t2">MCP Client A</text>
      <rect x="85" y="205" width="120" height="40" rx="8" style={S.box} />
      <text x="145" y="230" textAnchor="middle" style={S.text} className="svg-t2">MCP Client B</text>

      <rect x="225" y="105" width="110" height="140" rx="10" style={{ fill: "var(--warn-soft)" }} />
      <text x="280" y="130" textAnchor="middle" style={S.text} className="svg-t2">权限控制</text>
      <text x="280" y="155" textAnchor="middle" style={S.dim} className="svg-t2">用户确认</text>
      <text x="280" y="175" textAnchor="middle" style={S.dim} className="svg-t2">能力协商</text>
      <text x="280" y="195" textAnchor="middle" style={S.dim} className="svg-t2">采样沙箱</text>

      <rect x="440" y="80" width="160" height="60" rx="10" style={S.box} />
      <text x="520" y="105" textAnchor="middle" style={S.text} className="svg-t1">Server：GitHub</text>
      <text x="520" y="125" textAnchor="middle" style={S.dim} className="svg-t2">issues / PR / 仓库</text>
      <rect x="440" y="160" width="160" height="60" rx="10" style={S.box} />
      <text x="520" y="185" textAnchor="middle" style={S.text} className="svg-t1">Server：数据库</text>
      <text x="520" y="205" textAnchor="middle" style={S.dim} className="svg-t2">只读查询 / Schema</text>

      <path d="M205,175 H440" style={lineA} markerEnd={`url(#${id}-a)`} />
      <path d="M440,200 H205" style={line} markerEnd={`url(#${id})`} />
      <text x="330" y="168" textAnchor="middle" style={S.dim} className="svg-t2">JSON-RPC：tools/list → tools/call</text>
      <text x="330" y="216" textAnchor="middle" style={S.dim} className="svg-t2">结果 / 资源回传</text>
    </svg>
  );
}

/* 5. Skill 生命周期 */
function Skill() {
  const id = "ag-skill";
  return (
    <svg viewBox="0 0 640 260" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">Skill 的渐进式加载：按需展开，不占常驻上下文</text>

      <rect x="40" y="90" width="150" height="64" rx="12" style={S.box} />
      <text x="115" y="116" textAnchor="middle" style={S.text} className="svg-t1">① 常驻：技能名</text>
      <text x="115" y="136" textAnchor="middle" style={S.dim} className="svg-t2">仅几十字节/技能</text>

      <rect x="245" y="90" width="150" height="64" rx="12" style={S.acc} />
      <text x="320" y="116" textAnchor="middle" style={S.text} className="svg-t1">② 命中：读 SKILL.md</text>
      <text x="320" y="136" textAnchor="middle" style={S.dim} className="svg-t2">正文+流程进入上下文</text>

      <rect x="450" y="90" width="150" height="64" rx="12" style={S.box} />
      <text x="525" y="116" textAnchor="middle" style={S.text} className="svg-t1">③ 深挖：加载附属文件</text>
      <text x="525" y="136" textAnchor="middle" style={S.dim} className="svg-t2">脚本 / 模板按需读</text>

      <path d="M190,122 H245" style={line} markerEnd={`url(#${id})`} />
      <path d="M395,122 H450" style={line} markerEnd={`url(#${id})`} />

      <rect x="120" y="185" width="400" height="50" rx="10" style={{ fill: "var(--box)" }} />
      <text x="320" y="212" textAnchor="middle" style={S.dim} className="svg-t2">对比 MCP：工具全量常驻上下文；Skill 只在用到时展开 → 省上下文、可版本管理</text>
    </svg>
  );
}

/* 6. 多智能体拓扑 */
function Multi() {
  const id = "ag-multi";
  return (
    <svg viewBox="0 0 640 300" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">编排者–工人（Orchestrator–Workers）模式</text>

      <rect x="255" y="55" width="130" height="54" rx="12" style={S.acc} />
      <text x="320" y="80" textAnchor="middle" style={S.text} className="svg-t1">编排者</text>
      <text x="320" y="98" textAnchor="middle" style={S.dim} className="svg-t2">拆解任务 / 汇总</text>

      <rect x="45" y="190" width="150" height="54" rx="12" style={S.box} />
      <text x="120" y="215" textAnchor="middle" style={S.text} className="svg-t1">检索工人</text>
      <text x="120" y="233" textAnchor="middle" style={S.dim} className="svg-t2">搜资料 · 读文档</text>
      <rect x="245" y="190" width="150" height="54" rx="12" style={S.box} />
      <text x="320" y="215" textAnchor="middle" style={S.text} className="svg-t1">编码工人</text>
      <text x="320" y="233" textAnchor="middle" style={S.dim} className="svg-t2">写代码 · 跑测试</text>
      <rect x="445" y="190" width="150" height="54" rx="12" style={S.box} />
      <text x="520" y="215" textAnchor="middle" style={S.text} className="svg-t1">评审工人</text>
      <text x="520" y="233" textAnchor="middle" style={S.dim} className="svg-t2">挑错 · 打回重做</text>

      <path d="M300,109 C220,150 160,160 125,190" style={line} markerEnd={`url(#${id})`} />
      <path d="M320,109 V190" style={line} markerEnd={`url(#${id})`} />
      <path d="M340,109 C420,150 480,160 515,190" style={line} markerEnd={`url(#${id})`} />
      <path d="M515,190 C470,160 380,150 335,109" style={lineA} markerEnd={`url(#${id}-a)`} />
      <text x="470" y="150" style={S.dim} className="svg-t2">评审不通过 → 打回</text>
      <text x="320" y="280" textAnchor="middle" style={S.dim} className="svg-t2">每个工人 = 独立 Agent（独立上下文），编排者只看结论 → 各上下文互不污染</text>
    </svg>
  );
}

/* 7. RAG 数据流 */
function Rag() {
  const id = "ag-rag";
  return (
    <svg viewBox="0 0 640 280" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">RAG：先检索，后生成</text>

      <rect x="40" y="60" width="130" height="50" rx="10" style={S.box} />
      <text x="105" y="90" textAnchor="middle" style={S.text} className="svg-t1">用户提问</text>
      <rect x="220" y="60" width="140" height="50" rx="10" style={S.box} />
      <text x="290" y="90" textAnchor="middle" style={S.text} className="svg-t1">向量化 Embed</text>
      <rect x="410" y="45" width="190" height="80" rx="12" style={S.acc} />
      <text x="505" y="75" textAnchor="middle" style={S.text} className="svg-t1">向量库检索 Top-K</text>
      <text x="505" y="97" textAnchor="middle" style={S.dim} className="svg-t2">相似度排序（cosine）</text>

      <path d="M170,85 H220" style={line} markerEnd={`url(#${id})`} />
      <path d="M360,85 H410" style={line} markerEnd={`url(#${id})`} />

      <rect x="410" y="165" width="190" height="60" rx="10" style={S.box} />
      <text x="505" y="192" textAnchor="middle" style={S.text} className="svg-t2">拼接：问题 + 检索片段</text>
      <text x="505" y="212" textAnchor="middle" style={S.dim} className="svg-t2">（可重排/压缩）</text>
      <rect x="150" y="165" width="180" height="60" rx="10" style={S.warn} />
      <text x="240" y="192" textAnchor="middle" style={S.text} className="svg-t1">LLM 生成回答</text>
      <text x="240" y="212" textAnchor="middle" style={S.dim} className="svg-t2">引用来源、可溯源</text>

      <path d="M505,125 V165" style={line} markerEnd={`url(#${id})`} />
      <path d="M410,195 H330" style={line} markerEnd={`url(#${id})`} />

      <text x="40" y="255" style={S.dim} className="svg-t2">没有 RAG：模型只会训练语料里的旧知识，还会一本正经编造 → 检索增强 = 给它开卷考试</text>
    </svg>
  );
}

/* 8. 上下文窗口水位 */
function Context() {
  const id = "ag-ctx";
  return (
    <svg viewBox="0 0 640 300" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">长任务的上下文消耗与治理</text>

      <rect x="60" y="50" width="520" height="70" rx="10" style={S.box} />
      <rect x="60" y="50" width="430" height="70" rx="10" style={{ fill: "var(--acc-soft)" }} />
      <line x1="490" y1="45" x2="490" y2="125" style={{ stroke: "var(--warn)", strokeWidth: 3 }} />
      <text x="80" y="80" style={S.text} className="svg-t1">系统提示 + 工具定义（常驻）</text>
      <text x="80" y="102" style={S.dim} className="svg-t2">对话历史 + 工具结果不断追加……</text>
      <text x="500" y="95" style={{ fill: "var(--warn)" }} className="svg-t2">逼近上限</text>

      <rect x="60" y="150" width="120" height="44" rx="10" style={S.box} />
      <text x="120" y="177" textAnchor="middle" style={S.text} className="svg-t2">裁剪修剪</text>
      <rect x="205" y="150" width="120" height="44" rx="10" style={S.box} />
      <text x="265" y="177" textAnchor="middle" style={S.text} className="svg-t2">历史压缩</text>
      <rect x="350" y="150" width="120" height="44" rx="10" style={S.box} />
      <text x="410" y="177" textAnchor="middle" style={S.text} className="svg-t2">落盘取数</text>
      <rect x="495" y="150" width="120" height="44" rx="10" style={S.box} />
      <text x="555" y="177" textAnchor="middle" style={S.text} className="svg-t2">子代理隔离</text>

      <text x="60" y="235" style={S.dim} className="svg-t2">法则：上下文是稀缺资源。工具结果太长就写文件；已完成的工作写进度笔记；</text>
      <text x="60" y="258" style={S.dim} className="svg-t2">无关历史直接丢。窗口撑满 → 模型「遗忘」最早的指令，质量骤降。</text>
      <path d="M120,150 V125" style={line} markerEnd={`url(#${id})`} />
      <path d="M265,150 V125" style={line} markerEnd={`url(#${id})`} />
      <path d="M410,150 V125" style={line} markerEnd={`url(#${id})`} />
      <path d="M555,150 V125" style={line} markerEnd={`url(#${id})`} />
    </svg>
  );
}

/* 9. 测评-改进回路 */
function Trm() {
  const id = "ag-trm";
  return (
    <svg viewBox="0 0 640 250" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">评测驱动开发：先有考卷，再改学生</text>

      <rect x="40" y="70" width="140" height="56" rx="12" style={S.box} />
      <text x="110" y="96" textAnchor="middle" style={S.text} className="svg-t1">① 建评测集</text>
      <text x="110" y="114" textAnchor="middle" style={S.dim} className="svg-t2">真实任务 30-100 条</text>
      <rect x="250" y="70" width="140" height="56" rx="12" style={S.box} />
      <text x="320" y="96" textAnchor="middle" style={S.text} className="svg-t1">② 跑端到端</text>
      <text x="320" y="114" textAnchor="middle" style={S.dim} className="svg-t2">单测测组件，评测测整体</text>
      <rect x="460" y="70" width="140" height="56" rx="12" style={S.acc} />
      <text x="530" y="96" textAnchor="middle" style={S.text} className="svg-t1">③ LLM 当裁判</text>
      <text x="530" y="114" textAnchor="middle" style={S.dim} className="svg-t2">打分 + 给理由（配人工抽检）</text>
      <rect x="250" y="170" width="140" height="50" rx="12" style={S.warn} />
      <text x="320" y="194" textAnchor="middle" style={S.text} className="svg-t1">④ 依据失败案例</text>
      <text x="320" y="211" textAnchor="middle" style={S.dim} className="svg-t2">改提示词 / 加工具 / 换模型</text>

      <path d="M180,98 H250" style={line} markerEnd={`url(#${id})`} />
      <path d="M390,98 H460" style={line} markerEnd={`url(#${id})`} />
      <path d="M530,126 C530,175 460,195 390,195" style={line} markerEnd={`url(#${id})`} />
      <path d="M250,195 C180,195 110,170 110,126" style={lineA} markerEnd={`url(#${id}-a)`} />
      <text x="140" y="168" style={S.dim} className="svg-t2">回到 ① 迭代</text>
    </svg>
  );
}

/* 10. 提示词层级结构 */
function Prompt() {
  return (
    <svg viewBox="0 0 640 300" className="diagram">
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">系统提示的结构化写法（自上而下优先级递减）</text>
      <rect x="120" y="45" width="400" height="38" rx="8" style={S.acc} />
      <text x="320" y="69" textAnchor="middle" style={S.text} className="svg-t1">身份与目标（你是谁，为谁做什么）</text>
      <rect x="120" y="91" width="400" height="38" rx="8" style={S.box} />
      <text x="320" y="115" textAnchor="middle" style={S.text} className="svg-t1">硬性约束（安全红线、禁止事项、超时步数）</text>
      <rect x="120" y="137" width="400" height="38" rx="8" style={S.box} />
      <text x="320" y="161" textAnchor="middle" style={S.text} className="svg-t1">工作流（何时用哪个工具、先想后做）</text>
      <rect x="120" y="183" width="400" height="38" rx="8" style={S.box} />
      <text x="320" y="207" textAnchor="middle" style={S.text} className="svg-t1">输出格式（结构、长度、语言）</text>
      <rect x="120" y="229" width="400" height="38" rx="8" style={S.box} />
      <text x="320" y="253" textAnchor="middle" style={S.text} className="svg-t2">示例 Few-shot（好答案长什么样）</text>
    </svg>
  );
}

/* 11. 循环失控（Agent 卡死）*/
function Doom() {
  const id = "ag-doom";
  return (
    <svg viewBox="0 0 640 240" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">失控信号与熔断机制</text>
      <circle cx="150" cy="130" r="46" style={S.warn} />
      <text x="150" y="126" textAnchor="middle" style={S.text} className="svg-t1">反复报错</text>
      <text x="150" y="146" textAnchor="middle" style={S.dim} className="svg-t2">同一工具×3</text>
      <circle cx="320" cy="130" r="46" style={S.warn} />
      <text x="320" y="126" textAnchor="middle" style={S.text} className="svg-t1">原地打转</text>
      <text x="320" y="146" textAnchor="middle" style={S.dim} className="svg-t2">A→B→A→B</text>
      <circle cx="490" cy="130" r="46" style={S.warn} />
      <text x="490" y="126" textAnchor="middle" style={S.text} className="svg-t1">步数烧尽</text>
      <text x="490" y="146" textAnchor="middle" style={S.dim} className="svg-t2">预算/上限触顶</text>
      <path d="M196,130 H274" style={line} markerEnd={`url(#${id})`} />
      <path d="M366,130 H444" style={line} markerEnd={`url(#${id})`} />
      <rect x="180" y="35" width="280" height="36" rx="8" style={S.box} />
      <text x="320" y="58" textAnchor="middle" style={S.text} className="svg-t2">护栏：最大步数 · 错误喂回模型自我纠正 · 卡死升级问人</text>
    </svg>
  );
}

/* 12. 安全三层防护 */
function Security() {
  return (
    <svg viewBox="0 0 640 240" className="diagram">
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">纵深防御：不指望模型「意志坚强」，指望机制兜底</text>
      <rect x="60" y="50" width="520" height="46" rx="10" style={{ fill: "var(--acc-soft)", stroke: "var(--acc)" }} />
      <text x="320" y="78" textAnchor="middle" style={S.text} className="svg-t1">第 1 层 · 提示词防线：约束写在系统提示（可被绕过，只是第一道）</text>
      <rect x="60" y="104" width="520" height="46" rx="10" style={S.box} />
      <text x="320" y="132" textAnchor="middle" style={S.text} className="svg-t1">第 2 层 · 工具防线：最小权限、白名单、只读默认、输出过滤</text>
      <rect x="60" y="158" width="520" height="46" rx="10" style={S.box} />
      <text x="320" y="186" textAnchor="middle" style={S.text} className="svg-t1">第 3 层 · 运行时防线：沙箱隔离、人工确认高危操作、审计日志</text>
    </svg>
  );
}

/* 13. 学习路线图（毕业课用；不传 doneStages 时中性显示） */
export function Roadmap({ doneStages }: { doneStages?: boolean[] }) {
  const highlight = doneStages !== undefined;
  const stages = [
    { n: "1", t: "新手村", d: "LLM·Prompt" },
    { n: "2", t: "核心机制", d: "循环·工具" },
    { n: "3", t: "标准协议", d: "MCP·Skill" },
    { n: "4", t: "系统进阶", d: "多Agent·RAG" },
    { n: "5", t: "生产化", d: "评测·安全" },
    { n: "6", t: "企业落地", d: "架构·成本·案例" },
  ];
  const W = 92, GAP = 12, X0 = 16, Y = 44, H = 68;
  return (
    <svg viewBox={`0 0 ${X0 * 2 + 6 * W + 5 * GAP} ${Y + H + 26}`} className="diagram roadmap-svg" role="img" aria-label="六阶段学习路线">
      {stages.map((s, i) => {
        const x = X0 + i * (W + GAP);
        const cx = x + W / 2;
        const done = highlight && doneStages![i];
        const current = highlight && !done && (i === 0 || doneStages![i - 1]);
        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={x - GAP} y1={Y + H / 2} x2={x - 1} y2={Y + H / 2}
                stroke={done ? "var(--acc)" : "var(--line)"}
                strokeWidth={1.5}
                strokeDasharray={done ? undefined : "2 3"}
              />
            )}
            <rect
              x={x} y={Y} width={W} height={H} rx={10}
              fill={done ? "var(--acc-soft)" : "var(--bg-card)"}
              stroke={done || current ? "var(--acc)" : "var(--line)"}
              strokeWidth={done || current ? 1.5 : 1}
              opacity={done || current ? 1 : 0.72}
            />
            <text x={cx} y={Y + 24} textAnchor="middle" style={{ fill: done ? "var(--acc)" : "var(--fg-dim)" }} className="svg-t3" fontWeight={600}>
              阶段 {s.n}{done ? " · 已完成" : ""}
            </text>
            <text x={cx} y={Y + 44} textAnchor="middle" style={S.text} className="svg-t1">
              {s.t}
            </text>
            <text x={cx} y={Y + 60} textAnchor="middle" style={S.dim} className="svg-t3">
              {s.d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* 14. 生产级平台架构 */
function ProdArch() {
  const id = "ag-prodarch";
  return (
    <svg viewBox="0 0 640 320" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">生产级 Agent 平台的五个平面</text>

      <rect x="40" y="48" width="120" height="52" rx="10" style={S.box} />
      <text x="100" y="70" textAnchor="middle" style={S.text} className="svg-t1">接入平面</text>
      <text x="100" y="88" textAnchor="middle" style={S.dim} className="svg-t2">网关·SSO·限流</text>

      <rect x="196" y="48" width="120" height="52" rx="10" style={S.acc} />
      <text x="256" y="70" textAnchor="middle" style={S.text} className="svg-t1">编排平面</text>
      <text x="256" y="88" textAnchor="middle" style={S.dim} className="svg-t2">会话·循环·预算</text>

      <rect x="352" y="48" width="120" height="52" rx="10" style={S.box} />
      <text x="412" y="70" textAnchor="middle" style={S.text} className="svg-t1">工具平面</text>
      <text x="412" y="88" textAnchor="middle" style={S.dim} className="svg-t2">注册中心·沙箱</text>

      <rect x="508" y="48" width="100" height="52" rx="10" style={S.box} />
      <text x="558" y="70" textAnchor="middle" style={S.text} className="svg-t1">模型平面</text>
      <text x="558" y="88" textAnchor="middle" style={S.dim} className="svg-t2">路由·缓存·降级</text>

      <path d="M160,74 H196" style={line} markerEnd={`url(#${id})`} />
      <path d="M316,74 H352" style={line} markerEnd={`url(#${id})`} />
      <path d="M472,74 H508" style={line} markerEnd={`url(#${id})`} />

      <rect x="40" y="140" width="280" height="60" rx="10" style={{ fill: "var(--warn-soft)" }} />
      <text x="180" y="164" textAnchor="middle" style={S.text} className="svg-t1">观测平面</text>
      <text x="180" y="184" textAnchor="middle" style={S.dim} className="svg-t2">OTel 追踪 · 结构化日志 · 成本账本</text>

      <rect x="352" y="140" width="256" height="60" rx="10" style={{ fill: "var(--warn-soft)" }} />
      <text x="480" y="164" textAnchor="middle" style={S.text} className="svg-t1">数据平面</text>
      <text x="480" y="184" textAnchor="middle" style={S.dim} className="svg-t2">向量库 · 会话库 · 审计库（不可篡改）</text>

      <path d="M256,100 V140" style={lineA} markerEnd={`url(#${id}-a)`} />
      <path d="M412,100 V140" style={lineA} markerEnd={`url(#${id}-a)`} />

      <rect x="40" y="228" width="568" height="56" rx="10" style={S.box} />
      <text x="324" y="252" textAnchor="middle" style={S.text} className="svg-t1">质量回路：评测集 → 灰度发布 → 线上监控 → 失败样本回流评测集</text>
      <text x="324" y="272" textAnchor="middle" style={S.dim} className="svg-t2">五个平面各自无状态可扩，质量回路保证越跑越好而不是越跑越歪</text>
    </svg>
  );
}

/* 15. 成本分层（缓存与路由） */
function CostLayers() {
  const id = "ag-cost";
  return (
    <svg viewBox="0 0 640 280" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">成本四层漏斗：请求自上而下逐层过滤</text>

      <rect x="80" y="50" width="480" height="42" rx="10" style={S.acc} />
      <text x="320" y="76" textAnchor="middle" style={S.text} className="svg-t1">L1 提示缓存：系统提示+工具定义命中 ≈ 1 折计价</text>
      <rect x="80" y="102" width="480" height="42" rx="10" style={S.box} />
      <text x="320" y="128" textAnchor="middle" style={S.text} className="svg-t1">L2 语义缓存：相似问句直接返回（命中率 30~50%）</text>
      <rect x="80" y="154" width="480" height="42" rx="10" style={S.box} />
      <text x="320" y="180" textAnchor="middle" style={S.text} className="svg-t1">L3 模型路由：轻→mini / 中→标准 / 重→旗舰</text>
      <rect x="80" y="206" width="480" height="42" rx="10" style={S.box} />
      <text x="320" y="232" textAnchor="middle" style={S.text} className="svg-t1">L4 批处理：离线任务走 batch API（约五折）</text>

      <path d="M320,92 V102" style={lineA} markerEnd={`url(#${id}-a)`} />
      <path d="M320,144 V154" style={lineA} markerEnd={`url(#${id}-a)`} />
      <path d="M320,196 V206" style={lineA} markerEnd={`url(#${id}-a)`} />
      <text x="330" y="100" style={S.dim} className="svg-t2">未命中 ↓</text>
    </svg>
  );
}

/* 16. 人工审批流（HITL） */
function HitlFlow() {
  const id = "ag-hitl";
  return (
    <svg viewBox="0 0 640 250" className="diagram">
      <Defs id={id} />
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">高危操作的人工审批流（HITL）</text>

      <rect x="40" y="80" width="130" height="56" rx="12" style={S.box} />
      <text x="105" y="106" textAnchor="middle" style={S.text} className="svg-t1">Agent 循环</text>
      <text x="105" y="124" textAnchor="middle" style={S.dim} className="svg-t2">要调高危工具</text>

      <rect x="225" y="80" width="140" height="56" rx="12" style={S.warn} />
      <text x="295" y="106" textAnchor="middle" style={S.text} className="svg-t1">审批队列</text>
      <text x="295" y="124" textAnchor="middle" style={S.dim} className="svg-t2">挂起 + 30 分钟超时升级</text>

      <rect x="420" y="80" width="170" height="56" rx="12" style={S.acc} />
      <text x="505" y="106" textAnchor="middle" style={S.text} className="svg-t1">人工审批</text>
      <text x="505" y="124" textAnchor="middle" style={S.dim} className="svg-t2">批准 / 驳回 / 修改参数</text>

      <path d="M170,108 H225" style={line} markerEnd={`url(#${id})`} />
      <path d="M365,108 H420" style={line} markerEnd={`url(#${id})`} />

      <path d="M505,136 C505,200 105,200 105,136" style={lineA} markerEnd={`url(#${id}-a)`} />
      <text x="305" y="212" textAnchor="middle" style={S.dim} className="svg-t2">结果（含审批人）回填上下文，循环继续并全部落审计日志</text>

      <text x="40" y="238" style={S.dim} className="svg-t2">企业红线：删库/对外打款/群发通知/变更生产配置 —— 一律进审批流，超时默认拒绝而非默认通过</text>
    </svg>
  );
}

/* 14. 记忆分层 */
function Memory() {
  return (
    <svg viewBox="0 0 640 230" className="diagram">
      <text x="320" y="26" textAnchor="middle" style={S.text} className="svg-title">记忆的三种形态（都只是上下文工程）</text>
      <rect x="40" y="55" width="170" height="110" rx="12" style={S.box} />
      <text x="125" y="85" textAnchor="middle" style={S.text} className="svg-t1">短期记忆</text>
      <text x="125" y="110" textAnchor="middle" style={S.dim} className="svg-t2">对话历史本身</text>
      <text x="125" y="132" textAnchor="middle" style={S.dim} className="svg-t2">随窗口增长</text>
      <rect x="235" y="55" width="170" height="110" rx="12" style={S.acc} />
      <text x="320" y="85" textAnchor="middle" style={S.text} className="svg-t1">外部记忆</text>
      <text x="320" y="110" textAnchor="middle" style={S.dim} className="svg-t2">向量库 / 数据库</text>
      <text x="320" y="132" textAnchor="middle" style={S.dim} className="svg-t2">RAG 按需检索</text>
      <rect x="430" y="55" width="170" height="110" rx="12" style={S.box} />
      <text x="515" y="85" textAnchor="middle" style={S.text} className="svg-t1">程序性记忆</text>
      <text x="515" y="110" textAnchor="middle" style={S.dim} className="svg-t2">文件 / 笔记 / 配置</text>
      <text x="515" y="132" textAnchor="middle" style={S.dim} className="svg-t2">如 CLAUDE.md、任务清单</text>
      <text x="320" y="200" textAnchor="middle" style={S.dim} className="svg-t2">没有魔法：所谓「记住」，就是把正确的信息在正确的时机放回上下文窗口</text>
    </svg>
  );
}

export const Diagrams: Record<string, ComponentType> = {
  loop: Loop,
  anatomy: Anatomy,
  ladder: Ladder,
  mcp: Mcp,
  skill: Skill,
  multi: Multi,
  rag: Rag,
  context: Context,
  trm: Trm,
  prompt: Prompt,
  doom: Doom,
  security: Security,
  roadmap: Roadmap,
  memory: Memory,
  prodarch: ProdArch,
  cost: CostLayers,
  hitl: HitlFlow,
};
