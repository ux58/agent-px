import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Factory,
  MousePointerClick,
  PartyPopper,
  Puzzle,
  Search,
  TrendingUp,
} from "lucide-react";
import { STAGES_DATA, ALL_LESSONS, lessonTouched } from "../types";
import type { ProgressMap, Stage } from "../types";
import { GLOSSARY } from "../data";
import { STAGE_META, LessonCard } from "./LessonCard";
import { StageCarousel } from "./StageCarousel";
import { useActiveBox } from "./Slider";
import type { CSSProperties, RefObject } from "react";

const TOPICS: { icon: string; name: string; keys: string[] }[] = [
  { icon: "🔁", name: "Agent 循环", keys: ["agent-loop", "first-agent", "planning"] },
  { icon: "🛠", name: "工具调用", keys: ["tool-use", "mcp"] },
  { icon: "🪟", name: "上下文工程", keys: ["context-engineering", "memory", "cost-engineering"] },
  { icon: "🔌", name: "MCP 协议", keys: ["mcp", "prod-architecture"] },
  { icon: "🎒", name: "Skill 开发", keys: ["skills", "memory"] },
  { icon: "🕸", name: "多智能体", keys: ["multi-agent", "protocol-ecosystem"] },
  { icon: "⌨️", name: "编程智能体", keys: ["coding-agents", "skills"] },
  { icon: "🖥", name: "Computer Use", keys: ["computer-use", "agent-loop"] },
  { icon: "📚", name: "RAG 检索", keys: ["rag", "memory"] },
  { icon: "📊", name: "评测驱动", keys: ["evals", "case-study", "capstone"] },
  { icon: "🛡", name: "安全护栏", keys: ["safety", "prod-architecture"] },
  { icon: "🔭", name: "可观测性", keys: ["observability", "prod-architecture"] },
  { icon: "🤝", name: "协议生态", keys: ["mcp", "protocol-ecosystem"] },
  { icon: "🏭", name: "企业架构", keys: ["prod-architecture", "case-study"] },
  { icon: "💰", name: "成本工程", keys: ["cost-engineering"] },
  { icon: "🧠", name: "LLM 基础", keys: ["llm-basics", "prompt-engineering"] },
];

const TABS = [
  { id: "all", label: "全部课程" },
  { id: "stage", label: "按阶段" },
  { id: "topic", label: "按主题" },
  { id: "doing", label: "继续学习" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const TRY_CHIPS = [
  { label: "提示词", href: "#/course/prompt-engineering" },
  { label: "MCP", href: "#/course/mcp" },
  { label: "多智能体", href: "#/course/multi-agent" },
  { label: "成本工程", href: "#/course/cost-engineering" },
  { label: "术语表", href: "#/glossary" },
];

const SIMS = [
  { name: "loop", label: "Agent 循环模拟器" },
  { name: "mcp", label: "MCP 握手模拟器" },
  { name: "skill", label: "Skill 渐进加载" },
  { name: "prompt", label: "提示词体检" },
  { name: "multiagent", label: "多智能体协作" },
  { name: "contextwin", label: "上下文窗口" },
  { name: "router", label: "模型路由成本" },
];

const WHY = [
  { ico: Puzzle, title: "先机制后名词", text: "MCP、Skill、多智能体这些热词，背后都是「循环 + 工具 + 上下文」的变体。先吃透机制，新概念出现时你一眼就能看穿它的本质。" },
  { ico: MousePointerClick, title: "每课必动手", text: "七个可交互模拟器把机制变成动画：亲手驱动 Agent 循环、握手 MCP、体验上下文溢出、算一算企业级成本账。" },
  { ico: Factory, title: "企业级实践", text: "每课配「企业实践」板块：生产级代码、上线检查清单、灰度方案、审计 Schema——是能直接抄进工作的方案，不是玩具 Demo。" },
  { ico: TrendingUp, title: "进度可衡量", text: "每题即时判分（可重试）、逐题记录进度，Rust 后端跨端同步——学到哪、掌握哪，一目了然。" },
];

const FAQ = [
  { q: "需要什么基础？", a: "会用命令行、写过任意一门语言就够。阶段 1 从零建立大模型直觉，不要求数学推导；阶段 6 的企业方案配有可直接套用的配置与代码模板。" },
  { q: "必须按顺序学吗？", a: "推荐顺序（机制层层递进），但每课自成一体。急用某项技能时，切到「按主题」Tab 直达——比如只学 MCP 协议或成本优化。" },
  { q: "练习答错了怎么办？", a: "单选/排序/连线都有「再试一次」；进度按题记录，答错不影响其他题。一门课的练习全部通过即视为达成该阶段毕业标准。" },
  { q: "学习进度保存在哪？", a: "浏览器本地即时保存，Rust 后端启动时自动同步（顶栏绿点指示）。换设备、清缓存后仍可从服务端续学。" },
  { q: "学完能达到什么水平？", a: "能独立设计并落地生产级 Agent 系统：平台架构、成本工程、评测门禁、安全纵深全链路，并以智能客服全案作为可复用的立项模板。" },
];

type Hit =
  | { kind: "课程"; title: string; sub: string; href: string }
  | { kind: "术语"; title: string; sub: string; href: string }
  | { kind: "模拟器"; title: string; sub: string; href: string };

/* Tab 栏胶囊滑块：测量激活 tab 的位置，translate + 宽高滑动跟随（与顶栏胶囊同语言） */
function TabSlider({ tab, barRef }: { tab: TabId; barRef: RefObject<HTMLDivElement | null> }) {
  const { box, ready } = useActiveBox(barRef, `[data-tab="${tab}"]`, tab);
  return (
    <div
      className="tabs-slider"
      data-ready={ready ? "1" : "0"}
      style={box ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h } : undefined}
      aria-hidden="true"
    />
  );
}

/* applore 式 hero 搜索：课程 / 术语 / 模拟器全站检索 */
function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const out: Hit[] = [];
    for (const e of ALL_LESSONS) {
      if (e.lesson.title.toLowerCase().includes(k) || e.stage.title.toLowerCase().includes(k)) {
        out.push({ kind: "课程", title: e.lesson.title, sub: `阶段 ${e.stage.id} · ${e.stage.title}`, href: `#/course/${e.lesson.key}` });
      }
    }
    for (const t of GLOSSARY) {
      if (t.term.toLowerCase().includes(k) || t.en.toLowerCase().includes(k)) {
        out.push({ kind: "术语", title: t.term, sub: t.en, href: "#/glossary" });
      }
    }
    for (const s of SIMS) {
      if (s.label.toLowerCase().includes(k) || s.name.includes(k)) {
        out.push({ kind: "模拟器", title: s.label, sub: "交互沙盒", href: "#/sandbox" });
      }
    }
    return out.slice(0, 8);
  }, [q]);

  const go = (href: string) => {
    window.location.hash = href;
    setOpen(false);
    setQ("");
  };

  return (
    <div className="hero-search" ref={boxRef}>
      <div className="hs-input-wrap">
        <Search size={17} className="hs-icon" />
        <input
          className="hs-input"
          placeholder="搜索课程、术语、模拟器…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) go(hits[0].href);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <kbd className="hs-kbd">⏎</kbd>
      </div>
      {open && q.trim() && (
        <>
          <div className="hs-mask" onClick={() => setOpen(false)} />
          <div className="hs-drop">
            {hits.length === 0 && <div className="hs-empty">没有匹配结果，换个关键词试试</div>}
            {hits.map((h, i) => (
              <a key={i} className="hs-item" href={h.href} onClick={() => setOpen(false)}>
                <span className="hs-k">{h.kind}</span>
                <b>{h.title}</b>
                <span className="hs-sub">{h.sub}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StageGroupHead({ stage, progress }: { stage: Stage; progress: ProgressMap }) {
  const meta = STAGE_META[stage.id];
  const done = stage.lessons.filter((l) => lessonTouched(progress[l.key])).length;
  return (
    <div className="sg-head" style={{ "--sc": meta.color } as CSSProperties}>
      <span className="sg-dots">
        {stage.lessons.map((l, i) => (
          <i key={l.key} className={lessonTouched(progress[l.key]) ? "on" : ""}>{i + 1}</i>
        ))}
      </span>
      <b>{stage.title}</b>
      <span className="sg-sub">{stage.tagline}</span>
      <span className={`sg-count ${done === stage.lessons.length ? "full" : ""}`}>
        {done === stage.lessons.length ? "✓ 已毕业" : `${done}/${stage.lessons.length} 课`}
      </span>
    </div>
  );
}

export function Home({ progress }: { progress: ProgressMap }) {
  const [tab, setTab] = useState<TabId>("all");
  const tabsRef = useRef<HTMLDivElement>(null);
  const total = ALL_LESSONS.length;
  const doneCount = ALL_LESSONS.filter((x) => lessonTouched(progress[x.lesson.key])).length;
  const next = ALL_LESSONS.find((x) => !lessonTouched(progress[x.lesson.key]));
  const firstKey = ALL_LESSONS[0].lesson.key;
  const pct = Math.round((doneCount / total) * 100);
  const remaining = ALL_LESSONS.filter((x) => !lessonTouched(progress[x.lesson.key]));
  const byKey = (key: string) => ALL_LESSONS.find((x) => x.lesson.key === key)!;

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">AI AGENT 系统课</p>
        <h1>
          从大模型直觉
          <br />
          到企业级落地
        </h1>
        <p className="hero-sub">
          体系化恰恰是稀缺品。{total} 节课 · 6 个进阶阶段：图文机制 + 可动手的模拟器
          + 即时判分的练习 + 真实工程实践，系统玩转 AI Agent 开发。
        </p>

        <SearchBox />

        <div className="try-row">
          <span>Try:</span>
          {TRY_CHIPS.map((c) => (
            <a key={c.label} className="try-chip" href={c.href}>{c.label}</a>
          ))}
        </div>

        <div className="hero-actions">
          {next ? (
            <a className="btn btn-primary btn-lg" href={`#/course/${next.lesson.key}`}>
              {doneCount === 0 ? "开始学习" : `继续 · ${next.lesson.title}`}
              <ArrowRight size={16} />
            </a>
          ) : (
            <a className="btn btn-primary btn-lg" href="#/lab"><PartyPopper size={16} /> 已全部学完 · 查看成果</a>
          )}
          <a className="btn btn-lg" href="#/sandbox">玩玩模拟器</a>
        </div>

        <div className="hero-progress">
          <div className="hp-track"><div style={{ width: `${pct}%` }} /></div>
          <span className="hp-num">{doneCount}/{total} 课 · {pct}%</span>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div className="hs-left">
            <p className="eyebrow">CURRICULUM</p>
            <h2>学习路线</h2>
            <p className="section-sub">按顺序学效果最佳；每课 12~20 分钟，练习全部通过即达成该阶段毕业标准。</p>
          </div>
          <a className="see-all" href="#/lab">我的进度 <ArrowRight size={14} /></a>
        </div>
        <StageCarousel progress={progress} />

        {/* applore 式大数字统计带 */}
        <div className="stat-strip">
          <div className="stat"><b>{STAGES_DATA.length}</b><span>进阶阶段</span></div>
          <div className="stat"><b>{total}</b><span>系统课程</span></div>
          <div className="stat"><b>7</b><span>互动模拟器</span></div>
          <div className="stat"><b>{ALL_LESSONS.reduce((n, e) => n + e.lesson.blocks.filter((b) => b.type === "work").length, 0)}</b><span>企业实践板块</span></div>
          <div className="stat"><b>{GLOSSARY.length}</b><span>术语词条</span></div>
        </div>

        <div className="tabs" role="tablist" ref={tabsRef}>
          <TabSlider tab={tab} barRef={tabsRef} />
          {TABS.map((t) => (
            <button
              key={t.id}
              data-tab={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "doing" && remaining.length > 0 && <span className="tab-badge">{remaining.length}</span>}
            </button>
          ))}
        </div>

        <div className="tabpane" key={tab}>

        {tab === "all" && (
          <div className="lc-grid">
            {ALL_LESSONS.map((e) => (
              <LessonCard key={e.lesson.key} entry={e} progress={progress} />
            ))}
          </div>
        )}

        {tab === "stage" && (
          <>
            {STAGES_DATA.map((s) => (
              <div key={s.id} className="stage-group">
                <StageGroupHead stage={s} progress={progress} />
                <div className="lc-grid">
                  {s.lessons.map((l) => (
                    <LessonCard key={l.key} entry={byKey(l.key)} progress={progress} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "topic" && (
          <div className="topic-grid">
            {TOPICS.map((t) => (
              <div className="topic-card" key={t.name}>
                <div className="topic-head"><span className="topic-ico">{t.icon}</span>{t.name}</div>
                <div className="topic-chips">
                  {t.keys.map((k) => (
                    <a key={k} href={`#/course/${k}`}>
                      {lessonTouched(progress[k]) ? "✓ " : ""}{byKey(k).lesson.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "doing" && (
          <div className="doing-wrap">
            {remaining.length > 0 ? (
              <>
                <p className="doing-tip">
                  还剩 {remaining.length} 课 —— 下一步：<b>{next?.lesson.title}</b>
                </p>
                <div className="lc-grid">
                  {remaining.map((e) => (
                    <LessonCard key={e.lesson.key} entry={e} progress={progress} />
                  ))}
                </div>
              </>
            ) : (
              <div className="doing-empty">
                <PartyPopper size={34} />
                <b>全部 {total} 课已完成！</b>
                <span>去<a href="#/lab">实验室</a>查看学习成果，或到<a href="#/sandbox">沙盒</a>复习模拟器。</span>
              </div>
            )}
          </div>
        )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div className="hs-left">
            <p className="eyebrow">WHY IT WORKS</p>
            <h2>为什么这样学</h2>
            <p className="section-sub">对比碎片化刷文，体系化学习的四个抓手：</p>
          </div>
        </div>
        <div className="stage-grid why-grid">
          {WHY.map(({ ico: Ico, title, text }) => (
            <div className="stage-card why-card" key={title}>
              <span className="why-ico"><Ico size={19} /></span>
              <h3>{title}</h3>
              <p className="tagline">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div className="hs-left">
            <p className="eyebrow">FAQ</p>
            <h2>常见问题</h2>
          </div>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}<span className="faq-x">＋</span></summary>
              <div className="faq-body">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <div className="start-banner">
        <div>
          <b>准备好了吗？</b>
          <span>{doneCount > 0 ? `已学 ${doneCount}/${total} 课，` : ""}{total} 节课 · 约 4.5 小时 · 从直觉到企业级落地方案</span>
        </div>
        <a className="btn btn-primary btn-lg" href={`#/course/${next?.lesson.key ?? firstKey}`}>
          {doneCount > 0 ? "继续学习" : "开始学习"} <ArrowRight size={16} />
        </a>
      </div>
    </>
  );
}
