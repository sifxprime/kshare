import styles from './page.module.css';
import { KodeLythMark } from './components/KodeLythMark';

const terminalLines = [
  { t: 'cmd',   v: '$ npx @sifxprime/kshare --port 3000' },
  { t: 'blank', v: '' },
  { t: 'brand', v: '  KShare  by KODELYTH' },
  { t: 'blank', v: '' },
  { t: 'ok',    v: '  Connected' },
  { t: 'blank', v: '' },
  { t: 'label', v: '  Public URL  ', extra: 'https://ab12x.kodelyth.net' },
  { t: 'label', v: '  Dashboard   ', extra: 'http://localhost:4040' },
  { t: 'muted', v: '  Expires      23h 59m' },
  { t: 'muted', v: '  Local        localhost:3000' },
  { t: 'blank', v: '' },
  { t: 'req',   v: '  GET  /        200   12ms' },
  { t: 'req',   v: '  GET  /api/me  200   8ms' },
  { t: 'blank', v: '' },
  { t: 'dim',   v: '  Press Ctrl+C to stop' },
];

export default function HomePage() {
  return (
    <main className={styles.main}>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <KodeLythMark size={22} />
          <span className={styles.navWordmark}>KODELYTH</span>
          <span className={styles.navSep}>/</span>
          <span className={styles.navProduct}>KShare</span>
        </div>
        <div className={styles.navLinks}>
          <a
            href="https://github.com/sifxprime/kshare"
            target="_blank"
            rel="noreferrer"
            className={styles.navLink}
          >
            GitHub
          </a>
          <a
            href="https://github.com/sifxprime/kshare/blob/main/docs/vps-setup.md"
            target="_blank"
            rel="noreferrer"
            className={styles.navLink}
          >
            Self-host
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Open source &middot; Free &middot; Self-hostable</div>
        <h1 className={styles.heroHeadline}>
          Share localhost.<br />
          <span className={styles.heroAccent}>Instantly.</span>
        </h1>
        <p className={styles.heroCopy}>
          One command. A public HTTPS link to your local app in seconds.
          No signup, no config, no cloud account — just run it.
        </p>

        <div className={styles.installRow}>
          <code className={styles.installCmd}>npx @sifxprime/kshare --port 3000</code>
          <span className={styles.installOr}>or</span>
          <code className={styles.installCmd}>npm install -g @sifxprime/kshare</code>
        </div>
      </section>

      {/* Terminal demo */}
      <section className={styles.demoWrap}>
        <div className={styles.terminal}>
          <div className={styles.termBar}>
            <div className={styles.termDots}>
              <span className={styles.dot} style={{ background: '#f87171' }} />
              <span className={styles.dot} style={{ background: '#fbbf24' }} />
              <span className={styles.dot} style={{ background: '#a3e635' }} />
            </div>
            <span className={styles.termTitle}>terminal</span>
          </div>
          <div className={styles.termBody}>
            {terminalLines.map((line, i) => {
              if (line.t === 'blank') return <div key={i} className={styles.termLine} />;
              if (line.t === 'cmd')   return <div key={i} className={styles.termLine}><span className={styles.tCmd}>{line.v}</span></div>;
              if (line.t === 'brand') return <div key={i} className={styles.termLine}><span className={styles.tBrand}>{line.v}</span></div>;
              if (line.t === 'ok')    return <div key={i} className={styles.termLine}><span className={styles.tOk}>{line.v}</span></div>;
              if (line.t === 'dim')   return <div key={i} className={styles.termLine}><span className={styles.tDim}>{line.v}</span></div>;
              if (line.t === 'muted') return <div key={i} className={styles.termLine}><span className={styles.tMuted}>{line.v}</span></div>;
              if (line.t === 'req')   return <div key={i} className={styles.termLine}><span className={styles.tReq}>{line.v}</span></div>;
              if (line.t === 'label') return (
                <div key={i} className={styles.termLine}>
                  <span className={styles.tMuted}>{line.v}</span>
                  <span className={styles.tUrl}>{line.extra}</span>
                </div>
              );
              return null;
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureNum}>01</div>
          <h3 className={styles.featureTitle}>Any app, any port</h3>
          <p className={styles.featureCopy}>React, Vite, Next.js, Django, Laravel, Express, Rails, FastAPI — any localhost app works with zero changes.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureNum}>02</div>
          <h3 className={styles.featureTitle}>Stays connected</h3>
          <p className={styles.featureCopy}>Wi-Fi drops? KShare reconnects automatically and restores the exact same URL — no broken links, no re-sharing.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureNum}>03</div>
          <h3 className={styles.featureTitle}>HTTPS by default</h3>
          <p className={styles.featureCopy}>Every link is HTTPS. Cookies, auth flows, OAuth redirects, and mixed-content assets all work correctly through the tunnel.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureNum}>04</div>
          <h3 className={styles.featureTitle}>Local request log</h3>
          <p className={styles.featureCopy}>Open localhost:4040 while a tunnel is running to see every request, status code, and response time — no browser extension needed.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureNum}>05</div>
          <h3 className={styles.featureTitle}>Password protect</h3>
          <p className={styles.featureCopy}>Add <code className={styles.inlineCode}>--password</code> to restrict who can open your tunnel. Share the link and password separately.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureNum}>06</div>
          <h3 className={styles.featureTitle}>Self-hostable</h3>
          <p className={styles.featureCopy}>Run your own tunnel server on a $4/month VPS. One config file, full control, your own domain.</p>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <h2 className={styles.howTitle}>How it works</h2>
        <div className={styles.howDiagram}>
          <div className={styles.howNode}>
            <div className={styles.howNodeLabel}>Your machine</div>
            <div className={styles.howNodeSub}>localhost:3000</div>
          </div>
          <div className={styles.howArrow}>
            <span className={styles.howArrowLine} />
            <span className={styles.howArrowText}>outbound WebSocket</span>
            <span className={styles.howArrowLine} />
          </div>
          <div className={styles.howNode}>
            <div className={styles.howNodeLabel}>Tunnel server</div>
            <div className={styles.howNodeSub}>routes requests</div>
          </div>
          <div className={styles.howArrow}>
            <span className={styles.howArrowLine} />
            <span className={styles.howArrowText}>HTTPS</span>
            <span className={styles.howArrowLine} />
          </div>
          <div className={styles.howNode}>
            <div className={styles.howNodeLabel}>Public URL</div>
            <div className={styles.howNodeSub}>ab12x.kodelyth.net</div>
          </div>
        </div>
        <p className={styles.howNote}>
          Outbound WebSocket only — no port forwarding, no firewall rules, no router config.
        </p>
      </section>

      {/* Self-host CTA */}
      <section className={styles.selfHost}>
        <div className={styles.selfHostCard}>
          <div className={styles.selfHostLeft}>
            <h3 className={styles.selfHostTitle}>Run your own tunnel server</h3>
            <p className={styles.selfHostCopy}>
              KShare is fully open source. Self-host on any VPS with one config file.
              Your domain, your infrastructure, your data.
            </p>
          </div>
          <a
            href="https://github.com/sifxprime/kshare/blob/main/docs/vps-setup.md"
            target="_blank"
            rel="noreferrer"
            className={styles.selfHostBtn}
          >
            Read the setup guide →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <KodeLythMark size={16} />
          <span>KODELYTH</span>
        </div>
        <div className={styles.footerLinks}>
          <a href="https://github.com/sifxprime/kshare" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://github.com/sifxprime/kshare/blob/main/SECURITY.md" target="_blank" rel="noreferrer">Security</a>
          <a href="https://kodelyth.com" target="_blank" rel="noreferrer">kodelyth.com</a>
        </div>
      </footer>

    </main>
  );
}
