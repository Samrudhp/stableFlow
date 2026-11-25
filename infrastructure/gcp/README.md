# StableFlow GCP Deployment

This directory prepares deployment; it does not create resources automatically. GCP resources can incur charges even when the project has promotional credit.

## 1. Authenticate locally

```bash
gcloud auth login
gcloud auth application-default login
gcloud projects list
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1
```

Copy `.env.gcp.example` to a private shell environment and fill in the project ID, region, RabbitMQ VM address, and secret names. Do not commit the filled file.

## 2. Enable APIs

```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com
```

## 3. Create the runtime resources

The intended low-cost demonstration layout is:

- Cloud Run: API Gateway, Payment, Wallet, Blockchain, Notification.
- Cloud SQL PostgreSQL: one instance with four databases owned by separate services.
- Compute Engine: one small RabbitMQ VM with a reserved internal/static address.
- Artifact Registry: one Docker repository.
- Secret Manager: database and RabbitMQ credentials.

Create Cloud SQL and the RabbitMQ VM only after reviewing their estimated cost. Cloud SQL and Compute Engine continue charging while running. Keep firewall rules closed to the public internet except for required administrative access.

The Cloud SQL socket factory is included in the service builds. Cloud Run service accounts need the `roles/cloudsql.client` role, and each service receives a JDBC URL in this form:

```text
jdbc:postgresql:///payment_db?cloudSqlInstance=PROJECT:REGION:INSTANCE&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy
```

Create `payment_db`, `wallet_db`, `blockchain_db`, and `notification_db`, and create a database user whose password is stored in Secret Manager.

For RabbitMQ, expose AMQP only to the Cloud Run egress path or a private VPC path. Do not expose the management UI publicly. The current educational deployment uses environment-based RabbitMQ host configuration; production-grade service identity and private networking are still required before treating this as production infrastructure.

## 4. Build and deploy

After authentication and resource review, export the required variables and run:

```bash
export GCP_PROJECT_ID=YOUR_PROJECT_ID
export GCP_REGION=us-central1
export ARTIFACT_REPOSITORY=stableflow
export CLOUD_SQL_CONNECTION_NAME=YOUR_PROJECT_ID:us-central1:stableflow-db
export RABBITMQ_HOST=YOUR_RABBITMQ_HOST
export RABBITMQ_PASSWORD_SECRET=stableflow-rabbitmq-password
export DB_PASSWORD_SECRET=stableflow-db-password
export CONFIRM_BILLABLE_DEPLOYMENT=YES
./infrastructure/gcp/deploy-cloud-run.sh
```

The script builds all five images with Cloud Build, pushes them to Artifact Registry, and deploys Cloud Run services in dependency order. It intentionally requires `CONFIRM_BILLABLE_DEPLOYMENT=YES`.

## 5. Verify and clean up

```bash
gcloud run services list --region "$GCP_REGION"
gcloud run services describe api-gateway --region "$GCP_REGION" --format='value(status.url)'
gcloud logging read 'resource.type="cloud_run_revision"' --limit=20
```

After the demonstration, remove billable resources:

```bash
gcloud run services delete api-gateway payment-service wallet-service blockchain-service notification-service --region "$GCP_REGION"
gcloud sql instances delete "$CLOUD_SQL_INSTANCE"
gcloud compute instances delete stableflow-rabbitmq --zone "$GCP_ZONE"
gcloud artifacts repositories delete "$ARTIFACT_REPOSITORY" --location "$GCP_REGION"
```

Review every command before running it. Deletion is irreversible and database backups should be handled separately.
