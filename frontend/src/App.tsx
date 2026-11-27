import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Terminal, Wrench } from 'lucide-react';
import { StableFlowClient } from './api/stableflowClient';
import { ApiInspector } from './components/ApiInspector';
import { DemoTools } from './components/DemoTools';
import { PaymentStudio } from './components/PaymentStudio';
import { TopBar } from './components/TopBar';
import { WalletSidebar } from './components/WalletSidebar';
import type { ApiLogEntry, NotificationItem, Payment, Wallet } from './types';

const STORAGE_WALLETS_KEY = 'stableflow.wallets.v1';
const STORAGE_PAYMENTS_KEY = 'stableflow.payments.v1';

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState('dev-key-admin');
  const [gatewayHealth, setGatewayHealth] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');
  const [activeTab, setActiveTab] = useState<'transactions' | 'tools' | 'logs'>('transactions');

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_WALLETS_KEY);
      return raw ? (JSON.parse(raw) as Wallet[]) : [];
    } catch {
      return [];
    }
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PAYMENTS_KEY);
      return raw ? (JSON.parse(raw) as Payment[]) : [];
    } catch {
      return [];
    }
  });

  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [senderId, setSenderId] = useState<string>('');
  const [receiverId, setReceiverId] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [autoPoll, setAutoPoll] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceDeltas, setBalanceDeltas] = useState<Record<string, number>>({});

  const prevBalancesRef = useRef<Record<string, number>>({});

  const addLog = useCallback((entry: ApiLogEntry) => {
    setLogs((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const client = useMemo(() => new StableFlowClient('', apiKey, addLog), [apiKey, addLog]);

  useEffect(() => {
    client.setConfig('', apiKey);
  }, [client, apiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_WALLETS_KEY, JSON.stringify(wallets));
    if (wallets.length >= 1 && !senderId) {
      setSenderId(wallets[0].walletId);
    }
    if (wallets.length >= 2 && !receiverId) {
      setReceiverId(wallets[1].walletId);
    }
  }, [wallets, senderId, receiverId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PAYMENTS_KEY, JSON.stringify(payments));
  }, [payments]);

  const checkHealth = useCallback(async () => {
    setGatewayHealth('CHECKING');
    try {
      const h = await client.checkHealth();
      setGatewayHealth(h.status === 'UP' ? 'UP' : 'DOWN');
    } catch {
      setGatewayHealth('DOWN');
    }
  }, [client]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const refreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Refresh tracked wallets
      if (wallets.length > 0) {
        const updated = await Promise.all(
          wallets.map(async (w) => {
            try {
              const bal = await client.getBalance(w.walletId);
              return {
                ...w,
                availableBalance: bal.availableBalance,
                reservedBalance: bal.reservedBalance,
              };
            } catch {
              return w;
            }
          })
        );

        // Compute deltas for visual feedback
        const newDeltas: Record<string, number> = {};
        updated.forEach((w) => {
          const prev = prevBalancesRef.current[w.walletId];
          if (prev !== undefined && Math.abs(w.availableBalance - prev) > 0.0000001) {
            newDeltas[w.walletId] = w.availableBalance - prev;
          }
          prevBalancesRef.current[w.walletId] = w.availableBalance;
        });

        if (Object.keys(newDeltas).length > 0) {
          setBalanceDeltas((curr) => ({ ...curr, ...newDeltas }));
          setTimeout(() => {
            setBalanceDeltas((curr) => {
              const copy = { ...curr };
              Object.keys(newDeltas).forEach((k) => delete copy[k]);
              return copy;
            });
          }, 4500);
        }

        setWallets(updated);
      }

      // Refresh notifications
      try {
        const notifs = await client.getNotifications();
        setNotifications(notifs);
      } catch {
        // ignore if gateway key is intentionally invalid during auth demo
      }

      // Refresh any PROCESSING payments in session
      const pending = payments.filter((p) => p.status === 'PROCESSING' || p.status === 'CREATED');
      if (pending.length > 0) {
        const refreshedPayments = await Promise.all(
          pending.map(async (p) => {
            try {
              return await client.getPayment(p.paymentId);
            } catch {
              return p;
            }
          })
        );
        setPayments((prev) =>
          prev.map((p) => refreshedPayments.find((rp) => rp.paymentId === p.paymentId) || p)
        );
        if (activePayment) {
          const match = refreshedPayments.find((rp) => rp.paymentId === activePayment.paymentId);
          if (match) setActivePayment(match);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [wallets, payments, activePayment, client, isRefreshing]);

  // Auto-poll every 2s
  useEffect(() => {
    if (!autoPoll) return;
    const timer = setInterval(() => {
      refreshAll();
    }, 2000);
    return () => clearInterval(timer);
  }, [autoPoll, refreshAll]);

  const upsertWallet = (w: Wallet) => {
    prevBalancesRef.current[w.walletId] = w.availableBalance;
    setWallets((prev) => {
      const exists = prev.some((x) => x.walletId === w.walletId);
      return exists ? prev.map((x) => (x.walletId === w.walletId ? w : x)) : [w, ...prev];
    });
  };

  const handleCreateWallet = async (ownerName: string, initialBalance: number) => {
    const w = await client.createWallet({ ownerName, currency: 'USDC', initialBalance });
    upsertWallet(w);
  };

  const handleLookupWallet = async (walletId: string) => {
    const w = await client.getWallet(walletId);
    upsertWallet(w);
  };

  const handleQuickSetupDemo = async () => {
    const alice = await client.createWallet({
      ownerName: 'Alice',
      currency: 'USDC',
      initialBalance: 500,
    });
    const bob = await client.createWallet({
      ownerName: 'Bob',
      currency: 'USDC',
      initialBalance: 0.000001,
    });
    upsertWallet(bob);
    upsertWallet(alice);
    setSenderId(alice.walletId);
    setReceiverId(bob.walletId);
  };

  const handleSubmitPayment = async (
    sId: string,
    rId: string,
    amount: number,
    idempotencyKey: string
  ) => {
    const created = await client.createPayment(
      { senderWalletId: sId, receiverWalletId: rId, amount, currency: 'USDC' },
      idempotencyKey
    );
    setPayments((prev) => {
      const exists = prev.some((p) => p.paymentId === created.paymentId);
      return exists
        ? prev.map((p) => (p.paymentId === created.paymentId ? created : p))
        : [created, ...prev];
    });
    setActivePayment(created);

    // Immediately refresh balances (shows reservedBalance on sender)
    refreshAll();

    // Fast-poll payment status every 500ms for up to 10s so SETTLED appears right away
    let attempts = 0;
    const fastPoll = setInterval(async () => {
      attempts += 1;
      try {
        const updated = await client.getPayment(created.paymentId);
        setPayments((prev) =>
          prev.map((p) => (p.paymentId === updated.paymentId ? updated : p))
        );
        setActivePayment((curr) => (curr?.paymentId === updated.paymentId ? updated : curr));
        if (updated.status === 'SETTLED' || updated.status === 'FAILED' || attempts >= 20) {
          clearInterval(fastPoll);
          refreshAll();
        }
      } catch {
        clearInterval(fastPoll);
      }
    }, 500);
  };

  const handleRefreshPayment = async (paymentId: string) => {
    const updated = await client.getPayment(paymentId);
    setPayments((prev) => prev.map((p) => (p.paymentId === updated.paymentId ? updated : p)));
    if (activePayment?.paymentId === updated.paymentId) {
      setActivePayment(updated);
    }
    refreshAll();
  };

  return (
    <div className="app-shell">
      <TopBar
        gatewayHealth={gatewayHealth}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onCheckHealth={checkHealth}
        onOpenAuthTab={() => setActiveTab('tools')}
      />

      <main className="main-grid">
        {/* Left Main Workspace */}
        <section className="left-col">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                <ArrowRightLeft size={14} />
                Transactions
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                onClick={() => setActiveTab('tools')}
              >
                <Wrench size={14} />
                Wallets & Demo Tools
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                <Terminal size={14} />
                API Inspector ({logs.length})
              </button>
            </div>
          </div>

          {activeTab === 'transactions' && (
            <PaymentStudio
              wallets={wallets}
              senderId={senderId}
              receiverId={receiverId}
              payments={payments}
              activePayment={activePayment}
              onSenderChange={setSenderId}
              onReceiverChange={setReceiverId}
              onSubmitPayment={handleSubmitPayment}
              onRefreshPayment={handleRefreshPayment}
              onSelectActivePayment={setActivePayment}
            />
          )}

          {activeTab === 'tools' && (
            <DemoTools
              onCreateWallet={handleCreateWallet}
              onLookupPayment={(id) => client.getPayment(id)}
              onRunAuthSuite={() => client.runGatewayAuthSuite()}
            />
          )}

          {activeTab === 'logs' && (
            <ApiInspector logs={logs} onClear={() => setLogs([])} />
          )}
        </section>

        {/* Right Persistent Counterparty & Balances Sidebar */}
        <WalletSidebar
          wallets={wallets}
          balanceDeltas={balanceDeltas}
          senderId={senderId}
          receiverId={receiverId}
          notifications={notifications}
          autoPoll={autoPoll}
          isRefreshing={isRefreshing}
          onToggleAutoPoll={() => setAutoPoll((v) => !v)}
          onRefreshAll={refreshAll}
          onSelectSender={setSenderId}
          onSelectReceiver={setReceiverId}
          onRemoveWallet={(id) => setWallets((prev) => prev.filter((w) => w.walletId !== id))}
          onLookupWallet={handleLookupWallet}
          onQuickSetupDemo={handleQuickSetupDemo}
        />
      </main>
    </div>
  );
};

export default App;
