(function () {
  'use strict';

  class LinkDetector {
    observer;
    processedLinks = /* @__PURE__ */ new WeakSet();
    init() {
      this.scanExistingLinks();
      this.observer = new MutationObserver((mutations) => this.handleMutation(mutations));
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
    destroy() {
      if (this.observer) this.observer.disconnect();
    }
    scanExistingLinks() {
      const links = document.querySelectorAll("a[href]");
      this.processNewNodes(links);
    }
    handleMutation(mutations) {
      const nodesToProcess = [];
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node;
              if (el.tagName === "A" && el.hasAttribute("href")) {
                nodesToProcess.push(el);
              }
              const childLinks = el.querySelectorAll("a[href]");
              childLinks.forEach((child) => nodesToProcess.push(child));
            }
          });
        }
      }
      if (nodesToProcess.length > 0) {
        this.processNewNodes(nodesToProcess);
      }
    }
    processNewNodes(nodes) {
      const batch = Array.from(nodes);
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          batch.forEach((el) => this.processLink(el));
        });
      } else {
        setTimeout(() => {
          batch.forEach((el) => this.processLink(el));
        }, 0);
      }
    }
    processLink(el) {
      if (this.processedLinks.has(el) || el.hasAttribute("data-wss-scanned")) return;
      this.processedLinks.add(el);
      el.setAttribute("data-wss-scanned", "true");
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      try {
        const url = new URL(href, window.location.href).href;
        const event = new CustomEvent("wss:link-detected", {
          detail: { url, element: el }
        });
        document.dispatchEvent(event);
      } catch {
      }
    }
    getDetectedLinks() {
      return Array.from(document.querySelectorAll('a[data-wss-scanned="true"]'));
    }
  }

  class HoverDetector {
    currentHoveredURL = null;
    hoverTimer = null;
    HOVER_DELAY_MS = 300;
    overlay;
    init(overlay) {
      this.overlay = overlay;
      document.addEventListener("mouseover", this.handleMouseOver.bind(this));
      document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    }
    destroy() {
      document.removeEventListener("mouseover", this.handleMouseOver.bind(this));
      document.removeEventListener("mouseout", this.handleMouseOut.bind(this));
      if (this.hoverTimer) clearTimeout(this.hoverTimer);
    }
    handleMouseOver(e) {
      const target = e.target;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
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
      }
    }
    handleMouseOut(e) {
      const related = e.relatedTarget;
      if (related && related.closest(".wss-popup")) {
        return;
      }
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      this.currentHoveredURL = null;
      this.overlay.hide();
    }
    analyzeURL(url, targetEl) {
      this.overlay.show(targetEl, url);
      chrome.runtime.sendMessage({ type: "ANALYZE_URL", payload: { url } }, (response) => {
        if (this.currentHoveredURL === url && response && response.success) {
          this.showPopup(url, response.result, targetEl);
        }
      });
    }
    showPopup(url, result, targetEl) {
      window.requestAnimationFrame(() => {
        if (this.currentHoveredURL === url) {
          this.overlay.update(result);
        }
      });
    }
  }

  class ClickInterceptor {
    pendingResults = /* @__PURE__ */ new Map();
    init() {
      document.addEventListener("click", this.handleClick.bind(this), { capture: true });
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "UPDATE_CACHE" && msg.payload?.url) {
          this.pendingResults.set(msg.payload.url, msg.payload.result);
        }
      });
    }
    destroy() {
      document.removeEventListener("click", this.handleClick.bind(this), { capture: true });
    }
    handleClick(e) {
      const target = e.target;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      try {
        const url = new URL(href, window.location.href).href;
        chrome.runtime.sendMessage({ type: "ANALYZE_URL", payload: { url } }, (response) => {
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
          } else if (cachedResult.riskLevel === "SUSPICIOUS") {
            console.warn(`[WSS] Suspicious URL clicked: ${url}`);
          }
        }
      } catch {
      }
    }
    showWarningPage(url, result) {
      const encodedUrl = encodeURIComponent(url);
      const warningUrl = chrome.runtime.getURL(`warning.html?url=${encodedUrl}&score=${result.score}`);
      window.location.href = warningUrl;
    }
    isHighRisk(result) {
      return result.score >= 75 || result.riskLevel === "HIGH";
    }
  }

  const URGENCY_KEYWORDS = [
    "urgent",
    "immediately",
    "act now",
    "expires",
    "expiring",
    "suspended",
    "locked",
    "compromised",
    "unauthorized",
    "verify now",
    "limited time",
    "account will be",
    "within 24 hours",
    "within 48 hours",
    "action required",
    "important notice",
    "security alert",
    "warning"
  ];
  const CREDENTIAL_REQUEST_KEYWORDS = [
    "enter your password",
    "confirm your password",
    "enter your credentials",
    "sign in to continue",
    "verify your identity",
    "update your payment",
    "enter your credit card",
    "confirm billing",
    "enter your otp",
    "enter your pin",
    "social security",
    "bank account number"
  ];

  function isValidHTTPURL(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  const BRAND_DATABASE = {
    google: ["google.com", "googleapis.com", "googlevideo.com", "youtube.com"],
    microsoft: ["microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com", "bing.com", "azure.com", "office365.com"],
    apple: ["apple.com", "icloud.com", "itunes.com"],
    paypal: ["paypal.com", "paypalobjects.com"],
    amazon: ["amazon.com", "aws.amazon.com", "amazonwebservices.com", "kindle.com", "audible.com"],
    facebook: ["facebook.com", "fb.com", "messenger.com", "meta.com"],
    instagram: ["instagram.com"],
    linkedin: ["linkedin.com"],
    netflix: ["netflix.com"],
    docusign: ["docusign.com", "docusign.net"],
    dropbox: ["dropbox.com", "dropboxusercontent.com"],
    twitter: ["twitter.com", "x.com", "t.co"],
    github: ["github.com", "githubusercontent.com", "githubassets.com"],
    adobe: ["adobe.com", "adobeaemcloud.com"],
    chase: ["chase.com", "jpmorganchase.com"],
    wellsfargo: ["wellsfargo.com"],
    bankofamerica: ["bankofamerica.com"],
    citibank: ["citi.com", "citibank.com"],
    irs: ["irs.gov"],
    usps: ["usps.com"],
    fedex: ["fedex.com"],
    ups: ["ups.com"],
    dhl: ["dhl.com"],
    ebay: ["ebay.com", "ebayimg.com"],
    shopify: ["shopify.com"],
    stripe: ["stripe.com"],
    zoom: ["zoom.us"],
    slack: ["slack.com"],
    discord: ["discord.com", "discordapp.com"],
    steam: ["steampowered.com", "steamcommunity.com"]
  };

  class WebpageAnalyzer {
    analyze() {
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
        score: 0
      };
    }
    detectLoginForms() {
      return document.querySelectorAll('form input[type="password"], form input[name*="user"]').length > 0;
    }
    detectPasswordFields() {
      return document.querySelectorAll('input[type="password"]').length > 0;
    }
    detectOTPFields() {
      return document.querySelectorAll(
        'input[name*="otp"], input[name*="pin"], input[autocomplete="one-time-code"]'
      ).length > 0;
    }
    detectCreditCardFields() {
      return document.querySelectorAll(
        'input[name*="card"], input[name*="ccv"], input[name*="cvv"], input[autocomplete*="cc-"]'
      ).length > 0;
    }
    detectBankingFields() {
      return document.querySelectorAll(
        'input[name*="account"], input[name*="routing"], input[name*="iban"], input[name*="swift"]'
      ).length > 0;
    }
    detectUrgencyLanguage() {
      try {
        const text = (document.body.innerText || "").toLowerCase();
        return URGENCY_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
      } catch (_e) {
        return false;
      }
    }
    detectFakeWarnings() {
      try {
        const text = (document.body.innerText || "").toLowerCase();
        const patterns = [
          "your computer has a virus",
          "call microsoft support",
          "windows defender alert",
          "your device is infected",
          "call apple support"
        ];
        return patterns.some((p) => text.includes(p));
      } catch (_e) {
        return false;
      }
    }
    detectSuspiciousDownloads() {
      const links = document.querySelectorAll('a[href$=".exe"], a[href$=".apk"], a[href$=".scr"], a[href$=".bat"], a[href$=".ps1"]');
      return links.length > 0;
    }
    detectHiddenIframes() {
      const iframes = document.querySelectorAll("iframe");
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        try {
          const style = window.getComputedStyle(iframe);
          if (style.display === "none" || style.visibility === "hidden" || style.width === "0px" || style.height === "0px" || style.opacity === "0") {
            return true;
          }
        } catch (_e) {
        }
      }
      return false;
    }
    detectSuspiciousScripts() {
      const scripts = document.querySelectorAll("script[src]");
      let externalCount = 0;
      const currentHostname = window.location.hostname;
      scripts.forEach((s) => {
        try {
          const src = s.getAttribute("src") || "";
          if (src.startsWith("http")) {
            const srcHostname = new URL(src).hostname;
            if (srcHostname && srcHostname !== currentHostname) {
              externalCount++;
            }
          }
        } catch (_e) {
        }
      });
      return externalCount > 8;
    }
    detectBrandMismatch() {
      try {
        const title = document.title || "";
        const h1Text = document.querySelector("h1")?.innerText || "";
        const text = (title + " " + h1Text).toLowerCase();
        const currentHostname = window.location.hostname.toLowerCase();
        for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
          if (text.includes(brand)) {
            const isLegit = legitimateDomains.some((d) => currentHostname === d || currentHostname.endsWith("." + d));
            if (!isLegit) {
              return { brandMismatch: true, detectedBrand: brand };
            }
          }
        }
      } catch (_e) {
      }
      return { brandMismatch: false, detectedBrand: null };
    }
    countSensitiveFields() {
      return document.querySelectorAll(
        'input[type="password"], input[name*="card"], input[name*="account"], input[name*="cvv"], input[name*="pin"]'
      ).length;
    }
    analyzeLinks() {
      const links = document.querySelectorAll("a[href]");
      let external = 0;
      let suspicious = 0;
      const currentHostname = window.location.hostname;
      links.forEach((l) => {
        try {
          const href = l.getAttribute("href") || "";
          if (!href || href.startsWith("#")) return;
          const resolved = new URL(href, window.location.href);
          if (resolved.hostname && resolved.hostname !== currentHostname) {
            external++;
          }
          if (!isValidHTTPURL(resolved.href)) {
            suspicious++;
          }
        } catch (_e) {
        }
      });
      return { externalLinks: external, suspiciousLinks: suspicious };
    }
  }

  class EmailDetector {
    platform = "none";
    observer;
    init() {
      this.platform = this.detectPlatform();
      if (this.platform !== "none") {
        this.observer = new MutationObserver(() => this.handleMutation());
        this.observer.observe(document.body, { childList: true, subtree: true });
      }
    }
    destroy() {
      if (this.observer) this.observer.disconnect();
    }
    detectPlatform() {
      const host = window.location.hostname;
      if (host.includes("mail.google.com")) return "gmail";
      if (host.includes("outlook.live.com") || host.includes("outlook.office.com") || host.includes("outlook.office365.com")) return "outlook";
      if (host.includes("mail.yahoo.com")) return "yahoo";
      if (host.includes("mail.proton.me")) return "protonmail";
      return "none";
    }
    handleMutation() {
      if (this.platform !== "none") {
        const result = this.analyzeCurrentEmail();
        if (result) {
          chrome.runtime.sendMessage({ type: "ANALYZE_EMAIL", payload: result });
        }
      }
    }
    analyzeCurrentEmail() {
      switch (this.platform) {
        case "gmail":
          return this.analyzeGmail();
        case "outlook":
          return this.analyzeOutlook();
        case "yahoo":
          return this.analyzeYahoo();
        default:
          return null;
      }
    }
    analyzeGmail() {
      const senderEl = document.querySelector(".gD");
      const subjectEl = document.querySelector(".hP");
      const bodyEl = document.querySelector(".a3s.aiL") || document.querySelector(".ii.gt");
      if (!senderEl || !bodyEl) return null;
      const displayName = senderEl.getAttribute("name") || senderEl.textContent || "";
      const emailAddress = senderEl.getAttribute("email") || "";
      const subject = subjectEl?.textContent || "";
      const bodyText = bodyEl.textContent || "";
      return {
        platform: "gmail",
        sender: emailAddress,
        displayName,
        replyTo: null,
        subject,
        hasDisplayNameMismatch: this.checkDisplayNameMismatch(displayName, emailAddress),
        hasDomainMismatch: false,
        hasUrgencyLanguage: this.detectUrgencyLanguage(bodyText),
        hasCredentialRequest: this.detectCredentialRequest(bodyText),
        hasPaymentRequest: this.detectPaymentRequest(bodyText),
        hasThreatLanguage: this.detectThreatLanguage(bodyText),
        hasSuspiciousAttachment: false,
        links: this.extractLinksFromEmail(bodyEl),
        indicators: [],
        score: 0
      };
    }
    analyzeOutlook() {
      return null;
    }
    analyzeYahoo() {
      return null;
    }
    extractLinksFromEmail(emailBody) {
      const links = [];
      const anchors = emailBody.querySelectorAll("a[href]");
      anchors.forEach((a) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("http")) {
          const img = a.querySelector("img");
          if (!img || img.width > 1 || img.height > 1) {
            links.push(href);
          }
        }
      });
      return links;
    }
    checkDisplayNameMismatch(displayName, emailAddress) {
      if (!displayName || displayName === emailAddress) return false;
      return displayName.includes("@") && displayName !== emailAddress;
    }
    checkDomainMismatch(fromEmail, replyTo) {
      if (!replyTo) return false;
      const fromDomain = fromEmail.split("@")[1];
      const replyDomain = replyTo.split("@")[1];
      return fromDomain !== replyDomain;
    }
    detectUrgencyLanguage(text) {
      const lower = text.toLowerCase();
      return URGENCY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
    }
    detectCredentialRequest(text) {
      const lower = text.toLowerCase();
      return CREDENTIAL_REQUEST_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
    }
    detectPaymentRequest(text) {
      const lower = text.toLowerCase();
      return ["invoice", "payment", "wire transfer", "gift card", "bitcoin"].some((kw) => lower.includes(kw));
    }
    detectThreatLanguage(text) {
      const lower = text.toLowerCase();
      return ["suspend", "terminate", "close your account", "legal action"].some((kw) => lower.includes(kw));
    }
  }

  class SecurityOverlay {
    host;
    shadow;
    state = "hidden";
    mode = "compact";
    currentResult = null;
    currentUrl = "";
    constructor() {
      this.host = document.createElement("div");
      this.host.id = "wss-overlay-host";
      this.host.style.cssText = [
        "position: fixed",
        "z-index: 2147483647",
        "top: 0",
        "left: 0",
        "pointer-events: none",
        "opacity: 0",
        "transition: opacity 0.15s ease",
        "will-change: transform, opacity"
      ].join(";");
      this.shadow = this.host.attachShadow({ mode: "open" });
      document.body.appendChild(this.host);
      this.host.addEventListener("mouseenter", () => {
        this.host.style.pointerEvents = "auto";
      });
      this.host.addEventListener("mouseleave", () => {
        this.host.style.pointerEvents = "none";
        this.hide();
      });
      this.host.addEventListener("click", (e) => {
        e.stopPropagation();
        this.mode = this.mode === "compact" ? "expanded" : "compact";
        this.render();
      });
    }
    show(targetEl, url) {
      this.currentUrl = url;
      this.state = "loading";
      this.mode = "compact";
      this.render();
      this.position(targetEl);
      this.host.style.opacity = "1";
      this.host.style.pointerEvents = "auto";
    }
    update(result) {
      this.currentResult = result;
      this.state = "ready";
      this.render();
    }
    hide() {
      this.state = "hidden";
      this.host.style.opacity = "0";
      this.host.style.pointerEvents = "none";
      this.currentResult = null;
    }
    expand() {
      this.mode = "expanded";
      this.render();
    }
    collapse() {
      this.mode = "compact";
      this.render();
    }
    destroy() {
      if (this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
    }
    render() {
      if (this.state === "hidden") return;
      this.shadow.innerHTML = "";
      const style = document.createElement("style");
      style.textContent = this.getStyles();
      this.shadow.appendChild(style);
      const container = document.createElement("div");
      container.className = "wss-popup " + this.mode;
      if (this.state === "loading") {
        container.innerHTML = this.renderLoading();
      } else if (this.state === "ready" && this.currentResult) {
        container.innerHTML = this.renderResult(this.currentResult);
      }
      this.shadow.appendChild(container);
    }
    renderLoading() {
      let domain = "";
      try {
        domain = new URL(this.currentUrl).hostname;
      } catch (_e) {
      }
      return '<div class="wss-header"><span class="wss-shield">🛡</span><span class="wss-title">Link Security</span></div><div class="wss-domain">' + this.escapeHtml(domain) + '</div><div class="wss-risk wss-unknown"><span class="wss-spinner"></span><span class="wss-level">Analyzing...</span></div>';
    }
    renderResult(result) {
      const levelClass = "wss-" + result.riskLevel.toLowerCase();
      const emoji = this.getRiskEmoji(result.riskLevel);
      const label = this.getRiskLabel(result.riskLevel);
      let html = '<div class="wss-header"><span class="wss-shield">🛡</span><span class="wss-title">Link Security</span></div><div class="wss-domain">' + this.escapeHtml(result.domain) + '</div><div class="wss-risk ' + levelClass + '"><span class="wss-emoji">' + emoji + '</span><span class="wss-level">' + label + '</span></div><div class="wss-score">Risk Score: ' + result.score + "/100</div>";
      if (result.indicators.length > 0) {
        html += '<div class="wss-hint">Click for details</div>';
      }
      if (this.mode === "expanded" && result.indicators.length > 0) {
        html += '<div class="wss-indicators">';
        for (const ind of result.indicators.slice(0, 5)) {
          html += '<div class="wss-indicator">⚠ ' + this.escapeHtml(ind.message) + "</div>";
        }
        html += "</div>";
      }
      return html;
    }
    getRiskEmoji(level) {
      const map = {
        LOW: "🟢",
        // 🟢
        UNKNOWN: "⚪",
        // ⚪
        SUSPICIOUS: "🟠",
        // 🟠
        HIGH: "🔴"
        // 🔴
      };
      return map[level] || "⚪";
    }
    getRiskLabel(level) {
      const map = {
        LOW: "LOW RISK",
        UNKNOWN: "UNKNOWN",
        SUSPICIOUS: "SUSPICIOUS",
        HIGH: "HIGH RISK"
      };
      return map[level] || "UNKNOWN";
    }
    escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    getStyles() {
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
    position(targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const popupWidth = this.mode === "expanded" ? 300 : 220;
      const popupHeight = 160;
      const margin = 10;
      let left = rect.right + margin;
      let top = rect.bottom + margin;
      if (left + popupWidth > window.innerWidth - margin) {
        left = rect.left - popupWidth - margin;
        if (left < margin) left = margin;
      }
      if (top + popupHeight > window.innerHeight - margin) {
        top = rect.top - popupHeight - margin;
        if (top < margin) top = margin;
      }
      window.scrollX || document.documentElement.scrollLeft;
      window.scrollY || document.documentElement.scrollTop;
      this.host.style.transform = `translate(${left}px, ${top}px)`;
    }
  }

  (function() {
    if (window.__wss_initialized) return;
    window.__wss_initialized = true;
    let linkDetector;
    let hoverDetector;
    let clickInterceptor;
    let webpageAnalyzer;
    let emailDetector;
    let securityOverlay;
    async function init() {
      const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      const settings = response || {};
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
        chrome.runtime.sendMessage({ type: "ANALYZE_PAGE", payload: analysis });
      }
      if (settings.enableEmailAnalysis) {
        emailDetector = new EmailDetector();
        emailDetector.init();
      }
      if (settings.showPageBadge) ;
    }
    function handleUrlChange() {
      if (webpageAnalyzer) {
        const analysis = webpageAnalyzer.analyze();
        chrome.runtime.sendMessage({ type: "ANALYZE_PAGE", payload: analysis });
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
    }, 1e3);
    window.addEventListener("popstate", () => {
      lastUrl = location.href;
      handleUrlChange();
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "PAGE_ANALYSIS_COMPLETE") ;
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();

})();
//# sourceMappingURL=content.js.map
