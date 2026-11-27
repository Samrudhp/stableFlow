import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, Trash2 } from 'lucide-react';
import type { ApiLogEntry } from '../types';

interface ApiInspectorProps {
  logs: ApiLogEntry[];
  onClear: () => void;
}

export const ApiInspector: React.FC<ApiInspectorProps> = ({ logs, onClear }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title" style={{ fontSize: 15 }}>
            <Terminal size={16} color="var(--accent)" />
            Live API Inspector ({logs.length})
          </h3>
          <p className="card-subtitle">
            Real-time HTTP traffic through <code>api-gateway</code>
          </p>
        </div>
        {logs.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No API calls recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
          {logs.map((log) => {
            const isOpen = expandedId === log.id;
            return (
              <div
                key={log.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : log.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span
                      className={`badge ${
                        log.status === null
                          ? 'badge-danger'
                          : log.status < 300
                            ? 'badge-success'
                            : log.status === 401
                              ? 'badge-danger'
                              : 'badge-warning'
                      }`}
                    >
                      {log.status ?? 'ERR'}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {log.method}
                    </span>
                    <span
                      className="mono"
                      style={{
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.path}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      fontSize: 11,
                    }}
                  >
                    <span>{log.durationMs}ms</span>
                    <span>{log.timestamp}</span>
                  </div>
                </button>
                {isOpen && (
                  <pre
                    className="mono"
                    style={{
                      margin: 0,
                      padding: 10,
                      fontSize: 11,
                      background: '#ffffff',
                      borderTop: '1px solid var(--border)',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(log.responseBody, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
