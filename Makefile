.PHONY: dev build serve check clean

# 开发：并行启动后端(:8787)与前端(:5173 热更新，/api 代理到 8787)
dev:
	@echo "==> 启动后端 :8787 与前端 :5173 (Ctrl+C 退出)"
	@cd server && cargo run -- --port 8787 & \
	cd web && npx vite --port 5173 & \
	wait

# 构建：前端产物 + 后端 release 二进制
build:
	cd web && npm run build
	cd server && cargo build --release

# 生产模式：后端托管前端产物，单端口访问
serve:
	./server/target/release/agent-school-server --host 127.0.0.1 --port 8787 --dist web/dist

# 检查：前端类型检查 + 后端编译检查
check:
	cd web && npm run typecheck
	cd server && cargo check

clean:
	rm -rf web/dist web/node_modules/.vite server/target
