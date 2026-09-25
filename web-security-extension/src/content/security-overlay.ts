import { SecurityResult, RiskLevel } from '../types/security';

export type OverlayState = 'hidden' | 'loading' | 'ready';
export type DisplayMode = 'compact' | 'expanded';

export class SecurityOverlay {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private state: OverlayState = 'hidden';
  private mode: DisplayMode = 'compact';
  private currentResult: SecurityResult | null = null;
  private currentUrl: string = '';

  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'wss-overlay-host';
    this.host.style.cssText = [
      'position: fixed',
      'z-index: 2147483647',
      'top: 0',
      'left: 0',
      'pointer-events: none',
      'opacity: 0',
      'transition: opacity 0.15s ease',
      'will-change: transform, opacity',
    ].join(';');

    this.shadow = this.host.attachShadow({ mode: 'open' });
    document.body.appendChild(this.host);

    // Keep popup alive when mouse enters it
    this.host.addEventListener('mouseenter', () => {
      this.host.style.pointerEvents = 'auto';
    });
    this.host.addEventListener('mouseleave', () => {
      this.host.style.pointerEvents = 'none';
      this.hide();
    });
    // Toggle compact/expanded on click
    this.host.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mode = this.mode === 'compact' ? 'expanded' : 'compact';
      this.render();
    });
  }

  show(targetEl: HTMLElement, url: string): void {
    this.currentUrl = url;
    this.state = 'loading';
    this.mode = 'compact';
    this.render();
    this.position(targetEl);
    this.host.style.opacity = '1';
    this.host.style.pointerEvents = 'auto';
  }

  update(result: SecurityResult): void {
    this.currentResult = result;
    this.state = 'ready';
    this.render();
  }

  hide(): void {
    this.state = 'hidden';
    this.host.style.opacity = '0';
    this.host.style.pointerEvents = 'none';
    this.currentResult = null;
  }

  expand(): void {
    this.mode = 'expanded';
    this.render();
  }

  collapse(): void {
    this.mode = 'compact';
    this.render();
  }

  destroy(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
  }

  private render(): void {
    if (this.state === 'hidden') return;

    // Clear and re-render shadow DOM
    this.shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'wss-popup ' + this.mode;

    if (this.state === 'loading') {
      container.innerHTML = this.renderLoading();
    } else if (this.state === 'ready' && this.currentResult) {
      container.innerHTML = this.renderResult(this.currentResult);
    }

    this.shadow.appendChild(container);
  }

  private renderLoading(): string {
    let domain = '';
    try { domain = new URL(this.currentUrl).hostname; } catch (_e) { /* ignore */ }

    return (
      '<div class="wss-header">' +
        '<span class="wss-shield">\uD83D\uDEE1</span>' +
        '<span class="wss-title">Link Security</span>' +
      '</div>' +
      '<div class="wss-domain">' + this.escapeHtml(domain) + '</div>' +
      '<div class="wss-risk wss-unknown">' +
        '<span class="wss-spinner"></span>' +
        '<span class="wss-level">Analyzing...</span>' +
      '</div>'
    );
  }

  private renderResult(result: SecurityResult): string {
    const levelClass = 'wss-' + result.riskLevel.toLowerCase();
    const emoji = this.getRiskEmoji(result.riskLevel);
    const label = this.getRiskLabel(result.riskLevel);

    let html =
      '<div class="wss-header">' +
        '<span class="wss-shield">\uD83D\uDEE1</span>' +
        '<span class="wss-title">Link Security</span>' +
      '</div>' +
      '<div class="wss-domain">' + this.escapeHtml(result.domain) + '</div>' +
      '<div class="wss-risk ' + levelClass + '">' +
        '<span class="wss-emoji">' + emoji + '</span>' +
        '<span class="wss-level">' + label + '</span>' +
      '</div>' +
      '<div class="wss-score">Risk Score: ' + result.score + '/100</div>';

    if (result.indicators.length > 0) {
      html += '<div class="wss-hint">Click for details</div>';
    }

    if (this.mode === 'expanded' && result.indicators.length > 0) {
      html += '<div class="wss-indicators">';
      for (const ind of result.indicators.slice(0, 5)) {
        html += '<div class="wss-indicator">\u26A0 ' + this.escapeHtml(ind.message) + '</div>';
      }
      html += '</div>';
    }

    return html;
  }

  private getRiskEmoji(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      LOW: '\uD83D\uDFE2',       // 🟢
      UNKNOWN: '\u26AA',          // ⚪
      SUSPICIOUS: '\uD83D\uDFE0', // 🟠
      HIGH: '\uD83D\uDD34',       // 🔴
    };
    return map[level] || '\u26AA';
  }

  private getRiskLabel(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      LOW: 'LOW RISK',
      UNKNOWN: 'UNKNOWN',
      SUSPICIOUS: 'SUSPICIOUS',
      HIGH: 'HIGH RISK',
    };
    return map[level] || 'UNKNOWN';
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }

      .wss-popup {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: rgba(15, 23, 42, 0.97);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #f1f5f9;
        border-radius: 10px;
        padding: 12px 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
        line-height: 1.4;
      }
      .wss-popup.compact { width: 220px; }
      .wss-popup.expanded { width: 300px; }

      .wss-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .wss-shield { font-size: 14px; }

      .wss-domain {
        font-size: 12px;
        color: #cbd5e1;
        margin-bottom: 10px;
        word-break: break-all;
        font-weight: 500;
      }

      .wss-risk {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        padding: 7px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
        letter-spacing: 0.03em;
      }
      .wss-emoji { font-size: 16px; }
      .wss-level { font-size: 13px; }

      .wss-low    { background: rgba(34,197,94,0.15);  color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
      .wss-unknown{ background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }
      .wss-suspicious { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.35); }
      .wss-high   { background: rgba(239,68,68,0.15);  color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

      .wss-score {
        font-size: 11px;
        color: #64748b;
      }

      .wss-hint {
        font-size: 10px;
        color: #475569;
        margin-top: 4px;
        font-style: italic;
      }

      .wss-indicators {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.07);
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .wss-indicator {
        font-size: 11px;
        color: #fbbf24;
        line-height: 1.5;
      }

      .wss-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(148,163,184,0.3);
        border-top-color: #94a3b8;
        border-radius: 50%;
        animation: wss-spin 0.8s linear infinite;
      }

      @keyframes wss-spin {
        to { transform: rotate(360deg); }
      }
    `;
  }

  private position(targetEl: HTMLElement): void {
    const rect = targetEl.getBoundingClientRect();
    const popupWidth = this.mode === 'expanded' ? 300 : 220;
    const popupHeight = 160;
    const margin = 10;

    // Default: below and to the right of the element
    let left = rect.right + margin;
    let top = rect.bottom + margin;

    // Flip left if near right viewport edge
    if (left + popupWidth > window.innerWidth - margin) {
      left = rect.left - popupWidth - margin;
      if (left < margin) left = margin;
    }

    // Flip above if near bottom viewport edge
    if (top + popupHeight > window.innerHeight - margin) {
      top = rect.top - popupHeight - margin;
      if (top < margin) top = margin;
    }

    // Account for scroll position
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // Position is fixed so we use viewport coordinates directly
    void scrollLeft; void scrollTop; // fixed positioning uses viewport coords

    this.host.style.transform = `translate(${left}px, ${top}px)`;
  }
}
