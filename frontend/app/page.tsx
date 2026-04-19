'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Subscription {
  id: number;
  user_id: number;
  repo: string;
  keyword: string;
  created_at: string;
}

interface Notification {
  id: number;
  user_id: number;
  repo: string;
  keyword: string;
  content: string;
  issue_url: string;
  issue_title: string;
  created_at: string;
  read: boolean;
}

// ---- Helper: simple fetch wrapper ----
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  const [repo, setRepo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [subError, setSubError] = useState('');

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('kas_email');
    const savedUserId = localStorage.getItem('kas_userId');
    if (savedEmail && savedUserId) {
      setEmail(savedEmail);
      setUserId(parseInt(savedUserId, 10));
    }
  }, []);

  // Load subscriptions + notifications when logged in
  useEffect(() => {
    if (!userId) return;
    apiFetch(`/subscriptions?userId=${userId}`)
      .then((d) => setSubscriptions(d.subscriptions))
      .catch(console.error);
    apiFetch(`/notifications?userId=${userId}`)
      .then((d) => setNotifications(d.notifications))
      .catch(console.error);
  }, [userId]);

  // Real-time notification handler
  const onNotification = useCallback((data: unknown) => {
    const n = data as Notification;
    setNotifications((prev) => [n, ...prev]);
  }, []);

  useSocket(userId, onNotification);

  // Login / register by email
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/users/by-email?email=${encodeURIComponent(inputEmail.trim())}`);
      setEmail(data.user.email);
      setUserId(data.user.id);
      localStorage.setItem('kas_email', data.user.email);
      localStorage.setItem('kas_userId', String(data.user.id));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('kas_email');
    localStorage.removeItem('kas_userId');
    setEmail('');
    setUserId(null);
    setSubscriptions([]);
    setNotifications([]);
  }

  // Create subscription
  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubError('');
    if (!repo.trim() || !keyword.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ email, repo: repo.trim(), keyword: keyword.trim() }),
      });
      setSubscriptions((prev) => [data.subscription, ...prev]);
      setRepo('');
      setKeyword('');
    } catch (err) {
      setSubError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Delete subscription
  async function handleDeleteSub(id: number) {
    try {
      await apiFetch(`/subscriptions/${id}?userId=${userId}`, { method: 'DELETE' });
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // Mark notification as read
  async function handleMarkRead(id: number) {
    try {
      await apiFetch(`/notifications/${id}/read?userId=${userId}`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Render: not logged in ----
  if (!userId) {
    return (
      <main style={styles.centered}>
        <div style={styles.card}>
          <h1 style={styles.title}>GitHub Keyword Alert</h1>
          <p style={{ color: '#555', marginBottom: 24 }}>
            Enter your email to start monitoring GitHub repositories.
          </p>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="your@email.com"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---- Render: logged in ----
  return (
    <main style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <span style={{ fontWeight: 600 }}>GitHub Keyword Alert</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#555' }}>{email}</span>
          <button onClick={handleLogout} style={styles.outlineButton}>
            Logout
          </button>
        </div>
      </header>

      <div style={styles.layout}>
        {/* Left column: subscriptions */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Add Subscription</h2>
          <form onSubmit={handleSubscribe} style={styles.form}>
            <input
              placeholder="owner/repo (e.g. vercel/next.js)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              style={styles.input}
              required
            />
            <input
              placeholder="keyword (e.g. bug)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={styles.input}
              required
            />
            {subError && <p style={{ color: '#c00', fontSize: 13, margin: 0 }}>{subError}</p>}
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Saving...' : 'Subscribe'}
            </button>
          </form>

          <h2 style={{ ...styles.sectionTitle, marginTop: 28 }}>Active Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>No subscriptions yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {subscriptions.map((s) => (
                <li key={s.id} style={styles.subItem}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{s.repo}</span>
                    <span style={styles.badge}>{s.keyword}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSub(s.id)}
                    style={styles.deleteButton}
                    title="Remove subscription"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right column: notifications */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Notifications
            {unreadCount > 0 && (
              <span style={styles.unreadBadge}>{unreadCount} new</span>
            )}
          </h2>
          {notifications.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>
              No notifications yet. Alerts will appear here when keywords are detected in new issues.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  style={{ ...styles.notifItem, opacity: n.read ? 0.6 : 1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <a
                      href={n.issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.issueLink}
                    >
                      {n.issue_title}
                    </a>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        style={styles.readButton}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <span style={styles.badge}>{n.keyword}</span>
                    <span style={{ marginLeft: 8 }}>{n.repo}</span>
                    <span style={{ marginLeft: 8 }}>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

// ---- Inline styles ----
const styles: Record<string, React.CSSProperties> = {
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 16,
  },
  page: {
    minHeight: '100vh',
    padding: 0,
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: 24,
    padding: 24,
    maxWidth: 1100,
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    alignSelf: 'start',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d0d0d0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  button: {
    padding: '9px 16px',
    background: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  outlineButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#555',
    border: '1px solid #d0d0d0',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#999',
    lineHeight: 1,
    padding: '0 4px',
  },
  readButton: {
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    padding: '2px 6px',
    color: '#555',
    whiteSpace: 'nowrap',
  },
  subItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: 14,
  },
  badge: {
    background: '#f0f4ff',
    color: '#0055cc',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 12,
    fontWeight: 500,
    marginLeft: 8,
  },
  unreadBadge: {
    background: '#0070f3',
    color: '#fff',
    borderRadius: 12,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
  },
  notifItem: {
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  issueLink: {
    color: '#0070f3',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
};
