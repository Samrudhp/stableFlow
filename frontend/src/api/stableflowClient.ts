import type {
  ApiLogEntry,
  AuthCheckResult,
  BalanceResponse,
  CreatePaymentRequest,
  CreateWalletRequest,
  NotificationItem,
  Payment,
  Wallet,
} from '../types';

export type LogListener = (entry: ApiLogEntry) => void;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class StableFlowClient {
  private baseUrl: string;
  private apiKey: string;
  private onLog?: LogListener;

  constructor(baseUrl = '', apiKey = 'dev-key-admin', onLog?: LogListener) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.onLog = onLog;
  }

  setConfig(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    opts: { skipApiKey?: boolean; overrideApiKey?: string; summary?: string } = {}
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (!opts.skipApiKey) {
      const key = opts.overrideApiKey !== undefined ? opts.overrideApiKey : this.apiKey;
      if (key) {
        headers.set('X-API-Key', key);
      }
    }

    const start = performance.now();
    try {
      const res = await fetch(url, { ...options, headers });
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        // leave as text
      }

      this.onLog?.({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
        method,
        path,
        status: res.status,
        durationMs,
        ok: res.ok,
        summary: opts.summary || `${method} ${path}`,
        responseBody: parsed,
      });

      if (!res.ok) {
        const msg =
          typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? String((parsed as { message: unknown }).message)
            : typeof parsed === 'object' && parsed !== null && 'error' in parsed
              ? String((parsed as { error: unknown }).error)
              : `HTTP ${res.status}`;
        throw new ApiError(res.status, msg, parsed);
      }

      return { data: parsed as T, status: res.status };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const durationMs = Math.round(performance.now() - start);
      this.onLog?.({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
        method,
        path,
        status: null,
        durationMs,
        ok: false,
        summary: opts.summary || `${method} ${path} (Network Error)`,
        responseBody: String(err),
      });
      throw err;
    }
  }

  async checkHealth(): Promise<{ status: string }> {
    const { data } = await this.request<{ status: string }>(
      '/actuator/health',
      { method: 'GET' },
      { skipApiKey: true, summary: 'Gateway health probe (no API key)' }
    );
    return data;
  }

  async createWallet(req: CreateWalletRequest): Promise<Wallet> {
    const { data } = await this.request<Wallet>(
      '/api/wallets',
      { method: 'POST', body: JSON.stringify(req) },
      { summary: `Create wallet for ${req.ownerName} (${req.initialBalance} ${req.currency})` }
    );
    return data;
  }

  async getWallet(walletId: string): Promise<Wallet> {
    const { data } = await this.request<Wallet>(
      `/api/wallets/${walletId}`,
      { method: 'GET' },
      { summary: `Get wallet ${walletId.slice(0, 8)}...` }
    );
    return data;
  }

  async getBalance(walletId: string): Promise<BalanceResponse> {
    const { data } = await this.request<BalanceResponse>(
      `/api/wallets/${walletId}/balance`,
      { method: 'GET' },
      { summary: `Get balance ${walletId.slice(0, 8)}...` }
    );
    return data;
  }

  async createPayment(req: CreatePaymentRequest, idempotencyKey: string): Promise<Payment> {
    const { data } = await this.request<Payment>(
      '/api/payments',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(req),
      },
      { summary: `Submit payment ${req.amount} ${req.currency}` }
    );
    return data;
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const { data } = await this.request<Payment>(
      `/api/payments/${paymentId}`,
      { method: 'GET' },
      { summary: `Poll payment ${paymentId.slice(0, 8)}...` }
    );
    return data;
  }

  async getNotifications(): Promise<NotificationItem[]> {
    const { data } = await this.request<NotificationItem[]>(
      '/api/notifications',
      { method: 'GET' },
      { summary: 'Fetch notifications' }
    );
    return data;
  }

  async runGatewayAuthSuite(): Promise<AuthCheckResult[]> {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const results: AuthCheckResult[] = [];

    // 2a. No API key -> 401
    try {
      const r = await this.request(
        `/api/wallets/${dummyId}`,
        { method: 'GET' },
        { skipApiKey: true, summary: 'Auth Test 2a: No X-API-Key' }
      );
      results.push({
        label: '2a. No API key → 401 Unauthorized',
        expected: 401,
        actual: r.status,
        passed: false,
        detail: `Unexpected HTTP ${r.status}`,
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : null;
      results.push({
        label: '2a. No API key → 401 Unauthorized',
        expected: 401,
        actual: status,
        passed: status === 401,
        detail: status === 401 ? 'Blocked at gateway' : `Got ${status ?? 'network error'}`,
      });
    }

    // 2b. Wrong API key -> 401
    try {
      const r = await this.request(
        `/api/wallets/${dummyId}`,
        { method: 'GET' },
        { overrideApiKey: 'hacker', summary: 'Auth Test 2b: Wrong X-API-Key (hacker)' }
      );
      results.push({
        label: '2b. Wrong API key ("hacker") → 401 Unauthorized',
        expected: 401,
        actual: r.status,
        passed: false,
        detail: `Unexpected HTTP ${r.status}`,
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : null;
      results.push({
        label: '2b. Wrong API key ("hacker") → 401 Unauthorized',
        expected: 401,
        actual: status,
        passed: status === 401,
        detail: status === 401 ? 'Blocked at gateway' : `Got ${status ?? 'network error'}`,
      });
    }

    // 2c. Valid API key -> 404 (not blocked by gateway)
    try {
      const r = await this.request(
        `/api/wallets/${dummyId}`,
        { method: 'GET' },
        { overrideApiKey: 'dev-key-admin', summary: 'Auth Test 2c: Valid X-API-Key (dev-key-admin)' }
      );
      results.push({
        label: '2c. Valid API key ("dev-key-admin") → 404 Not Found',
        expected: 404,
        actual: r.status,
        passed: r.status === 404,
        detail: 'Passed gateway',
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : null;
      results.push({
        label: '2c. Valid API key ("dev-key-admin") → 404 Not Found',
        expected: 404,
        actual: status,
        passed: status === 404,
        detail: status === 404 ? 'Passed gateway to wallet-service' : `Got ${status ?? 'network error'}`,
      });
    }

    // 2d. /actuator/health -> 200 UP without key
    try {
      const r = await this.request<{ status: string }>(
        '/actuator/health',
        { method: 'GET' },
        { skipApiKey: true, summary: 'Auth Test 2d: /actuator/health (no key)' }
      );
      results.push({
        label: '2d. /actuator/health (no key) → 200 UP',
        expected: 200,
        actual: r.status,
        passed: r.status === 200 && r.data?.status === 'UP',
        detail: `Status: ${r.data?.status ?? 'unknown'}`,
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : null;
      results.push({
        label: '2d. /actuator/health (no key) → 200 UP',
        expected: 200,
        actual: status,
        passed: false,
        detail: `Got ${status ?? 'network error'}`,
      });
    }

    return results;
  }
}
