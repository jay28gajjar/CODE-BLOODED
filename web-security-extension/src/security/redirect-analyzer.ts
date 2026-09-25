import { ThreatIndicator } from '../types/security';
import { REDIRECT_PARAMS } from '../types/url';
import { parseURL } from '../utils/url-utils';

export interface RedirectAnalysis {
  hasRedirect: boolean;
  redirectTarget: string | null;
  isSafeRedirect: boolean;
  indicators: ThreatIndicator[];
}

export function analyzeRedirects(url: string): RedirectAnalysis {
  const indicators: ThreatIndicator[] = [];
  const parsed = parseURL(url);
  
  if (!parsed) {
    return { hasRedirect: false, redirectTarget: null, isSafeRedirect: true, indicators };
  }

  const queryParams = new URLSearchParams(parsed.query);
  let redirectTarget: string | null = null;
  let hasRedirect = false;

  for (const param of REDIRECT_PARAMS || []) {
    if (queryParams.has(param)) {
      const val = queryParams.get(param);
      if (val) {
        try {
          const decoded = decodeURIComponent(val);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            hasRedirect = true;
            redirectTarget = decoded;
            break;
          }
        } catch {
          // ignore decoding errors
        }
      }
    }
  }

  let isSafeRedirect = true;

  if (hasRedirect && redirectTarget) {
    const targetParsed = parseURL(redirectTarget);
    if (targetParsed) {
      if (targetParsed.domain !== parsed.domain) {
        isSafeRedirect = false;
        indicators.push({
          code: 'CROSS_DOMAIN_REDIRECT',
          message: 'URL redirects to a different domain',
          score: 25
        });
      }
    }
  }

  return {
    hasRedirect,
    redirectTarget,
    isSafeRedirect,
    indicators
  };
}
