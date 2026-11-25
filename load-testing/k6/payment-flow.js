import http from 'k6/http';
import { check, sleep } from 'k6';

const duration = __ENV.DURATION || '60s';

export const options = {
  scenarios: {
    payments: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: Number(__ENV.VUS || 10) },
        { duration, target: Number(__ENV.VUS || 10) },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const suffix = `${__VU}-${__ITER}-${Date.now()}`;
  const headers = { 'Content-Type': 'application/json' };
  const alice = http.post(`${baseUrl}/api/wallets`, JSON.stringify({
    ownerName: `load-alice-${suffix}`, currency: 'USDC', initialBalance: 100000,
  }), { headers });
  const bob = http.post(`${baseUrl}/api/wallets`, JSON.stringify({
    ownerName: `load-bob-${suffix}`, currency: 'USDC', initialBalance: 0.000001,
  }), { headers });
  check(alice, { 'alice wallet created': (response) => response.status === 201 });
  check(bob, { 'bob wallet created': (response) => response.status === 201 });
  if (alice.status !== 201 || bob.status !== 201) return;

  const sender = JSON.parse(alice.body).walletId;
  const receiver = JSON.parse(bob.body).walletId;
  const payment = http.post(`${baseUrl}/api/payments`, JSON.stringify({
    senderWalletId: sender, receiverWalletId: receiver, amount: 1, currency: 'USDC',
  }), { headers: { ...headers, 'Idempotency-Key': `load-${suffix}` } });
  check(payment, { 'payment accepted': (response) => response.status === 201 });
  sleep(1);
}
