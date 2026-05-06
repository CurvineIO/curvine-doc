#!/usr/bin/env bash
set -euo pipefail

# Curvine one-command Docker demo installer.
# Usage:
#   curl -fsSL https://curvineio.github.io/install.sh | bash
# Optional:
#   CURVINE_IMAGE=ghcr.io/curvineio/curvine:latest bash install.sh
#   CURVINE_MASTER_WEB_PORT=19000 bash install.sh
#   CURVINE_RESET=false bash install.sh

CURVINE_IMAGE="${CURVINE_IMAGE:-ghcr.io/curvineio/curvine:latest}"
CURVINE_PROJECT="${CURVINE_PROJECT:-curvine-demo}"
CURVINE_HOME_DIR="${CURVINE_HOME_DIR:-$HOME/.curvine/$CURVINE_PROJECT}"
NETWORK_NAME="${CURVINE_PROJECT}-net"
MASTER_NAME="${CURVINE_PROJECT}-master"
WORKER_NAME="${CURVINE_PROJECT}-worker"
MASTER_DATA_VOLUME="${CURVINE_PROJECT}-master-data"
WORKER_DATA_VOLUME="${CURVINE_PROJECT}-worker-data"
MASTER_LOG_VOLUME="${CURVINE_PROJECT}-master-logs"
WORKER_LOG_VOLUME="${CURVINE_PROJECT}-worker-logs"
MASTER_RPC_HOST_PORT="${CURVINE_MASTER_RPC_PORT:-18995}"
MASTER_JOURNAL_HOST_PORT="${CURVINE_MASTER_JOURNAL_PORT:-18996}"
WORKER_RPC_HOST_PORT="${CURVINE_WORKER_RPC_PORT:-18997}"
MASTER_WEB_HOST_PORT="${CURVINE_MASTER_WEB_PORT:-9000}"
WORKER_WEB_HOST_PORT="${CURVINE_WORKER_WEB_PORT:-9001}"
CURVINE_RESET="${CURVINE_RESET:-true}"

info() { printf '[curvine] %s\n' "$*"; }
warn() { printf '[curvine] WARN: %s\n' "$*" >&2; }
die() { printf '[curvine] ERROR: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required. Please install it and retry."
}

select_docker() {
  if [ -n "${CURVINE_DOCKER:-}" ]; then
    DOCKER_CMD="$CURVINE_DOCKER"
    return
  fi

  need_cmd docker
  if docker info >/dev/null 2>&1; then
    DOCKER_CMD="docker"
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
    return
  fi

  die "Docker is installed but not accessible. Add your user to the docker group, start Docker Desktop, or set CURVINE_DOCKER='sudo docker' if passwordless sudo is enabled."
}

run_docker() {
  # shellcheck disable=SC2086
  $DOCKER_CMD "$@"
}

write_config() {
  mkdir -p "$CURVINE_HOME_DIR/conf"
  cat > "$CURVINE_HOME_DIR/conf/curvine-cluster.toml" <<'EOF'
format_master = true
format_worker = true
cluster_id = "curvine-demo"

[master]
rpc_port = 8995
web_port = 9000
meta_dir = "./data/meta"
audit_logging_enabled = true
log = { level = "info", log_dir = "./logs", file_name = "master.log" }

[journal]
rpc_port = 8996
journal_addrs = [
    { id = 1, hostname = "curvine-demo-master", port = 8996 }
]
journal_dir = "./data/journal"

[worker]
rpc_port = 8997
web_port = 9001
dir_reserved = "1GB"
data_dir = [
    "[SSD]/data/data1",
]
log = { level = "info", log_dir = "./logs", file_name = "worker.log" }

[client]
master_addrs = [
    { hostname = "curvine-demo-master", port = 8995 }
]

[fuse]
debug = false

[log]
level = "info"
log_dir = "./logs"
file_name = "client.log"
EOF

  cat > "$CURVINE_HOME_DIR/conf/curvine-env.sh" <<'EOF'
#!/usr/bin/env bash
export CURVINE_HOME=/app/curvine
export CURVINE_MASTER_HOSTNAME=curvine-demo-master
export CURVINE_WORKER_HOSTNAME=curvine-demo-worker
export CURVINE_CLIENT_HOSTNAME=curvine-demo-master
export CURVINE_CONF_FILE=/app/curvine/conf/curvine-cluster.toml
EOF
}

cleanup_containers() {
  for name in "$WORKER_NAME" "$MASTER_NAME"; do
    if run_docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
      info "Removing existing container: $name"
      run_docker rm -f "$name" >/dev/null
    fi
  done
}

reset_demo_volumes() {
  if [ "$CURVINE_RESET" != "true" ]; then
    return
  fi
  for volume in "$MASTER_DATA_VOLUME" "$WORKER_DATA_VOLUME" "$MASTER_LOG_VOLUME" "$WORKER_LOG_VOLUME"; do
    if run_docker volume inspect "$volume" >/dev/null 2>&1; then
      info "Removing existing demo volume: $volume"
      run_docker volume rm -f "$volume" >/dev/null
    fi
  done
}

ensure_network() {
  if ! run_docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    info "Creating Docker network: $NETWORK_NAME"
    run_docker network create "$NETWORK_NAME" >/dev/null
  fi
}

wait_for_app_log() {
  local name="$1"
  local log_glob="$2"
  local pattern="$3"
  local timeout_seconds="${4:-90}"
  local elapsed=0
  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    local status
    status="$(run_docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)"
    if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
      warn "Container $name exited before becoming ready. Recent logs:"
      run_docker logs --tail 100 "$name" >&2 || true
      return 1
    fi
    if [ "$status" = "running" ] && run_docker exec "$name" bash -lc "grep -q '$pattern' $log_glob" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  warn "Timed out waiting for $name readiness pattern: $pattern"
  run_docker logs --tail 100 "$name" >&2 || true
  run_docker exec "$name" bash -lc "tail -120 $log_glob" >&2 || true
  return 1
}


wait_for_live_worker() {
  local timeout_seconds="${1:-60}"
  local elapsed=0
  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if run_docker exec "$MASTER_NAME" bash -lc "cv report | grep -Eq 'live_worker_num:[[:space:]]*[1-9]'" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  warn "Timed out waiting for at least one live worker in cv report."
  return 1
}

wait_for_http() {
  local url="$1"
  local timeout_seconds="${2:-60}"
  local elapsed=0
  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

main() {
  need_cmd curl
  select_docker

  info "Using image: $CURVINE_IMAGE"
  info "Pulling Curvine image..."
  run_docker pull "$CURVINE_IMAGE"

  write_config
  cleanup_containers
  reset_demo_volumes
  ensure_network

  info "Starting Curvine master..."
  run_docker run -d \
    --name "$MASTER_NAME" \
    --hostname "$MASTER_NAME" \
    --network "$NETWORK_NAME" \
    -e CURVINE_MASTER_HOSTNAME="$MASTER_NAME" \
    -e CURVINE_CLIENT_HOSTNAME="$MASTER_NAME" \
    -e CURVINE_CONF_FILE=/app/curvine/conf/curvine-cluster.toml \
    -p "$MASTER_RPC_HOST_PORT:8995" \
    -p "$MASTER_JOURNAL_HOST_PORT:8996" \
    -p "$MASTER_WEB_HOST_PORT:9000" \
    -v "$CURVINE_HOME_DIR/conf:/app/curvine/conf:ro" \
    -v "$MASTER_DATA_VOLUME:/app/curvine/data" \
    -v "$MASTER_LOG_VOLUME:/app/curvine/logs" \
    "$CURVINE_IMAGE" master start >/dev/null
  wait_for_app_log "$MASTER_NAME" "/app/curvine/logs/master.log.*" "Rpc server .* start successfully" 120

  info "Starting Curvine worker..."
  run_docker run -d \
    --name "$WORKER_NAME" \
    --hostname "$WORKER_NAME" \
    --network "$NETWORK_NAME" \
    -e CURVINE_MASTER_HOSTNAME="$MASTER_NAME" \
    -e CURVINE_WORKER_HOSTNAME="$WORKER_NAME" \
    -e CURVINE_CLIENT_HOSTNAME="$MASTER_NAME" \
    -e CURVINE_CONF_FILE=/app/curvine/conf/curvine-cluster.toml \
    -p "$WORKER_RPC_HOST_PORT:8997" \
    -p "$WORKER_WEB_HOST_PORT:9001" \
    -v "$CURVINE_HOME_DIR/conf:/app/curvine/conf:ro" \
    -v "$WORKER_DATA_VOLUME:/data/data1" \
    -v "$WORKER_LOG_VOLUME:/app/curvine/logs" \
    "$CURVINE_IMAGE" worker start >/dev/null
  wait_for_app_log "$WORKER_NAME" "/app/curvine/logs/worker.log.*" "worker register success" 120

  if wait_for_http "http://127.0.0.1:$MASTER_WEB_HOST_PORT" 60; then
    info "Master Web UI is ready: http://127.0.0.1:$MASTER_WEB_HOST_PORT"
  else
    warn "Master Web UI did not respond yet. Check logs with: $DOCKER_CMD logs $MASTER_NAME"
  fi

  info "Waiting for worker registration to appear in cv report..."
  if wait_for_live_worker 60; then
    info "Running a quick CLI check..."
    run_docker exec "$MASTER_NAME" bash -lc 'cv report'
  else
    warn "CLI check did not find a live worker yet. The containers are running; inspect logs if needed."
  fi

  cat <<EOF

Curvine demo cluster is running.

  Master Web UI:  http://127.0.0.1:$MASTER_WEB_HOST_PORT
  Worker Web UI:  http://127.0.0.1:$WORKER_WEB_HOST_PORT

Useful commands:
  $DOCKER_CMD logs -f $MASTER_NAME
  $DOCKER_CMD logs -f $WORKER_NAME
  $DOCKER_CMD exec -it $MASTER_NAME bash
  $DOCKER_CMD rm -f $MASTER_NAME $WORKER_NAME

EOF
}

main "$@"
