'use client';

import { useEffect, useState } from 'react';
import styles from './admin.module.css';

interface Tunnel {
  subdomain:    string;
  port:         number;
  ip:           string;
  createdAt:    number;
  expiresAt:    number;
  requestCount: number;
}

interface Stats {
  activeTunnels: number;
  uptime:        number;
  memory:        { rss: number; heapUsed: number };
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeRemaining(expiresAt: number) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function AdminPage() {
  const [secret, setSecret]   = useState('');
  const [authed, setAuthed]   = useState(false);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [error, setError]     = useState('');

  const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || 'http://127.0.0.1:4001/admin';

  async function login() {
    try {
      const res = await fetch(`${ADMIN_API}/stats`, {
        headers: { 'x-admin-secret': secret },
      });
      if (!res.ok) { setError('Wrong secret'); return; }
      const data = await res.json();
      setStats(data);
      setAuthed(true);
      setError('');
    } catch {
      setError('Cannot reach admin server — is it running?');
    }
  }

  async function fetchData() {
    const headers = { 'x-admin-secret': secret };
    const [tunnelRes, statsRes] = await Promise.all([
      fetch(`${ADMIN_API}/tunnels`, { headers }),
      fetch(`${ADMIN_API}/stats`,   { headers }),
    ]);
    setTunnels(await tunnelRes.json().then((d) => d.tunnels || []));
    setStats(await statsRes.json());
  }

  async function revoke(subdomain: string) {
    await fetch(`${ADMIN_API}/tunnels/${subdomain}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': secret },
    });
    setTunnels((prev) => prev.filter((t) => t.subdomain !== subdomain));
  }

  useEffect(() => {
    if (!authed) return;
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [authed]);

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginCard}>
          <div className={styles.mark}>KShare</div>
          <div className={styles.by}>Admin Panel</div>
          {error && <div className={styles.error}>{error}</div>}
          <input
            className={styles.input}
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          <button className={styles.btn} onClick={login}>Enter</button>
          <p className={styles.note}>
            Set <code>ADMIN_SECRET</code> in your server <code>.env</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <span className={styles.mark}>KShare</span>
          <span className={styles.by}> Admin</span>
        </div>
        <button className={styles.btnSmall} onClick={() => setAuthed(false)}>
          Sign out
        </button>
      </header>

      {stats && (
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{stats.activeTunnels}</div>
            <div className={styles.statLabel}>Active tunnels</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatUptime(stats.uptime)}</div>
            <div className={styles.statLabel}>Uptime</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatBytes(stats.memory.heapUsed)}</div>
            <div className={styles.statLabel}>Heap used</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{formatBytes(stats.memory.rss)}</div>
            <div className={styles.statLabel}>RSS</div>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Active Tunnels ({tunnels.length})
        </h2>
        {tunnels.length === 0 ? (
          <p className={styles.empty}>No active tunnels</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Subdomain</th>
                <th>Port</th>
                <th>IP</th>
                <th>Requests</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((t) => (
                <tr key={t.subdomain}>
                  <td><code>{t.subdomain}</code></td>
                  <td>{t.port}</td>
                  <td className={styles.ip}>{t.ip}</td>
                  <td>{t.requestCount}</td>
                  <td className={styles.expires}>{timeRemaining(t.expiresAt)}</td>
                  <td>
                    <button
                      className={styles.btnRevoke}
                      onClick={() => revoke(t.subdomain)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
