import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import type { ComponentType, LazyExoticComponent, ReactElement } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Factory,
  ListChecks,
  PanelLeft,
  PartyPopper,
  PenLine,
  Square,
  SquareCheck,
  X,
} from "lucide-react";
import type { Block, Lesson, LessonProgress, ProgressMap, Stage } from "../types";
import { STAGES_DATA, exerciseCount } from "../types";
import { ExerciseView } from "./Exercise";

/* 模拟器与图示库均为大模块：懒加载分包，首屏不下载（约 -45KB gzip 前体积） */
/* 懒加载重试包装：chunk 404（部署更新后旧页面引用失效 chunk）时自动重试，
   重试仍失败则触发一次性自愈刷新（加载新 index.html 拿到新 chunk 名）。
   这是「发布后旧标签页白屏、刷新才恢复」的标准解法。 */
let selfHealed = false;
function importWithRetry<T>(load: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await load();
    } catch (err) {
      // 等一小会儿（部署窗口可能正在进行），带 cache-bust 重试一次
      await new Promise((r) => setTimeout(r, 300));
      try {
        return await load();
      } catch {
        if (!selfHealed && !sessionStorage.getItem("agentpx.healed")) {
          selfHealed = true;
          sessionStorage.setItem("agentpx.healed", "1");
          window.location.reload();
        }
        throw err;
      }
    }
  };
}

const SIM_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  loop: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.AgentLoopSim })))),
  mcp: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.McpSim })))),
  skill: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.SkillSim })))),
  prompt: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.PromptSim })))),
  multiagent: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.MultiAgentSim })))),
  contextwin: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.ContextSim })))),
  router: lazy(importWithRetry(() => import("./Simulators").then((m) => ({ default: m.RouterSim })))),
};

/* 图示懒加载实例按 name 缓存：同一课重渲染/翻课时复用同一实例，
   避免 lazy() 每次渲染新建导致 Suspense 反复挂起（内容闪回骨架屏）。 */
const DIAGRAM_CACHE = new Map<string, LazyExoticComponent<ComponentType>>();
function diagramFor(name: string) {
  let c = DIAGRAM_CACHE.get(name);
  if (!c) {
    c = lazy(
      importWithRetry(() =>
        import("../diagrams").then((m) => ({ default: (m.Diagrams[name] ?? (() => null)) as ComponentType })),
      ),
    );
    DIAGRAM_CACHE.set(name, c);
  }
  return c;
}

export function Figure({ name, caption }: { name: string; caption?: string }) {
  const Diagram = diagramFor(name);
  return (
    <figure className="figure">
      <Suspense fallback={<div className="lazy-skel" aria-label="图示加载中" />}>
        <Diagram />
      </Suspense>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** 空闲时预取大分包：进入课程页/沙盒页时图示与模拟器已就绪，零网络等待 */
export function prefetchHeavyChunks() {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      void import("../diagrams");
      void import("./Simulators");
    });
  } else {
    setTimeout(() => {
      void import("../diagrams");
      void import("./Simulators");
    }, 1500);
  }
}

export function Sim({ name }: { name: string }) {
  const SimComp = SIM_COMPONENTS[name];
  if (!SimComp) return null;
  return (
    <Suspense fallback={<div className="lazy-skel" aria-label="模拟器加载中" />}>
      <SimComp />
    </Suspense>
  );
}

type MarkFn = (k: string, f: "page" | "quiz" | "sim" | "done") => void;

/* 企业实践板块 */
function WorkBox({ block }: { block: Extract<Block, { type: "work" }> }) {
  return (
    <div className="work">
      <span className="work-badge"><Factory size={12} /> 企业实践</span>
      <div className="work-title">{block.title}</div>
      {block.text && <p className="work-text">{block.text}</p>}
      {block.list && (
        <ul className="work-list">
          {block.list.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
      {block.code && <CodeBlock lang={block.lang || "code"} code={block.code} />}
    </div>
  );
}

/* 代码块：hover 淡入的一键复制（Clipboard API，降级 execCommand） */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="code-block">
      <span className="cb-lang">{lang}</span>
      <button className={`cb-copy ${copied ? "ok" : ""}`} onClick={copy} aria-label="复制代码">
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "已复制" : "复制"}
      </button>
      <pre>{code}</pre>
    </div>
  );
}

/* 滚动浮现：块进入视口时加 .io-in（一次性，unobserve 即止；降级无动画） */
function Reveal({ children }: { children: ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("io-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("io-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="io-reveal">
      {children}
    </div>
  );
}

/* 可勾选交互清单（本地持久化） */
function Checklist({ block, lessonKey }: { block: Extract<Block, { type: "checklist" }>; lessonKey: string }) {
  const KEY = `agentpx.check.${lessonKey}.${block.title}`;
  const [checked, setChecked] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]") as number[];
    } catch {
      return [];
    }
  });
  const toggle = (i: number) => {
    setChecked((c) => {
      const next = c.includes(i) ? c.filter((x) => x !== i) : [...c, i];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };
  const pct = Math.round((checked.length / block.items.length) * 100);
  return (
    <div className="checklist">
      <div className="ck-head">
        <span className="work-badge alt"><ListChecks size={12} /> {block.title}</span>
        <span className="ck-count">{checked.length}/{block.items.length} · {pct}%</span>
      </div>
      <div className="ctx-meter"><div style={{ width: `${pct}%` }} /></div>
      {block.items.map((it, i) => (
        <button key={i} className={`ck-item ${checked.includes(i) ? "done" : ""}`} onClick={() => toggle(i)}>
          <span className="ck-box">{checked.includes(i) ? <SquareCheck size={16} /> : <Square size={16} />}</span>
          <span>{it}</span>
        </button>
      ))}
      {pct === 100 && <div className="ex-feedback ok" style={{ marginTop: 10 }}>清单全部勾完 —— 这份可以直接抄进你的上线评审模板。</div>}
    </div>
  );
}

function BlockView({ block, lessonKey }: { block: Block; lessonKey: string }) {
  switch (block.type) {
    case "p":
      return <p className="md-p">{block.text}</p>;
    case "h3":
      return <h3 className="md-h3">{block.text}</h3>;
    case "ul":
      return (
        <ul className="md-ul">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "quote":
      return <div className="md-quote">{block.text}</div>;
    case "code":
      return <CodeBlock lang={block.lang} code={block.code} />;
    case "table":
      return (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "svg":
      return <Reveal><Figure name={block.name} caption={block.caption} /></Reveal>;
    case "sim":
      return <Reveal><Sim name={block.name} /></Reveal>;
    case "work":
      return <WorkBox block={block} />;
    case "checklist":
      return <Checklist block={block} lessonKey={lessonKey} />;
    case "exercise":
      return null; // 在 LessonBlocks 中统一编号渲染
    default:
      return null;
  }
}

/* 渲染整课内容；练习题按出现顺序编号、按题记录进度。
   memo：只在当前课的进度记录变化时重渲染，其他打点（如别课/翻页）不惊动这里。 */
const LessonBlocks = memo(function LessonBlocks({
  lesson,
  markEx,
  lp,
}: {
  lesson: Lesson;
  markEx: (k: string, idx: number) => void;
  lp: LessonProgress | undefined;
}) {
  let exIdx = 0;
  return (
    <>
      {lesson.blocks.map((b, i) => {
        if (b.type === "exercise") {
          const idx = exIdx++;
          const solved = !!lp?.quiz || !!lp?.ex?.includes(idx);
          return (
            <ExerciseView
              key={i}
              ex={b.ex}
              index={idx}
              solved={solved}
              onSolved={() => markEx(lesson.key, idx)}
            />
          );
        }
        return <BlockView key={i} block={b} lessonKey={lesson.key} />;
      })}
    </>
  );
});

function TocStage({
  stage,
  activeKey,
  progress,
}: {
  stage: Stage;
  activeKey: string;
  progress: ProgressMap;
}) {
  const isCurrent = stage.lessons.some((l) => l.key === activeKey);
  return (
    <>
      <h4>阶段 {stage.id} {isCurrent ? "· 进行中" : ""}</h4>
      {stage.lessons.map((l) => {
        const p = progress[l.key] || {};
        const done = !!p.quiz || (p.ex?.length ?? 0) > 0 || p.page;
        return (
          <a key={l.key} href={`#/course/${l.key}`} className={l.key === activeKey ? "active" : ""}>
            <span className={`idx ${done ? "t-idx" : ""}`}>{done ? <Check size={12} strokeWidth={3} /> : "·"}</span>
            {l.title}
          </a>
        );
      })}
    </>
  );
}

/* 阅读进度条：rAF 节流 + ref 直写样式，滚动零 React 重渲染 */
function ReadProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0;
      if (ref.current) ref.current.style.width = `${pct}%`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={ref} className="read-progress" style={{ width: 0 }} />;
}

export function CourseLayout({
  stage,
  lesson,
  progress,
  mark,
  markEx,
  prev,
  next,
  idx,
  total,
  resetProgress,
}: {
  stage: Stage;
  lesson: Lesson;
  progress: ProgressMap;
  mark: MarkFn;
  markEx: (k: string, idx: number) => void;
  prev: { stage: Stage; lesson: Lesson } | null;
  next: { stage: Stage; lesson: Lesson } | null;
  idx: number;
  total: number;
  resetProgress: () => void;
}) {
  const p = progress[lesson.key] || {};
  const [tocOpen, setTocOpen] = useState(false);
  const exTotal = exerciseCount(lesson);
  const exSolved = p.quiz ? exTotal : (p.ex?.length ?? 0);

  // 阅读打点：进入课程页 5 秒后记「已读」
  useEffect(() => {
    const t = setTimeout(() => mark(lesson.key, "page"), 5000);
    return () => clearTimeout(t);
  }, [lesson.key]);

  // 键盘翻课 ←/→（输入框中不触发）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" && next) window.location.hash = `#/course/${next.lesson.key}`;
      if (e.key === "ArrowLeft" && prev) window.location.hash = `#/course/${prev.lesson.key}`;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div className="course-grid">
      <ReadProgress />

      <aside className={`toc ${tocOpen ? "open" : ""}`}>
        <button className="btn toc-toggle-close" onClick={() => setTocOpen(false)}><X size={15} /> 收起目录</button>
        <div style={{ padding: "0 4px 10px", fontSize: 12.5, color: "var(--fg-dim)" }}>
          总进度 {idx + 1} / {total}
        </div>
        {STAGES_DATA.map((s) => (
          <TocStage key={s.id} stage={s} activeKey={lesson.key} progress={progress} />
        ))}
        <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0", paddingTop: 10 }}>
          <button className="btn btn-danger" style={{ width: "100%", fontSize: 12.5 }} onClick={resetProgress}>
            清空学习进度
          </button>
        </div>
      </aside>

      <article>
        <button className="btn toc-toggle" onClick={() => setTocOpen(true)}><PanelLeft size={15} /> 本课目录 / 进度</button>
        <div className="lesson-head">
          <div className="lesson-crumb">
            <a href="#/">首页</a> <span className="crumb-sep">/</span> <a href={`#/course/${stage.lessons[0].key}`}>阶段 {stage.id} · {stage.title}</a>
          </div>
          <h1 className="lesson-title">{lesson.title}</h1>
          <div className="lesson-meta">
            <span><Clock size={13} /> 约 {lesson.minutes} 分钟</span>
            <span><BookOpen size={13} /> 阶段 {stage.id}</span>
            {exTotal > 0 && (
              <span style={{ color: exSolved >= exTotal ? "var(--ok)" : "var(--fg-dim)" }}>
                <PenLine size={13} /> 练习 {exSolved}/{exTotal}
              </span>
            )}
            {p.page && <span style={{ color: "var(--ok)" }}><CircleCheck size={13} /> 已读</span>}
            <span style={{ color: "var(--fg-dim)" }}><ArrowLeftRight size={13} /> ←/→ 翻课</span>
          </div>
        </div>

        <div className="lesson-body">
          <LessonBlocks lesson={lesson} markEx={markEx} lp={progress[lesson.key]} />

          <div className="lesson-complete-row">
            <button className={`btn ${p.done ? "btn-done" : "btn-primary"}`} onClick={() => mark(lesson.key, "done")}>
              {p.done ? (<><CircleCheck size={15} /> 已完成本课</>) : "标记本课完成"}
            </button>
            {exTotal > 0 && (
              <span className="complete-hint">
                {exSolved >= exTotal
                  ? (<span className="hint-ok"><PartyPopper size={14} /> 练习全部通过</span>)
                  : `还剩 ${exTotal - exSolved} 题练习未通过`}
              </span>
            )}
          </div>

          <div className="lesson-nav">
            {prev ? (
              <a href={`#/course/${prev.lesson.key}`}>
                <div className="dir"><ArrowLeft size={13} /> 上一课</div>
                <div className="t">{prev.lesson.title}</div>
              </a>
            ) : <span />}
            {next ? (
              <a className="next" href={`#/course/${next.lesson.key}`}>
                <div className="dir">下一课 <ArrowRight size={13} /></div>
                <div className="t">{next.lesson.title}</div>
              </a>
            ) : (
              <a className="next" href="#/lab">
                <div className="dir">全部课程完成 <ArrowRight size={13} /></div>
                <div className="t">查看学习成果</div>
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
