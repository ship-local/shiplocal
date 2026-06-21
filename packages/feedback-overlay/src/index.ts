import html2canvas from 'html2canvas';

interface OverlayConfig {
  tunnelId: string;
  apiUrl: string;
}

function getConfig(): OverlayConfig | null {
  const script = document.currentScript as HTMLScriptElement | null;
  const tunnelId = script?.dataset['tunnelId'];
  const apiUrl = script?.dataset['apiUrl'];

  if (!tunnelId || !apiUrl) return null;
  return { tunnelId, apiUrl };
}

const SCREENSHOT_PADDING_PX = 16;

function getPaddedCaptureRect(element: Element): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  const docWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
    window.innerWidth,
  );
  const docHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    window.innerHeight,
  );

  const left = rect.left + window.scrollX - SCREENSHOT_PADDING_PX;
  const top = rect.top + window.scrollY - SCREENSHOT_PADDING_PX;
  const right = rect.right + window.scrollX + SCREENSHOT_PADDING_PX;
  const bottom = rect.bottom + window.scrollY + SCREENSHOT_PADDING_PX;

  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const width = Math.min(docWidth, right) - x;
  const height = Math.min(docHeight, bottom) - y;

  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

async function captureScreenshot(
  element: Element,
  hideElements: HTMLElement[],
): Promise<string | undefined> {
  const previousVisibility = hideElements.map((node) => node.style.visibility);
  for (const node of hideElements) {
    node.style.visibility = 'hidden';
  }

  try {
    const captureRect = getPaddedCaptureRect(element);
    const canvas = await html2canvas(document.documentElement, {
      logging: false,
      useCORS: true,
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio, 2),
      x: captureRect.x,
      y: captureRect.y,
      width: captureRect.width,
      height: captureRect.height,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  } finally {
    hideElements.forEach((node, index) => {
      node.style.visibility = previousVisibility[index] ?? '';
    });
  }
}

function buildSelector(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    if (current.classList.length > 0) {
      part += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

function createStyles(): void {
  if (document.getElementById('shiplocal-overlay-styles')) return;

  const style = document.createElement('style');
  style.id = 'shiplocal-overlay-styles';
  style.textContent = `
    #shiplocal-feedback-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: #3b82f6; color: white; font-size: 22px; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    #shiplocal-feedback-btn.active { background: #1d4ed8; }
    .shiplocal-highlight { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; cursor: crosshair !important; }
    #shiplocal-modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    #shiplocal-modal {
      background: white; color: #111; border-radius: 12px; padding: 20px;
      width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    #shiplocal-modal textarea {
      width: 100%; min-height: 100px; margin: 12px 0; padding: 10px;
      border: 1px solid #ddd; border-radius: 8px; font: inherit; resize: vertical;
    }
    #shiplocal-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
    #shiplocal-modal-actions button {
      padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; font: inherit;
    }
    #shiplocal-submit { background: #3b82f6; color: white; }
    #shiplocal-cancel { background: #f4f4f5; color: #111; }
    #shiplocal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    #shiplocal-toast {
      position: fixed; bottom: 88px; left: 50%; z-index: 2147483647;
      transform: translateX(-50%) translateY(12px);
      max-width: min(420px, calc(100vw - 32px));
      padding: 12px 16px; border-radius: 10px;
      font: 14px/1.4 system-ui, sans-serif; color: #111;
      background: white; box-shadow: 0 8px 30px rgba(0,0,0,0.18);
      opacity: 0; pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #shiplocal-toast.visible {
      opacity: 1; transform: translateX(-50%) translateY(0);
    }
    #shiplocal-toast.shiplocal-toast--success { border-left: 4px solid #22c55e; }
    #shiplocal-toast.shiplocal-toast--error { border-left: 4px solid #ef4444; }
  `;
  document.head.appendChild(style);
}

function showToast(message: string, variant: 'success' | 'error'): void {
  document.getElementById('shiplocal-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'shiplocal-toast';
  toast.className = `shiplocal-toast--${variant}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => {
      toast.remove();
    }, 200);
  }, 4000);
}

function init(): void {
  const config = getConfig();
  if (!config) return;

  const { tunnelId, apiUrl } = config;

  createStyles();

  let pickMode = false;
  let highlighted: Element | null = null;

  const btn = document.createElement('button');
  btn.id = 'shiplocal-feedback-btn';
  btn.type = 'button';
  btn.title = 'Leave feedback';
  btn.textContent = '💬';
  document.body.appendChild(btn);

  function clearHighlight(): void {
    if (highlighted) {
      highlighted.classList.remove('shiplocal-highlight');
      highlighted = null;
    }
  }

  function setPickMode(enabled: boolean): void {
    pickMode = enabled;
    btn.classList.toggle('active', enabled);
    document.body.style.cursor = enabled ? 'crosshair' : '';
    if (!enabled) clearHighlight();
  }

  function openModal(element: Element, screenshot: string | undefined): void {
    const backdrop = document.createElement('div');
    backdrop.id = 'shiplocal-modal-backdrop';

    const modal = document.createElement('div');
    modal.id = 'shiplocal-modal';
    modal.innerHTML = `
      <strong>Leave feedback</strong>
      <p style="margin:8px 0 0;font-size:14px;color:#666">Describe what you'd like changed on this element.</p>
    `;

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'e.g. Make this button bigger';

    const actions = document.createElement('div');
    actions.id = 'shiplocal-modal-actions';

    const cancel = document.createElement('button');
    cancel.id = 'shiplocal-cancel';
    cancel.type = 'button';
    cancel.textContent = 'Cancel';

    const submit = document.createElement('button');
    submit.id = 'shiplocal-submit';
    submit.type = 'button';
    submit.textContent = 'Send feedback';

    actions.append(cancel, submit);
    modal.append(textarea, actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    cancel.onclick = () => {
      backdrop.remove();
    };

    submit.onclick = () => {
      void (async () => {
        submit.textContent = 'Sending…';
        submit.setAttribute('disabled', 'true');

        try {
          const rect = element.getBoundingClientRect();

          const response = await fetch(`${apiUrl}/api/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tunnelId,
              page: window.location.pathname + window.location.search,
              selector: buildSelector(element),
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              message: textarea.value.trim(),
              screenshot,
              metadata: {
                viewport: { width: window.innerWidth, height: window.innerHeight },
                userAgent: navigator.userAgent,
              },
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to send feedback');
          }

          backdrop.remove();
          showToast('Feedback sent. Thank you!', 'success');
        } catch {
          submit.textContent = 'Send feedback';
          submit.removeAttribute('disabled');
          showToast('Could not send feedback. Please try again.', 'error');
        }
      })();
    };
  }

  btn.onclick = () => {
    if (pickMode) {
      setPickMode(false);
    } else {
      setPickMode(true);
    }
  };

  document.addEventListener('mousemove', (event) => {
    if (!pickMode) return;
    const target = event.target as Element | null;
    if (!target || target === btn || target.closest('#shiplocal-modal-backdrop')) return;

    if (highlighted !== target) {
      clearHighlight();
      highlighted = target;
      target.classList.add('shiplocal-highlight');
    }
  });

  document.addEventListener(
    'click',
    (event) => {
      if (!pickMode) return;
      const target = event.target as Element | null;
      if (!target || target === btn || target.closest('#shiplocal-modal-backdrop')) return;

      event.preventDefault();
      event.stopPropagation();
      setPickMode(false);

      void (async () => {
        const screenshot = await captureScreenshot(target, [btn]);
        openModal(target, screenshot);
      })();
    },
    true,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
