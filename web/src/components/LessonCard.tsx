import { CircleCheck } from "lucide-react";
import type { CSSProperties } from "react";
import type { ProgressMap } from "../types";
import { ALL_LESSONS, exerciseCount, lessonTouched } from "../types";
import {
  Boxes,
  Cog,
  Factory,
  Plug,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* 全站共享：阶段色与图标（applore 式彩色图标位） */
export const STAGE_META: Record<number, { color: string; Icon: typeof Sparkles }> = {
  1: { color: "#6366f1", Icon: Sparkles },
  2: { color: "#0ea5e9", Icon: Cog },
  3: { color: "#10b981", Icon: Plug },
  4: { color: "#f59e0b", Icon: Boxes },
  5: { color: "#f43f5e", Icon: ShieldCheck },
  6: { color: "#8b5cf6", Icon: Factory },
};

type Entry = (typeof ALL_LESSONS)[number];

export function LessonCard({ entry, progress }: { entry: Entry; progress: ProgressMap }) {
  const meta = STAGE_META[entry.stage.id];
  const p = progress[entry.lesson.key];
  const exTotal = exerciseCount(entry.lesson);
  const exn = p?.quiz ? exTotal : (p?.ex?.length ?? 0);
  const started = lessonTouched(progress[entry.lesson.key]);
  const pct = exTotal > 0 ? Math.round((exn / exTotal) * 100) : 0;
  const Icon = meta.Icon;
  return (
    <a
      className="lesson-card"
      href={`#/course/${entry.lesson.key}`}
      style={{ "--sc": meta.color } as CSSProperties}
    >
      <span className="lc-ico"><Icon size={20} /></span>
      <span className="lc-main">
        <span className="lc-title">
          {entry.lesson.title}
          {started && exTotal > 0 && exn >= exTotal && <CircleCheck size={14} className="lc-done" />}
        </span>
        <span className="lc-meta">
          阶段 {entry.stage.id} · {entry.lesson.minutes} 分钟
          {started ? ` · 练习 ${exn}/${exTotal}` : " · 未开始"}
        </span>
        <span className="lc-bar"><i style={{ width: `${pct}%` }} /></span>
      </span>
    </a>
  );
}
