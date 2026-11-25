#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION}"
: "${ARTIFACT_REPOSITORY:?Set ARTIFACT_REPOSITORY}"
: "${CLOUD_SQL_CONNECTION_NAME:?Set CLOUD_SQL_CONNECTION_NAME}"
: "${RABBITMQ_HOST:?Set RABBITMQ_HOST}"
: "${RABBITMQ_PASSWORD_SECRET:?Set RABBITMQ_PASSWORD_SECRET}"
: "${DB_PASSWORD_SECRET:?Set DB_PASSWORD_SECRET}"
: "${CLOUD_RUN_SERVICE_ACCOUNT:?Set CLOUD_RUN_SERVICE_ACCOUNT}"
: "${CONFIRM_BILLABLE_DEPLOYMENT:?Set CONFIRM_BILLABLE_DEPLOYMENT=YES to continue}"

if [[ "$CONFIRM_BILLABLE_DEPLOYMENT" != "YES" ]]; then
  printf 'Refusing deployment: set CONFIRM_BILLABLE_DEPLOYMENT=YES after reviewing infrastructure costs.\n' >&2
  exit 1
fi

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
  --location "$GCP_REGION" >/dev/null 2>&1 || \
gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
  --repository-format=docker --location "$GCP_REGION" \
  --description='StableFlow service images'

REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$ARTIFACT_REPOSITORY"
for service in api-gateway payment-service wallet-service blockchain-service notification-service; do
  gcloud builds submit . \
    --config infrastructure/gcp/cloudbuild.yaml \
    --substitutions "_DOCKERFILE=$service/Dockerfile,_IMAGE=$REGISTRY/$service:latest"
done

deploy_service() {
  local service="$1"
  local extra_env="${2:-}"
  local datasource_url="$3"
  local runtime_flags=()
  if [[ "$service" == "payment-service" || "$service" == "blockchain-service" || "$service" == "notification-service" ]]; then
    runtime_flags+=(--min 1 --no-cpu-throttling)
  fi
  shift
  gcloud run deploy "$service" \
    --image "$REGISTRY/$service:latest" \
    --region "$GCP_REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "$CLOUD_RUN_SERVICE_ACCOUNT" \
    "${runtime_flags[@]}" \
    --set-env-vars "SERVER_PORT=8080,SPRING_RABBITMQ_HOST=$RABBITMQ_HOST,SPRING_RABBITMQ_PORT=5672,SPRING_RABBITMQ_USERNAME=stableflow,SPRING_DATASOURCE_USERNAME=stableflow,SPRING_DATASOURCE_URL=$datasource_url${extra_env:+,$extra_env}" \
    --set-secrets "SPRING_RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD_SECRET:latest,SPRING_DATASOURCE_PASSWORD=$DB_PASSWORD_SECRET:latest" \
    --quiet
}

deploy_service wallet-service "" "jdbc:postgresql:///wallet_db?cloudSqlInstance=$CLOUD_SQL_CONNECTION_NAME&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy"
WALLET_URL="$(gcloud run services describe wallet-service --region "$GCP_REGION" --format='value(status.url)')"
deploy_service payment-service "WALLET_SERVICE_URL=$WALLET_URL" "jdbc:postgresql:///payment_db?cloudSqlInstance=$CLOUD_SQL_CONNECTION_NAME&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy"
PAYMENT_URL="$(gcloud run services describe payment-service --region "$GCP_REGION" --format='value(status.url)')"
deploy_service blockchain-service "" "jdbc:postgresql:///blockchain_db?cloudSqlInstance=$CLOUD_SQL_CONNECTION_NAME&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy"
BLOCKCHAIN_URL="$(gcloud run services describe blockchain-service --region "$GCP_REGION" --format='value(status.url)')"
deploy_service notification-service "" "jdbc:postgresql:///notification_db?cloudSqlInstance=$CLOUD_SQL_CONNECTION_NAME&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy"
NOTIFICATION_URL="$(gcloud run services describe notification-service --region "$GCP_REGION" --format='value(status.url)')"

gcloud run deploy api-gateway \
  --image "$REGISTRY/api-gateway:latest" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "$CLOUD_RUN_SERVICE_ACCOUNT" \
  --set-env-vars "SERVER_PORT=8080,PAYMENT_SERVICE_URL=$PAYMENT_URL,WALLET_SERVICE_URL=$WALLET_URL,BLOCKCHAIN_SERVICE_URL=$BLOCKCHAIN_URL,NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL" \
  --quiet

echo "Deployment submitted. Verify service URLs and Cloud Run logs before testing payments."
