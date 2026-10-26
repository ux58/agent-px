import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useHashRoute, useProgress, useTheme } from "./hooks";
import { ALL_LESSONS, STAGES_DATA, TOTAL_LESSONS, findLesson, lessonNeighbors } from "./types";
import { GLOSSARY } from "./data";

/** 全站「企业实践」板块总数（数据驱动，课程增删自动更新） */
const WORK_COUNT = STAGES_DATA.flatMap((s) => s.lessons).reduce(
  (n, l) => n + l.blocks.filter((b) => b.type === "work").length,
  0,
);

/* 顶栏导航胶囊滑块：测量激活项位置，背景块滑动跟随（与课程页 Tab 滑块同语言） */
function NavPill({ page }: { page: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const pill = ref.current;
    const bar = pill?.parentElement;
    if (!pill || !bar) return;
    const measure = () => {
      const el = bar.querySelector<HTMLAnchorElement>(`[data-nav="${page}"]`);
      if (!el) return;
      setStyle({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [page]);

  return (
    <div
      ref={ref}
      className="nav-pill"
      style={style ? { transform: `translate(${style.x}px, -50%)`, width: style.w } : undefined}
      aria-hidden="true"
    />
  );
}
import { Home } from "./components/Home";
import { CourseLayout, prefetchHeavyChunks } from "./components/Course";
import { Sandbox } from "./components/Sandbox";
import { Glossary } from "./components/Glossary";
import { Lab } from "./components/Lab";

/* 回到顶部：ref 直写显隐，滚动零重渲染 */
function BackToTop() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (ref.current) ref.current.dataset.show = window.scrollY > 480 ? "1" : "0";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <button
      ref={ref}
      className="back-top"
      data-show="0"
      title="回到顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}

/* 品牌标识：渐变圆角徽标 + A 字形 + 灵感火花（与 favicon.svg 同源，配色随主题切换） */
function BrandMark({ gid }: { gid: string }) {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--bm-a)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--bm-b)" }} />
          <stop offset="1" style={{ stopColor: "var(--bm-c)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path d="M9.8 22.4 15 9.9a1.07 1.07 0 0 1 1.98 0l5.2 12.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 17.7h7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="5.4" r="1.7" fill="#fff" />
    </svg>
  );
}

/* applore 式页脚：链接矩阵 + 底栏 */
function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="f-brand">
          <a className="brand" href="#/">
            <BrandMark gid="bm-footer" />
            Agent 学堂
          </a>
          <p>
            体系化学习 AI Agent 开发：{STAGES_DATA.length} 阶段 {TOTAL_LESSONS} 课 · 7 个模拟器 · {WORK_COUNT} 处企业实践 · {GLOSSARY.length} 条术语，
            从大模型直觉到生产级落地方案。
          </p>
        </div>
        <div className="f-col">
          <h5>课程阶段</h5>
          {STAGES_DATA.map((s) => (
            <a key={s.id} href={`#/course/${s.lessons[0].key}`}>{s.id}. {s.title}</a>
          ))}
        </div>
        <div className="f-col">
          <h5>实践工具</h5>
          <a href="#/sandbox">交互沙盒</a>
          <a href="#/glossary">术语表</a>
          <a href="#/lab">我的实验室</a>
          <a href={`#/course/capstone`}>毕业项目</a>
        </div>
        <div className="f-col">
          <h5>延伸阅读</h5>
          <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noreferrer">Building Effective Agents ↗</a>
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">MCP 规范 ↗</a>
          <a href="https://github.com/anthropics/skills" target="_blank" rel="noreferrer">Agent Skills 仓库 ↗</a>
          <a href="https://platform.claude.com/docs" target="_blank" rel="noreferrer">Claude 文档 ↗</a>
          <a href="https://github.com/cgbin24" target="_blank" rel="noreferrer">作者 GitHub @cgbin24 ↗</a>
        </div>
      </div>
      <div className="f-bottom">
        <span>© 2026 Agent 学堂 · Rust + React + Vite + TS 构建</span>
        <span>学以智用 · Keep Building</span>
      </div>
    </footer>
  );
}

export default function App() {
  const hash = useHashRoute();
  const { progress, mark, markEx, reset, serverSynced } = useProgress();
  const { theme, toggle } = useTheme();

  const route = useMemo(() => {
    const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);
    if (parts[0] === "course" && parts[1]) return { page: "lesson" as const, key: parts[1] };
    if (parts[0] === "sandbox") return { page: "sandbox" as const };
    if (parts[0] === "glossary") return { page: "glossary" as const };
    if (parts[0] === "lab") return { page: "lab" as const };
    return { page: "home" as const };
  }, [hash]);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0 }), []);
  useEffect(scrollToTop, [route.page, route.key === undefined ? "" : route.key]);

  // 首屏就绪后空闲预取图示/模拟器分包：后续翻课、进沙盒零加载等待
  useEffect(() => {
    prefetchHeavyChunks();
  }, []);

  const nav = (
    <nav className="topnav">
      <a className="brand" href="#/">
        <BrandMark gid="bm-nav" />
        Agent 学堂
      </a>
      <div className="nav-links">
        <NavPill page={route.page} />
        <a href="#/" data-nav="home" className={route.page === "home" ? "active" : ""}>首页</a>
        <a
          href={`#/course/${ALL_LESSONS[0].lesson.key}`}
          data-nav="lesson"
          className={route.page === "lesson" ? "active" : ""}
        >
          课程
        </a>
        <a href="#/lab" data-nav="lab" className={route.page === "lab" ? "active" : ""}>实验室</a>
        <a href="#/sandbox" data-nav="sandbox" className={route.page === "sandbox" ? "active" : ""}>沙盒</a>
        <a href="#/glossary" data-nav="glossary" className={route.page === "glossary" ? "active" : ""}>术语表</a>
      </div>
      <div className="nav-right">
        <a
          className="gh-link"
          href="https://github.com/cgbin24"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub @cgbin24"
          title="GitHub @cgbin24"
        >
          <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
        {serverSynced !== null && (
          <span
            className="sync-dot"
            data-on={serverSynced ? "1" : "0"}
            title={serverSynced ? "学习进度已连接 Rust 后端，跨端同步中" : "后端未连接：进度仅保存在本机浏览器"}
          />
        )}
        <button
          className="theme-switch"
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="切换主题"
          title={theme === "dark" ? "当前：暗色 · 点击切换亮色" : "当前：亮色 · 点击切换暗色"}
          onClick={toggle}
        >
          <Sun size={13} className="ts-ico ts-sun" />
          <span className="ts-knob" />
          <Moon size={13} className="ts-ico ts-moon" />
        </button>
      </div>
    </nav>
  );

  const body = (() => {
    switch (route.page) {
      case "home":
        return <Home progress={progress} />;
      case "lesson": {
        const found = findLesson(route.key);
        if (!found) return <Home progress={progress} />;
        const { prev, next, idx } = lessonNeighbors(route.key);
        return (
          <CourseLayout
            stage={found.stage}
            lesson={found.lesson}
            progress={progress}
            mark={mark}
            markEx={markEx}
            prev={prev}
            next={next}
            idx={idx}
            total={TOTAL_LESSONS}
            resetProgress={reset}
          />
        );
      }
      case "sandbox":
        return <Sandbox />;
      case "glossary":
        return <Glossary />;
      case "lab":
        return <Lab progress={progress} resetProgress={reset} />;
    }
  })();

  return (
    <div className="app">
      {nav}
      <main className="main page-fade" key={route.page + (route.key ?? "")}>{body}</main>
      <BackToTop />
      <SiteFooter />
    </div>
  );
}
