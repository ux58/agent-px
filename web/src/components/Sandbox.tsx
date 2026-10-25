import { lazy, Suspense } from "react";
import type { ComponentType } from "react";

/* 模拟器全部懒加载：进入沙盒页才下载对应分包 */
const SIMS: { comp: ComponentType; title: string; desc: string }[] = [
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.AgentLoopSim }))), title: "Agent 循环", desc: "亲手驱动 思考→行动→观察，看模型自我纠错" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.McpSim }))), title: "MCP 握手", desc: "连接 Server、注册工具、发起 JSON-RPC 调用" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.SkillSim }))), title: "Skill 渐进加载", desc: "对比全量常驻与按需展开的上下文开销" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.PromptSim }))), title: "提示词体检", desc: "五维度实时给你的 System Prompt 打分" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.MultiAgentSim }))), title: "多智能体协作", desc: "编排者派活、工人干活、评审打回全流程" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.ContextSim }))), title: "上下文窗口", desc: "10k 预算内体会『上下文是稀缺资源』" },
  { comp: lazy(() => import("./Simulators").then((m) => ({ default: m.RouterSim }))), title: "模型路由成本", desc: "三种策略的月账单差一个数量级" },
];

function SimSkeleton() {
  return <div className="lazy-skel" aria-label="模拟器加载中" />;
}

export function Sandbox() {
  return (
    <>
      <div className="page-head">
        <div className="hs-left">
          <p className="eyebrow">SANDBOX</p>
          <h1>交互沙盒</h1>
          <p className="section-sub">
            七个模拟器自由试玩，无需按课程顺序——玩过再回头看原理，或反过来，都行。
          </p>
        </div>
        <span className="count-chip">7 个模拟器</span>
      </div>
      <div className="sandbox-grid">
        {SIMS.map(({ comp: Sim, title, desc }) => (
          <div className="sandbox-card" key={title}>
            <h3>{title}</h3>
            <p className="desc">{desc}</p>
            <Suspense fallback={<SimSkeleton />}>
              <Sim />
            </Suspense>
          </div>
        ))}
      </div>
    </>
  );
}
