# Render 部署专用 Dockerfile：不做任何编译，直接使用 render 分支里
# 由 GitHub Actions 预编译好的 musl 静态二进制与前端产物。
# （此文件会被工作流复制到 render 分支根目录作为 Dockerfile）
FROM alpine:3.20
WORKDIR /app

# agent-school-server：x86_64 musl 静态二进制，无动态库依赖
# dist/：前端构建产物
COPY agent-school-server /app/agent-school-server
COPY dist /app/web/dist
RUN chmod +x /app/agent-school-server

EXPOSE 8787

# exec 数组 + sh -c：绝对路径启动（PATH 不含工作目录，裸命令名会 127 not found），
# sh -c 用于展开 Render 注入的 PORT 环境变量（默认 10000；本地/其它平台回落 8787）
CMD ["/bin/sh", "-c", "/app/agent-school-server --host 0.0.0.0 --port \"${PORT:-8787}\" --dist /app/web/dist --data-dir /app/data"]
