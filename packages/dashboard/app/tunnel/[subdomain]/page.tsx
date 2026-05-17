'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './tunnel.module.css';
import { KodeLythMark } from '../../components/KodeLythMark';

interface TunnelStatus {
  subdomain:    string;
  url:          string;
  active:       boolean;
  expiresAt:    number;
  requestCount: number;
  createdAt:    number;
}

function formatDuration(ms: number) {
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TunnelPage() {
  const params                = useParams();
  const subdomain             = params.subdomain as string;
  const [status, setStatus]   = useState<TunnelStatus | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  const API = process.env.NEXT_PUBLIC_API_ORIGIN || 'https://api.kodelyth.net';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/status/${subdomain}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Tunnel not found or expired');
        setStatus(null);
      } else {
        setStatus(await res.json());
        setError('');
      }
    } catch {
      setError('Cannot reach server');
    } finally {
      setLoading(false);
    }
  }, [subdomain, API]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  function copyUrl() {
    if (!status) return;
    navigator.clipboard.writeText(status.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const remaining = status ? status.expiresAt - Date.now() : 0;
  const pct       = status
    ? Math.max(0, Math.min(100, (remaining / (24 * 3600 * 1000)) * 100))
    : 0;

  return (
    <div className={styles.root}>

      {/* Nav */}
      <nav className={styles.nav}>
        <a href="/" className={styles.navBrand}>
          <KodeLythMark size={18} />
          <span className={styles.navWordmark}>KODELYTH</span>
          <span className={styles.navSep}>/</span>
          <span className={styles.navProduct}>KShare</span>
        </a>
      </nav>

      <main className={styles.main}>

        {/* Header row */}
        <div className={styles.titleRow}>
          <div className={styles.subdomainBlock}>
            <span className={styles.subdomainLabel}>Tunnel</span>
            <h1 className={styles.subdomain}>{subdomain}<span className={styles.subdomainSuffix}>.kodelyth.net</span></h1>
          </div>
          {!loading && (
            <div className={status?.active ? styles.statusActive : styles.statusInactive}>
              {status?.active
                ? <><span className={styles.pulse} />connected</>
                : 'offline'}
            </div>
          )}
        </div>

        {loading && <p className={styles.hint}>Checking tunnel status...</p>}

        {!loading && error && (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>Tunnel not found</p>
            <p className={styles.errorCopy}>{error}. This tunnel may have expired or never existed.</p>
            <a href="/" className={styles.errorBack}>← Back to KShare</a>
          </div>
        )}

        {!loading && status && (
          <>
            {/* URL card */}
            <div className={styles.urlCard}>
              <a href={status.url} target="_blank" rel="noreferrer" className={styles.urlText}>
                {status.url}
              </a>
              <button className={styles.copyBtn} onClick={copyUrl}>
                {copied ? 'Copied' : 'Copy URL'}
              </button>
            </div>

            {/* Expiry bar */}
            <div className={styles.expiryWrap}>
              <div className={styles.expiryBar}>
                <div className={styles.expiryFill} style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.expiryLabel}>{formatDuration(remaining)} remaining</span>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{status.requestCount.toLocaleString()}</div>
                <div className={styles.statLabel}>Requests served</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{formatDate(status.createdAt)}</div>
                <div className={styles.statLabel}>Tunnel created</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{formatDate(status.expiresAt)}</div>
                <div className={styles.statLabel}>Expires at</div>
              </div>
            </div>

            {/* Offline notice */}
            {!status.active && (
              <div className={styles.offlineNote}>
                The client is currently disconnected. KShare will restore this URL automatically when it reconnects.
              </div>
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <KodeLythMark size={14} />
          <span>KODELYTH</span>
        </div>
        <a href="/" className={styles.footerBack}>All of KShare →</a>
      </footer>
    </div>
  );
}
