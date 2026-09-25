import { SecurityOverlay } from './security-overlay';
import { SecurityResult } from '../types/security';

export class HoverDetector {
  private currentHoveredURL: string | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly HOVER_DELAY_MS = 300;
  private overlay!: SecurityOverlay;

  init(overlay: SecurityOverlay): void {
    this.overlay = overlay;
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
  }

  destroy(): void {
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
  }

  private handleMouseOver(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href]') as HTMLAnchorElement;

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    try {
      const url = new URL(href, window.location.href).href;
      this.currentHoveredURL = url;
      
      if (this.hoverTimer) clearTimeout(this.hoverTimer);
      
      this.hoverTimer = setTimeout(() => {
        if (this.currentHoveredURL === url) {
          this.analyzeURL(url, anchor);
        }
      }, this.HOVER_DELAY_MS);
    } catch {
      // invalid URL
    }
  }

  private handleMouseOut(e: MouseEvent): void {
    const related = e.relatedTarget as HTMLElement;
    if (related && related.closest('.wss-popup')) {
      return; // Still in popup
    }
    
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.currentHoveredURL = null;
    this.overlay.hide();
  }

  private analyzeURL(url: string, targetEl: HTMLElement): void {
    this.overlay.show(targetEl, url);
    chrome.runtime.sendMessage({ type: 'ANALYZE_URL', payload: { url } }, (response) => {
      if (this.currentHoveredURL === url && response && response.success) {
        this.showPopup(url, response.result, targetEl);
      }
    });
  }

  private showPopup(url: string, result: SecurityResult, targetEl: HTMLElement): void {
    window.requestAnimationFrame(() => {
      if (this.currentHoveredURL === url) {
        this.overlay.update(result);
      }
    });
  }
}
