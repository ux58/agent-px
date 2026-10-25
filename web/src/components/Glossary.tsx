import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { GLOSSARY } from "../data";
import { useActiveBox } from "./Slider";

export function Glossary() {
  const [q, setQ] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // 字母筛选滑块：随激活字母滑动（chips 可换行，量 offsetTop 一起跟）
  const { box: chipBox, ready: chipReady } = useActiveBox(
    chipsRef,
    "[data-chip].active",
    letter ?? "all",
  );

  const letters = useMemo(() => {
    const s = new Set<string>();
    for (const t of GLOSSARY) s.add(t.en[0].toUpperCase());
    return [...s].sort();
  }, []);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => {
      const hitQ =
        !k ||
        t.term.toLowerCase().includes(k) ||
        t.en.toLowerCase().includes(k) ||
        t.def.toLowerCase().includes(k);
      const hitL = !letter || t.en[0].toUpperCase() === letter;
      return hitQ && hitL;
    });
  }, [q, letter]);

  return (
    <>
      <div className="page-head">
        <div className="hs-left">
          <p className="eyebrow">GLOSSARY</p>
          <h1>术语表</h1>
          <p className="section-sub">遇到不认识的词，先来这里查一查。共 {GLOSSARY.length} 条，随课程持续更新。</p>
        </div>
        <span className="count-chip">{list.length} 条</span>
      </div>

      <div className="glossary-toolbar">
        <div className="glossary-search-wrap">
          <Search size={15} className="glossary-search-ico" />
          <input
            className="glossary-search"
            placeholder="搜索术语、英文或定义…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="letter-chips" ref={chipsRef}>
          <span
            className="chip-slider"
            data-ready={chipReady ? "1" : "0"}
            style={chipBox ? { transform: `translate(${chipBox.x}px, ${chipBox.y}px)`, width: chipBox.w, height: chipBox.h } : undefined}
            aria-hidden="true"
          />
          <button data-chip="all" className={!letter ? "active" : ""} onClick={() => setLetter(null)}>全部</button>
          {letters.map((L) => (
            <button key={L} data-chip={L} className={letter === L ? "active" : ""} onClick={() => setLetter(L)}>{L}</button>
          ))}
        </div>
      </div>

      <div className="glossary-grid" key={letter ?? "all"}>
        {list.map((t, i) => (
          <div className="glossary-item" key={t.en + t.term}>
            <span
              className="gl-tile"
              style={{ background: `linear-gradient(135deg, hsl(${(i * 47) % 360} 62% 52%), hsl(${(i * 47 + 30) % 360} 62% 42%))` }}
            >
              {t.en[0].toUpperCase()}
            </span>
            <div>
              <h4>
                {t.term}
                <span className="g-en">{t.en}</span>
              </h4>
              <p>{t.def}</p>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p style={{ color: "var(--fg-dim)" }}>没有匹配的术语，换个关键词或清除字母筛选试试。</p>
        )}
      </div>
    </>
  );
}
