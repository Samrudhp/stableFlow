#!/usr/bin/env bash
# =============================================================================
#  StableFlow — Professor Demo Script
#  Covers: Minikube deployment · per-service DB · sync+async comms
#          · resilience (service down) · API-key auth at gateway
#
#  Usage:
#    # First time (fresh machine) — start Minikube and deploy:
#    minikube start --driver=docker --memory=4096 --cpus=3
#    ./infrastructure/minikube/deploy.sh
#
#    # Open ONE terminal and keep it running (port-forward):
#    kubectl port-forward svc/api-gateway 8080:8080 -n stableflow
#
#    # In a second terminal run the demo:
#    ./demo.sh
#
#    # If Minikube is already running from a previous session, just ensure
#    # the port-forward is active, then run ./demo.sh
# =============================================================================
set -euo pipefail

export PATH="$HOME/bin:$PATH"
GW="http://localhost:8080"
PASS=0; FAIL=0

# ── colour helpers ────────────────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
blue()   { printf '\033[0;34m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n'   "$*"; }

header() {
  echo ""
  blue "══════════════════════════════════════════════════════════"
  blue "  $*"
  blue "══════════════════════════════════════════════════════════"
  echo ""
}

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    green "  ✓  $label"
    PASS=$((PASS+1))
  else
    red   "  ✗  $label"
    red   "     expected : $expected"
    red   "     got      : $actual"
    FAIL=$((FAIL+1))
  fi
}

# ── preflight ─────────────────────────────────────────────────────────────────
header "PREFLIGHT"

# 1. Minikube running?
if ! minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running"; then
  red "  Minikube is not running."
  red "  Start it with:  minikube start --driver=docker --memory=4096 --cpus=3"
  exit 1
fi
green "  ✓  Minikube is running"

# 2. Namespace exists?
if ! kubectl get ns stableflow &>/dev/null; then
  red "  stableflow namespace not found."
  red "  Deploy first:  ./infrastructure/minikube/deploy.sh"
  exit 1
fi

# 3. Wait for all pods to be ready
NOT_READY=$(kubectl get pods -n stableflow --no-headers 2>/dev/null \
  | awk '$2!="1/1"' | wc -l | tr -d ' ')
if [[ "$NOT_READY" -gt 0 ]]; then
  yellow "  Some pods not yet ready — waiting up to 3 minutes..."
  kubectl wait --for=condition=ready pod --all -n stableflow --timeout=180s
fi
green "  ✓  All pods ready"

# 4. Port-forward — start one if the gateway isn't reachable
if ! curl -sf "$GW/actuator/health" &>/dev/null; then
  yellow "  Port-forward not detected — starting one now..."
  yellow "  (For the demo, keep a separate terminal running:"
  yellow "   kubectl port-forward svc/api-gateway 8080:8080 -n stableflow)"
  kubectl port-forward svc/api-gateway 8080:8080 -n stableflow &>/tmp/pf.log &
  PF_PID=$!
  sleep 4
  if ! curl -sf "$GW/actuator/health" &>/dev/null; then
    red "  Gateway still not reachable. Check: kubectl get pods -n stableflow"
    kill "$PF_PID" 2>/dev/null || true
    exit 1
  fi
  yellow "  (port-forward PID $PF_PID — will be cleaned up at script end)"
else
  PF_PID=""
  green "  ✓  Port-forward already active"
fi
green "  ✓  Gateway reachable at $GW"

# =============================================================================
header "DEMO 1 — Minikube Deployment"
# =============================================================================
bold "  7 workloads running inside a local Kubernetes cluster:"
echo ""
kubectl get pods -n stableflow \
  -o custom-columns="POD:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount"
echo ""
bold "  Services — only the API gateway is exposed outside the cluster (NodePort 30080):"
kubectl get svc -n stableflow
echo ""
check "All 7 pods exist" "7" "$(kubectl get pods -n stableflow --no-headers | wc -l | tr -d ' ')"

# =============================================================================
header "DEMO 2 — Security: Authentication at the Gateway"
# =============================================================================
bold "  Every request must carry X-API-Key. The gateway enforces this before"
bold "  the request ever reaches a downstream service."
echo ""

yellow "  2a. No API key → 401 Unauthorized"
S=$(curl -s -o /dev/null -w "%{http_code}" "$GW/api/wallets/00000000-0000-0000-0000-000000000000")
echo "      curl $GW/api/wallets/...            → HTTP $S"
check "No key blocked at gateway" "401" "$S"

yellow "  2b. Wrong key → 401 Unauthorized"
S=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: hacker" \
    "$GW/api/wallets/00000000-0000-0000-0000-000000000000")
echo "      X-API-Key: hacker                   → HTTP $S"
check "Wrong key blocked at gateway" "401" "$S"

yellow "  2c. Valid key → request passes through (404 = wallet not found, not blocked)"
S=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: dev-key-admin" \
    "$GW/api/wallets/00000000-0000-0000-0000-000000000000")
echo "      X-API-Key: dev-key-admin            → HTTP $S"
check "Valid key passes through gateway" "404" "$S"

yellow "  2d. /actuator/health is public — Kubernetes probes need no key"
HEALTH=$(curl -s "$GW/actuator/health")
echo "      $HEALTH"
check "Health endpoint requires no key" "UP" "$HEALTH"

# =============================================================================
header "DEMO 3 — Per-Service Databases"
# =============================================================================
bold "  One Postgres instance, four isolated databases."
bold "  No service can query another service's tables."
echo ""
kubectl exec -n stableflow deploy/postgres -- \
  psql -U stableflow -c "\l" 2>/dev/null \
  | awk '/payment_db|wallet_db|blockchain_db|notification_db/{print "    " $0}'
echo ""

PG="kubectl exec -n stableflow deploy/postgres -- psql -U stableflow -lqt"
check "payment_db      → owned by payment-service"      "payment_db"      "$($PG 2>/dev/null || echo '')"
check "wallet_db       → owned by wallet-service"       "wallet_db"       "$($PG 2>/dev/null || echo '')"
check "blockchain_db   → owned by blockchain-service"   "blockchain_db"   "$($PG 2>/dev/null || echo '')"
check "notification_db → owned by notification-service" "notification_db" "$($PG 2>/dev/null || echo '')"

# =============================================================================
header "DEMO 4 — Cross-Service Communication"
# =============================================================================
bold "  Synchronous  : payment-service calls wallet-service over HTTP (REST)"
bold "  Asynchronous : services exchange events over RabbitMQ"
echo ""

yellow "  Creating Alice (500 USDC) and Bob (1 µUSDC) wallets..."
ALICE_RESP=$(curl -s -X POST "$GW/api/wallets" \
  -H "X-API-Key: dev-key-admin" -H "Content-Type: application/json" \
  -d '{"ownerName":"Alice","currency":"USDC","initialBalance":500}')
BOB_RESP=$(curl -s -X POST "$GW/api/wallets" \
  -H "X-API-Key: dev-key-admin" -H "Content-Type: application/json" \
  -d '{"ownerName":"Bob","currency":"USDC","initialBalance":0.000001}')

ALICE_ID=$(echo "$ALICE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['walletId'])")
BOB_ID=$(echo   "$BOB_RESP"   | python3 -c "import sys,json; print(json.load(sys.stdin)['walletId'])")
echo "      Alice  $ALICE_ID  500 USDC"
echo "      Bob    $BOB_ID"
echo ""

yellow "  4a. SYNC — payment-service calls wallet-service (HTTP POST /reserve)"
yellow "      Submitting 100 USDC payment Alice → Bob..."
PAYMENT_RESP=$(curl -s -X POST "$GW/api/payments" \
  -H "X-API-Key: dev-key-admin" -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-$(date +%s%N)" \
  -d "{\"senderWalletId\":\"$ALICE_ID\",\"receiverWalletId\":\"$BOB_ID\",\"amount\":100,\"currency\":\"USDC\"}")
PAYMENT_ID=$(echo "$PAYMENT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['paymentId'])")
STATUS_NOW=$(echo "$PAYMENT_RESP"  | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo "      Payment $PAYMENT_ID"
echo "      Status immediately after creation: $STATUS_NOW"
echo "      (funds reserved synchronously via HTTP before this response returned)"
check "Payment created as PROCESSING (sync reserve succeeded)" "PROCESSING" "$STATUS_NOW"

echo ""
yellow "  4b. ASYNC — event chain over RabbitMQ:"
yellow "      payment-service  →[blockchain.transaction.requested]→  blockchain-service"
yellow "      blockchain-service →[blockchain.transaction.confirmed]→  payment-service"
yellow "      payment-service  →[payment.status.changed]→  notification-service"
yellow "      Waiting 4 seconds for the full chain to complete..."
sleep 4

FINAL_STATUS=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/payments/$PAYMENT_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo "      Payment status now: $FINAL_STATUS"
check "Payment auto-settled through async event chain" "SETTLED" "$FINAL_STATUS"

ALICE_BAL=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/wallets/$ALICE_ID/balance" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['availableBalance'])")
BOB_BAL=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/wallets/$BOB_ID/balance" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['availableBalance'])")
echo ""
echo "      Alice balance : $ALICE_BAL USDC  (was 500, sent 100  →  400)"
echo "      Bob   balance : $BOB_BAL USDC  (was ~0, received 100 → 100)"
check "Alice debited correctly" "400" "$ALICE_BAL"
check "Bob credited correctly"  "100" "$BOB_BAL"

NOTIF_COUNT=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/notifications" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo ""
echo "      Notifications stored by notification-service: $NOTIF_COUNT"
check "Notification-service received the event" "$(( NOTIF_COUNT > 0 ? NOTIF_COUNT : -1 ))" "$NOTIF_COUNT"

# =============================================================================
header "DEMO 5 — Resilience: One Service Down, Others Keep Answering"
# =============================================================================
bold "  We kill blockchain-service mid-demo."
bold "  The gateway, wallet reads, and payment creation keep working."
bold "  When blockchain comes back, the pending payment auto-settles."
echo ""

yellow "  5a. Scaling blockchain-service to 0 replicas (simulating a crash)..."
kubectl scale deployment blockchain-service -n stableflow --replicas=0
# wait until the pod is fully gone (not just Terminating)
kubectl wait --for=delete pod -l app=blockchain-service -n stableflow --timeout=30s 2>/dev/null || sleep 5
RUNNING_BC=$(kubectl get pods -n stableflow --no-headers \
  | awk '/blockchain/{print}' | wc -l | tr -d ' ')
echo "      blockchain-service pods running: $RUNNING_BC"
check "blockchain-service has 0 running pods" "0" "$RUNNING_BC"

echo ""
yellow "  5b. Gateway health check — still UP:"
H=$(curl -s "$GW/actuator/health")
echo "      $H"
check "Gateway healthy while blockchain is down" "UP" "$H"

yellow "  5c. Wallet balance read — still works:"
BAL_RESP=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/wallets/$ALICE_ID/balance")
echo "      $BAL_RESP"
check "Wallet service answers with blockchain down" "availableBalance" "$BAL_RESP"

echo ""
yellow "  5d. Submit a payment while blockchain is down..."
yellow "      (The event goes into the outbox — safe even if broker is slow)"
STUCK_RESP=$(curl -s -X POST "$GW/api/payments" \
  -H "X-API-Key: dev-key-admin" -H "Content-Type: application/json" \
  -H "Idempotency-Key: resilience-$(date +%s%N)" \
  -d "{\"senderWalletId\":\"$ALICE_ID\",\"receiverWalletId\":\"$BOB_ID\",\"amount\":25,\"currency\":\"USDC\"}")
STUCK_ID=$(echo     "$STUCK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['paymentId'])")
STUCK_STATUS=$(echo "$STUCK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo "      Payment $STUCK_ID  status=$STUCK_STATUS"
echo "      (accepted and funds reserved — blockchain event queued in outbox)"
check "Payment accepted while blockchain is down" "PROCESSING" "$STUCK_STATUS"

echo ""
yellow "  5e. Bringing blockchain-service back (Kubernetes restarts it)..."
kubectl scale deployment blockchain-service -n stableflow --replicas=1
kubectl rollout status deployment/blockchain-service -n stableflow --timeout=180s

echo ""
yellow "  5f. Outbox relay fires — pending event delivers — payment settles:"
yellow "      Waiting 5 seconds..."
sleep 5
RECOVERED=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/payments/$STUCK_ID" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo "      Payment $STUCK_ID  status=$RECOVERED"
check "Stuck payment self-healed after blockchain recovered" "SETTLED" "$RECOVERED"

ALICE_FINAL=$(curl -s -H "X-API-Key: dev-key-admin" "$GW/api/wallets/$ALICE_ID/balance" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['availableBalance'])")
echo "      Alice final balance: $ALICE_FINAL USDC  (500 − 100 − 25 = 375)"
check "Alice final balance is 375" "375" "$ALICE_FINAL"

# =============================================================================
header "SUMMARY"
# =============================================================================
TOTAL=$((PASS+FAIL))
echo "  Total checks : $TOTAL"
printf "  Passed       : "; green "$PASS"
printf "  Failed       : "
if [[ $FAIL -eq 0 ]]; then green "$FAIL"; else red "$FAIL"; fi
echo ""
if [[ $FAIL -eq 0 ]]; then
  green "  ✓  All requirements demonstrated — 20/20 checks passed."
else
  red   "  ✗  $FAIL check(s) failed — see above."
fi
echo ""
yellow "  Requirement coverage:"
echo "   ✓  Minikube deployment  — 7 pods (api-gateway, payment, wallet, blockchain, notification, postgres, rabbitmq)"
echo "   ✓  Per-service DB       — payment_db · wallet_db · blockchain_db · notification_db"
echo "   ✓  Sync communication   — payment-service → wallet-service via HTTP"
echo "   ✓  Async communication  — 3-hop RabbitMQ event chain (requested → confirmed → status)"
echo "   ✓  Resilience           — blockchain down → others answer → payment heals on restart"
echo "   ✓  Auth at gateway      — X-API-Key enforced, 401 on missing/wrong key"
echo ""

# clean up port-forward only if this script started it
[[ -n "${PF_PID:-}" ]] && kill "$PF_PID" 2>/dev/null || true
