import React, { useState } from 'react';
import {
  CheckCircle2,
  PlusCircle,
  Search,
  ServerCrash,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { AuthCheckResult, Payment } from '../types';

interface DemoToolsProps {
  onCreateWallet: (ownerName: string, initialBalance: number) => Promise<void>;
  onLookupPayment: (paymentId: string) => Promise<Payment>;
  onRunAuthSuite: () => Promise<AuthCheckResult[]>;
}

export const DemoTools: React.FC<DemoToolsProps> = ({
  onCreateWallet,
  onLookupPayment,
  onRunAuthSuite,
}) => {
  // Create Wallet state
  const [ownerName, setOwnerName] = useState('');
  const [initialBalance, setInitialBalance] = useState('500');
  const [creating, setCreating] = useState(false);
  const [walletMsg, setWalletMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Lookup Payment state
  const [lookupPaymentId, setLookupPaymentId] = useState('');
  const [foundPayment, setFoundPayment] = useState<Payment | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  // Auth Suite state
  const [authResults, setAuthResults] = useState<AuthCheckResult[] | null>(null);
  const [runningAuth, setRunningAuth] = useState(false);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMsg(null);
    const bal = parseFloat(initialBalance);
    if (!ownerName.trim()) {
      setWalletMsg({ type: 'err', text: 'Owner name is required.' });
      return;
    }
    if (isNaN(bal) || bal < 0.000001) {
      setWalletMsg({ type: 'err', text: 'Initial balance must be >= 0.000001 USDC.' });
      return;
    }
    setCreating(true);
    try {
      await onCreateWallet(ownerName.trim(), bal);
      setWalletMsg({
        type: 'ok',
        text: `Created wallet for ${ownerName.trim()} (${bal} USDC) and added to sidebar.`,
      });
      setOwnerName('');
    } catch (err) {
      setWalletMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to create wallet',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleLookupPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupErr(null);
    setFoundPayment(null);
    if (!lookupPaymentId.trim()) return;
    try {
      const p = await onLookupPayment(lookupPaymentId.trim());
      setFoundPayment(p);
    } catch (err) {
      setLookupErr(err instanceof Error ? err.message : 'Payment not found');
    }
  };

  const handleRunAuth = async () => {
    setRunningAuth(true);
    try {
      const res = await onRunAuthSuite();
      setAuthResults(res);
    } finally {
      setRunningAuth(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Create Wallet */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <PlusCircle size={18} color="var(--accent)" />
              Create New Wallet
            </h2>
            <p className="card-subtitle">
              Calls <code>POST /api/wallets</code> and adds the wallet to your live sidebar.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleCreateWallet}
          style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 12, alignItems: 'end' }}
        >
          <div className="field">
            <label>Owner Name</label>
            <input
              className="input"
              placeholder="e.g. Charlie"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Initial Balance (USDC)</label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              className="input mono"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create Wallet'}
          </button>
        </form>
        {walletMsg && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: walletMsg.type === 'ok' ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: walletMsg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${
                walletMsg.type === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'
              }`,
            }}
          >
            {walletMsg.text}
          </div>
        )}
      </div>

      {/* Gateway Auth Suite (DEMO 2) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <ShieldCheck size={18} color="var(--accent)" />
              Demo 2 — Gateway Authentication Suite
            </h2>
            <p className="card-subtitle">
              Verifies <code>X-API-Key</code> enforcement at <code>api-gateway</code> and public{' '}
              <code>/actuator/health</code>.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleRunAuth}
            disabled={runningAuth}
          >
            {runningAuth ? 'Running...' : 'Run 4 Auth Checks'}
          </button>
        </div>

        {authResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {authResults.map((r) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${r.passed ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  background: r.passed ? 'var(--success-soft)' : 'var(--danger-soft)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  {r.passed ? (
                    <CheckCircle2 size={16} color="var(--success)" />
                  ) : (
                    <XCircle size={16} color="var(--danger)" />
                  )}
                  <span>{r.label}</span>
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  HTTP {r.actual ?? 'ERR'} · {r.detail}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lookup Payment by UUID */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Search size={18} color="var(--accent)" />
              Lookup Payment by UUID
            </h2>
            <p className="card-subtitle">
              Query <code>GET /api/payments/{'{paymentId}'}</code> directly.
            </p>
          </div>
        </div>
        <form onSubmit={handleLookupPayment} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input mono"
            placeholder="Paste payment UUID..."
            value={lookupPaymentId}
            onChange={(e) => setLookupPaymentId(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Lookup
          </button>
        </form>
        {lookupErr && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{lookupErr}</div>
        )}
        {foundPayment && (
          <pre
            className="mono"
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: 'var(--bg-subtle)',
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(foundPayment, null, 2)}
          </pre>
        )}
      </div>

      {/* Resilience Demo Guide (DEMO 5) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <ServerCrash size={18} color="var(--warning)" />
              Demo 5 — Resilience Walkthrough (Outbox + Self-Healing)
            </h2>
            <p className="card-subtitle">
              Demonstrate <code>blockchain-service</code> going down while payments & wallets keep
              working.
            </p>
          </div>
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <li>
            Scale down blockchain-service:{' '}
            <code>kubectl scale deployment blockchain-service -n stableflow --replicas=0</code>
          </li>
          <li>
            Submit a <strong>25 USDC</strong> payment in the <strong>Transactions</strong> tab.
            Notice it immediately returns <code>PROCESSING</code> and Alice's{' '}
            <strong>Reserved (In-Flight)</strong> balance in the sidebar shows <code>25.00 USDC</code>.
          </li>
          <li>
            Scale blockchain-service back up:{' '}
            <code>kubectl scale deployment blockchain-service -n stableflow --replicas=1</code>
          </li>
          <li>
            Within ~5 seconds, the Payment Service outbox delivers the queued event, the payment
            auto-transitions to <code>SETTLED</code>, and Bob's balance in the sidebar flashes{' '}
            <strong>+25.00 USDC</strong>!
          </li>
        </ol>
      </div>
    </div>
  );
};
