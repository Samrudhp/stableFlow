#!/usr/bin/env bash
set -euo pipefail

# Run this as Compute Engine startup metadata on a private RabbitMQ VM.
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://packagecloud.io/rabbitmq/rabbitmq-server/gpgkey | gpg --dearmor -o /etc/apt/keyrings/rabbitmq.gpg
printf 'deb [signed-by=/etc/apt/keyrings/rabbitmq.gpg] https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ jammy main\n' > /etc/apt/sources.list.d/rabbitmq.list
apt-get update
apt-get install -y rabbitmq-server
systemctl enable rabbitmq-server
systemctl start rabbitmq-server
rabbitmq-plugins enable rabbitmq_management
rabbitmqctl add_user "${RABBITMQ_USERNAME:-stableflow}" "${RABBITMQ_PASSWORD:?Set RABBITMQ_PASSWORD in instance metadata or Secret Manager}"
rabbitmqctl add_vhost stableflow
rabbitmqctl set_permissions -p stableflow "${RABBITMQ_USERNAME:-stableflow}" '.*' '.*' '.*'
rabbitmqctl delete_user guest || true
