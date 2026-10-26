import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ProgressMap } from "./types";

const KEY = "agentpx.progress.v1";

function load(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as ProgressMap;
  } catch {
    return {};
  }
}

/** 进度：localStorage 即时保存；Rust 后端可用时异步同步（best-effort） */
export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(load);
  const [serverSynced, setServerSynced] = useState<boolean | null>(null);

  // 启动时尝试从服务端拉取（多端续学），失败则纯本地
  useEffect(() => {
    let alive = true;
    fetch("/api/progress/default")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rec) => {
        if (!alive) return;
        setServerSynced(true);
        if (rec?.data) {
          const remote = JSON.parse(rec.data) as ProgressMap;
          const local = load();
          // 简单合并：取两者并集（按 key 合并字段）
          const merged: ProgressMap = { ...local };
          for (const [k, v] of Object.entries(remote)) {
            merged[k] = { ...merged[k], ...v };
          }
          setProgress(merged);
          localStorage.setItem(KEY, JSON.stringify(merged));
        }
      })
      .catch(() => alive && setServerSynced(false));
    return () => {
      alive = false;
    };
  }, []);

  const persist = (next: ProgressMap) => {
    setProgress(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const sync = (next: ProgressMap) => {
    fetch("/api/progress/default", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: JSON.stringify(next) }),
    }).catch(() => {});
  };

  const mark = useCallback(
    (lessonKey: string, field: "page" | "quiz" | "sim" | "done") => {
      setProgress((prev) => {
        const cur = prev[lessonKey] || {};
        if (cur[field]) return prev;
        const next = { ...prev, [lessonKey]: { ...cur, [field]: true } };
        localStorage.setItem(KEY, JSON.stringify(next));
        sync(next);
        return next;
      });
    },
    [],
  );

  /** 按练习题序号打点（一课可有多题，逐题记录） */
  const markEx = useCallback((lessonKey: string, idx: number) => {
    setProgress((prev) => {
      const cur = prev[lessonKey] || {};
      const ex = cur.ex ?? [];
      if (ex.includes(idx)) return prev;
      const next = { ...prev, [lessonKey]: { ...cur, ex: [...ex, idx] } };
      localStorage.setItem(KEY, JSON.stringify(next));
      sync(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    persist({});
    fetch("/api/progress/default", { method: "DELETE" }).catch(() => {});
  }, []);

  return { progress, mark, markEx, reset, serverSynced };
}

/** 主题：dark / light，持久化。切换即时生效；圆环收缩动画为纯装饰（WAAPI 遮罩层），
    不承担任何状态职责 —— 状态同步落在点击事件任务内（输入分发永不被节流），
    在渲染管线被遮挡冻结的环境（如内嵌 webview）下依然点击即生效。 */
export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("agentpx.theme");
    return saved === "light" ? "light" : "dark";
  });
  // themeRef：已提交到 DOM 的主题；intentRef：意图主题（点击即翻转）。
  // 两者由 apply() 收敛，幂等单调 —— 任何乱序/丢失/迟到都收敛到最新意图，不会翻两次。
  const themeRef = useRef(theme);
  const intentRef = useRef(theme);
  useLayoutEffect(() => {
    themeRef.current = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agentpx.theme", theme);
  }, [theme]);

  const apply = useCallback(() => {
    if (themeRef.current === intentRef.current) return;
    themeRef.current = intentRef.current;
    flushSync(() => setTheme(intentRef.current));
  }, []);

  const toggle = useCallback(() => {
    // 自愈对齐：若上一次意图因故未落 DOM，以屏幕可见状态为基准，
    // 保证每次点击翻转的都是用户眼前看到的那一档，永不出现"两次点击互相抵消"
    if (intentRef.current !== themeRef.current) intentRef.current = themeRef.current;
    const from = intentRef.current;
    intentRef.current = from === "dark" ? "light" : "dark";

    const btn = document.querySelector(".theme-switch");
    const r = btn?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth - 48;
    const y = r ? r.top + r.height / 2 : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    apply(); // 同步落盘：本 tick 内状态与 DOM 一致，点击即生效

    // 纯装饰动画：旧主题底色遮罩从全屏圆环收缩回按钮位置（方向：旧貌收进按钮）。
    // 不依赖渲染机会 —— 管线冻结时动画不播，状态也绝不出错；遮罩由 finished/超时双保险移除。
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const oldBg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (!oldBg) return;
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:${oldBg};`;
    document.body.appendChild(overlay);
    const remove = () => overlay.remove();
    const anim = overlay.animate(
      [
        { clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: 1 },
        { clipPath: `circle(0px at ${x}px ${y}px)`, opacity: 0.6 },
      ],
      { duration: 420, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" },
    );
    anim.finished.then(remove, remove);
    setTimeout(remove, 700);
  }, [apply]);

  // 原生兜底：开发模式下偶发"点击到达按钮、React 处理器却没执行"（HMR / 长闲置后首点）。
  // 点击后 250ms 意图仍未翻转 → 判定该次事件在 React 层丢失，原生补一次 toggle。
  useEffect(() => {
    const btn = document.querySelector(".theme-switch");
    if (!btn) return;
    let intentAtClick = intentRef.current;
    const onNativeClick = () => {
      intentAtClick = intentRef.current;
      window.setTimeout(() => {
        if (intentRef.current === intentAtClick) toggle();
      }, 250);
    };
    btn.addEventListener("click", onNativeClick);
    return () => btn.removeEventListener("click", onNativeClick);
  }, [toggle]);

  return { theme, toggle };
}

/** hash 路由：#/、#/course/<key>、#/sandbox、#/glossary、#/lab */
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || "#/");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}
