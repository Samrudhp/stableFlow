# StableFlow

StableFlow is an educational stablecoin payment and settlement simulation. Phase 1 provides the API Gateway, Payment Service, and Wallet Service foundation.

## Phase 1 local run

Start the infrastructure:

```bash
docker compose up -d postgres rabbitmq
```

Run the services in separate terminals:

```bash
mvn -pl wallet-service spring-boot:run
mvn -pl payment-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

Run tests:

```bash
mvn test
```

The gateway listens on `http://localhost:8080`, Payment Service on `8081`, and Wallet Service on `8082`.

Phase 1 supports wallet creation, balance lookup, locked fund reservation, payment creation, payment lookup, and idempotency keys.

## Phase 2 local run

Start the infrastructure and run the five services in separate terminals:

```bash
docker compose up -d postgres rabbitmq
mvn -pl wallet-service spring-boot:run
mvn -pl payment-service spring-boot:run
mvn -pl blockchain-service spring-boot:run
mvn -pl notification-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

Payment creation reserves funds, publishes `BlockchainTransactionRequested.v1`, and returns `PROCESSING`. The blockchain simulator confirms after `BLOCKCHAIN_SIMULATION_DELAY_MS` (default 250 ms), then Payment Service settles the wallet and publishes `PaymentStatusChanged.v1`. Set `BLOCKCHAIN_SIMULATION_MODE=failure` to exercise compensation and fund release.

RabbitMQ queues are durable and consumers treat repeated payment status or blockchain requests as no-ops after the corresponding database record already exists. Payment events are first stored in the Payment Service outbox and relayed asynchronously, so a broker outage does not lose a committed payment state. Consumers retry three times with exponential backoff; exhausted messages are routed to service-specific dead-letter queues.

## Phase 4 container run

With Docker Desktop running, start the complete local stack:

```bash
docker compose up --build
```

Only the gateway (`http://localhost:8080`), PostgreSQL (`5432`), and RabbitMQ management UI (`http://localhost:15672`) are exposed to the host. Application services communicate over the Compose network using service names. The default RabbitMQ credentials are `guest`/`guest` for local development only.

## Phase 5 testing and load testing

Run the complete automated suite:

```bash
mvn test
```

The focused reliability tests cover insufficient funds, reserved-fund settlement, duplicate blockchain confirmation, payment idempotency, and wallet reservation behavior. The service tests use Mockito; the running Compose stack provides the manual end-to-end smoke path.

Run the successful-payment workload at different concurrency levels:

```bash
k6 run -e BASE_URL=http://localhost:8080 -e VUS=10 load-testing/k6/payment-flow.js
k6 run -e BASE_URL=http://localhost:8080 -e VUS=25 load-testing/k6/payment-flow.js
k6 run -e BASE_URL=http://localhost:8080 -e VUS=50 load-testing/k6/payment-flow.js
k6 run -e BASE_URL=http://localhost:8080 -e VUS=100 load-testing/k6/payment-flow.js
```

Run the failed-payment workload with `BLOCKCHAIN_SIMULATION_MODE=failure` on the blockchain service, then restore `success` afterward:

```bash
k6 run -e BASE_URL=http://localhost:8080 -e VUS=10 load-testing/k6/failed-payments.js
```

Record actual measurements in [load-testing/REPORT_TEMPLATE.md](load-testing/REPORT_TEMPLATE.md). The repository does not include fabricated performance results.

The recorded local run is available at [load-testing/results/2026-11-12-local.md](load-testing/results/2026-11-12-local.md).
