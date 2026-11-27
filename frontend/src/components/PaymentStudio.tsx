import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Payment, Wallet } from '../types';

interface PaymentStudioProps {
  wallets: Wallet[];
  senderId: string;
  receiverId: string;
  payments: Payment[];
  activePayment: Payment | null;
  onSenderChange: (id: string) => void;
  onReceiverChange: (id: string) => void;
  onSubmitPayment: (
    senderId: string,
    receiverId: string,
    amount: number,
    idempotencyKey: string
  ) => Promise<void>;
  onRefreshPayment: (paymentId: string) => Promise<void>;
  onSelectActivePayment: (p: Payment) => void;
}

function generateIdempotencyKey() {
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const PaymentStudio: React.FC<PaymentStudioProps> = ({
  wallets,
  senderId,
  receiverId,
  payments,
  activePayment,
  onSenderChange,
  onReceiverChange,
  onSubmitPayment,
  onRefreshPayment,
  onSelectActivePayment,
}) => {
  const [amount, setAmount] = useState('100');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  const [lastUsedKey, setLastUsedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const senderWallet = wallets.find((w) => w.walletId === senderId);
  const receiverWallet = wallets.find((w) => w.walletId === receiverId);

  const handleSwap = () => {
    const prevSender = senderId;
    onSenderChange(receiverId);
    onReceiverChange(prevSender);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    if (!senderId || !receiverId) {
      setError('Please select both a Sender and a Receiver wallet.');
      return;
    }
    if (senderId === receiverId) {
      setError('Sender and Receiver wallets must be different.');
      return;
    }
    if (isNaN(numAmount) || numAmount < 0.000001) {
      setError('Amount must be at least 0.000001 USDC.');
      return;
    }
    if (!idempotencyKey.trim()) {
      setError('Idempotency-Key header is required.');
      return;
    }

    setSubmitting(true);
    try {
      const usedKey = idempotencyKey.trim();
      await onSubmitPayment(senderId, receiverId, numAmount, usedKey);
      setLastUsedKey(usedKey);
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getWalletLabel = (id: string) => {
    const w = wallets.find((x) => x.walletId === id);
    return w ? `${w.ownerName} (${w.walletId.slice(0, 8)}...)` : `${id.slice(0, 8)}...`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Send Payment Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Send size={18} color="var(--accent)" />
              Send USDC Payment
            </h2>
            <p className="card-subtitle">
              Sync reserve via HTTP (<code>wallet-service</code>) → Async settlement via RabbitMQ (
              <code>blockchain-service</code>)
            </p>
          </div>
          {wallets.length >= 2 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSwap}
              title="Swap Sender and Receiver"
            >
              <ArrowLeftRight size={14} />
              Swap
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Sender Wallet</label>
              {wallets.length > 0 ? (
                <select
                  className="select"
                  value={senderId}
                  onChange={(e) => onSenderChange(e.target.value)}
                >
                  <option value="">Select sender...</option>
                  {wallets.map((w) => (
                    <option key={w.walletId} value={w.walletId}>
                      {w.ownerName} — {w.availableBalance} {w.currency}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input mono"
                  placeholder="Sender Wallet UUID"
                  value={senderId}
                  onChange={(e) => onSenderChange(e.target.value)}
                />
              )}
            </div>

            <div className="field">
              <label>Receiver Wallet (Counterparty)</label>
              {wallets.length > 0 ? (
                <select
                  className="select"
                  value={receiverId}
                  onChange={(e) => onReceiverChange(e.target.value)}
                >
                  <option value="">Select receiver...</option>
                  {wallets.map((w) => (
                    <option key={w.walletId} value={w.walletId}>
                      {w.ownerName} — {w.availableBalance} {w.currency}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input mono"
                  placeholder="Receiver Wallet UUID"
                  value={receiverId}
                  onChange={(e) => onReceiverChange(e.target.value)}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Amount (USDC)</label>
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                className="input mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {['10', '25', '100', '500'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => setAmount(preset)}
                  >
                    {preset} USDC
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Idempotency-Key Header</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input mono"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                  title="Generate new Idempotency-Key"
                >
                  New
                </button>
                {lastUsedKey && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIdempotencyKey(lastUsedKey)}
                    title="Reuse last Idempotency-Key to test idempotent replay"
                  >
                    Reuse
                  </button>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Reusing the same key returns the existing payment without double-charging.
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--danger-soft)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {senderWallet && receiverWallet ? (
                <span>
                  Transferring <strong>{amount || '0'} USDC</strong> from{' '}
                  <strong>{senderWallet.ownerName}</strong> →{' '}
                  <strong>{receiverWallet.ownerName}</strong>
                </span>
              ) : (
                <span>Select or create wallets in the sidebar to begin</span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Zap size={15} />
              {submitting ? 'Reserving & Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Settlement Pipeline */}
      {activePayment && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 15 }}>
                Live Transaction Lifecycle
              </h3>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Payment ID: {activePayment.paymentId}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`badge ${
                  activePayment.status === 'SETTLED'
                    ? 'badge-success'
                    : activePayment.status === 'FAILED'
                      ? 'badge-danger'
                      : 'badge-warning'
                }`}
              >
                {activePayment.status === 'SETTLED' && <CheckCircle2 size={12} />}
                {activePayment.status === 'FAILED' && <XCircle size={12} />}
                {activePayment.status === 'PROCESSING' && <Clock size={12} className="spin" />}
                {activePayment.status}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onRefreshPayment(activePayment.paymentId)}
              >
                <RefreshCw size={12} />
                Poll
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            {[
              {
                step: '1. Gateway',
                desc: 'X-API-Key verified',
                done: true,
              },
              {
                step: '2. Sync Reserve',
                desc: 'HTTP /reserve → PROCESSING',
                done: true,
              },
              {
                step: '3. Blockchain',
                desc:
                  activePayment.status === 'PROCESSING'
                    ? 'Awaiting RabbitMQ confirm...'
                    : activePayment.status === 'SETTLED'
                      ? 'Confirmed on-chain'
                      : 'Failed / Released',
                done: activePayment.status === 'SETTLED',
                failed: activePayment.status === 'FAILED',
                pending: activePayment.status === 'PROCESSING',
              },
              {
                step: '4. Settlement',
                desc:
                  activePayment.status === 'SETTLED'
                    ? 'Receiver credited + Notified'
                    : activePayment.status === 'FAILED'
                      ? 'Funds released to sender'
                      : 'Pending outbox/settlement',
                done: activePayment.status === 'SETTLED',
                failed: activePayment.status === 'FAILED',
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${
                    s.failed
                      ? 'var(--danger-border)'
                      : s.done
                        ? 'var(--success-border)'
                        : s.pending
                          ? 'var(--warning-border)'
                          : 'var(--border)'
                  }`,
                  background: s.failed
                    ? 'var(--danger-soft)'
                    : s.done
                      ? 'var(--success-soft)'
                      : s.pending
                        ? 'var(--warning-soft)'
                        : 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{s.step}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: 15 }}>
            Session Transactions ({payments.length})
          </h3>
        </div>

        {payments.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            No payments submitted yet in this session.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>Payment ID</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>From → To</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.paymentId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background:
                        activePayment?.paymentId === p.paymentId
                          ? 'var(--accent-soft)'
                          : 'transparent',
                    }}
                  >
                    <td className="mono" style={{ padding: '10px 6px', fontSize: 12 }}>
                      {p.paymentId.slice(0, 13)}...
                    </td>
                    <td style={{ padding: '10px 6px', fontSize: 12 }}>
                      <span>{getWalletLabel(p.senderWalletId)}</span>
                      <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                      <strong>{getWalletLabel(p.receiverWalletId)}</strong>
                    </td>
                    <td className="mono tabular-nums" style={{ padding: '10px 6px', fontWeight: 600 }}>
                      {p.amount} {p.currency}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <span
                        className={`badge ${
                          p.status === 'SETTLED'
                            ? 'badge-success'
                            : p.status === 'FAILED'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onSelectActivePayment(p)}
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRefreshPayment(p.paymentId)}
                          title="Re-fetch status from GET /api/payments/{id}"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
