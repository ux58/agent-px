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
use tower_http::{cors::CorsLayer, trace::TraceLayer};

/// 学习进度记录。前端只有一个逻辑用户，profileId 预留多用户扩展。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
struct ProgressRecord {
    profile_id: String,
    /// JSON 字符串：{ lessonKey: { quiz, sim, page, ... } }
    data: String,
    updated_at: u64,
}

/// 文件持久化存储：每个 profile 一个 JSON 文件（{data-dir}/{profile_id}.json），
/// 启动时全量加载进内存，写入时先落盘（临时文件 + rename 原子替换）再更新内存。
struct Store {
    dir: PathBuf,
    profiles: RwLock<HashMap<String, ProgressRecord>>,
}

/// profile_id 只允许字母数字下划线连字符（1~64 位），同时是文件名白名单，杜绝路径穿越。
fn valid_profile(id: &str) -> bool {
    (1..=64).contains(&id.len())
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

impl Store {
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

    fn remove(&self, profile: &str) {
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

    let store = Arc::new(
        Store::open(config.data_dir.clone()).unwrap_or_else(|e| {
            panic!(
                "failed to init progress storage at {}: {e}",
                config.data_dir.display()
            )
        }),
    );
    println!(
        "progress storage: {} ({} profile(s) loaded)",
        config.data_dir.display(),
        store.profiles.read().await.len()
    );

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

async fn health(State(store): State<Arc<Store>>) -> Json<serde_json::Value> {
    let count = store.profiles.read().await.len();
    Json(serde_json::json!({
        "status": "ok",
        "service": "agent-school-server",
        "version": env!("CARGO_PKG_VERSION"),
        "storage": "file",
        "profiles": count,
    }))
}

async fn get_progress(
    State(store): State<Arc<Store>>,
    Path(profile_id): Path<String>,
) -> Response {
    if !valid_profile(&profile_id) {
        return (StatusCode::BAD_REQUEST, "invalid profile id").into_response();
    }
    let guard = store.profiles.read().await;
    Json(guard.get(&profile_id).cloned().unwrap_or_default()).into_response()
}

async fn put_progress(
    State(store): State<Arc<Store>>,
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

    let mut guard = store.profiles.write().await;
    // 先落盘再更新内存：磁盘失败时内存保持原状，避免出现内存有、重启即丢的假同步。
    if let Err(e) = store.persist(&record) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("persist failed: {e}") })),
        )
            .into_response();
    }
    let status = if guard.insert(profile_id, record.clone()).is_none() {
        StatusCode::CREATED
    } else {
        StatusCode::OK
    };
    (status, Json(record)).into_response()
}

async fn clear_progress(
    State(store): State<Arc<Store>>,
    Path(profile_id): Path<String>,
) -> Response {
    if !valid_profile(&profile_id) {
        return (StatusCode::BAD_REQUEST, "invalid profile id").into_response();
    }
    let mut guard = store.profiles.write().await;
    let existed = guard.remove(&profile_id).is_some();
    drop(guard);
    if existed {
        store.remove(&profile_id);
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({ "cleared": existed })),
    )
        .into_response()
}

// ---- SPA fallback：非 API 请求找不到文件时返回 index.html ----
fn fallback_file(dist: PathBuf) -> axum::routing::MethodRouter {
    axum::routing::any(move |uri: Uri| {
        let dist = dist.clone();
        async move {
            let path = percent_decode(uri.path());
            let full = dist.join(path.trim_start_matches('/'));
            // 防目录穿越
            if full.starts_with(&dist) && full.is_file() {
                match tokio::fs::read(&full).await {
                    Ok(bytes) => {
                        let mime = mime_guess(&full);
                        return Response::builder()
                            .status(StatusCode::OK)
                            .header(header::CONTENT_TYPE, mime)
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
