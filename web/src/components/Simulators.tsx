import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AppWindow,
  ArrowLeftRight,
  BookOpen,
  CircleCheck,
  CircleX,
  Check,
  Coins,
  FileText,
  Network,
  PackageOpen,
  Pause,
  PenLine,
  Play,
  Plug,
  Repeat,
  TriangleAlert,
  X,
} from "lucide-react";

/* 七个可交互模拟器：把课程里的机制变成可亲手操作的动画 */

export function SimulatorFrame({
  ico: Ico,
  title,
  sub,
  children,
}: {
  ico: typeof Repeat;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="simulator">
      <div className="sim-head">
        <span className="sim-ico"><Ico size={17} /></span>
        <div>
          <b>{title}</b>
          <div className="sim-sub">{sub}</div>
        </div>
      </div>
      <div className="sim-body">{children}</div>
    </div>
  );
}

type LogLine = { step: string; tag: string; msg: string };

function Log({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);
  const tagCls: Record<string, string> = {
    用户: "user", 思考: "think", 工具: "tool", 观察: "obs", 错误: "err", 系统: "sys",
  };
  return (
    <div className="sim-log" ref={ref}>
      {lines.map((l, i) => (
        <div className="log-line" key={i}>
          <span className="log-step">{l.step}</span>
          <span className={`log-tag ${tagCls[l.tag] || "sys"}`}>[{l.tag}]</span>
          <span className="log-msg">{l.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ============ 1. Agent 循环模拟器 ============ */

type LoopStep = { tag: string; msg: string; toolBtn?: string };

const LOOP_SCENARIOS: Record<string, { goal: string; steps: LoopStep[] }> = {
  查快递: {
    goal: "帮我查一下订单 A1001 的快递，晚了就提醒我投诉",
    steps: [
      { tag: "思考", msg: "目标是查订单 A1001 的物流。我需要先调用 query_order 工具拿到运单号。" },
      { tag: "工具", msg: "调用 query_order({ order_id: 'A1001' })" },
      { tag: "观察", msg: "返回：{ waybill: 'SF123456', status: '运输中' }" },
      { tag: "思考", msg: "拿到运单号 SF123456，继续调用 track_express 查物流轨迹。" },
      { tag: "工具", msg: "调用 track_express({ waybill: 'SF123456' })" },
      { tag: "错误", msg: "工具超时（网络抖动）" },
      { tag: "思考", msg: "工具失败了，但错误信息很明确。重试一次是合理的，而不是立刻放弃。" },
      { tag: "工具", msg: "重试 track_express({ waybill: 'SF123456' })" },
      { tag: "观察", msg: "返回：[{ time: '08:10', place: '广州转运中心' }, { time: '06:30', place: '深圳揽收' }]" },
      { tag: "思考", msg: "物流正常运输中，没有延误。目标已达成，可以整理输出结束了。" },
      { tag: "系统", msg: "最终答复：订单 A1001（顺丰 SF123456）已从深圳揽收，08:10 到达广州转运中心，运输正常无延误。" },
    ],
  },
  修Bug: {
    goal: "修复 utils.ts 里的 parseDate 报错",
    steps: [
      { tag: "思考", msg: "先读代码找到 parseDate，再跑测试复现报错。" },
      { tag: "工具", msg: "调用 read_file('utils.ts')" },
      { tag: "观察", msg: "parseDate: string => new Date(s).toISOString() …" },
      { tag: "工具", msg: "调用 run_tests()" },
      { tag: "错误", msg: "3 个用例失败：Invalid time value" },
      { tag: "思考", msg: "Invalid time value 说明入参可能为空串。需要处理边界，而不是盲目改格式。" },
      { tag: "工具", msg: "调用 edit_file('utils.ts')：空值提前返回 null" },
      { tag: "工具", msg: "调用 run_tests()" },
      { tag: "观察", msg: "全部通过" },
      { tag: "系统", msg: "最终答复：已修复。根因是空字符串传入 new Date()，现对空值提前返回，测试全部通过。" },
    ],
  },
};

export function AgentLoopSim() {
  const [scene, setScene] = useState<keyof typeof LOOP_SCENARIOS>("查快递");
  const [idx, setIdx] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scen = LOOP_SCENARIOS[scene];
  const finished = idx >= scen.steps.length;

  useEffect(() => {
    if (!playing || finished) return;
    timer.current = setTimeout(() => {
      setLogs((ls) => [...ls, { step: `${ls.length + 1}`, tag: scen.steps[ls.length].tag, msg: scen.steps[ls.length].msg }]);
      setIdx((i) => i + 1);
    }, 850);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, idx, finished, scen]);

  const start = (s: keyof typeof LOOP_SCENARIOS) => {
    setScene(s); setIdx(0); setLogs([]); setPlaying(true);
  };
  const stepOnce = () => {
    if (idx < scen.steps.length) {
      setLogs((ls) => [...ls, { step: `${ls.length + 1}`, tag: scen.steps[idx].tag, msg: scen.steps[idx].msg }]);
      setIdx(idx + 1);
    }
  };

  return (
    <SimulatorFrame ico={Repeat} title="Agent 循环模拟器" sub="亲手驱动 思考 → 行动 → 观察，看模型如何自我纠错">
      <div className="sim-controls">
        <span style={{ color: "var(--fg-dim)", fontSize: 13.5 }}>选择任务：</span>
        {(Object.keys(LOOP_SCENARIOS) as (keyof typeof LOOP_SCENARIOS)[]).map((k) => (
          <button key={k} className={`pill ${scene === k ? "active" : ""}`} onClick={() => start(k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="sim-controls">
        <button className="btn btn-primary" onClick={() => setPlaying((p) => !p)} disabled={finished}>
          {playing ? (<><Pause size={14} /> 暂停</>) : (<><Play size={14} /> 自动运行</>)}
        </button>
        <button className="btn" onClick={stepOnce} disabled={finished || playing}>单步</button>
        <button className="btn" onClick={() => start(scene)}>重新开始</button>
        <span className="ctx-label">进度 {idx}/{scen.steps.length} · 目标：{scen.goal}</span>
      </div>
      <Log lines={logs} />
      {finished && <div className="ex-feedback ok" style={{ marginTop: 10 }}>循环结束：模型判断目标达成 → 停止。注意第 6 步：工具报错后它没有放弃，而是读错误、重试——这就是 Agent 和普通调用的区别。</div>}
    </SimulatorFrame>
  );
}

/* ============ 2. MCP 模拟器 ============ */

const MCP_SERVERS: Record<string, { desc: string; tools: { name: string; desc: string; result: string }[] }> = {
  github: {
    desc: "GitHub MCP Server",
    tools: [
      { name: "list_issues", desc: "列出仓库 issue", result: "issue #12: 登录页白屏 (open)" },
      { name: "create_pr", desc: "创建 Pull Request", result: "PR #48 已创建: fix/login-blank-screen" },
      { name: "search_code", desc: "搜索仓库代码", result: "命中 3 个文件包含 'useState(login)'" },
    ],
  },
  filesystem: {
    desc: "文件系统 MCP Server",
    tools: [
      { name: "read_file", desc: "读取文件内容", result: "'const cfg = { port: 8787 }' (src/config.ts, 12 行)" },
      { name: "write_file", desc: "写入文件", result: "已写入 ./notes/todo.md（需用户确认）" },
      { name: "list_dir", desc: "列出目录", result: "src/ server/ docs/ README.md" },
    ],
  },
};

export function McpSim() {
  const [connected, setConnected] = useState<string[]>([]);
  const [tools, setTools] = useState<{ name: string; desc: string; result: string; server: string; called?: boolean }[]>([]);
  const [rpcLog, setRpcLog] = useState<LogLine[]>([]);
  const seq = useRef(0);

  const connect = (key: string) => {
    if (connected.includes(key)) return;
    const s = MCP_SERVERS[key];
    seq.current += 1;
    const n = seq.current;
    setRpcLog((l) => [
      ...l,
      { step: `#${n}`, tag: "系统", msg: `initialize → ${s.desc}（协议版本协商 capabilities）` },
      { step: `#${n}`, tag: "系统", msg: `tools/list → 返回 ${s.tools.length} 个工具定义` },
      { step: `#${n}`, tag: "观察", msg: `已接入：${s.tools.map((t) => t.name).join(", ")}` },
    ]);
    setConnected((c) => [...c, key]);
    setTools((t) => [...t, ...s.tools.map((tool) => ({ ...tool, server: key }))]);
  };

  const callTool = (i: number) => {
    setTools((ts) => ts.map((t, j) => (j === i ? { ...t, called: true } : t)));
    seq.current += 1;
    setRpcLog((l) => [
      ...l,
      { step: `#${seq.current}`, tag: "工具", msg: `tools/call → ${tools[i].name}({ … })` },
      { step: `#${seq.current}`, tag: "观察", msg: `← ${tools[i].result}` },
    ]);
  };

  return (
    <SimulatorFrame ico={Plug} title="MCP 握手与调用模拟器" sub="体验 Host ↔ Server 的 JSON-RPC 交互全过程">
      <div className="sim-controls">
        <span style={{ color: "var(--fg-dim)", fontSize: 13.5 }}>连接一个 Server：</span>
        {Object.keys(MCP_SERVERS).map((k) => (
          <button key={k} className={`pill ${connected.includes(k) ? "active" : ""}`} disabled={connected.includes(k)} onClick={() => connect(k)}>
            {connected.includes(k) ? (<><Check size={12} /> {MCP_SERVERS[k].desc}</>) : MCP_SERVERS[k].desc}
          </button>
        ))}
        <button className="btn" onClick={() => { setConnected([]); setTools([]); setRpcLog([]); seq.current = 0; }}>
          断开重置
        </button>
      </div>
      <div className="mcp-grid">
        <div className="mcp-pane">
          <h5>Host（模型可见的工具面板）</h5>
          {tools.length === 0 && <div style={{ color: "var(--fg-dim)", fontSize: 13 }}>尚未连接任何 Server。模型此刻什么工具都看不到。</div>}
          {tools.map((t, i) => (
            <div key={t.server + t.name} className={`tool-row ${t.called ? "called" : ""}`}>
              <span className="tname">{t.name}</span>
              <span className="tres">{t.called ? t.result : t.desc}</span>
              <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} disabled={t.called} onClick={() => callTool(i)}>
                {t.called ? "已调用" : "调用"}
              </button>
            </div>
          ))}
        </div>
        <div className="mcp-arrow"><ArrowLeftRight size={20} /></div>
        <div className="mcp-pane">
          <h5>📡 JSON-RPC 消息流</h5>
          <Log lines={rpcLog} />
        </div>
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 13, marginBottom: 0 }}>
        观察点：工具是「连接时批量注册、调用时逐个执行」的。换 Server 不用改模型代码——这就是 MCP 的意义。
      </p>
    </SimulatorFrame>
  );
}

/* ============ 3. Skill 渐进加载模拟器 ============ */

const SKILL_FILES = [
  { name: "pdf/SKILL.md", desc: "技能名：pdf · 何时用：处理 PDF", body: "## 处理 PDF\n1. 用 pdfplumber 提取文本\n2. 表格 → pandas\n3. 输出前先展示预览", cost: 320 },
  { name: "pdf/scripts/extract.py", desc: "附属脚本：提取文本", body: "import pdfplumber\nwith pdfplumber.open(p) as pdf:\n    print('\\n'.join(pg.extract_text() for pg in pdf.pages))", cost: 180 },
  { name: "xlsx/SKILL.md", desc: "技能名：xlsx · 何时用：处理表格", body: "## 处理 Excel\n1. openpyxl 读写\n2. 大文件用流式读取\n3. 公式与样式保留", cost: 300 },
  { name: "frontend-design/SKILL.md", desc: "技能名：前端设计", body: "## 设计原则\n留白、层级、一致性……", cost: 260 },
];

export function SkillSim() {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<"skill" | "mcp">("skill");
  // mcp 策略下工具全量常驻
  const used = SKILL_FILES.reduce((a, f) => a + (loaded.includes(f.name) ? f.cost : 0), 0);
  const total = strategy === "skill" ? used : SKILL_FILES.reduce((a, f) => a + f.cost, 0);
  const budget = 2000;
  const pct = Math.min(100, Math.round((total / budget) * 100));

  return (
    <SimulatorFrame ico={PackageOpen} title="Skill 渐进加载模拟器" sub="对比『全量常驻』与『按需展开』的上下文开销">
      <div className="sim-controls">
        <button className={`pill ${strategy === "skill" ? "active" : ""}`} onClick={() => setStrategy("skill")}>
          策略 A：Skill 渐进加载
        </button>
        <button className={`pill ${strategy === "mcp" ? "active" : ""}`} onClick={() => setStrategy("mcp")}>
          策略 B：工具全量常驻（MCP 常见形态）
        </button>
        <button className="btn" onClick={() => setLoaded([])}>清空已加载</button>
      </div>
      {SKILL_FILES.map((f) => {
        const isOpen = strategy === "mcp" || loaded.includes(f.name);
        return (
          <button
            key={f.name}
            className={`skill-file ${isOpen ? "loaded" : ""}`}
            onClick={() => strategy === "skill" && setLoaded((l) => (l.includes(f.name) ? l : [...l, f.name]))}
            disabled={strategy === "mcp"}
          >
            <span className="sf-name">{isOpen ? <BookOpen size={12} /> : <FileText size={12} />} {f.name}</span>
            <span className="sf-desc"> · {f.desc} · ~{f.cost} tokens</span>
            {isOpen && <pre style={{ margin: "8px 0 0", fontSize: 12 }}>{f.body}</pre>}
          </button>
        );
      })}
      <div className="ctx-meter"><div style={{ width: `${pct}%` }} /></div>
      <div className="ctx-label">
        上下文占用：{total} / {budget} tokens（{pct}%）
        {strategy === "skill" && loaded.length === 0 && " —— Skill 策略下，未点开的技能只占名字那一行"}
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 13, marginBottom: 0 }}>
        点左侧文件模拟模型「命中技能后展开阅读」。同样 4 份资料：Skill 策略按需付费，全量常驻一次性吃光窗口——技能一多，差距就是能不能干活。
      </p>
    </SimulatorFrame>
  );
}

/* ============ 4. 提示词体检模拟器 ============ */

const PROMPT_RULES = [
  { name: "身份与目标", re: /(你是|你扮演|身份|角色|目标|帮(?:助|我))/, tip: "以「你是…」开头，给模型一个清晰的角色和使命" },
  { name: "硬性约束", re: /(不要|禁止|不得|必须|不能|超过|上限|拒绝)/, tip: "写明红线：禁止什么、上限多少，约束越具体越好" },
  { name: "工作流步骤", re: /(先|然后|再|步骤|第一步|流程|依次|之后)/, tip: "把做事顺序写出来：先…然后…最后…，模型会照做" },
  { name: "输出格式", re: /(json|表格|markdown|列表|格式|输出|返回|字数|以内)/, tip: "指定输出结构（JSON/表格/条数），下游才能稳定解析" },
  { name: "示例参考", re: /(例如|比如|示例|few.?shot|样例)/, tip: "给一个好示例，比十句形容词都管用" },
];

export function PromptSim() {
  const [text, setText] = useState(
    "你是一个订票助手，帮我订机票。\n出发地北京，目的地上海，2026-10-20 出发。优先早上 8-10 点的航班。",
  );
  const scores = PROMPT_RULES.map((r) => ({ ...r, hit: r.re.test(text) }));
  const total = scores.filter((s) => s.hit).length;

  return (
    <SimulatorFrame ico={PenLine} title="提示词体检模拟器" sub="实时给 System Prompt 打分，5 维度查漏补缺">
      <div className="prompt-panel">
        <div>
          <textarea className="prompt-editor" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="sim-controls" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setText("帮我订机票")}>载入反面示例</button>
            <button
              className="btn"
              onClick={() =>
                setText(
                  "你是差旅订票助手，为公司员工预订国内航班。\n约束：不订红眼航班；单程票价超过 3000 元必须先向用户确认。\n流程：1) 询问出发地/目的地/日期 2) 查询航班 3) 列出前 3 个选项等待用户选择。\n输出：用表格展示航班号、时间、价格，价格保留到个位。\n示例：| MU5101 | 08:00-10:15 | ¥1240 |",
                )
              }
            >
              载入满分示例
            </button>
          </div>
        </div>
        <div className="score-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b>体检报告</b>
            <span style={{ color: total >= 4 ? "var(--ok)" : total >= 2 ? "var(--warn)" : "var(--err)", fontWeight: 700 }}>
              {total}/5 项达标
            </span>
          </div>
          {scores.map((s) => (
            <div className="score-bar" key={s.name}>
              <span className={`sb-name ${s.hit ? "is-ok" : "is-warn"}`}>
                {s.hit ? <CircleCheck size={13} /> : <TriangleAlert size={13} />} {s.name}
              </span>
              <span className="sb-track"><span className="sb-fill" style={{ width: s.hit ? "100%" : "8%", background: s.hit ? "var(--acc)" : "var(--err)" }} /></span>
              <span className={`sb-val ${s.hit ? "is-ok" : "is-warn"}`}>{s.hit ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--fg-dim)" }}>
            {scores.filter((s) => !s.hit).length === 0
              ? "五项全达标，这份提示词结构完整。真正的优化方向变成：用真实对话不断修补漏洞。"
              : "改进建议：" + scores.filter((s) => !s.hit).map((s) => s.tip).join("；")}
          </div>
        </div>
      </div>
    </SimulatorFrame>
  );
}

/* ============ 5. 多智能体协作模拟器 ============ */

const MA_WORKERS = [
  { id: "research", name: "检索工人", task: "收集竞品定价资料", out: "竞品均价 $25/月，旗舰款 $49" },
  { id: "code", name: "编码工人", task: "实现定价计算模块", out: "pricing.ts 完成，测试 8/8 通过" },
  { id: "review", name: "评审工人", task: "审查代码与结论", out: "发现汇率换算用反了，打回重做" },
];

export function MultiAgentSim() {
  const [phase, setPhase] = useState<"idle" | "dispatch" | "working" | "review" | "rework" | "done">("idle");
  const [active, setActive] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<Record<string, string[]>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const push = (id: string, msg: string, delay?: number) => {
    const emit = () => setBubbles((b) => ({ ...b, [id]: [...(b[id] || []), msg] }));
    if (delay === undefined) emit();
    else timers.current.push(setTimeout(emit, delay));
  };
  const setActiveAt = (fn: (a: string[]) => string[], delay: number) => {
    timers.current.push(setTimeout(() => setActive(fn), delay));
  };

  const run = () => {
    clearTimers();
    setPhase("dispatch"); setActive([]); setBubbles({});
    setActiveAt((a) => [...a, "orch"], 0);
    push("orch", "任务：为 SaaS 产品做一次竞品定价分析并实现计算模块", 200);
    push("orch", "拆解 → 检索工人查资料，编码工人写模块，评审工人把关", 900);
    timers.current.push(setTimeout(() => setPhase("working"), 1600));
    setActiveAt(() => ["research", "code"], 1600);
    push("research", "开工：搜索 5 个竞品的公开定价页", 1800);
    push("code", "开工：先写 pricing.ts 的类型定义", 2000);
    timers.current.push(setTimeout(() => {
      push("research", "产出：竞品均价 $25/月，旗舰款 $49");
      setActive((a) => a.filter((x) => x !== "research"));
    }, 4200));
    timers.current.push(setTimeout(() => {
      push("code", "产出：pricing.ts 完成，测试 8/8 通过");
      setActive((a) => a.filter((x) => x !== "code"));
    }, 5600));
    timers.current.push(setTimeout(() => {
      setPhase("review");
      setActive((a) => [...a, "review"]);
      push("review", "审查中：对照需求逐条核对……");
    }, 6800));
    timers.current.push(setTimeout(() => {
      setPhase("rework");
      push("review", "发现汇率换算用反了！打回给编码工人");
      setActive((a) => [...a.filter((x) => x !== "review"), "code"]);
      push("code", "收到评审意见，修复汇率方向，重跑测试");
    }, 8200));
    timers.current.push(setTimeout(() => {
      push("code", "已修复，测试 10/10 通过");
      setActive((a) => a.filter((x) => x !== "code"));
    }, 10600));
    timers.current.push(setTimeout(() => {
      setPhase("done");
      setActive((a) => [...a, "review"]);
      push("review", "复审通过，质量达标");
    }, 11800));
    timers.current.push(setTimeout(() => {
      setActive((a) => [...a, "orch"]);
      push("orch", "汇总：竞品均价 $25/月；计算模块已实现并通过复审。任务完成。");
    }, 13400));
  };

  const nodeCls = (id: string) =>
    `ma-node ${id === "orch" ? "orch" : ""} ${active.includes(id) ? "working" : ""} ${phase === "done" ? "done" : ""}`;

  return (
    <SimulatorFrame ico={Network} title="多智能体协作模拟器" sub="看编排者如何拆任务、派活、验收，以及评审打回的价值">
      <div className="sim-controls">
        <button className="btn btn-primary" onClick={run} disabled={phase !== "idle" && phase !== "done"}>
          {phase === "idle" ? (<><Play size={14} /> 派发任务</>) : phase === "done" ? "已完成" : "运行中…"}
        </button>
        <button
          className="btn"
          onClick={() => { clearTimers(); setPhase("idle"); setActive([]); setBubbles({}); }}
        >
          重置
        </button>
        <span className="ctx-label">注意评审工人第一次为什么打回——多智能体最大的价值就是「有人把关」</span>
      </div>
      <div className="ma-grid">
        <div className={nodeCls("orch")}>
          <h5>🧭 编排者 Orchestrator</h5>
          {(bubbles["orch"] || []).map((m, i) => <div className="ma-bubble" key={i}>{m}</div>)}
        </div>
        {MA_WORKERS.map((w) => (
          <div className={nodeCls(w.id)} key={w.id}>
            <h5>{w.name}</h5>
            <div className="ma-status">{w.task}</div>
            {(bubbles[w.id] || []).map((m, i) => <div className="ma-bubble" key={i}>{m}</div>)}
          </div>
        ))}
      </div>
    </SimulatorFrame>
  );
}

/* ============ 7. 模型路由与成本模拟器 ============ */

type Task = { id: string; name: string; tin: number; tout: number; vol: number; tier: "轻" | "中" | "重" };
const ROUTER_TASKS: Task[] = [
  { id: "ticket", name: "🎫 工单分类", tin: 600, tout: 80, vol: 30000, tier: "轻" },
  { id: "sql", name: "🗄️ NL2SQL 报表", tin: 2500, tout: 600, vol: 5000, tier: "中" },
  { id: "research", name: "🔬 深度研究", tin: 60000, tout: 8000, vol: 500, tier: "重" },
];

// 每百万 token 单价（美元，示意值）：旗舰 / 标准 / 轻量
const PRICE = {
  flagship: { in: 3, out: 15 },
  standard: { in: 0.8, out: 4 },
  mini: { in: 0.08, out: 0.4 },
};
type ModelKey = "flagship" | "standard" | "mini";
const MODEL_NAME: Record<ModelKey, string> = { flagship: "旗舰模型", standard: "标准模型", mini: "轻量模型" };

type Strategy = "single" | "routed" | "routed_cache";

function pickModel(tier: Task["tier"]): ModelKey {
  return tier === "轻" ? "mini" : tier === "中" ? "standard" : "flagship";
}

function monthlyCost(task: Task, strategy: Strategy) {
  const mIn = (task.tin * task.vol * 30) / 1e6; // 每月输入 M tokens
  const mOut = (task.tout * task.vol * 30) / 1e6;
  const model = strategy === "single" ? "flagship" : pickModel(task.tier);
  let inPrice = PRICE[model].in;
  let outPrice = PRICE[model].out;
  // 路由+缓存：提示缓存命中系统提示与工具定义（约占输入 80%，价格 1 折）；工单再吃 40% 语义缓存
  if (strategy === "routed_cache") {
    inPrice = PRICE[model].in * (0.8 * 0.1 + 0.2);
    const semantic = task.id === "ticket" ? 0.4 : 0;
    return { model, usd: (mIn * inPrice + mOut * outPrice) * (1 - semantic) };
  }
  return { model, usd: mIn * inPrice + mOut * outPrice };
}

export function RouterSim() {
  const [strategy, setStrategy] = useState<Strategy>("single");
  const rows = ROUTER_TASKS.map((t) => ({ task: t, ...monthlyCost(t, strategy) }));
  const total = rows.reduce((a, r) => a + r.usd, 0);
  const maxUsd = Math.max(...rows.map((r) => r.usd), 1);
  const labels: Record<Strategy, string> = {
    single: "全走旗舰模型",
    routed: "分级路由",
    routed_cache: "路由 + 缓存",
  };
  const baseline = ROUTER_TASKS.map((t) => monthlyCost(t, "single").usd).reduce((a, b) => a + b, 0);

  return (
    <SimulatorFrame ico={Coins} title="模型路由与成本模拟器" sub="同样的业务量，三种策略的月账单差一个数量级">
      <div className="sim-controls">
        {(Object.keys(labels) as Strategy[]).map((s) => (
          <button key={s} className={`pill ${strategy === s ? "active" : ""}`} onClick={() => setStrategy(s)}>
            {labels[s]}
          </button>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.task.id} className="score-bar">
          <span className="sb-name">
            {r.task.name} · {r.task.tier} · {r.task.vol / 1000}k/日
          </span>
          <span className="sb-track">
            <span className="sb-fill" style={{ width: `${(r.usd / maxUsd) * 100}%` }} />
          </span>
          <span className="sb-val" style={{ width: 130, textAlign: "right" }}>
            {strategy === "single" ? MODEL_NAME.flagship : MODEL_NAME[r.model]} · ${r.usd.toFixed(0)}/月
          </span>
        </div>
      ))}
      <div className="router-total">
        <b>月度总成本 ≈ ${total.toFixed(0)}</b>
        {strategy !== "single" && (
          <span style={{ color: "var(--ok)" }}>（对比全走旗舰 ${baseline.toFixed(0)}，省 {Math.round((1 - total / baseline) * 100)}%）</span>
        )}
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 13, marginBottom: 0 }}>
        企业实践三板斧：① 分类/抽取类任务下放轻量模型；② 系统提示与工具定义吃提示缓存（1 折计价）；
        ③ 高频重复问句上语义缓存。切到「路由 + 缓存」看看能省多少——省下来的预算正好给深度研究这种重任务用旗舰模型。
      </p>
    </SimulatorFrame>
  );
}

/* ============ 6. 上下文窗口模拟器 ============ */

type Seg = { name: string; tokens: number; color: string };

const CTX_INITIAL: Seg[] = [
  { name: "系统提示", tokens: 1200, color: "#8b5cf6" },
  { name: "工具定义", tokens: 1800, color: "#6366f1" },
  { name: "历史对话", tokens: 1500, color: "#0ea5e9" },
];

export function ContextSim() {
  const LIMIT = 10000;
  const [segs, setSegs] = useState<Seg[]>(CTX_INITIAL);
  const [warnings, setWarnings] = useState<{ lvl: "err" | "ok" | "warn"; msg: string }[]>([]);

  const addWarn = (lvl: "err" | "ok" | "warn", msg: string) =>
    setWarnings((w) => [...w, { lvl, msg }]);
  const used = segs.reduce((a, s) => a + s.tokens, 0);
  const pct = Math.round((used / LIMIT) * 100);

  const add = (name: string, tokens: number, color: string, warn?: string) => {
    if (used + tokens > LIMIT) {
      addWarn("err", `窗口溢出！${name} 需要 ${tokens} tokens，但只剩 ${LIMIT - used}。真实 Agent 此时会出现「遗忘」：最早的指令被挤出窗口。`);
      return;
    }
    setSegs((s) => [...s, { name, tokens, color }]);
    if (warn) addWarn("warn", warn);
  };
  const compact = () => {
    setSegs((s) =>
      s.map((x) =>
        x.name === "历史对话" || x.name === "工具结果"
          ? { ...x, tokens: Math.round(x.tokens * 0.35), name: "历史(已压缩)" }
          : x,
      ),
    );
    addWarn("ok", "已压缩历史：旧对话摘要化，细节丢了但结论保留");
  };
  const offload = () => {
    setSegs((s) => s.filter((x) => !(x.name === "工具结果" && x.tokens > 2000)));
    addWarn("ok", "大结果已写入文件，上下文里只留一行引用路径");
  };

  return (
    <SimulatorFrame ico={AppWindow} title="上下文窗口模拟器" sub="10k tokens 预算内做事，体会『上下文是稀缺资源』">
      <div className="ctxwin">
        <div className="ctxwin-bar">
          {segs.map((s, i) => (
            <div
              key={i}
              className="ctxwin-seg"
              style={{ width: `${(s.tokens / LIMIT) * 100}%`, background: s.color, opacity: 0.88 }}
              title={`${s.name}: ${s.tokens}`}
            >
              <span>{s.tokens >= 800 ? s.name : ""}</span>
            </div>
          ))}
          <div className="ctxwin-seg" style={{ width: `${((LIMIT - used) / LIMIT) * 100}%` }} />
        </div>
        <div className="ctxwin-legend">
          {segs.map((s, i) => (
            <span key={i}><i style={{ background: s.color }} />{s.name} {s.tokens}</span>
          ))}
          <span><i style={{ background: "var(--box)" }} />剩余 {LIMIT - used}</span>
        </div>
        <div className="warnline">{pct >= 85 ? `占用 ${pct}%，逼近上限！接下来每次「大结果直接塞上下文」都会溢出。` : ""}</div>
      </div>
      <div className="sim-controls">
        <button className="btn" onClick={() => add("工具结果", 2500, "#f59e0b", "一次 2500 tokens 的工具结果直接进了窗口——它是最大消耗源")}>
          工具返回大 JSON (+2500)
        </button>
        <button className="btn" onClick={() => add("新对话", 400, "#0ea5e9")}>
          用户继续对话 (+400)
        </button>
        <button className="btn" onClick={compact}>压缩历史</button>
        <button className="btn" onClick={offload}>大结果落盘</button>
        <button className="btn" onClick={() => { setSegs(CTX_INITIAL); setWarnings([]); }}>重置</button>
      </div>
      <div className="warn-list">
        {warnings.slice(-3).map((w, i) => (
          <div key={i} className={`warn-item ${w.lvl}`}>
            {w.lvl === "err" ? <CircleX size={13} /> : w.lvl === "ok" ? <CircleCheck size={13} /> : <TriangleAlert size={13} />}
            <span>{w.msg}</span>
          </div>
        ))}
        {warnings.length === 0 && <span className="warn-empty">试试：连点两次「工具返回大 JSON」会发生什么？再试试先压缩、再落盘的组合拳。</span>}
      </div>
    </SimulatorFrame>
  );
}
