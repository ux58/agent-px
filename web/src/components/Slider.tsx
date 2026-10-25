import { useEffect, useState } from "react";
import type { RefObject } from "react";

/* 通用滑块指示器：测量容器内激活项（selector 命中元素）的 offset 位置，
   供绝对定位滑块 translate 过渡跟随。容器需 position:relative 且为激活项的 offsetParent。
   - activeKey 变化 / 容器尺寸变化 / 字体就绪时重测；
   - ready 为 false 时不启用过渡，避免首帧滑块从容器左上角飞入。 */
export function useActiveBox(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  activeKey: string,
) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bar = containerRef.current;
    if (!bar) return;
    const measure = () => {
      // display:none（如移动端抽屉收起）时量出来全是 0，跳过待可见后由 ResizeObserver 补测
      if (!bar.offsetWidth && !bar.offsetHeight) return;
      const el = bar.querySelector<HTMLElement>(selector);
      if (!el) return;
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      setBox((b) =>
        b && b.x === next.x && b.y === next.y && b.w === next.w && b.h === next.h ? b : next,
      );
    };
    measure();
    // 首次测量落位后再开过渡（下一帧），此后切换才做滑动动画
    const raf = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    // CJK 字体晚到会改变菜单项宽度，量一次兜底
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [containerRef, selector, activeKey]);

  return { box, ready };
}
