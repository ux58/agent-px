import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

/* 全局错误边界：懒加载 chunk 彻底失效（重试+自愈刷新都失败）或渲染异常时，
   给出可操作的兜底 UI，而不是整棵树卸载成白屏。 */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: unknown }
> {
  state: { err: unknown } = { err: null };

  static getDerivedStateFromError(err: unknown) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontFamily: "inherit",
            padding: 24,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 17 }}>页面资源加载失败</b>
          <span style={{ fontSize: 14, opacity: 0.65, maxWidth: 420 }}>
            应用可能刚发布过新版本，当前页面引用的资源已失效。刷新一下即可恢复。
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "9px 22px",
              borderRadius: 10,
              border: "1px solid rgba(128,128,140,0.4)",
              background: "rgba(128,128,140,0.12)",
              color: "inherit",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
