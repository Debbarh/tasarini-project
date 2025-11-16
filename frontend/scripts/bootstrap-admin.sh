set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v docker >/dev/null 2>&1 && [ -f "$ROOT_DIR/docker-compose.yml" ]; then
  (cd "$ROOT_DIR" && docker compose run --rm backend python manage.py bootstrap_admin "$@")
else
  (cd "$ROOT_DIR/backend" && python manage.py bootstrap_admin "$@")
fi
