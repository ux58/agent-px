# 免费部署到 Render + Neon（路线 A 实施手册）

参照 free-fullstack-deploy skill 的平台组合（Render 托管 + Neon 数据库；本项目无文件上传，
Supabase 用不上），全程零信用卡。本项目的两个适配已内置：

1. **进度存储外置**：服务端检测到 `DATABASE_URL` 时自动切换 Postgres 存储（启动时自动建表），
   不设置则回落本地文件存储（本地开发不变）；
2. **免编译镜像**：GitHub Actions 预编译 musl 静态二进制并发布到 `render` 分支，
   Render 构建 Docker 镜像只做 COPY（免费 512MB 实例上现场编译 Rust 会 OOM）。

## 前置

- 项目推到 GitHub（main 分支）。国内网络推送失败时开系统代理并：
  `git config http.proxy http://127.0.0.1:<端口>`（详见 skill 第 5.3 节）
- 推送后 Actions 自动运行 `.github/workflows/render-release.yml`，产出 `render` 分支
  （内含：二进制、web/dist、Dockerfile）。去仓库 Actions 页确认该工作流绿了再继续。

## 第 1 步：Neon（数据库，约 5 分钟）

1. <https://neon.tech> → GitHub 登录 → Create project（区域选 Singapore）
2. 复制连接串（选 **Pooled connection**，形如
   `postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`）
3. 无需手动建表：服务端启动时自动执行 `CREATE TABLE IF NOT EXISTS progress ...`

> Neon 免费层空闲会挂起、首次请求约 1 秒冷启动，对进度接口无感。

## 第 2 步：Render（应用托管，约 15 分钟）

1. <https://dashboard.render.com> → GitHub 登录 → 授权 GitHub App（只勾选目标仓库）
2. New → **Web Service** → 选择仓库
3. 配置：
   - **Branch：`render`**（关键！这是预编译产物的分支，不是 main）
   - Runtime 自动识别 Docker（使用分支内的 Dockerfile）
   - **Region：Singapore**；**Instance Type：Free**
   - Health Check Path：`/api/health`
4. Environment Variables：
   - `DATABASE_URL` = Neon 连接串（唯一必需变量）
5. Create Web Service → 构建 1~2 分钟（只是 COPY 文件）→ 部署完成

## 第 3 步：端到端验证

```bash
BASE=https://你的应用.onrender.com

# 1) 健康：storage 应为 postgres
curl -s $BASE/api/health
# 期望 {"status":"ok",...,"storage":"postgres"}

# 2) 进度写入（等于前端「学习一课后自动同步」）
curl -s -X PUT $BASE/api/progress/default \
  -H 'Content-Type: application/json' \
  -d '{"data":"{\"llm-basics\":{\"page\":true}}"}'
# 期望 201，再次 PUT 期望 200（幂等 upsert）

# 3) 读回
curl -s $BASE/api/progress/default
# 期望 data 与写入一致

# 4) 清理
curl -s -X DELETE $BASE/api/progress/default
# 期望 {"cleared":true}
```

浏览器验收：打开站点学习任意一课 → 顶栏绿点常亮（后端已连接）；换设备/清缓存后打开，
进度自动恢复。

## 免费层行为（务必知晓）

| 平台 | 行为 | 对本项目的影响 |
|---|---|---|
| Render Free | 闲置 15 分钟休眠，唤醒约 50 秒 | 首次打开慢；前端是纯静态由同一服务托管，唤醒期间整站不可达 |
| Neon Free | 空闲挂起，首请求约 1s | 无感 |
| 二者 | 免费额度月度滚动 | 个人学习站完全够用 |

## 日常更新流程

改代码 → push 到 main → Actions 自动重编并更新 render 分支 → Render 自动检测到
render 分支更新并重新部署（全流程 5~10 分钟）。

## 回退到纯本地存储

删除 Render 环境变量 `DATABASE_URL` 并重新部署，服务端即回落文件存储
（注意：免费实例的文件系统随重启清空，仅适合验证）。
