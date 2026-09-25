import { WebpageAnalysis, URGENCY_KEYWORDS } from '../types/webpage';
import { isValidHTTPURL } from '../utils/url-utils';
import { detectBrandImpersonation, BRAND_DATABASE } from '../security/brand-detector';

export class WebpageAnalyzer {
  analyze(): WebpageAnalysis {
    const url = window.location.href;
    const domain = window.location.hostname;
    const brandMismatchInfo = this.detectBrandMismatch();
    const linkInfo = this.analyzeLinks();

    return {
      url,
      domain,
      hasLoginForm: this.detectLoginForms(),
      hasPasswordField: this.detectPasswordFields(),
      hasOTPField: this.detectOTPFields(),
      hasCreditCardField: this.detectCreditCardFields(),
      hasBankingField: this.detectBankingFields(),
      hasUrgencyLanguage: this.detectUrgencyLanguage(),
      hasFakeWarnings: this.detectFakeWarnings(),
      hasSuspiciousDownload: this.detectSuspiciousDownloads(),
      hasHiddenIframes: this.detectHiddenIframes(),
      hasSuspiciousScripts: this.detectSuspiciousScripts(),
      brandMismatch: brandMismatchInfo.brandMismatch,
      detectedBrand: brandMismatchInfo.detectedBrand,
      sensitiveFieldCount: this.countSensitiveFields(),
      externalLinks: linkInfo.externalLinks,
      suspiciousLinks: linkInfo.suspiciousLinks,
      indicators: [],
      score: 0,
    };
  }

  private detectLoginForms(): boolean {
    return document.querySelectorAll('form input[type="password"], form input[name*="user"]').length > 0;
  }

  private detectPasswordFields(): boolean {
    return document.querySelectorAll('input[type="password"]').length > 0;
  }

  private detectOTPFields(): boolean {
    return document.querySelectorAll(
      'input[name*="otp"], input[name*="pin"], input[autocomplete="one-time-code"]'
    ).length > 0;
  }

  private detectCreditCardFields(): boolean {
    return document.querySelectorAll(
      'input[name*="card"], input[name*="ccv"], input[name*="cvv"], input[autocomplete*="cc-"]'
    ).length > 0;
  }

  private detectBankingFields(): boolean {
    return document.querySelectorAll(
      'input[name*="account"], input[name*="routing"], input[name*="iban"], input[name*="swift"]'
    ).length > 0;
  }

  private detectUrgencyLanguage(): boolean {
    try {
      const text = (document.body.innerText || '').toLowerCase();
      return URGENCY_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
    } catch (_e) {
      return false;
    }
  }

  private detectFakeWarnings(): boolean {
    try {
      const text = (document.body.innerText || '').toLowerCase();
      const patterns = [
        'your computer has a virus',
        'call microsoft support',
        'windows defender alert',
        'your device is infected',
        'call apple support',
      ];
      return patterns.some(p => text.includes(p));
    } catch (_e) {
      return false;
    }
  }

  private detectSuspiciousDownloads(): boolean {
    const links = document.querySelectorAll('a[href$=".exe"], a[href$=".apk"], a[href$=".scr"], a[href$=".bat"], a[href$=".ps1"]');
    return links.length > 0;
  }

  private detectHiddenIframes(): boolean {
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i] as HTMLIFrameElement;
      try {
        const style = window.getComputedStyle(iframe);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.width === '0px' ||
          style.height === '0px' ||
          style.opacity === '0'
        ) {
          return true;
        }
      } catch (_e) { /* ignore cross-origin iframes */ }
    }
    return false;
  }

  private detectSuspiciousScripts(): boolean {
    const scripts = document.querySelectorAll('script[src]');
    let externalCount = 0;
    const currentHostname = window.location.hostname;
    scripts.forEach(s => {
      try {
        const src = s.getAttribute('src') || '';
        if (src.startsWith('http')) {
          const srcHostname = new URL(src).hostname;
          if (srcHostname && srcHostname !== currentHostname) {
            externalCount++;
          }
        }
      } catch (_e) { /* ignore */ }
    });
    return externalCount > 8; // > 8 external scripts is suspicious
  }

  private detectBrandMismatch(): { brandMismatch: boolean; detectedBrand: string | null } {
    try {
      const title = document.title || '';
      const h1Text = (document.querySelector('h1') as HTMLElement)?.innerText || '';
      const text = (title + ' ' + h1Text).toLowerCase();
      const currentHostname = window.location.hostname.toLowerCase();

      // Check if any brand name appears in the page content
      for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
        if (text.includes(brand)) {
          // Check if the current domain is one of the legitimate domains
          const isLegit = legitimateDomains.some(d => currentHostname === d || currentHostname.endsWith('.' + d));
          if (!isLegit) {
            return { brandMismatch: true, detectedBrand: brand };
          }
        }
      }
    } catch (_e) { /* ignore */ }

    return { brandMismatch: false, detectedBrand: null };
  }

  private countSensitiveFields(): number {
    return document.querySelectorAll(
      'input[type="password"], input[name*="card"], input[name*="account"], input[name*="cvv"], input[name*="pin"]'
    ).length;
  }

  private analyzeLinks(): { externalLinks: number; suspiciousLinks: number } {
    const links = document.querySelectorAll('a[href]');
    let external = 0;
    let suspicious = 0;
    const currentHostname = window.location.hostname;

    links.forEach(l => {
      try {
        const href = (l as HTMLAnchorElement).getAttribute('href') || '';
        if (!href || href.startsWith('#')) return;
        const resolved = new URL(href, window.location.href);
        if (resolved.hostname && resolved.hostname !== currentHostname) {
          external++;
        }
        if (!isValidHTTPURL(resolved.href)) {
          suspicious++;
        }
      } catch (_e) { /* ignore malformed links */ }
    });

    return { externalLinks: external, suspiciousLinks: suspicious };
  }
}
