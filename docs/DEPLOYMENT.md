# 部署指南 · DEPLOYMENT

> 三种部署方式：本地生产模式 / Docker Compose / 云端（Nginx 反代 + HTTPS）。

## 方式一：本地生产模式（最简）

```bash
make build            # web/dist + server/target/release
make serve            # http://127.0.0.1:8787
# 等价手工命令：
# ./server/target/release/agent-school-server --host 0.0.0.0 --port 8787 --dist web/dist
```

参数：`--host`（默认 127.0.0.1）、`--port`（默认 8787）、`--dist`（前端产物目录，省略则只提供 API）、
`--data-dir`（进度数据目录，默认 `./data`，每个 profile 一个 JSON 文件，重启不丢）。

## 方式二：Docker Compose（推荐服务器部署）

```bash
docker compose up --build -d      # 构建并后台运行，端口 8787
docker compose logs -f            # 看日志
docker compose down               # 停止
```

镜像为两阶段构建：Node 阶段构建前端 → Rust 阶段编译后端并把 `web/dist`
拷入运行时镜像；容器内以 `--host 0.0.0.0 --dist /app/web/dist` 启动，
进度数据写入 `/app/data`（compose 挂载命名卷 `agent-school-data`，重建容器不丢数据）。

## 方式三：云端 + Nginx 反向代理

1. 服务器上 `make build`（或用 compose）；
2. Nginx 配置参考：

```nginx
server {
    listen 80;
    server_name your.domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. HTTPS 用 certbot 一键签发：`sudo certbot --nginx -d your.domain.com`。

## 健康检查与运维

```bash
curl http://127.0.0.1:8787/api/health
# {"service":"agent-school-server","status":"ok","version":"0.1.0","storage":"file","profiles":1}
```

- 日志：`RUST_LOG=info ./agent-school-server ...`（tower_http 打请求级日志）。
- 进度数据为文件持久化存储（`--data-dir` 指定目录，默认 `./data`）：每个 profile
  一个 JSON 文件，原子写入（临时文件 + rename），重启不丢。备份即拷贝该目录。
- 升级流程：`git pull && make build && make serve`（compose：`docker compose up -d --build`）。

## 资源占用参考

Rust 单二进制 + 静态文件服务，空载内存约 5~15MB；无数据库、无运行时依赖，
单核 512MB 的云主机即可稳定运行。
