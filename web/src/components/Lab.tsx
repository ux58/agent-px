import type { CSSProperties } from "react";
import { CircleCheck, Eye, GraduationCap, PartyPopper, PencilLine } from "lucide-react";
import { ALL_LESSONS, STAGES_DATA, exerciseCount, lessonTouched } from "../types";
import type { ProgressMap } from "../types";
import { STAGE_META, LessonCard } from "./LessonCard";

export function Lab({
  progress,
  resetProgress,
}: {
  progress: ProgressMap;
  resetProgress: () => void;
}) {
  const total = ALL_LESSONS.length;
  const doneCount = ALL_LESSONS.filter((x) => lessonTouched(progress[x.lesson.key])).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const readCount = ALL_LESSONS.filter((x) => progress[x.lesson.key]?.page).length;
  const exDone = ALL_LESSONS.reduce(
    (a, x) => {
      const p = progress[x.lesson.key];
      return a + (p?.quiz ? exerciseCount(x.lesson) : (p?.ex?.length ?? 0));
    },
    0,
  );
  const exTotal = ALL_LESSONS.reduce((a, x) => a + exerciseCount(x.lesson), 0);
  const graduated = STAGES_DATA.filter((s) =>
    s.lessons.every((l) => lessonTouched(progress[l.key])),
  ).length;

  return (
    <>
      <div className="page-head">
        <div className="hs-left">
          <p className="eyebrow">MY LAB</p>
          <h1>我的实验室</h1>
          <p className="section-sub">
            进度保存在浏览器本地；Rust 后端启动时（顶栏绿点）同步到服务端，换设备续学。
          </p>
        </div>
        <span className="count-chip">{pct}%</span>
      </div>

      <div className="stat-strip">
        <div className="stat"><b>{doneCount}<i>/{total}</i></b><span><Eye size={12} /> 已学课程</span></div>
        <div className="stat"><b>{readCount}</b><span><PencilLine size={12} /> 已读课程</span></div>
        <div className="stat"><b>{exDone}<i>/{exTotal}</i></b><span><CircleCheck size={12} /> 练习通过</span></div>
        <div className="stat"><b>{graduated}<i>/{STAGES_DATA.length}</i></b><span><GraduationCap size={12} /> 已毕业阶段</span></div>
      </div>

      {STAGES_DATA.map((s) => {
        const meta = STAGE_META[s.id];
        const done = s.lessons.filter((l) => lessonTouched(progress[l.key])).length;
        const spct = Math.round((done / s.lessons.length) * 100);
        return (
          <div className="stage-group" key={s.id}>
            <div className="sg-head" style={{ "--sc": meta.color } as CSSProperties}>
              <span className="sg-dots">
                {s.lessons.map((l, i) => (
                  <i key={l.key} className={lessonTouched(progress[l.key]) ? "on" : ""}>{i + 1}</i>
                ))}
              </span>
              <b>{s.title}</b>
              <span className="sg-sub">{s.outcome}</span>
              <span className={`sg-count ${spct === 100 ? "full" : ""}`}>
                {spct === 100 ? "✓ 已毕业" : `${done}/${s.lessons.length} 课`}
              </span>
            </div>
            <div className="lc-grid">
              {ALL_LESSONS.filter((x) => x.stage.id === s.id).map((e) => (
                <LessonCard key={e.lesson.key} entry={e} progress={progress} />
              ))}
            </div>
          </div>
        );
      })}

      {pct === 100 && (
        <div className="doing-empty" style={{ marginTop: 26 }}>
          <PartyPopper size={30} />
          <b>全部 {total} 课已完成！</b>
          <span>去毕业项目验收你的设计，或到<a href="#/sandbox">沙盒</a>复习模拟器。</span>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm("确定清空全部学习进度？此操作会同时删除服务端进度。")) resetProgress();
          }}
        >
          清空全部学习进度
        </button>
      </div>
    </>
  );
}
