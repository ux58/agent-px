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

/* ---------- View Transitions 公共层 ----------
   个别 WebView/被遮挡环境下合成器不产帧，transition 会永久卡死（整页冻结在旧快照）。
   启动后空闲时探测一次健康度：VT 不健康就用「瞬时切换 + CSS 软过渡」兜底，
   健康才启用主题圆形扩散与路由整页交叉过渡。 */

type VT = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

let vtHealthy: boolean | null = null;

/** 空闲时探测：无操作 transition 的 ready 在 350ms 内 resolve 视为健康 */
export function probeViewTransitions() {
  if (vtHealthy !== null) return;
  const startVT = (document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => VT;
  }).startViewTransition;
  if (!startVT) {
    vtHealthy = false;
    return;
  }
  const t0 = performance.now();
  let settled = false;
  const fail = () => {
    if (!settled) {
      settled = true;
      vtHealthy = false;
    }
  };
  try {
    const vt = startVT(() => {});
    const timer = setTimeout(fail, 350);
    vt.ready.then(
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          vtHealthy = performance.now() - t0 < 350;
        }
      },
      fail,
    );
    vt.finished.catch(() => {}).finally(() => {
      clearTimeout(timer);
      fail();
    });
  } catch {
    vtHealthy = false;
  }
}

/** 统一 VT 包装：挂 kind 类供 CSS 区分动画（vt-theme / vt-page），
    卡死 450ms 兜底 skip + 补执行，结束清理类。返回 false = 未走 VT（调用方自行瞬时 apply）。 */
function runViewTransition(
  kind: "theme" | "page",
  update: () => Promise<void> | void,
  forceApply: () => void,
): boolean {
  const startVT = (document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => VT;
  }).startViewTransition;
  const root = document.documentElement;
  if (
    !startVT ||
    vtHealthy === false ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }
  // 已有过渡在跑（连点主题 / 快速翻页）：直接瞬时更新，避免嵌套 startViewTransition 抛错
  if (root.classList.contains("vt-active")) {
    return false;
  }
  root.classList.add("vt-active", `vt-${kind}`);
  let vt: VT;
  try {
    vt = startVT(update);
  } catch {
    root.classList.remove("vt-active", `vt-${kind}`);
    return false;
  }
  const cleanup = () => root.classList.remove("vt-active", `vt-${kind}`);
  const guard = setTimeout(() => {
    try {
      vt.skipTransition();
    } catch {
      /* 已结束的 transition 跳过会抛错，忽略 */
    }
    forceApply();
    cleanup();
  }, 450);
  const settle = () => {
    clearTimeout(guard);
    cleanup();
  };
  vt.ready.then(
    () => clearTimeout(guard),
    () => clearTimeout(guard),
  );
  vt.finished.catch(() => {}).finally(settle);
  return true;
}

/** 主题：dark / light，持久化。健康浏览器用 View Transitions 圆形扩散（从点击位置
    展开 + 旧主题微缩淡出）；不健康/不支持的浏览器瞬时切换 + 短促 CSS 淡入软着陆。
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
    const apply = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
    const root = document.documentElement;
    // 圆心/半径必须在创建 transition 之前写入：伪元素动画随 transition 首帧即生效。
    // 键盘触发（Enter/Space）时 clientX/Y 为 0：回退到按钮中心而非屏幕左上角。
    const btn = document.querySelector(".theme-switch")?.getBoundingClientRect();
    const hasPoint = !!origin && (origin.x > 0 || origin.y > 0);
    const x = hasPoint ? origin!.x : btn ? btn.left + btn.width / 2 : window.innerWidth - 48;
    const y = hasPoint ? origin!.y : btn ? btn.top + btn.height / 2 : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
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

    const usedVt = runViewTransition(
      "theme",
      () => {
        applyOnce();
        return domCommitted;
      },
      applyOnce,
    );
    if (!usedVt) {
      commitRef.current = null;
      applyOnce();
      // 无过渡能力时的软着陆：新主题短暂淡入，替代生硬的硬切
      root.classList.add("theme-fallback");
      setTimeout(() => root.classList.remove("theme-fallback"), 420);
    }
  }, []);

  return { theme, toggle };
}

/** 最近一次路由切换是否由 VT 接管：App 据此决定是否还叠加 CSS 入场动画（防双重动画） */
export const navState = { usedVt: false };

/** hash 路由：#/、#/course/<key>、#/sandbox、#/glossary、#/lab。
    VT 健康时切换用整页交叉过渡（旧页淡出、新页上滑淡入，无白屏间隙）；
    回调要等 React 渲染出新页面才 resolve，VT 才能截到最终画面。 */
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  const commitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    commitRef.current?.();
    commitRef.current = null;
  }, [hash]);

  useEffect(() => {
    const onChange = () => {
      const target = window.location.hash || "#/";
      const apply = () => {
        setHash(target);
        // 切页即时回顶：CSS 的 scroll-behavior:smooth 会把这次滚动变成动画，显式 instant
        window.scrollTo({ top: 0, behavior: "instant" });
      };
      const commit = new Promise<void>((resolve) => {
        commitRef.current = resolve;
      });
      const usedVt = runViewTransition("page", () => {
        apply();
        return commit;
      }, apply);
      navState.usedVt = usedVt;
      if (!usedVt) {
        commitRef.current = null;
        apply();
      }
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}
