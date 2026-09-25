export class LinkDetector {
  private observer!: MutationObserver;
  private processedLinks: WeakSet<Element> = new WeakSet();

  init(): void {
    this.scanExistingLinks();
    this.observer = new MutationObserver((mutations) => this.handleMutation(mutations));
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  private scanExistingLinks(): void {
    const links = document.querySelectorAll('a[href]');
    this.processNewNodes(links);
  }

  private handleMutation(mutations: MutationRecord[]): void {
    const nodesToProcess: Element[] = [];
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.tagName === 'A' && el.hasAttribute('href')) {
              nodesToProcess.push(el);
            }
            const childLinks = el.querySelectorAll('a[href]');
            childLinks.forEach(child => nodesToProcess.push(child));
          }
        });
      }
    }
    if (nodesToProcess.length > 0) {
      this.processNewNodes(nodesToProcess as NodeListOf<Element>);
    }
  }

  private processNewNodes(nodes: NodeList | Element[]): void {
    const batch = Array.from(nodes) as HTMLAnchorElement[];
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        batch.forEach(el => this.processLink(el));
      });
    } else {
      setTimeout(() => {
        batch.forEach(el => this.processLink(el));
      }, 0);
    }
  }

  private processLink(el: HTMLAnchorElement): void {
    if (this.processedLinks.has(el) || el.hasAttribute('data-wss-scanned')) return;
    this.processedLinks.add(el);
    el.setAttribute('data-wss-scanned', 'true');

    const href = el.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    try {
      const url = new URL(href, window.location.href).href;
      const event = new CustomEvent('wss:link-detected', {
        detail: { url, element: el }
      });
      document.dispatchEvent(event);
    } catch {
      // Invalid URL
    }
  }

  getDetectedLinks(): HTMLAnchorElement[] {
    return Array.from(document.querySelectorAll('a[data-wss-scanned="true"]'));
  }
}
