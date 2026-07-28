import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch } from '@/lib/api';
import { isCloudEdition } from '@/lib/edition';
import { captureTabScreenshot, fileToDataUrl, readClipboardImage } from '@/lib/review-screenshot';

type ShareInfo = {
  subdomain: string;
  tunnelId: string;
  publicUrl: string;
  reviewUrl: string;
  live: boolean;
  passwordProtected: boolean;
  projectName: string;
};

type Pin = { x: number; y: number };

type Props = Readonly<{
  subdomain: string;
}>;

export function ReviewChrome({ subdomain }: Props) {
  const cloud = isCloudEdition();
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOk, setSubmitOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadShare = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch<ShareInfo>(`/api/share/${encodeURIComponent(subdomain)}`);
      setShare(data);
    } catch (err) {
      setShare(null);
      setLoadError(err instanceof ApiError ? err.message : 'Could not load this preview');
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    void loadShare();
  }, [loadShare]);

  useEffect(() => {
    if (!panelOpen) return;

    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          void fileToDataUrl(file).then((dataUrl) => {
            setScreenshot(dataUrl);
            setPin(null);
          });
          return;
        }
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [panelOpen]);

  async function handleCaptureTab() {
    setCaptureBusy(true);
    setSubmitError('');
    try {
      const dataUrl = await captureTabScreenshot();
      setScreenshot(dataUrl);
      setPin(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Screenshot cancelled');
    } finally {
      setCaptureBusy(false);
    }
  }

  async function handlePasteClick() {
    setCaptureBusy(true);
    setSubmitError('');
    try {
      const dataUrl = await readClipboardImage();
      if (!dataUrl) {
        setSubmitError('No image on clipboard — take a screenshot, then paste (⌘V / Ctrl+V).');
        return;
      }
      setScreenshot(dataUrl);
      setPin(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not read clipboard');
    } finally {
      setCaptureBusy(false);
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setSubmitError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      setScreenshot(dataUrl);
      setPin(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not read image');
    }
  }

  function handlePinClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setPin({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!share?.live) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitOk(false);

    try {
      await apiFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          tunnelId: share.tunnelId,
          page: share.publicUrl,
          message: message.trim(),
          ...(screenshot ? { screenshot } : {}),
          ...(pin
            ? {
                x: Math.round(pin.x * 1000) / 1000,
                y: Math.round(pin.y * 1000) / 1000,
              }
            : {}),
          metadata: {
            source: 'review-chrome',
            screenshotCaptured: Boolean(screenshot),
            pin: pin ?? undefined,
            viewport:
              typeof window !== 'undefined'
                ? { width: window.innerWidth, height: window.innerHeight }
                : undefined,
          },
        }),
      });
      setMessage('');
      setScreenshot(null);
      setPin(null);
      setSubmitOk(true);
      setTimeout(() => setSubmitOk(false), 2500);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  }

  if (!cloud) {
    return (
      <main style={shellStyle}>
        <p style={{ color: 'var(--muted)', padding: '2rem' }}>
          Client feedback chrome is available on ShipLocal Cloud.
        </p>
      </main>
    );
  }

  let body: ReactNode;
  if (loading) {
    body = <p style={centerMsgStyle}>Loading preview…</p>;
  } else if (loadError) {
    body = (
      <div style={centerMsgStyle}>
        <p style={{ marginBottom: '0.75rem' }}>{loadError}</p>
        <button type="button" onClick={() => void loadShare()} style={ghostButtonStyle}>
          Retry
        </button>
      </div>
    );
  } else if (share && !share.live) {
    body = (
      <div style={centerMsgStyle}>
        <p style={{ marginBottom: '0.5rem' }}>This tunnel is offline.</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Ask the developer to keep <code>shiplocal</code> running, then refresh.
        </p>
        <button type="button" onClick={() => void loadShare()} style={ghostButtonStyle}>
          Refresh
        </button>
      </div>
    );
  } else if (share) {
    body = (
      <>
        <iframe
          title={`Preview of ${share.subdomain}`}
          src={share.publicUrl}
          style={iframeStyle}
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <p style={frameHintStyle}>
          Preview blank after tunnel rewrite? Open the{' '}
          <a href={share.publicUrl} target="_blank" rel="noreferrer">
            raw URL
          </a>
          , screenshot it, then Paste into Feedback. Or ask the developer to allow framing.
        </p>
      </>
    );
  } else {
    body = null;
  }

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <Link href="/" style={brandStyle}>
            ShipLocal
          </Link>
          <span style={dividerStyle} aria-hidden />
          <span style={metaStyle} title={share?.projectName ?? subdomain}>
            {share?.projectName ?? subdomain}
          </span>
          {share ? (
            <span
              style={{
                ...pillStyle,
                background: share.live ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: share.live ? '#4ade80' : '#f87171',
              }}
            >
              {share.live ? 'Live' : 'Offline'}
            </span>
          ) : null}
          {share?.passwordProtected ? <span style={pillStyle}>Password</span> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {share ? (
            <a href={share.publicUrl} target="_blank" rel="noreferrer" style={ghostLinkStyle}>
              Open raw URL
            </a>
          ) : null}
          <button
            type="button"
            disabled={!share?.live}
            onClick={() => setPanelOpen((open) => !open)}
            style={{
              ...feedbackButtonStyle,
              opacity: share?.live ? 1 : 0.5,
              cursor: share?.live ? 'pointer' : 'not-allowed',
            }}
          >
            {panelOpen ? 'Close' : '💬 Feedback'}
          </button>
        </div>
      </header>

      <div style={bodyStyle}>
        {body}

        {panelOpen && share?.live ? (
          <aside style={panelStyle} aria-label="Leave feedback">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Leave feedback
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              Attach a screenshot of the issue, optionally click to pin where, then send.
            </p>

            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}
            >
              <button
                type="button"
                disabled={captureBusy}
                onClick={() => void handleCaptureTab()}
                style={ghostButtonStyle}
              >
                {captureBusy ? 'Capturing…' : 'Capture tab'}
              </button>
              <button
                type="button"
                disabled={captureBusy}
                onClick={() => void handlePasteClick()}
                style={ghostButtonStyle}
              >
                Paste image
              </button>
              <button
                type="button"
                disabled={captureBusy}
                onClick={() => fileInputRef.current?.click()}
                style={ghostButtonStyle}
              >
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void handleFileChange(e.target.files?.[0])}
              />
            </div>

            {screenshot ? (
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.375rem' }}>
                  Click the image to pin the spot (optional).
                </p>
                <button
                  type="button"
                  onClick={handlePinClick}
                  style={shotButtonStyle}
                  aria-label="Pin feedback location on screenshot"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshot} alt="Feedback screenshot" style={shotImgStyle} />
                  {pin ? (
                    <span
                      style={{
                        ...pinStyle,
                        left: `${String(pin.x * 100)}%`,
                        top: `${String(pin.y * 100)}%`,
                      }}
                    />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshot(null);
                    setPin(null);
                  }}
                  style={{
                    ...ghostLinkStyle,
                    marginTop: '0.375rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Remove screenshot
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Tip: OS screenshot → Paste, or Capture tab and choose this browser tab.
              </p>
            )}

            <form
              onSubmit={(e) => void handleSubmit(e)}
              style={{ display: 'grid', gap: '0.75rem' }}
            >
              <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
                Message
                <textarea
                  required
                  rows={4}
                  maxLength={5000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What should change? Be specific…"
                  style={textareaStyle}
                />
              </label>
              {share ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
                  Prefer click-to-element on the live page?{' '}
                  <a href={share.publicUrl} target="_blank" rel="noreferrer">
                    Open raw URL
                  </a>{' '}
                  (works when the in-page 💬 overlay is active).
                </p>
              ) : null}
              {submitError ? (
                <p style={{ color: '#f87171', fontSize: '0.8125rem' }}>{submitError}</p>
              ) : null}
              {submitOk ? (
                <p style={{ color: '#4ade80', fontSize: '0.8125rem' }}>Sent — thank you!</p>
              ) : null}
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                style={feedbackButtonStyle}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

const shellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: 'var(--background)',
  color: 'var(--foreground)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.625rem 1rem',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)',
  flexShrink: 0,
};

const brandStyle: CSSProperties = {
  fontWeight: 700,
  color: 'var(--foreground)',
  textDecoration: 'none',
  fontSize: '0.9375rem',
};

const dividerStyle: CSSProperties = {
  width: 1,
  height: 16,
  background: 'var(--border)',
};

const metaStyle: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--muted)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const pillStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  padding: '0.2rem 0.45rem',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--muted)',
};

const ghostLinkStyle: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--muted)',
  textDecoration: 'none',
};

const ghostButtonStyle: CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.4rem 0.65rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--foreground)',
  cursor: 'pointer',
};

const feedbackButtonStyle: CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  padding: '0.45rem 0.85rem',
  borderRadius: 6,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
};

const bodyStyle: CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const iframeStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  border: 'none',
  background: '#fff',
};

const centerMsgStyle: CSSProperties = {
  margin: 'auto',
  textAlign: 'center',
  padding: '2rem',
  maxWidth: 420,
};

const frameHintStyle: CSSProperties = {
  flexShrink: 0,
  margin: 0,
  padding: '0.5rem 1rem',
  fontSize: '0.75rem',
  color: 'var(--muted)',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
};

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 'min(380px, calc(100% - 24px))',
  maxHeight: 'calc(100% - 24px)',
  overflow: 'auto',
  padding: '1rem',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  zIndex: 2,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  resize: 'vertical',
  padding: '0.625rem 0.75rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  lineHeight: 1.5,
};

const shotButtonStyle: CSSProperties = {
  position: 'relative',
  display: 'block',
  width: '100%',
  padding: 0,
  border: '1px solid var(--border)',
  borderRadius: 6,
  overflow: 'hidden',
  cursor: 'crosshair',
  background: '#000',
};

const shotImgStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
  maxHeight: 220,
  objectFit: 'contain',
};

const pinStyle: CSSProperties = {
  position: 'absolute',
  width: 14,
  height: 14,
  marginLeft: -7,
  marginTop: -7,
  borderRadius: '50%',
  background: '#ef4444',
  border: '2px solid #fff',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
  pointerEvents: 'none',
};
