import { useCallback, useEffect, useRef, useState } from "react";
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

/** 主题：dark / light，持久化。切换用 View Transitions 圆形扩散（一次性截图合成，
    避免逐元素颜色过渡造成的闪烁与全局重绘压力）；不支持的浏览器瞬时切换。
    首帧主题由 index.html 内联脚本预设，这里初始化时直接读 DOM，避免二次翻转。 */
export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
  );
  // startViewTransition 的回调必须等 React 把 dataset.theme 提交到 DOM 后再 resolve
  const commitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agentpx.theme", theme);
    commitRef.current?.();
    commitRef.current = null;
  }, [theme]);

  const toggle = useCallback((origin?: { x: number; y: number }) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startVT = (document as Document & {
      startViewTransition?: (cb: () => Promise<void> | void) => {
        ready: Promise<void>;
        finished: Promise<void>;
        skipTransition: () => void;
      };
    }).startViewTransition;
    const apply = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

    if (!startVT || reduce) {
      apply();
      return;
    }
    // 圆心/半径必须在创建 transition 之前写入：伪元素动画随 transition 首帧即生效。
    // （若等 vt.ready 再挂动画类，new 快照会先整页直切一帧再重放圆形扩散，形成闪变。）
    const btn = document.querySelector(".theme-switch")?.getBoundingClientRect();
    // 键盘触发（Enter/Space）时 clientX/Y 为 0：回退到按钮中心而非屏幕左上角
    const hasPoint = !!origin && (origin.x > 0 || origin.y > 0);
    const x = hasPoint ? origin!.x : btn ? btn.left + btn.width / 2 : window.innerWidth - 48;
    const y = hasPoint ? origin!.y : btn ? btn.top + btn.height / 2 : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${radius}px`);
    const domCommitted = new Promise<void>((resolve) => {
      commitRef.current = resolve;
    });
    // 回调只允许执行一次：异常/超时兜底路径下回调可能被跳过，需手动补切
    let applied = false;
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      apply();
    };
    let vt: ReturnType<NonNullable<typeof startVT>> | null = null;
    try {
      vt = startVT(() => {
        applyOnce();
        return domCommitted;
      });
    } catch {
      // 个别 WebView 在存在未完成过渡时会同步抛错：异常一旦冒泡，
      // 后面的兜底定时器就永远不会被调度，主题将永久卡死——这里直接瞬时切换保功能
      applyOnce();
      return;
    }
    // 卡死兜底：后台标签页 / 面板被遮挡时合成器不产帧，transition 会停在截图阶段，
    // ready 永不触发且整页冻在旧快照上（表现为「点了没反应」）。超时则跳过过渡直接切换。
    const guard = setTimeout(() => {
      try {
        vt!.skipTransition();
      } catch {
        /* 已结束的 transition 跳过会抛错，忽略 */
      }
      applyOnce();
    }, 500);
    // ready 被拒（过渡被跳过）时回调可能未执行：清掉 guard 并补切，幂等安全
    vt.ready.then(
      () => clearTimeout(guard),
      () => {
        clearTimeout(guard);
        applyOnce();
      },
    );
    vt.finished.catch(() => {}).finally(() => clearTimeout(guard));
  }, []);

  return { theme, toggle };
}

/** hash 路由：#/、#/course/<key>、#/sandbox、#/glossary、#/lab */
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || "#/");
      // 切页即时回顶：CSS 的 scroll-behavior:smooth 会让这次滚动变成动画，
      // 页面看起来「空转半天才回到内容」，这里显式用 instant。
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}
