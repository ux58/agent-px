import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发时 /api 代理到 Rust 后端（8787）；生产构建产物由后端托管
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    // vendor 分包：业务代码迭代时框架缓存不失效；模拟器/图示按路由懒加载自动分包
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          gsap: ["gsap"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
