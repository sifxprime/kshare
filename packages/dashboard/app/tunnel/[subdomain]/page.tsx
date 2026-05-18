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
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TunnelPage() {
  const params                    = useParams();
  const subdomain                 = params.subdomain as string;
  const [status, setStatus]       = useState<TunnelStatus | null>(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [nextRefresh, setNextRefresh] = useState(5);
  const [now, setNow]             = useState(Date.now());

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
      setNextRefresh(5);
    }
  }, [subdomain, API]);

  // Fetch on mount and every 5 s
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Live clock — updates remaining time and countdown
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setNextRefresh(n => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function copyUrl() {
    if (!status) return;
    navigator.clipboard.writeText(status.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const remaining = status ? status.expiresAt - now : 0;
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
        {!loading && status && (
          <button className={styles.refreshBtn} onClick={fetchStatus} title="Refresh now">
            Refresh {nextRefresh > 0 ? `(${nextRefresh}s)` : ''}
          </button>
        )}
      </nav>

      <main className={styles.main}>

        {/* Header row */}
        <div className={styles.titleRow}>
          <div className={styles.subdomainBlock}>
            <span className={styles.subdomainLabel}>Tunnel</span>
            <h1 className={styles.subdomain}>
              {subdomain}<span className={styles.subdomainSuffix}>.kodelyth.net</span>
            </h1>
          </div>
          {!loading && (
            <div className={status?.active ? styles.statusActive : styles.statusInactive}>
              {status?.active
                ? <><span className={styles.pulse} />connected</>
                : error ? 'not found' : 'offline'}
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className={styles.skeleton}>
            <div className={styles.skelUrl} />
            <div className={styles.skelBar} />
            <div className={styles.skelGrid}>
              <div className={styles.skelCard} />
              <div className={styles.skelCard} />
              <div className={styles.skelCard} />
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>Tunnel not found</p>
            <p className={styles.errorCopy}>
              {error}. This tunnel may have expired or never existed.
            </p>
            <div className={styles.errorHint}>
              <span className={styles.errorHintLabel}>Start a new tunnel:</span>
              <code className={styles.errorHintCode}>npx @sifxprime/kshare --port 3000</code>
            </div>
            <a href="/" className={styles.errorBack}>← Back to KShare</a>
          </div>
        )}

        {/* Active tunnel */}
        {!loading && status && (
          <>
            {/* URL card */}
            <div className={styles.urlCard}>
              <a href={status.url} target="_blank" rel="noreferrer" className={styles.urlText}>
                {status.url}
              </a>
              <div className={styles.urlActions}>
                <button className={styles.copyBtn} onClick={copyUrl}>
                  {copied ? '✓ Copied' : 'Copy URL'}
                </button>
                <a
                  href={status.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.openBtn}
                >
                  Open →
                </a>
              </div>
            </div>

            {/* Expiry bar */}
            <div className={styles.expiryWrap}>
              <div className={styles.expiryBar}>
                <div
                  className={styles.expiryFill}
                  style={{
                    width: `${pct}%`,
                    background: pct < 10 ? '#f87171' : pct < 25 ? '#fbbf24' : undefined,
                  }}
                />
              </div>
              <span className={styles.expiryLabel}>
                {remaining > 0 ? formatDuration(remaining) : 'expired'} remaining
              </span>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{status.requestCount.toLocaleString()}</div>
                <div className={styles.statLabel}>Requests served</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{formatDate(status.createdAt)}</div>
                <div className={styles.statLabel}>Created</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statVal}>{formatDate(status.expiresAt)}</div>
                <div className={styles.statLabel}>Expires at</div>
              </div>
            </div>

            {/* Offline notice */}
            {!status.active && (
              <div className={styles.offlineNote}>
                <strong>Client disconnected.</strong>{' '}
                KShare will restore this exact URL automatically when the tunnel reconnects — no action needed.
              </div>
            )}

            {/* Share row */}
            <div className={styles.shareRow}>
              <span className={styles.shareLabel}>Share this link:</span>
              <div className={styles.sharePills}>
                <a
                  href={`mailto:?subject=Check+out+my+app&body=${encodeURIComponent(status.url)}`}
                  className={styles.sharePill}
                >
                  Email
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(status.url)}&text=${encodeURIComponent('Check out this live demo via KShare by KODELYTH')}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sharePill}
                >
                  X / Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(status.url)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sharePill}
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <KodeLythMark size={14} />
          <span>KODELYTH</span>
        </div>
        <div className={styles.footerLinks}>
          <a href="https://github.com/sifxprime/kshare" target="_blank" rel="noreferrer" className={styles.footerLink}>GitHub</a>
          <a href="https://kodelyth.net" target="_blank" rel="noreferrer" className={styles.footerLink}>kodelyth.net</a>
        </div>
      </footer>
    </div>
  );
}
