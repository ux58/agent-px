use axum::{
    extract::{Path, State},
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::compression::CompressionLayer;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

/// 学习进度记录。前端只有一个逻辑用户，profileId 预留多用户扩展。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
struct ProgressRecord {
    profile_id: String,
    /// JSON 字符串：{ lessonKey: { quiz, sim, page, ... } }
    data: String,
    updated_at: u64,
}

/// profile_id 只允许字母数字下划线连字符（1~64 位），同时是文件名白名单，杜绝路径穿越。
fn valid_profile(id: &str) -> bool {
    (1..=64).contains(&id.len())
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/* ---------- 存储层：两种实现，同一套异步接口 ----------
   1) FileStore：本地 data-dir 的 JSON 文件（默认，开发/自托管用，数据可持久保留）
   2) Postgres：sqlx + rustls 连 Neon 等托管库（部署在无持久磁盘的平台时用，
      设置 DATABASE_URL 即启用；启动时自动建表）
   免费容器平台（Render Free 等）文件系统随重启清空，进度必须外置数据库。 */

type PgPool = sqlx::PgPool;

enum ProgressStore {
    File(FileStore),
    Postgres(PgPool),
}

impl ProgressStore {
    fn kind(&self) -> &'static str {
        match self {
            ProgressStore::File(_) => "file",
            ProgressStore::Postgres(_) => "postgres",
        }
    }

    /// 连接 Postgres 并确保表存在（幂等，可重复启动）
    async fn connect_postgres(url: &str) -> Result<Self, sqlx::Error> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(4)
            .acquire_timeout(std::time::Duration::from_secs(8))
            .connect(url)
            .await?;
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS progress (
                 profile_id  TEXT PRIMARY KEY,
                 data        TEXT NOT NULL,
                 updated_at  BIGINT NOT NULL
             )",
        )
        .execute(&pool)
        .await?;
        Ok(ProgressStore::Postgres(pool))
    }

    async fn get(&self, profile_id: &str) -> Result<Option<ProgressRecord>, String> {
        match self {
            ProgressStore::File(s) => Ok(s.profiles.read().await.get(profile_id).cloned()),
            ProgressStore::Postgres(pool) => {
                let row: Option<(String, i64)> =
                    sqlx::query_as("SELECT data, updated_at FROM progress WHERE profile_id = $1")
                        .bind(profile_id)
                        .fetch_optional(pool)
                        .await
                        .map_err(|e| e.to_string())?;
                Ok(row.map(|(data, updated_at)| ProgressRecord {
                    profile_id: profile_id.to_string(),
                    data,
                    updated_at: updated_at.max(0) as u64,
                }))
            }
        }
    }

    /// 返回是否为新插入（决定 201/200，与文件版语义一致）
    async fn put(&self, rec: &ProgressRecord) -> Result<bool, String> {
        match self {
            ProgressStore::File(s) => {
                let mut guard = s.profiles.write().await;
                // 先落盘再更新内存：磁盘失败时内存保持原状，避免出现内存有、重启即丢的假同步。
                if let Err(e) = s.persist(rec) {
                    return Err(e.to_string());
                }
                Ok(guard.insert(rec.profile_id.clone(), rec.clone()).is_none())
            }
            ProgressStore::Postgres(pool) => {
                // 先查存在性再 upsert：避免依赖 xmax 之类的方言技巧，两次往返对进度写入无感
                let existed: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM progress WHERE profile_id = $1)")
                    .bind(&rec.profile_id)
                    .fetch_one(pool)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query(
                    "INSERT INTO progress (profile_id, data, updated_at)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (profile_id)
                     DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
                )
                .bind(&rec.profile_id)
                .bind(&rec.data)
                .bind(rec.updated_at as i64)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;
                Ok(!existed)
            }
        }
    }

    async fn remove(&self, profile_id: &str) -> Result<bool, String> {
        match self {
            ProgressStore::File(s) => {
                let mut guard = s.profiles.write().await;
                let existed = guard.remove(profile_id).is_some();
                drop(guard);
                if existed {
                    s.remove_file(profile_id);
                }
                Ok(existed)
            }
            ProgressStore::Postgres(pool) => {
                let n = sqlx::query("DELETE FROM progress WHERE profile_id = $1")
                    .bind(profile_id)
                    .execute(pool)
                    .await
                    .map_err(|e| e.to_string())?
                    .rows_affected();
                Ok(n > 0)
            }
        }
    }
}

/// 本地文件存储：每个 profile 一个 JSON 文件（{data-dir}/{profile_id}.json），
/// 启动时全量加载进内存，写入时先落盘（临时文件 + rename 原子替换）再更新内存。
struct FileStore {
    dir: PathBuf,
    profiles: RwLock<HashMap<String, ProgressRecord>>,
}

impl FileStore {
    fn open(dir: PathBuf) -> std::io::Result<Self> {
        std::fs::create_dir_all(&dir)?;
        let mut profiles = HashMap::new();
        for entry in std::fs::read_dir(&dir)?.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };
            if !valid_profile(stem) {
                continue;
            }
            let parsed = std::fs::read(&path)
                .ok()
                .and_then(|bytes| serde_json::from_slice::<ProgressRecord>(&bytes).ok());
            match parsed {
                Some(rec) => {
                    profiles.insert(stem.to_string(), rec);
                }
                None => eprintln!("warning: skip unreadable progress file {}", path.display()),
            }
        }
        Ok(Self {
            dir,
            profiles: RwLock::new(profiles),
        })
    }

    fn file_of(&self, profile: &str) -> PathBuf {
        self.dir.join(format!("{profile}.json"))
    }

    /// 原子落盘：写临时文件后 rename，进程崩溃也不会留下半个 JSON。
    fn persist(&self, rec: &ProgressRecord) -> std::io::Result<()> {
        let tmp = self.dir.join(format!("{}.tmp", rec.profile_id));
        std::fs::write(&tmp, serde_json::to_vec_pretty(rec).unwrap_or_default())?;
        std::fs::rename(&tmp, self.file_of(&rec.profile_id))?;
        Ok(())
    }

    fn remove_file(&self, profile: &str) {
        let _ = std::fs::remove_file(self.file_of(profile));
    }
}

fn main() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("failed to build tokio runtime");
    runtime.block_on(async_main());
}

async fn async_main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "agent_school_server=info,tower_http=warn".into()),
        )
        .init();

    let args: Vec<String> = std::env::args().collect();
    let config = Config::parse(&args);

    let store = Arc::new(init_store(&config).await);
    println!("progress storage: {} ({})", store.kind(), storage_location(&config));

    // API 路由：进度读写 + 健康检查
    let api = Router::new()
        .route("/health", get(health))
        .route(
            "/progress/{profile_id}",
            get(get_progress).put(put_progress).delete(clear_progress),
        )
        .with_state(store.clone());

    let mut app = Router::new().nest("/api", api);

    // 生产模式：托管前端构建产物（SPA fallback 到 index.html）
    if let Some(dist) = &config.dist_dir {
        if dist.is_dir() {
            app = app
                .fallback_service(fallback_file(dist.clone()))
                .layer(TraceLayer::new_for_http());
            println!("static assets: {}", dist.display());
        } else {
            eprintln!(
                "warning: dist dir '{}' not found, serving API only",
                dist.display()
            );
        }
    }

    // 响应压缩 gzip：前端 JS/CSS 传输体积约 -65%，加载显著提速（默认谓词已排除图片等类型）
    app = app.layer(CompressionLayer::new());
    app = app.layer(CorsLayer::permissive());

    let addr = format!("{}:{}", config.host, config.port);
    println!("Agent 学堂 server listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));
    axum::serve(listener, app).await.expect("server error");
}

struct Config {
    host: String,
    port: u16,
    dist_dir: Option<PathBuf>,
    data_dir: PathBuf,
}

/// 存储初始化：设置了 DATABASE_URL 用 Postgres（托管平台），否则回退本地文件（开发/自托管）。
async fn init_store(config: &Config) -> ProgressStore {
    let url = std::env::var("DATABASE_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    match url {
        Some(url) => {
            println!("DATABASE_URL detected, connecting to Postgres ...");
            ProgressStore::connect_postgres(&url)
                .await
                .unwrap_or_else(|e| panic!("failed to init postgres storage: {e:#}"))
        }
        None => ProgressStore::File(
            FileStore::open(config.data_dir.clone()).unwrap_or_else(|e| {
                panic!(
                    "failed to init progress storage at {}: {e}",
                    config.data_dir.display()
                )
            }),
        ),
    }
}

fn storage_location(config: &Config) -> String {
    if std::env::var("DATABASE_URL")
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
    {
        "postgres".to_string()
    } else {
        config.data_dir.display().to_string()
    }
}

impl Config {
    fn parse(args: &[String]) -> Self {
        let mut host = "127.0.0.1".to_string();
        let mut port: u16 = 8787;
        let mut dist_dir = None;
        let mut data_dir = PathBuf::from("data");
        let mut i = 1;
        while i < args.len() {
            match args[i].as_str() {
                "--host" => {
                    i += 1;
                    if i < args.len() {
                        host = args[i].clone();
                    }
                }
                "--port" => {
                    i += 1;
                    if i < args.len() {
                        port = args[i].parse().unwrap_or(port);
                    }
                }
                "--dist" => {
                    i += 1;
                    if i < args.len() {
                        dist_dir = Some(PathBuf::from(&args[i]));
                    }
                }
                "--data-dir" => {
                    i += 1;
                    if i < args.len() {
                        data_dir = PathBuf::from(&args[i]);
                    }
                }
                _ => {}
            }
            i += 1;
        }
        Config {
            host,
            port,
            dist_dir,
            data_dir,
        }
    }
}

async fn health(State(store): State<Arc<ProgressStore>>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "agent-school-server",
        "version": env!("CARGO_PKG_VERSION"),
        "storage": store.kind(),
    }))
}

/// 数据库类错误的统一 500 响应
fn storage_error(e: String) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": format!("storage: {e}") })),
    )
        .into_response()
}

async fn get_progress(
    State(store): State<Arc<ProgressStore>>,
    Path(profile_id): Path<String>,
) -> Response {
    if !valid_profile(&profile_id) {
        return (StatusCode::BAD_REQUEST, "invalid profile id").into_response();
    }
    match store.get(&profile_id).await {
        Ok(rec) => Json(rec.unwrap_or_default()).into_response(),
        Err(e) => storage_error(e),
    }
}

async fn put_progress(
    State(store): State<Arc<ProgressStore>>,
    Path(profile_id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Response {
    if !valid_profile(&profile_id) {
        return (StatusCode::BAD_REQUEST, "invalid profile id").into_response();
    }
    let data = match body.get("data").and_then(|v| v.as_str()) {
        Some(d) => d.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "missing field: data" })),
            )
                .into_response()
        }
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let record = ProgressRecord {
        profile_id: profile_id.clone(),
        data,
        updated_at: now,
    };

    match store.put(&record).await {
        Ok(true) => (StatusCode::CREATED, Json(record)).into_response(),
        Ok(false) => (StatusCode::OK, Json(record)).into_response(),
        Err(e) => storage_error(e),
    }
}

async fn clear_progress(
    State(store): State<Arc<ProgressStore>>,
    Path(profile_id): Path<String>,
) -> Response {
    if !valid_profile(&profile_id) {
        return (StatusCode::BAD_REQUEST, "invalid profile id").into_response();
    }
    match store.remove(&profile_id).await {
        Ok(existed) => (
            StatusCode::OK,
            Json(serde_json::json!({ "cleared": existed })),
        )
            .into_response(),
        Err(e) => storage_error(e),
    }
}

// ---- SPA fallback：非 API 请求找不到文件时返回 index.html ----
// 缓存策略（解决「发布新版后旧标签页白屏、要手动刷新才恢复」）：
//   /assets/* 文件名带内容哈希 → 允许长缓存 immutable，改版必然换名；
//   index.html 等入口文件 → no-cache，每次都向服务器重新校验，
//   保证浏览器总能拿到引用最新 chunk 的入口，不再出现新旧引用错配。
fn fallback_file(dist: PathBuf) -> axum::routing::MethodRouter {
    axum::routing::any(move |uri: Uri| {
        let dist = dist.clone();
        async move {
            let path = percent_decode(uri.path());
            let is_asset = path.starts_with("/assets/");
            let full = dist.join(path.trim_start_matches('/'));
            // 防目录穿越
            if full.starts_with(&dist) && full.is_file() {
                match tokio::fs::read(&full).await {
                    Ok(bytes) => {
                        let mime = mime_guess(&full);
                        let cache = if is_asset {
                            "public, max-age=31536000, immutable"
                        } else {
                            "no-cache"
                        };
                        return Response::builder()
                            .status(StatusCode::OK)
                            .header(header::CONTENT_TYPE, mime)
                            .header(header::CACHE_CONTROL, cache)
                            .body(axum::body::Body::from(bytes))
                            .unwrap();
                    }
                    Err(_) => {}
                }
            }
            match tokio::fs::read(dist.join("index.html")).await {
                Ok(bytes) => Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                    .header(header::CACHE_CONTROL, "no-cache")
                    .body(axum::body::Body::from(bytes))
                    .unwrap(),
                Err(_) => (StatusCode::NOT_FOUND, "404: build web/ first").into_response(),
            }
        }
    })
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(
                std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("zz"),
                16,
            ) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn mime_guess(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" | "map" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}
