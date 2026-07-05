import { collectCspPolicies, wouldCspAllowExternalScript } from './csp-script-check.js';

export interface OverlayInjectionOptions {
  responseHeaders?: Record<string, string | string[] | undefined>;
  documentOrigin?: string;
  forceInDev?: boolean;
}

export function isDevBundlerHtml(html: string): boolean {
  return /webpack-hmr|@vite\/client|@react-refresh|__turbopack|react-refresh\.js/i.test(html);
}

export function shouldInjectFeedbackOverlay(
  html: string,
  apiUrl: string,
  options?: OverlayInjectionOptions,
): boolean {
  if (html.includes('data-shiplocal-overlay')) return false;
  if (!options?.forceInDev && isDevBundlerHtml(html)) return false;

  const policies = collectCspPolicies(options?.responseHeaders ?? {}, html);
  const overlayScriptUrl = `${apiUrl.replace(/\/$/, '')}/overlay.js`;

  if (
    policies.length > 0 &&
    !wouldCspAllowExternalScript(overlayScriptUrl, policies, options?.documentOrigin)
  ) {
    return false;
  }

  return true;
}

export function injectFeedbackOverlay(
  html: string,
  tunnelId: string,
  apiUrl: string,
  options?: OverlayInjectionOptions,
): string {
  if (!shouldInjectFeedbackOverlay(html, apiUrl, options)) return html;

  const safeTunnelId = tunnelId.replace(/"/g, '');
  const safeApiUrl = apiUrl.replace(/"/g, '');
  const scriptTag = `<script src="${safeApiUrl}/overlay.js" data-shiplocal-overlay data-tunnel-id="${safeTunnelId}" data-api-url="${safeApiUrl}" defer></script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}</body>`);
  }

  return `${html}${scriptTag}`;
}

export function isHtmlResponse(contentType: string | string[] | undefined): boolean {
  if (!contentType) return false;
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  return value?.includes('text/html') ?? false;
}
