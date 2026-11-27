import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  Copy,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wallet as WalletIcon,
} from 'lucide-react';
import type { NotificationItem, Wallet } from '../types';

interface WalletSidebarProps {
  wallets: Wallet[];
  balanceDeltas: Record<string, number>;
  senderId: string;
  receiverId: string;
  notifications: NotificationItem[];
  autoPoll: boolean;
  isRefreshing: boolean;
  onToggleAutoPoll: () => void;
  onRefreshAll: () => void;
  onSelectSender: (walletId: string) => void;
  onSelectReceiver: (walletId: string) => void;
  onRemoveWallet: (walletId: string) => void;
  onLookupWallet: (walletId: string) => Promise<void>;
  onQuickSetupDemo: () => Promise<void>;
}

function formatUsdc(val: number): string {
  if (val === 0) return '0.00';
  if (val > 0 && val < 0.01) return val.toFixed(6);
  const str = val.toFixed(6).replace(/\.?0+$/, '');
  if (!str.includes('.')) return `${str}.00`;
  const [, dec] = str.split('.');
  return dec.length === 1 ? `${str}0` : str;
}

export const WalletSidebar: React.FC<WalletSidebarProps> = ({
  wallets,
  balanceDeltas,
  senderId,
  receiverId,
  notifications,
  autoPoll,
  isRefreshing,
  onToggleAutoPoll,
  onRefreshAll,
  onSelectSender,
  onSelectReceiver,
  onRemoveWallet,
  onLookupWallet,
  onQuickSetupDemo,
}) => {
  const [sidebarTab, setSidebarTab] = useState<'wallets' | 'notifications'>('wallets');
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupId.trim();
    if (!trimmed) return;
    setLookupError(null);
    try {
      await onLookupWallet(trimmed);
      setLookupId('');
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Failed to fetch wallet');
    }
  };

  const handleQuickDemo = async () => {
    setSettingUp(true);
    try {
      await onQuickSetupDemo();
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <aside className="sidebar-col">
      <div className="card" style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div className="tabs" style={{ width: '100%', justifyContent: 'space-between' }}>
            <button
              type="button"
              className={`tab-btn ${sidebarTab === 'wallets' ? 'active' : ''}`}
              onClick={() => setSidebarTab('wallets')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <WalletIcon size={14} />
              Wallets ({wallets.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${sidebarTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setSidebarTab('notifications')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Bell size={14} />
              Events ({notifications.length})
            </button>
          </div>
        </div>

        {/* Live Poll Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 12,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={onToggleAutoPoll}
              style={{ accentColor: 'var(--accent)' }}
            />
            Live auto-sync (2s)
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            style={{ padding: '3px 8px' }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
            Sync
          </button>
        </div>

        {sidebarTab === 'wallets' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Quick Alice & Bob Demo Setup */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleQuickDemo}
              disabled={settingUp}
              style={{
                width: '100%',
                borderStyle: 'dashed',
                borderColor: 'var(--accent-border)',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              <Sparkles size={14} />
              {settingUp
                ? 'Creating Alice & Bob...'
                : 'Quick Setup: Alice (500) & Bob (0.000001)'}
            </button>

            {/* Tracked Wallets List */}
            {wallets.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  border: '1px dashed var(--border)',
                  borderRadius: 10,
                }}
              >
                No wallets tracked yet. Click <strong>Quick Setup</strong> above or create one on
                the left.
              </div>
            ) : (
              wallets.map((w) => {
                const isSender = w.walletId === senderId;
                const isReceiver = w.walletId === receiverId;
                const delta = balanceDeltas[w.walletId] || 0;
                const hasDelta = Math.abs(delta) > 0.0000001;

                return (
                  <div
                    key={w.walletId}
                    className={delta > 0 ? 'wallet-flash' : ''}
                    style={{
                      border: `1px solid ${
                        isReceiver
                          ? 'var(--success-border)'
                          : isSender
                            ? 'var(--accent-border)'
                            : 'var(--border)'
                      }`,
                      borderRadius: 10,
                      padding: 12,
                      background: isReceiver
                        ? 'rgba(236, 253, 245, 0.45)'
                        : isSender
                          ? 'rgba(239, 246, 255, 0.45)'
                          : 'var(--bg-card)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{w.ownerName}</span>
                        {isSender && <span className="badge badge-info">SENDER</span>}
                        {isReceiver && <span className="badge badge-success">RECEIVER</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCopy(w.walletId)}
                          title="Copy Wallet UUID"
                          style={{ padding: 4 }}
                        >
                          {copiedId === w.walletId ? (
                            <Check size={13} color="var(--success)" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRemoveWallet(w.walletId)}
                          title="Remove from sidebar"
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginBottom: 10,
                        wordBreak: 'break-all',
                      }}
                    >
                      {w.walletId}
                    </div>

                    {/* Balances */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          Available
                        </div>
                        <div
                          className="tabular-nums mono"
                          style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}
                        >
                          {formatUsdc(w.availableBalance)}{' '}
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                            {w.currency}
                          </span>
                        </div>
                      </div>

                      {hasDelta && (
                        <span
                          className={`badge ${delta > 0 ? 'badge-success' : 'badge-warning'}`}
                        >
                          {delta > 0 ? (
                            <ArrowDownLeft size={11} />
                          ) : (
                            <ArrowUpRight size={11} />
                          )}
                          {delta > 0 ? '+' : ''}
                          {formatUsdc(delta)} {w.currency}
                        </span>
                      )}
                    </div>

                    {w.reservedBalance > 0 && (
                      <div
                        className="badge badge-warning"
                        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Lock size={11} /> Reserved (In-Flight)
                        </span>
                        <span className="mono tabular-nums">
                          {formatUsdc(w.reservedBalance)} {w.currency}
                        </span>
                      </div>
                    )}

                    {/* Quick Role Assignment */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: 11 }}
                        onClick={() => onSelectSender(w.walletId)}
                        disabled={isSender}
                      >
                        Set Sender
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: 11 }}
                        onClick={() => onSelectReceiver(w.walletId)}
                        disabled={isReceiver}
                      >
                        Set Receiver
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Add Existing Wallet by UUID */}
            <form
              onSubmit={handleLookup}
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
                marginTop: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                TRACK EXISTING WALLET BY UUID
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input mono"
                  placeholder="Paste wallet UUID..."
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  style={{ fontSize: 12, padding: '7px 10px' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  <Plus size={14} />
                </button>
              </div>
              {lookupError && (
                <div style={{ fontSize: 12, color: 'var(--danger)' }}>{lookupError}</div>
              )}
            </form>
          </div>
        ) : (
          /* Notification Service Feed */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Live feed from <code>GET /api/notifications</code> (notification-service)
            </div>
            {notifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  border: '1px dashed var(--border)',
                  borderRadius: 10,
                }}
              >
                No notifications yet. Submit a payment to see RabbitMQ{' '}
                <code>payment.status.changed</code> events arrive here.
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className={`badge ${
                        n.status === 'SETTLED'
                          ? 'badge-success'
                          : n.status === 'FAILED'
                            ? 'badge-danger'
                            : 'badge-warning'
                      }`}
                    >
                      {n.status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                    {n.message}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Payment: {n.paymentId}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
