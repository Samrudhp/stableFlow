#!/usr/bin/env bash
# deploy.sh — build all stableFlow images into the Minikube Docker daemon and
# apply Kubernetes manifests in dependency order.
#
# Prerequisites:
#   minikube start
#   kubectl configured to use minikube context
#
# Usage:
#   ./infrastructure/minikube/deploy.sh
#
# To use custom API keys instead of the dev defaults, set env vars before running:
#   GATEWAY_API_KEY_1=<key1> GATEWAY_API_KEY_2=<key2> ./infrastructure/minikube/deploy.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K8S_DIR="$REPO_ROOT/k8s"

# ── Preflight ─────────────────────────────────────────────────────────────────
command -v minikube >/dev/null 2>&1 || { echo "minikube not found. Install from https://minikube.sigs.k8s.io"; exit 1; }
command -v kubectl  >/dev/null 2>&1 || { echo "kubectl not found."; exit 1; }
command -v docker   >/dev/null 2>&1 || { echo "docker not found."; exit 1; }

if ! minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running"; then
  echo "Minikube is not running. Start it with: minikube start"
  exit 1
fi

echo "==> Pointing Docker CLI at Minikube's daemon"
eval "$(minikube docker-env)"

# ── Build images ──────────────────────────────────────────────────────────────
echo "==> Building service images (this takes a few minutes on first run)"
for service in wallet-service payment-service blockchain-service notification-service api-gateway; do
  echo "    building $service..."
  docker build -q -f "$REPO_ROOT/$service/Dockerfile" -t "docker.io/library/$service:latest" "$REPO_ROOT"
  minikube image load "docker.io/library/$service:latest"
done
echo "==> All images built"

# ── Regenerate secrets from env vars if custom keys are provided ──────────────
GATEWAY_API_KEY_1="${GATEWAY_API_KEY_1:-dev-key-payment-service}"
GATEWAY_API_KEY_2="${GATEWAY_API_KEY_2:-dev-key-admin}"
POSTGRES_USER="${POSTGRES_USER:-stableflow}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-stableflow}"

# Overwrite secrets.yaml with freshly encoded values so the running cluster
# always reflects what was passed in — no manual base64 needed.
cat > "$K8S_DIR/secrets.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: stableflow-secrets
  namespace: stableflow
type: Opaque
data:
  postgres-user:     $(printf '%s' "$POSTGRES_USER"     | base64)
  postgres-password: $(printf '%s' "$POSTGRES_PASSWORD" | base64)
  gateway-api-key-1: $(printf '%s' "$GATEWAY_API_KEY_1" | base64)
  gateway-api-key-2: $(printf '%s' "$GATEWAY_API_KEY_2" | base64)
EOF

# ── Apply manifests ───────────────────────────────────────────────────────────
echo "==> Applying Kubernetes manifests"

kubectl apply -f "$K8S_DIR/namespace.yaml"
kubectl apply -f "$K8S_DIR/secrets.yaml"

# Infrastructure first — postgres and rabbitmq must be ready before services start
kubectl apply -f "$K8S_DIR/postgres.yaml"
kubectl apply -f "$K8S_DIR/rabbitmq.yaml"

echo "==> Waiting for postgres..."
kubectl rollout status deployment/postgres -n stableflow --timeout=120s

echo "==> Waiting for rabbitmq..."
kubectl rollout status deployment/rabbitmq -n stableflow --timeout=120s

# Application services — wallet first because payment depends on it
kubectl apply -f "$K8S_DIR/wallet-service.yaml"
echo "==> Waiting for wallet-service..."
kubectl rollout status deployment/wallet-service -n stableflow --timeout=120s

kubectl apply -f "$K8S_DIR/payment-service.yaml"
kubectl apply -f "$K8S_DIR/blockchain-service.yaml"
kubectl apply -f "$K8S_DIR/notification-service.yaml"
echo "==> Waiting for payment-service, blockchain-service, notification-service..."
kubectl rollout status deployment/payment-service     -n stableflow --timeout=120s
kubectl rollout status deployment/blockchain-service  -n stableflow --timeout=120s
kubectl rollout status deployment/notification-service -n stableflow --timeout=120s

kubectl apply -f "$K8S_DIR/api-gateway.yaml"
echo "==> Waiting for api-gateway..."
kubectl rollout status deployment/api-gateway -n stableflow --timeout=120s

# ── Done ──────────────────────────────────────────────────────────────────────
MINIKUBE_IP="$(minikube ip)"
echo ""
echo "==> Deployment complete"
echo ""
echo "    Gateway URL : http://$MINIKUBE_IP:30080"
echo "    API key     : $GATEWAY_API_KEY_1"
echo ""
echo "    Quick smoke test:"
echo "      curl -s -o /dev/null -w '%{http_code}' http://$MINIKUBE_IP:30080/actuator/health"
echo "      # should return 200 (no key required for health)"
echo ""
echo "      curl -s -H 'X-API-Key: $GATEWAY_API_KEY_1' \\"
echo "           -X POST http://$MINIKUBE_IP:30080/api/wallets \\"
echo "           -H 'Content-Type: application/json' \\"
echo "           -d '{\"ownerName\":\"Alice\",\"currency\":\"USDC\",\"initialBalance\":1000}'"
echo ""
echo "    RabbitMQ management UI:"
echo "      kubectl port-forward -n stableflow svc/rabbitmq 15672:15672"
echo "      open http://localhost:15672  (guest / guest)"
echo ""
echo "    Tear down:"
echo "      kubectl delete namespace stableflow"
