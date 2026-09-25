import { LinkDetector } from './link-detector';
import { HoverDetector } from './hover-detector';
import { ClickInterceptor } from './click-interceptor';
import { WebpageAnalyzer } from './webpage-analyzer';
import { EmailDetector } from './email-detector';
import { SecurityOverlay } from './security-overlay';
import { ExtensionSettings, ExtensionMessage } from '../types/security';

(function () {
  if ((window as any).__wss_initialized) return;
  (window as any).__wss_initialized = true;

  let linkDetector: LinkDetector;
  let hoverDetector: HoverDetector;
  let clickInterceptor: ClickInterceptor;
  let webpageAnalyzer: WebpageAnalyzer;
  let emailDetector: EmailDetector;
  let securityOverlay: SecurityOverlay;

  async function init() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings: ExtensionSettings = response || {};

    securityOverlay = new SecurityOverlay();

    if (settings.enableURLProtection) {
      linkDetector = new LinkDetector();
      linkDetector.init();
    }

    if (settings.enableHoverAnalysis) {
      hoverDetector = new HoverDetector();
      hoverDetector.init(securityOverlay);
    }

    if (settings.enableClickWarnings) {
      clickInterceptor = new ClickInterceptor();
      clickInterceptor.init();
    }

    if (settings.enableWebpageAnalysis) {
      webpageAnalyzer = new WebpageAnalyzer();
      const analysis = webpageAnalyzer.analyze();
      chrome.runtime.sendMessage({ type: 'ANALYZE_PAGE', payload: analysis });
    }

    if (settings.enableEmailAnalysis) {
      emailDetector = new EmailDetector();
      emailDetector.init();
    }

    if (settings.showPageBadge) {
      // Inject page badge logic
    }
  }

  function handleUrlChange() {
    if (webpageAnalyzer) {
      const analysis = webpageAnalyzer.analyze();
      chrome.runtime.sendMessage({ type: 'ANALYZE_PAGE', payload: analysis });
    }
    if (emailDetector) {
      emailDetector.destroy();
      emailDetector.init();
    }
  }

  let lastUrl = location.href;
  setInterval(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      handleUrlChange();
    }
  }, 1000);

  window.addEventListener('popstate', () => {
    lastUrl = location.href;
    handleUrlChange();
  });

  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'PAGE_ANALYSIS_COMPLETE') {
      // Handle page analysis complete
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
