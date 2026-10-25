// ---------- 练习题类型 ----------

export type QuizQ = {
  kind: "quiz";
  q: string;
  options: string[];
  answer: number;
  explain?: string;
};

export type BlankQ = {
  kind: "blank";
  q: string;
  /** 占位填空，前为提示语（代码原文），后为答案（允许多个等价写法，命中任一即可，均为小写比较） */
  answers: string[];
};

export type OrderQ = {
  kind: "order";
  q: string;
  /** 正确顺序 */
  steps: string[];
};

export type MatchQ = {
  kind: "match";
  q: string;
  pairs: { left: string; right: string }[];
};

export type Exercise = QuizQ | BlankQ | OrderQ | MatchQ;

// ---------- 课程类型 ----------

export type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "svg"; name: string; caption?: string }
  | { type: "sim"; name: string }
  | { type: "exercise"; ex: Exercise }
  /** 🏭 企业实践板块：真实工程方案、代码与清单 */
  | { type: "work"; title: string; text?: string; list?: string[]; code?: string; lang?: string }
  /** 可勾选的交互清单（本地持久化），如上线检查清单 */
  | { type: "checklist"; title: string; items: string[] };

export type Lesson = {
  key: string;
  title: string;
  minutes: number;
  blocks: Block[];
};

export type Stage = {
  id: number;
  title: string;
  tagline: string;
  outcome: string;
  lessons: Lesson[];
};

// ---------- 进度类型 ----------

export type LessonProgress = {
  page?: boolean;
  /** 已通过练习题的序号（0 起） */
  ex?: number[];
  /** 旧版字段：整课练习通过（兼容历史进度） */
  quiz?: boolean;
  sim?: boolean;
  done?: boolean;
};

export type ProgressMap = Record<string, LessonProgress>;

// ---------- 课程表 ----------

import { STAGES } from "./data";

export const STAGES_DATA: Stage[] = STAGES;

export const ALL_LESSONS: { stage: Stage; lesson: Lesson; globalIndex: number }[] =
  STAGES_DATA.flatMap((stage) =>
    stage.lessons.map((lesson) => ({ stage, lesson, globalIndex: 0 })),
  ).map((entry, idx) => ({ ...entry, globalIndex: idx }));

export function findLesson(key: string) {
  for (const stage of STAGES_DATA) {
    const lesson = stage.lessons.find((l) => l.key === key);
    if (lesson) return { stage, lesson };
  }
  return null;
}

export function lessonNeighbors(key: string) {
  const idx = ALL_LESSONS.findIndex((x) => x.lesson.key === key);
  return {
    prev: idx > 0 ? ALL_LESSONS[idx - 1] : null,
    next: idx >= 0 && idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null,
    idx,
  };
}

export const TOTAL_LESSONS = ALL_LESSONS.length;

/** 一课的练习题总数 */
export function exerciseCount(lesson: Lesson): number {
  return lesson.blocks.filter((b) => b.type === "exercise").length;
}

/** 该课是否全部练习通过（兼容旧 quiz 字段） */
export function exercisesAllSolved(p: LessonProgress | undefined, lesson: Lesson): boolean {
  if (!p) return false;
  if (p.quiz) return true;
  const total = exerciseCount(lesson);
  return total > 0 && (p.ex?.length ?? 0) >= total;
}

/** 该课是否有任何学习痕迹（用于进度统计与「继续学习」） */
export function lessonTouched(p: LessonProgress | undefined): boolean {
  return !!(p?.page || p?.quiz || (p?.ex?.length ?? 0) > 0);
}
