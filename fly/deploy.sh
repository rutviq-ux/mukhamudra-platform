#!/usr/bin/env bash
set -euo pipefail

# Deploy all Fly.io services for Mukha Mudra
# Usage: ./fly/deploy.sh [wa-bot|ghost|listmonk|all]
# Run from repo root: ./fly/deploy.sh

ORG="mukha-mudra"
REGION="bom"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "==> $*"; }
err() { echo "ERROR: $*" >&2; exit 1; }

ensure_app() {
  local app="$1"
  flyctl apps list --org "$ORG" 2>/dev/null | grep -q "$app" || {
    log "Creating $app app..."
    flyctl apps create "$app" --org "$ORG"
  }
}

ensure_volume() {
  local app="$1" vol="$2" size="${3:-1}"
  flyctl volumes list --app "$app" 2>/dev/null | grep -q "$vol" || {
    log "Creating $vol volume ($size GB)..."
    flyctl volumes create "$vol" --app "$app" --region "$REGION" --size "$size" --yes
  }
}

deploy_wa_bot() {
  log "Deploying mm-wa-bot..."
  ensure_app "mm-wa-bot"
  ensure_volume "mm-wa-bot" "wa_bot_data" 1

  # Deploy from repo root (Dockerfile needs workspace context)
  flyctl deploy \
    --app mm-wa-bot \
    --config "$REPO_ROOT/fly/wa-bot/fly.toml" \
    --dockerfile "$REPO_ROOT/services/wa-bot/Dockerfile" \
    --remote-only

  log "mm-wa-bot deployed!"
  log "Set DATABASE_URL if not already: flyctl secrets set DATABASE_URL='...' --app mm-wa-bot"
}

deploy_ghost() {
  log "Deploying mm-ghost..."
  ensure_app "mm-ghost"
  ensure_volume "mm-ghost" "ghost_content" 2

  cd "$REPO_ROOT/fly/ghost"
  flyctl deploy --app mm-ghost --config fly.toml --remote-only
  cd "$REPO_ROOT"

  log "mm-ghost deployed!"
  log "Set up admin: https://mm-ghost.fly.dev/ghost/"
  log "Custom domain: flyctl certs create ghost.mukhamudra.com --app mm-ghost"
}

deploy_listmonk() {
  log "Deploying mm-listmonk..."
  ensure_app "mm-listmonk"

  # Create Fly Postgres if not exists
  flyctl apps list --org "$ORG" 2>/dev/null | grep -q "mm-listmonk-db" || {
    log "Creating mm-listmonk-db (Fly Postgres)..."
    flyctl postgres create \
      --name mm-listmonk-db \
      --org "$ORG" \
      --region "$REGION" \
      --vm-size shared-cpu-1x \
      --initial-cluster-size 1 \
      --volume-size 1

    flyctl postgres attach mm-listmonk-db --app mm-listmonk
  }

  ensure_volume "mm-listmonk" "listmonk_uploads" 1

  cd "$REPO_ROOT/fly/listmonk"
  flyctl deploy --app mm-listmonk --config fly.toml --remote-only
  cd "$REPO_ROOT"

  log "mm-listmonk deployed!"
}

case "${1:-all}" in
  wa-bot)   deploy_wa_bot ;;
  ghost)    deploy_ghost ;;
  listmonk) deploy_listmonk ;;
  all)
    deploy_listmonk
    deploy_ghost
    deploy_wa_bot
    log ""
    log "All services deployed! Next steps:"
    log "  1. flyctl secrets set DATABASE_URL='<neon-url>' --app mm-wa-bot"
    log "  2. Set up Ghost admin: https://mm-ghost.fly.dev/ghost/"
    log "  3. flyctl certs create ghost.mukhamudra.com --app mm-ghost"
    log "  4. Update Vercel env vars:"
    log "     GHOST_URL=https://ghost.mukhamudra.com"
    log "     LISTMONK_URL=https://mm-listmonk.fly.dev"
    ;;
  *) err "Usage: $0 [wa-bot|ghost|listmonk|all]" ;;
esac
