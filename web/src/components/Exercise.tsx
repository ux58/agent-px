import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import type { Exercise, MatchQ, OrderQ, QuizQ, BlankQ } from "../types";

/* 四种练习题型：单选 / 填空 / 排序 / 连线，全部即时判分 */

export function ExerciseView({
  ex,
  index,
  onSolved,
  solved,
}: {
  ex: Exercise;
  index: number;
  onSolved: () => void;
  solved: boolean;
}) {
  const labels: Record<Exercise["kind"], string> = {
    quiz: "单选题",
    blank: "填空题",
    order: "排序题",
    match: "连线题",
  };
  return (
    <div className="exercise">
      <span className="ex-tag">练习 {index + 1} · {labels[ex.kind]}</span>
      <p className="ex-q">{ex.q}</p>
      {ex.kind === "quiz" && <QuizView q={ex} onSolved={onSolved} solved={solved} />}
      {ex.kind === "blank" && <BlankView q={ex} onSolved={onSolved} solved={solved} />}
      {ex.kind === "order" && <OrderView q={ex} onSolved={onSolved} solved={solved} />}
      {ex.kind === "match" && <MatchView q={ex} onSolved={onSolved} solved={solved} />}
    </div>
  );
}

function Feedback({ ok, text }: { ok: boolean; text?: string }) {
  return (
    <div className={`ex-feedback ${ok ? "ok" : "err"}`}>
      {ok ? <CircleCheck size={15} /> : <CircleX size={15} />}
      <b>{ok ? "正确！" : "再想想"}</b>
      {text ? <span>{text}</span> : null}
    </div>
  );
}

function QuizView({ q, onSolved, solved }: { q: QuizQ; onSolved: () => void; solved: boolean }) {
  const [picked, setPicked] = useState<number | null>(solved ? q.answer : null);
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) onSolved();
  };
  return (
    <>
      <div className="quiz-opts">
        {q.options.map((opt, i) => {
          let cls = "quiz-opt";
          if (picked !== null) {
            if (i === q.answer) cls += " right";
            else if (i === picked) cls += " wrong";
          }
          return (
            <button key={i} className={cls} disabled={picked !== null} onClick={() => pick(i)}>
              <span className="opt-key">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <Feedback ok={picked === q.answer} text={q.explain} />
      )}
      {picked !== null && picked !== q.answer && (
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setPicked(null)}>
          <RotateCcw size={14} /> 再试一次
        </button>
      )}
      {solved && picked === null && (
        <Feedback ok text="（你之前已答对本题）" />
      )}
    </>
  );
}

function BlankView({ q, onSolved, solved }: { q: BlankQ; onSolved: () => void; solved: boolean }) {
  const [val, setVal] = useState("");
  const [result, setResult] = useState<null | boolean>(solved ? true : null);
  const check = () => {
    const norm = val.trim().toLowerCase().replace(/\s+/g, "");
    const ok = q.answers.some((a) => norm === a.toLowerCase().replace(/\s+/g, ""));
    setResult(ok);
    if (ok) onSolved();
  };
  return (
    <>
      <input
        className="blank-input"
        placeholder="在这里输入答案…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && check()}
        disabled={result === true}
      />
      <div className="order-btns">
        <button className="btn btn-primary" onClick={check} disabled={result === true || !val.trim()}>
          提交
        </button>
      </div>
      {result !== null && <Feedback ok={result} text={result ? undefined : "提示：注意术语的准确名称，去掉空格后再试"} />}
    </>
  );
}

function OrderView({ q, onSolved, solved }: { q: OrderQ; onSolved: () => void; solved: boolean }) {
  const shuffled = useMemo(() => {
    const arr = q.steps.map((s, i) => ({ s, id: i }));
    // 确定性打乱（避免每次渲染变化）
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [q.steps]);
  const [items, setItems] = useState(shuffled);
  const [result, setResult] = useState<null | boolean>(solved ? true : null);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    setResult(null);
  };
  const check = () => {
    const ok = items.every((it, i) => it.s === q.steps[i]);
    setResult(ok);
    if (ok) onSolved();
  };
  return (
    <>
      <div className="order-list">
        {items.map((it, i) => (
          <div key={it.id} className={`order-item ${result === true ? "right" : ""}`}>
            <span className="n">{i + 1}</span>
            <span style={{ flex: 1 }}>{it.s}</span>
            <span className="order-move">
              <button className="btn btn-ghost" onClick={() => move(i, -1)} title="上移" disabled={result === true}><ArrowUp size={14} /></button>
              <button className="btn btn-ghost" onClick={() => move(i, 1)} title="下移" disabled={result === true}><ArrowDown size={14} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="order-btns">
        <button className="btn btn-primary" onClick={check} disabled={result === true}>
          检查顺序
        </button>
        {result === false && (
          <button className="btn" onClick={() => { setItems(shuffled); setResult(null); }}>
            重置
          </button>
        )}
        {result === true && (
          <button className="btn" onClick={() => { setItems(shuffled); setResult(null); }}>
            <RotateCcw size={14} /> 再练一次
          </button>
        )}
      </div>
      {result !== null && <Feedback ok={result} />}
    </>
  );
}

function MatchView({ q, onSolved, solved }: { q: MatchQ; onSolved: () => void; solved: boolean }) {
  const rights = useMemo(() => {
    const arr = q.pairs.map((p, i) => ({ r: p.right, id: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 5 + 2) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [q.pairs]);
  const [selLeft, setSelLeft] = useState<number | null>(null);
  // 左 -> 右 id 的选择
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [result, setResult] = useState<null | boolean>(solved ? true : null);

  const done = Object.keys(matches).length === q.pairs.length;

  const clickLeft = (i: number) => {
    if (result === true) return;
    // 重新选择左项：清除它已有配对
    setMatches((m) => {
      const next = { ...m };
      delete next[i];
      return next;
    });
    setSelLeft(i);
  };
  const clickRight = (rid: number) => {
    if (result === true || selLeft === null) return;
    // 该右项若已被别的左项占用，先解除
    setMatches((m) => {
      const next: Record<number, number> = {};
      for (const [l, r] of Object.entries(m)) {
        if (r !== rid && Number(l) !== selLeft) next[Number(l)] = r;
      }
      next[selLeft] = rid;
      return next;
    });
    setSelLeft(null);
  };
  const check = () => {
    const ok = q.pairs.every((_, i) => matches[i] === i);
    setResult(ok);
    if (ok) onSolved();
  };

  return (
    <>
      <div className="match-grid">
        <div className="match-col">
          {q.pairs.map((p, i) => (
            <button
              key={i}
              className={`match-item ${selLeft === i ? "sel" : ""} ${result === true ? "right" : ""}`}
              onClick={() => clickLeft(i)}
            >
              {p.left}
              {matches[i] !== undefined && (
                <span style={{ color: "var(--acc)", marginLeft: 8 }}>→ {rights.find((r) => r.id === matches[i])?.r}</span>
              )}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((r) => {
            const usedBy = Object.entries(matches).find(([, rid]) => rid === r.id)?.[0];
            return (
              <button key={r.id} className="match-item" onClick={() => clickRight(r.id)}>
                {r.r}
                {usedBy !== undefined && <span style={{ color: "var(--fg-dim)", marginLeft: 8 }}>（←{q.pairs[Number(usedBy)].left}）</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="order-btns">
        <button className="btn btn-primary" onClick={check} disabled={!done || result === true}>
          检查连线
        </button>
        <button
          className="btn"
          onClick={() => { setMatches({}); setResult(null); setSelLeft(null); }}
        >
          清空
        </button>
        {result === true && (
          <button
            className="btn"
            onClick={() => { setMatches({}); setResult(null); setSelLeft(null); }}
          >
            <RotateCcw size={14} /> 再练一次
          </button>
        )}
      </div>
      <p style={{ color: "var(--fg-dim)", fontSize: 13, margin: "8px 0 0" }}>
        玩法：先点左列概念，再点右列对应释义。
      </p>
      {result !== null && <Feedback ok={result} />}
    </>
  );
}
