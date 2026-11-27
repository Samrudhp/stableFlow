import React from 'react';
import { Activity, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  gatewayHealth: 'UP' | 'DOWN' | 'CHECKING';
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onCheckHealth: () => void;
  onOpenAuthTab: () => void;
}

const PRESET_KEYS = [
  { label: 'dev-key-admin (Valid)', value: 'dev-key-admin' },
  { label: 'dev-key-payment-service (Valid)', value: 'dev-key-payment-service' },
  { label: 'hacker (Invalid → 401)', value: 'hacker' },
  { label: '(No Key → 401)', value: '' },
];

export const TopBar: React.FC<TopBarProps> = ({
  gatewayHealth,
  apiKey,
  onApiKeyChange,
  onCheckHealth,
  onOpenAuthTab,
}) => {
  const isPreset = PRESET_KEYS.some((k) => k.value === apiKey);

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
          }}
        >
          SF
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
              StableFlow
            </span>
            <span className="badge badge-info">USDC Settlement</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            API Gateway <code style={{ fontSize: 11 }}>:8080</code> · Sync HTTP + Async RabbitMQ
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Health Badge */}
        <button
          type="button"
          onClick={onCheckHealth}
          className={`badge ${
            gatewayHealth === 'UP'
              ? 'badge-success'
              : gatewayHealth === 'DOWN'
                ? 'badge-danger'
                : 'badge-neutral'
          }`}
          style={{ cursor: 'pointer', padding: '5px 11px', fontSize: 12 }}
          title="Click to probe GET /actuator/health (no API key required)"
        >
          <Activity size={13} />
          <span>Gateway: {gatewayHealth}</span>
          <RefreshCw size={11} className={gatewayHealth === 'CHECKING' ? 'spin' : ''} />
        </button>

        {/* API Key Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-subtle)',
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <KeyRound size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            X-API-Key:
          </span>
          <select
            className="select"
            value={isPreset ? apiKey : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') {
                onApiKeyChange(e.target.value);
              }
            }}
            style={{
              width: 'auto',
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--border)',
            }}
          >
            {PRESET_KEYS.map((k) => (
              <option key={k.label} value={k.value}>
                {k.label}
              </option>
            ))}
            {!isPreset && <option value="__custom__">Custom ({apiKey})</option>}
          </select>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenAuthTab}>
          <ShieldCheck size={14} />
          Auth Demo
        </button>
      </div>
    </header>
  );
};
