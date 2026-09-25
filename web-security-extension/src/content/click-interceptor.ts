import { SecurityResult } from '../types/security';

export class ClickInterceptor {
  private pendingResults: Map<string, SecurityResult> = new Map();

  init(): void {
    document.addEventListener('click', this.handleClick.bind(this), { capture: true });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CACHE' && msg.payload?.url) {
        this.pendingResults.set(msg.payload.url, msg.payload.result);
      }
    });
  }

  destroy(): void {
    document.removeEventListener('click', this.handleClick.bind(this), { capture: true });
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href]') as HTMLAnchorElement;
    
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    try {
      const url = new URL(href, window.location.href).href;
      
      // Attempt to retrieve result synchronously for interception
      // A more robust implementation would wait for background, but this requires synchronous caching
      chrome.runtime.sendMessage({ type: 'ANALYZE_URL', payload: { url } }, (response) => {
          if (response && response.success && this.isHighRisk(response.result)) {
             this.showWarningPage(url, response.result);
          }
      });
      
      const cachedResult = this.pendingResults.get(url);
      if (cachedResult) {
        if (this.isHighRisk(cachedResult)) {
          e.preventDefault();
          e.stopPropagation();
          this.showWarningPage(url, cachedResult);
        } else if (cachedResult.riskLevel === 'SUSPICIOUS') {
          console.warn(`[WSS] Suspicious URL clicked: ${url}`);
        }
      }
    } catch {
      // invalid URL
    }
  }

  private showWarningPage(url: string, result: SecurityResult): void {
    const encodedUrl = encodeURIComponent(url);
    const warningUrl = chrome.runtime.getURL(`warning.html?url=${encodedUrl}&score=${result.score}`);
    window.location.href = warningUrl;
  }

  private isHighRisk(result: SecurityResult): boolean {
    return result.score >= 75 || result.riskLevel === 'HIGH';
  }
}
