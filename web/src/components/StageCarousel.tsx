import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { STAGES_DATA, lessonTouched } from "../types";
import type { ProgressMap } from "../types";
import type { CSSProperties, KeyboardEvent } from "react";
import { STAGE_META } from "./LessonCard";

/* 首页「学习路线」轮播：6 个阶段卡片，桌面一屏 3 张、窄屏 2 张、移动端 1 张右缘露出。
   箭头 / 圆点 / 拖拽（触摸跟手 + 边缘橡皮筋）三种切换方式；
   滑动到位后轨道做 elastic 回弹；入场时卡片逐张浮起、进度环从 0 画出。 */

const RING_R = 15.5;
const RING_C = 2 * Math.PI * RING_R;

export function StageCarousel({ progress }: { progress: ProgressMap }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<number[]>([0]);
  const posRef = useRef(0);
  const suppressClick = useRef(false);
  const [pos, setPos] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  const stages = useMemo(
    () =>
      STAGES_DATA.map((s) => {
        const total = s.lessons.length;
        const done = s.lessons.filter((l) => lessonTouched(progress[l.key])).length;
        const nextLesson = s.lessons.find((l) => !lessonTouched(progress[l.key])) ?? s.lessons[0];
        const [name, ...rest] = s.title.split("：");
        return {
          id: s.id,
          name,
          sub: rest.join("："),
          tagline: s.tagline,
          total,
          done,
          allDone: done === total,
          started: done > 0,
          href: `#/course/${nextLesson.key}`,
          lessons: s.lessons.map((l) => ({ key: l.key, title: l.title, touched: lessonTouched(progress[l.key]) })),
        };
      }),
    [progress],
  );

  /* 重测各卡片停靠位（相同位置去重），当前位置夹回合法区间（窗口缩放 / 断点切换时调用） */
  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const max = Math.max(0, track.scrollWidth - vp.clientWidth);
    const positions: number[] = [];
    for (const card of Array.from(track.children) as HTMLElement[]) {
      const off = Math.min(card.offsetLeft, max);
      if (!positions.some((p) => Math.abs(p - off) < 2)) positions.push(off);
    }
    positionsRef.current = positions;
    setDotCount(positions.length);
    const p = Math.min(posRef.current, positions.length - 1);
    posRef.current = p;
    setPos(p);
    // 缩放窗口时轨道可能正在动画中途，先杀掉再落位，避免在途 tween 把旧位置写回
    gsap.killTweensOf(track);
    gsap.set(track, { x: -positions[p], scale: 1 });
  }, []);

  const go = useCallback((target: number) => {
    const positions = positionsRef.current;
    const track = trackRef.current;
    if (!track || positions.length === 0) return;
    const p = Math.max(0, Math.min(target, positions.length - 1));
    posRef.current = p;
    setPos(p);
    const x = -positions[p];
    // 杀掉所有在途 tween（含上一轮切换遗留的回弹）：被杀 tween 的 onComplete 不再触发，
    // 否则上一轮回弹结束时会把过期的 x 写回轨道，轮播内容跳回旧位置、与圆点指示错位
    gsap.killTweensOf(track);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(track, { x, scale: 1 });
      return;
    }
    gsap.to(track, {
      x,
      duration: 0.48,
      ease: "power3.inOut",
      onComplete: () => {
        /* 切换到位后的整体回弹，只动 scale 不碰 x：x 已是最终值，
           即使这轮回弹被下一次 go() 杀掉也不会残留错误位置。 */
        gsap.fromTo(
          track,
          { scale: 1.012 },
          {
            scale: 1, duration: 0.7, ease: "elastic.out(1.1, 0.4)", transformOrigin: "50% 62%",
          },
        );
      },
    });
  }, []);
  const goRef = useRef(go);
  goRef.current = go;

  /* 拖拽 / 触摸滑动：跟手移动，松手按阈值翻页，越界有橡皮筋阻力 */
  useEffect(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    measure();

    let dragging = false;
    let startX = 0;
    let baseX = 0;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      baseX = (gsap.getProperty(track, "x") as number) || 0;
      gsap.killTweensOf(track);
      vp.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 7) moved = true;
      const max = Math.max(0, track.scrollWidth - vp.clientWidth);
      let x = baseX + dx;
      if (x > 0) x *= 0.35;
      else if (x < -max) x = -max + (x + max) * 0.35;
      gsap.set(track, { x });
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      suppressClick.current = moved;
      const dx = e.clientX - startX;
      const threshold = Math.min(88, vp.clientWidth / 4.5);
      if (moved && dx <= -threshold) goRef.current(posRef.current + 1);
      else if (moved && dx >= threshold) goRef.current(posRef.current - 1);
      else goRef.current(posRef.current);
    };
    const onCancel = () => {
      if (!dragging) return;
      dragging = false;
      goRef.current(posRef.current);
    };
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    };

    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onCancel);
    vp.addEventListener("click", onClickCapture, true);

    const ro = new ResizeObserver(() => measure());
    ro.observe(vp);
    window.addEventListener("resize", measure);

    return () => {
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onCancel);
      vp.removeEventListener("click", onClickCapture, true);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  /* 入场：卡片逐张浮起，进度环从 0 画出（仅挂载时一次） */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".rmc-card",
        { y: 24, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out",
          stagger: 0.07, delay: 0.05, clearProps: "transform,opacity,visibility",
        },
      );
      gsap.fromTo(
        ".rmc-ring-fg",
        { strokeDashoffset: RING_C },
        {
          strokeDashoffset: (_i, el) => Number((el as SVGCircleElement).dataset.off ?? 0),
          duration: 1.1, ease: "power3.out", delay: 0.35,
        },
      );
    }, track);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(posRef.current + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(posRef.current - 1); }
  };

  return (
    <div className="rmc">
      <div
        className="rmc-viewport"
        ref={viewportRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="学习路线阶段卡片，可用左右方向键或拖拽切换"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="rmc-track" ref={trackRef}>
          {stages.map((s) => {
            const pct = Math.round((s.done / s.total) * 100);
            const ringOff = RING_C * (1 - s.done / s.total);
            const status = s.allDone ? "已毕业" : s.started ? "进行中" : `${s.total} 课`;
            const cta = s.allDone ? "回顾阶段" : s.started ? "继续学习" : "开始学习";
            return (
              <a
                key={s.id}
                className="rmc-card"
                href={s.href}
                style={{ "--sc": STAGE_META[s.id].color } as CSSProperties}
                aria-label={`阶段 ${s.id} ${s.name}，${status}，点击${cta}`}
              >
                <span className="rmc-ghost" aria-hidden="true">0{s.id}</span>
                <span className="rmc-head">
                  <span className="rmc-ring" aria-hidden="true">
                    <svg viewBox="0 0 36 36">
                      <circle className="rmc-ring-bg" cx="18" cy="18" r={RING_R} />
                      <circle
                        className="rmc-ring-fg"
                        cx="18" cy="18" r={RING_R}
                        strokeDasharray={RING_C}
                        strokeDashoffset={ringOff}
                        data-off={ringOff}
                      />
                    </svg>
                    <b className="rmc-num">{s.allDone ? <Check size={15} strokeWidth={3} /> : s.id}</b>
                  </span>
                  <span className="rmc-titles">
                    <b>{s.name}</b>
                    <i>{s.sub}</i>
                  </span>
                  <span className={`rmc-status ${s.allDone ? "ok" : s.started ? "on" : ""}`}>{status}</span>
                </span>
                <span className="rmc-tagline">{s.tagline}</span>
                <ul className="rmc-lessons">
                  {s.lessons.map((l, i) => (
                    <li key={l.key} className={l.touched ? "touched" : ""}>
                      <i aria-hidden="true">{l.touched ? <Check size={12} strokeWidth={3} /> : i + 1}</i>
                      <span>{l.title}</span>
                    </li>
                  ))}
                </ul>
                <span className="rmc-foot" aria-hidden="true">
                  <span className="rmc-bar"><i style={{ width: `${pct}%` }} /></span>
                  <span className="rmc-count">{s.done}/{s.total} 课</span>
                </span>
                <span className="rmc-go">{cta} <ArrowRight size={15} /></span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="rmc-nav">
        <button
          type="button"
          className="rmc-btn"
          onClick={() => go(posRef.current - 1)}
          disabled={pos === 0}
          aria-label="上一组卡片"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="rmc-dots">
          {Array.from({ length: dotCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`rmc-dot ${i === pos ? "on" : ""}`}
              aria-label={`切换到第 ${i + 1} 组`}
              aria-current={i === pos}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="rmc-btn"
          onClick={() => go(posRef.current + 1)}
          disabled={pos === dotCount - 1}
          aria-label="下一组卡片"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
