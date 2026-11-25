import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '60s',
  thresholds: { http_req_failed: ['rate<0.05'] },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const suffix = `${__VU}-${__ITER}-${Date.now()}`;
  const headers = { 'Content-Type': 'application/json' };
  const alice = http.post(`${baseUrl}/api/wallets`, JSON.stringify({
    ownerName: `failure-alice-${suffix}`, currency: 'USDC', initialBalance: 10,
  }), { headers });
  const bob = http.post(`${baseUrl}/api/wallets`, JSON.stringify({
    ownerName: `failure-bob-${suffix}`, currency: 'USDC', initialBalance: 0.000001,
  }), { headers });
  if (alice.status !== 201 || bob.status !== 201) return;
  const payment = http.post(`${baseUrl}/api/payments`, JSON.stringify({
    senderWalletId: JSON.parse(alice.body).walletId,
    receiverWalletId: JSON.parse(bob.body).walletId,
    amount: 1,
    currency: 'USDC',
  }), { headers: { ...headers, 'Idempotency-Key': `failure-${suffix}` } });
  check(payment, { 'failure-mode payment accepted': (response) => response.status === 201 });
}
