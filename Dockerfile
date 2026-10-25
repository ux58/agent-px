# ---------- 阶段 1：构建前端 ----------
FROM node:22-alpine AS web-build
WORKDIR /build
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# ---------- 阶段 2：编译后端并打包 ----------
FROM rust:1-alpine AS server-build
WORKDIR /build
RUN apk add --no-cache musl-dev pkgconfig
COPY server/Cargo.toml ./
# 预热依赖缓存
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY server/src ./src
RUN touch src/main.rs && cargo build --release

# ---------- 运行时 ----------
FROM alpine:3.20
WORKDIR /app
COPY --from=server-build /build/target/release/agent-school-server /app/agent-school-server
COPY --from=web-build /build/dist /app/web/dist
EXPOSE 8787
CMD ["/app/agent-school-server", "--host", "0.0.0.0", "--port", "8787", "--dist", "/app/web/dist"]
