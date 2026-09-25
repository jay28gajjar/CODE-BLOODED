(function () {
  'use strict';

  const URL_SHORTENER_DOMAINS = /* @__PURE__ */ new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "short.io",
    "tiny.cc",
    "lnkd.in",
    "buff.ly",
    "rebrand.ly",
    "yourls.org",
    "is.gd",
    "v.gd",
    "clck.ru",
    "cutt.ly",
    "rb.gy"
  ]);
  const SUSPICIOUS_PATH_KEYWORDS = [
    "login",
    "signin",
    "sign-in",
    "verify",
    "verification",
    "account",
    "password",
    "reset",
    "security",
    "confirm",
    "payment",
    "update",
    "suspend",
    "billing",
    "checkout",
    "banking",
    "secure",
    "recover",
    "unlock",
    "activate"
  ];
  const REDIRECT_PARAMS = [
    "url",
    "redirect",
    "redirect_url",
    "redirectUrl",
    "target",
    "next",
    "destination",
    "returnUrl",
    "return_url",
    "goto",
    "link",
    "to",
    "ref",
    "redir"
  ];

  function isIPAddress(hostname) {
    if (!hostname) return false;
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/;
    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
  }
  function isPunycode(hostname) {
    return typeof hostname === "string" && hostname.includes("xn--");
  }
  function extractRegisteredDomain(hostname) {
    if (!hostname || isIPAddress(hostname)) return hostname;
    const parts = hostname.toLowerCase().split(".");
    if (parts.length <= 1) return hostname;
    if (parts.length === 2) return hostname;
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    const doubleTlds = /* @__PURE__ */ new Set(["co", "com", "org", "net", "edu", "gov", "ac"]);
    if (doubleTlds.has(sld) && parts.length > 2) {
      return `${parts[parts.length - 3]}.${sld}.${tld}`;
    }
    return `${sld}.${tld}`;
  }
  function parseURL(url) {
    try {
      const isJavaScript = url.toLowerCase().trim().startsWith("javascript:");
      const isDataURL = url.toLowerCase().trim().startsWith("data:");
      let parsedObj;
      if (isJavaScript || isDataURL) {
        parsedObj = new URL(url);
      } else {
        try {
          parsedObj = new URL(url);
        } catch {
          parsedObj = new URL("http://" + url);
        }
      }
      const scheme = parsedObj.protocol.replace(":", "").toLowerCase();
      const domain = parsedObj.hostname;
      const registeredDomain = extractRegisteredDomain(domain);
      let subdomain = "";
      if (domain !== registeredDomain && !isIPAddress(domain)) {
        subdomain = domain.substring(0, domain.length - registeredDomain.length - 1);
      }
      const parts = registeredDomain.split(".");
      const tld = parts.length > 1 ? parts[parts.length - 1] : "";
      return {
        original: url,
        normalized: normalizeURL(url),
        scheme,
        domain,
        registeredDomain,
        subdomain,
        tld,
        path: parsedObj.pathname,
        query: parsedObj.search,
        fragment: parsedObj.hash,
        port: parsedObj.port ? parseInt(parsedObj.port, 10) : null,
        isIP: isIPAddress(domain),
        isPunycode: isPunycode(domain),
        isShortened: URL_SHORTENER_DOMAINS.has(registeredDomain.toLowerCase()),
        isDataURL,
        isJavaScript
      };
    } catch (e) {
      return null;
    }
  }
  function normalizeURL(url) {
    try {
      const parsed = new URL(url);
      parsed.protocol = parsed.protocol.toLowerCase();
      parsed.hostname = parsed.hostname.toLowerCase();
      let normalized = parsed.toString();
      if (normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
      }
      return decodeURI(normalized);
    } catch {
      return url.toLowerCase().replace(/\/$/, "");
    }
  }
  function isValidHTTPURL(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  function getURLKey(url) {
    return normalizeURL(url);
  }

  const DANGEROUS_SCHEMES = /* @__PURE__ */ new Set(["javascript:", "data:", "vbscript:"]);
  const SUSPICIOUS_EXTENSIONS = /* @__PURE__ */ new Set([".exe", ".bat", ".ps1", ".vbs", ".scr"]);
  function analyzeURL(url) {
    const parsedURL = parseURL(url);
    if (!parsedURL) return null;
    let schemeRisk = 0;
    const indicators = [];
    const scheme = parsedURL.scheme.toLowerCase() + ":";
    if (DANGEROUS_SCHEMES.has(scheme)) {
      schemeRisk = 100;
      indicators.push({ code: "DANGEROUS_SCHEME", message: `Dangerous scheme used: ${scheme}`, score: 100 });
    } else if (scheme === "ftp:") {
      schemeRisk = 20;
      indicators.push({ code: "INSECURE_SCHEME", message: "Insecure FTP scheme", score: 20 });
    } else if (scheme === "http:") {
      schemeRisk = 10;
      indicators.push({ code: "HTTP_SCHEME", message: "Insecure HTTP scheme", score: 10 });
    }
    let pathRisk = 0;
    const pathLower = parsedURL.path.toLowerCase();
    let keywordMatches = 0;
    for (const keyword of SUSPICIOUS_PATH_KEYWORDS || []) {
      if (pathLower.includes(keyword)) {
        keywordMatches++;
      }
    }
    if (keywordMatches > 0) {
      const risk = Math.min(keywordMatches * 10, 30);
      pathRisk += risk;
      indicators.push({ code: "SUSPICIOUS_PATH", message: "Path contains suspicious keywords", score: risk });
    }
    if (parsedURL.path.length > 100) {
      pathRisk += 5;
      indicators.push({ code: "LONG_PATH", message: "Path is unusually long", score: 5 });
    }
    const pathSegments = parsedURL.path.split("/").filter(Boolean);
    if (pathSegments.length > 8) {
      pathRisk += 5;
      indicators.push({ code: "EXCESSIVE_SEGMENTS", message: "Too many path segments", score: 5 });
    }
    if (/%[0-9a-f]{2}/i.test(parsedURL.path)) {
      pathRisk += 5;
      indicators.push({ code: "ENCODED_PATH", message: "Path contains encoded characters", score: 5 });
    }
    let structureRisk = 0;
    if (url.length > 200) {
      structureRisk += 10;
      indicators.push({ code: "URL_VERY_LONG", message: "URL is very long", score: 10 });
    } else if (url.length > 100) {
      structureRisk += 5;
      indicators.push({ code: "URL_LONG", message: "URL is long", score: 5 });
    }
    const queryParams = new URLSearchParams(parsedURL.query);
    const paramCount = Array.from(queryParams.keys()).length;
    if (paramCount > 8) {
      structureRisk += 5;
      indicators.push({ code: "EXCESSIVE_QUERY_PARAMS", message: "Too many query parameters", score: 5 });
    }
    for (const val of queryParams.values()) {
      if (val.startsWith("http://") || val.startsWith("https://")) {
        structureRisk += 25;
        indicators.push({ code: "NESTED_URL", message: "URL found in query parameter", score: 25 });
        break;
      }
    }
    for (const ext of SUSPICIOUS_EXTENSIONS) {
      if (pathLower.endsWith(ext)) {
        structureRisk += 30;
        indicators.push({ code: "SUSPICIOUS_EXTENSION", message: `Suspicious file extension: ${ext}`, score: 30 });
        break;
      }
    }
    let redirectRisk = 0;
    for (const param of REDIRECT_PARAMS || []) {
      if (queryParams.has(param)) {
        redirectRisk += 15;
        indicators.push({ code: "REDIRECT_PARAM", message: "Potential redirect parameter found", score: 15 });
        break;
      }
    }
    return {
      parsedURL,
      schemeRisk,
      pathRisk,
      structureRisk,
      redirectRisk,
      indicators
    };
  }

  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from(
      { length: a.length + 1 },
      () => Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            // substitution
            matrix[i][j - 1] + 1,
            // insertion
            matrix[i - 1][j] + 1
            // deletion
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }
  function extractDomainParts(hostname) {
    if (!hostname || isIPAddress(hostname) || hostname === "localhost") {
      return { subdomain: "", domain: hostname, tld: "" };
    }
    const parts = hostname.split(".");
    if (parts.length === 1) return { subdomain: "", domain: hostname, tld: "" };
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    const doubleTlds = /* @__PURE__ */ new Set(["co", "com", "org", "net", "edu", "gov", "ac"]);
    let registeredDomain = `${sld}.${tld}`;
    let subLength = 2;
    if (doubleTlds.has(sld) && parts.length > 2) {
      registeredDomain = `${parts[parts.length - 3]}.${sld}.${tld}`;
      subLength = 3;
    }
    let subdomain = "";
    if (parts.length > subLength) {
      subdomain = parts.slice(0, parts.length - subLength).join(".");
    }
    return {
      subdomain,
      domain: registeredDomain,
      tld: parts.slice(parts.length - (subLength - 1)).join(".")
    };
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
  function detectBrandImpersonation(registeredDomain, fullDomain) {
    for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
      if (legitimateDomains.includes(registeredDomain)) {
        return { brand, isLegitimate: true, similarity: 1, legitimateDomains };
      }
    }
    for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
      if (registeredDomain.includes(brand)) {
        return { brand, isLegitimate: false, similarity: 0.8, legitimateDomains };
      }
      const domainName = registeredDomain.split(".")[0];
      const distance = levenshteinDistance(domainName, brand);
      if (distance > 0 && distance <= 2 && brand.length > 3) {
        const similarity = 1 - distance / Math.max(brand.length, domainName.length);
        return { brand, isLegitimate: false, similarity, legitimateDomains };
      }
    }
    return null;
  }

  const SUSPICIOUS_TLDS = /* @__PURE__ */ new Set(["xyz", "top", "tk", "ml", "ga", "cf", "gq", "pw", "cc", "vip", "click"]);
  function analyzeDomain(hostname, port) {
    const parts = extractDomainParts(hostname);
    const registeredDomain = parts.domain || hostname;
    const subdomain = parts.subdomain;
    const tldMatch = registeredDomain.match(/\.([^.]+)$/);
    const tld = tldMatch ? tldMatch[1].toLowerCase() : "";
    let lengthRisk = 0;
    if (registeredDomain.length > 30) lengthRisk = 20;
    else if (registeredDomain.length > 20) lengthRisk = 10;
    let subdomainRisk = 0;
    const subdomainParts = subdomain ? subdomain.split(".") : [];
    if (subdomainParts.length > 4) subdomainRisk = 25;
    else if (subdomainParts.length > 3) subdomainRisk = 15;
    let hyphenRisk = 0;
    const hyphenCount = (registeredDomain.match(/-/g) || []).length;
    if (hyphenCount > 2) hyphenRisk = 15;
    let digitRisk = 0;
    if (/\d/.test(registeredDomain)) digitRisk = 8;
    let punycodeRisk = 0;
    if (hostname.includes("xn--")) punycodeRisk = 20;
    let ipRisk = 0;
    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
    if (isIP) ipRisk = 25;
    let portRisk = 0;
    if (port !== null && port !== 80 && port !== 443) portRisk = 10;
    let tldRisk = 0;
    if (SUSPICIOUS_TLDS.has(tld)) tldRisk = 15;
    const brandMatch = detectBrandImpersonation(registeredDomain);
    const indicators = [];
    if (brandMatch && !brandMatch.isLegitimate) {
      indicators.push({ code: "BRAND_IMPERSONATION", message: `Domain impersonates brand: ${brandMatch.brand}`, score: 35 });
    }
    if (lengthRisk > 0) indicators.push({ code: "DOMAIN_LENGTH", message: "Domain is suspiciously long", score: lengthRisk });
    if (subdomainRisk > 0) indicators.push({ code: "SUBDOMAIN_COUNT", message: "Too many subdomains", score: subdomainRisk });
    if (hyphenRisk > 0) indicators.push({ code: "HYPHEN_COUNT", message: "Multiple hyphens in domain", score: hyphenRisk });
    if (digitRisk > 0) indicators.push({ code: "DOMAIN_DIGITS", message: "Domain contains digits", score: digitRisk });
    if (punycodeRisk > 0) indicators.push({ code: "PUNYCODE", message: "Punycode encoding detected", score: punycodeRisk });
    if (ipRisk > 0) indicators.push({ code: "IP_ADDRESS", message: "Domain is an IP address", score: ipRisk });
    if (portRisk > 0) indicators.push({ code: "NON_STANDARD_PORT", message: "Uses a non-standard port", score: portRisk });
    if (tldRisk > 0) indicators.push({ code: "SUSPICIOUS_TLD", message: "Suspicious TLD used", score: tldRisk });
    return {
      domain: hostname,
      registeredDomain,
      lengthRisk,
      subdomainRisk,
      hyphenRisk,
      digitRisk,
      punycodeRisk,
      ipRisk,
      portRisk,
      tldRisk,
      brandMatch,
      indicators
    };
  }

  function analyzeURLForPhishing(url) {
    const urlAnalysis = analyzeURL(url);
    if (!urlAnalysis) return null;
    const domainAnalysis = analyzeDomain(urlAnalysis.parsedURL.domain, urlAnalysis.parsedURL.port);
    const combinedIndicators = [...urlAnalysis.indicators, ...domainAnalysis.indicators];
    let rawScore = combinedIndicators.reduce((sum, ind) => sum + ind.score, 0);
    const hasImpersonation = combinedIndicators.some((ind) => ind.code === "BRAND_IMPERSONATION");
    const hasLoginPath = combinedIndicators.some((ind) => ind.code === "SUSPICIOUS_PATH");
    const hasIP = combinedIndicators.some((ind) => ind.code === "IP_ADDRESS");
    const hasDangerousScheme = combinedIndicators.some((ind) => ind.code === "DANGEROUS_SCHEME");
    if (hasDangerousScheme) {
      rawScore = 100;
    } else {
      if (hasImpersonation && hasLoginPath) {
        rawScore += 20;
      }
      if (hasIP && hasLoginPath) {
        rawScore += 15;
      }
    }
    rawScore = Math.min(Math.max(rawScore, 0), 100);
    return {
      urlAnalysis,
      domainAnalysis,
      combinedIndicators,
      rawScore
    };
  }

  const DEFAULT_SETTINGS = {
    enableURLProtection: true,
    enableHoverAnalysis: true,
    enableClickWarnings: true,
    enableWebpageAnalysis: true,
    enableEmailAnalysis: true,
    enableSearchAnalysis: true,
    showPageBadge: false,
    enableLocalAnalysis: true,
    enableAIAnalysis: false,
    storeScanHistory: false,
    googleSafeBrowsingApiKey: "",
    virusTotalApiKey: "",
    aiProviderApiKey: "",
    aiProvider: "none",
    sensitivityLevel: "medium",
    protectedBrands: [
      "google",
      "microsoft",
      "apple",
      "paypal",
      "amazon",
      "facebook",
      "instagram",
      "linkedin",
      "netflix",
      "docusign",
      "dropbox",
      "twitter",
      "github",
      "adobe",
      "chase",
      "wellsfargo",
      "bankofamerica",
      "citibank",
      "irs",
      "usps",
      "fedex",
      "ups"
    ],
    riskThresholds: {
      suspicious: 50,
      high: 75
    }
  };

  function calculateRisk(input) {
    const settings = input.settings || DEFAULT_SETTINGS;
    let score = input.phishingAnalysis?.rawScore || 0;
    const indicators = input.phishingAnalysis?.combinedIndicators ? [...input.phishingAnalysis.combinedIndicators] : [];
    if (input.threatIntelResult?.isKnownMalicious) {
      score = 100;
      indicators.push({
        code: "THREAT_INTEL_MATCH",
        message: "Known malicious URL according to Threat Intelligence",
        score: 100
      });
    } else if (input.aiResult) {
      const aiScore = getScoreFromRiskLevel(input.aiResult.riskLevel);
      score = Math.round(score * 0.7 + aiScore * 0.3);
      input.aiResult.reasons.forEach((reason) => {
        indicators.push({
          code: "AI_INDICATOR",
          message: reason,
          score: aiScore * 0.3
        });
      });
    }
    score = Math.min(Math.max(score, 0), 100);
    let thresholdSuspicious = 50;
    let thresholdHigh = 75;
    if (settings && settings.sensitivityLevel) {
      switch (settings.sensitivityLevel) {
        case "low":
          thresholdSuspicious = 60;
          thresholdHigh = 80;
          break;
        case "high":
          thresholdSuspicious = 35;
          thresholdHigh = 60;
          break;
        case "medium":
        default:
          thresholdSuspicious = 50;
          thresholdHigh = 75;
          break;
      }
    }
    let riskLevel = "UNKNOWN";
    if (score < 20) {
      riskLevel = "LOW";
    } else if (score < thresholdSuspicious) {
      riskLevel = "UNKNOWN";
    } else if (score < thresholdHigh) {
      riskLevel = "SUSPICIOUS";
    } else {
      riskLevel = "HIGH";
    }
    const domain = input.phishingAnalysis?.domainAnalysis?.domain || new URL(input.url).hostname;
    return {
      url: input.url,
      domain,
      riskLevel,
      score,
      indicators,
      isCached: false,
      analyzedAt: Date.now(),
      threatIntelResult: input.threatIntelResult,
      aiResult: input.aiResult
    };
  }
  function getScoreFromRiskLevel(level) {
    switch (level) {
      case "HIGH":
        return 90;
      case "SUSPICIOUS":
        return 65;
      case "LOW":
        return 10;
      case "UNKNOWN":
        return 35;
      default:
        return 35;
    }
  }

  class ReputationCache {
    memoryCache;
    TTL_LOW_RISK = 30 * 60 * 1e3;
    TTL_UNKNOWN = 10 * 60 * 1e3;
    TTL_SUSPICIOUS = 5 * 60 * 1e3;
    TTL_HIGH = 2 * 60 * 1e3;
    MAX_MEMORY_SIZE = 500;
    loaded = false;
    constructor() {
      this.memoryCache = /* @__PURE__ */ new Map();
    }
    async loadFromStorage() {
      if (this.loaded || typeof chrome === "undefined" || !chrome.storage) return;
      try {
        const data = await chrome.storage.local.get("reputationCache");
        if (data.reputationCache) {
          const entries = JSON.parse(data.reputationCache);
          for (const entry of entries) {
            if (!this.isExpired(entry)) {
              this.memoryCache.set(entry.key, entry);
            }
          }
        }
        this.loaded = true;
      } catch (e) {
        console.warn("Failed to load reputation cache", e);
      }
    }
    async saveToStorage() {
      if (typeof chrome === "undefined" || !chrome.storage) return;
      try {
        const entries = Array.from(this.memoryCache.values()).filter((e) => !this.isExpired(e));
        await chrome.storage.local.set({ reputationCache: JSON.stringify(entries) });
      } catch (e) {
        console.warn("Failed to save reputation cache", e);
      }
    }
    async get(key) {
      await this.loadFromStorage();
      const entry = this.memoryCache.get(key);
      if (!entry) return null;
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        await this.saveToStorage();
        return null;
      }
      const result = { ...entry.result, isCached: true };
      return result;
    }
    async set(key, url, result) {
      await this.loadFromStorage();
      if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
        this.evictOldest();
      }
      const entry = {
        key,
        url,
        result: { ...result, isCached: true },
        timestamp: Date.now(),
        expiresAt: Date.now() + this.getTTL(result.riskLevel)
      };
      this.memoryCache.set(key, entry);
      await this.saveToStorage();
    }
    async clear() {
      this.memoryCache.clear();
      if (typeof chrome !== "undefined" && chrome.storage) {
        await chrome.storage.local.remove("reputationCache");
      }
    }
    isExpired(entry) {
      return Date.now() > entry.expiresAt;
    }
    getTTL(riskLevel) {
      switch (riskLevel) {
        case "HIGH":
          return this.TTL_HIGH;
        case "SUSPICIOUS":
          return this.TTL_SUSPICIOUS;
        case "LOW":
          return this.TTL_LOW_RISK;
        case "UNKNOWN":
          return this.TTL_UNKNOWN;
        default:
          return this.TTL_UNKNOWN;
      }
    }
    evictOldest() {
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }
  const reputationCache = new ReputationCache();

  class ThreatIntelAggregator {
    providers;
    constructor(providers) {
      this.providers = providers;
    }
    async checkURL(url, settings) {
      const available = this.providers.filter((p) => p.isAvailable(settings));
      if (available.length === 0) {
        return { isKnownMalicious: false, sources: [], confidence: 0 };
      }
      const results = await Promise.allSettled(
        available.map((p) => this.withTimeout(p.checkURL(url, settings), 5e3))
      );
      return this.aggregateResults(results);
    }
    async checkDomain(domain, settings) {
      const available = this.providers.filter((p) => p.isAvailable(settings));
      if (available.length === 0) {
        return { isKnownMalicious: false, sources: [], confidence: 0 };
      }
      const results = await Promise.allSettled(
        available.map((p) => this.withTimeout(p.checkDomain(domain, settings), 5e3))
      );
      return this.aggregateResults(results);
    }
    aggregateResults(results) {
      let isKnownMalicious = false;
      let confidence = 0;
      const sources = [];
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          if (result.value.isKnownMalicious) {
            isKnownMalicious = true;
            confidence = Math.max(confidence, result.value.confidence);
          }
          sources.push(...result.value.sources);
        }
      }
      return {
        isKnownMalicious,
        sources: Array.from(new Set(sources)),
        confidence
      };
    }
    withTimeout(promise, timeoutMs) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
      ]);
    }
  }

  class GoogleSafeBrowsingProvider {
    name = "Google Safe Browsing";
    isAvailable(settings) {
      return !!settings.googleSafeBrowsingApiKey;
    }
    async checkURL(url, settings) {
      const safeResult = { isKnownMalicious: false, sources: [], confidence: 0 };
      if (!this.isAvailable(settings)) return safeResult;
      try {
        const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${settings.googleSafeBrowsingApiKey}`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: {
              clientId: "web-security-extension",
              clientVersion: "1.0.0"
            },
            threatInfo: {
              threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url }]
            }
          })
        });
        if (!response.ok) {
          return safeResult;
        }
        const data = await response.json();
        if (data.matches && data.matches.length > 0) {
          return {
            isKnownMalicious: true,
            sources: [this.name],
            confidence: 100
          };
        }
        return safeResult;
      } catch (e) {
        return safeResult;
      }
    }
    async checkDomain(domain, settings) {
      return this.checkURL(`https://${domain}`, settings);
    }
  }

  class VirusTotalProvider {
    name = "VirusTotal";
    lastCallTime = 0;
    RATE_LIMIT_MS = 15e3;
    // 4 req per min = 15s per req
    isAvailable(settings) {
      return !!settings.virusTotalApiKey;
    }
    encodeUrl(url) {
      return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    async checkURL(url, settings) {
      const safeResult = { isKnownMalicious: false, sources: [], confidence: 0 };
      if (!this.isAvailable(settings)) return safeResult;
      const now = Date.now();
      if (now - this.lastCallTime < this.RATE_LIMIT_MS) {
        return safeResult;
      }
      this.lastCallTime = now;
      try {
        const urlId = this.encodeUrl(url);
        const apiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "x-apikey": settings.virusTotalApiKey,
            "Accept": "application/json"
          }
        });
        if (!response.ok) {
          return safeResult;
        }
        const data = await response.json();
        const stats = data.data?.attributes?.last_analysis_stats;
        if (stats && stats.malicious > 2) {
          return {
            isKnownMalicious: true,
            sources: [this.name],
            confidence: Math.min(100, stats.malicious * 10)
          };
        }
        return safeResult;
      } catch (e) {
        return safeResult;
      }
    }
    async checkDomain(domain, settings) {
      const safeResult = { isKnownMalicious: false, sources: [], confidence: 0 };
      if (!this.isAvailable(settings)) return safeResult;
      const now = Date.now();
      if (now - this.lastCallTime < this.RATE_LIMIT_MS) {
        return safeResult;
      }
      this.lastCallTime = now;
      try {
        const apiUrl = `https://www.virustotal.com/api/v3/domains/${domain}`;
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "x-apikey": settings.virusTotalApiKey,
            "Accept": "application/json"
          }
        });
        if (!response.ok) return safeResult;
        const data = await response.json();
        const stats = data.data?.attributes?.last_analysis_stats;
        if (stats && stats.malicious > 2) {
          return {
            isKnownMalicious: true,
            sources: [this.name],
            confidence: Math.min(100, stats.malicious * 10)
          };
        }
        return safeResult;
      } catch (e) {
        return safeResult;
      }
    }
  }

  const STORAGE_KEYS = {
    SETTINGS: "settings",
    HISTORY: "scanHistory",
    CACHE: "urlCache"
  };
  async function getSettings() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const stored = data[STORAGE_KEYS.SETTINGS] || {};
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch (error) {
      console.error("Failed to get settings", error);
      return DEFAULT_SETTINGS;
    }
  }
  async function saveSettings(settings) {
    try {
      const current = await getSettings();
      const updated = { ...current, ...settings };
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    } catch (error) {
      console.error("Failed to save settings", error);
    }
  }
  async function getScanHistory() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      return data[STORAGE_KEYS.HISTORY] || [];
    } catch (error) {
      console.error("Failed to get scan history", error);
      return [];
    }
  }
  async function addToHistory(entry) {
    try {
      const settings = await getSettings();
      if (!settings.storeScanHistory) return;
      const history = await getScanHistory();
      const newEntry = {
        ...entry,
        id: crypto.randomUUID()
      };
      const updated = [newEntry, ...history].slice(0, 500);
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
    } catch (error) {
      console.error("Failed to add to history", error);
    }
  }
  async function clearCache() {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.CACHE);
    } catch (error) {
      console.error("Failed to clear cache", error);
    }
  }

  const PREFIX = "[WebSecurityShield]";
  function shouldLogInfo() {
    try {
      return false;
    } catch {
      return true;
    }
  }
  class ConsoleLogger {
    contextPrefix = "";
    constructor(context) {
      if (context) {
        this.contextPrefix = `[${context}] `;
      }
    }
    debug(message, ...args) {
      if (shouldLogInfo()) {
        console.debug(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
      }
    }
    info(message, ...args) {
      if (shouldLogInfo()) {
        console.info(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
      }
    }
    warn(message, ...args) {
      console.warn(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
    }
    error(message, ...args) {
      console.error(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
    }
  }
  const logger = new ConsoleLogger();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case "ANALYZE_URL": {
            const payload = message.payload;
            const result = await handleAnalyzeURL(payload.url);
            sendResponse(result);
            break;
          }
          case "ANALYZE_PAGE":
          case "ANALYZE_EMAIL":
            sendResponse({ success: true, result: message.payload });
            break;
          case "GET_SETTINGS":
            sendResponse(await getSettings());
            break;
          case "SAVE_SETTINGS":
            await saveSettings(message.payload);
            sendResponse({ success: true });
            break;
          case "CLEAR_CACHE":
            await clearCache();
            sendResponse({ success: true });
            break;
          case "GET_HISTORY":
            sendResponse(await getScanHistory());
            break;
          default:
            sendResponse({ success: false, error: "Unknown message type" });
        }
      } catch (error) {
        logger.error("Error handling message:", error);
        sendResponse({ success: false, error: String(error) });
      }
    })();
    return true;
  });
  async function handleAnalyzeURL(url) {
    if (!isValidHTTPURL(url)) {
      return { success: false, error: "Invalid HTTP URL" };
    }
    const cacheKey = getURLKey(url);
    const cached = await reputationCache.get(cacheKey);
    if (cached) {
      return { success: true, result: { ...cached, isCached: true } };
    }
    const settings = await getSettings();
    const phishingAnalysis = analyzeURLForPhishing(url);
    let result = calculateRisk({
      url,
      phishingAnalysis: phishingAnalysis ?? void 0,
      settings
    });
    if (settings.googleSafeBrowsingApiKey || settings.virusTotalApiKey) {
      try {
        const providers = [];
        if (settings.googleSafeBrowsingApiKey) providers.push(new GoogleSafeBrowsingProvider());
        if (settings.virusTotalApiKey) providers.push(new VirusTotalProvider());
        const aggregator = new ThreatIntelAggregator(providers);
        const threatIntel = await aggregator.checkURL(url, settings);
        if (threatIntel.isKnownMalicious) {
          result = calculateRisk({
            url,
            phishingAnalysis: phishingAnalysis ?? void 0,
            threatIntelResult: threatIntel,
            settings
          });
        }
      } catch (err) {
        logger.error("Threat intelligence check failed:", err);
      }
    }
    await reputationCache.set(cacheKey, url, result);
    if (settings.storeScanHistory) {
      const entry = {
        url: result.url,
        domain: result.domain,
        riskLevel: result.riskLevel,
        score: result.score,
        timestamp: Date.now()
      };
      await addToHistory(entry);
    }
    return { success: true, result };
  }
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      chrome.tabs.sendMessage(tabId, {
        type: "PAGE_ANALYSIS_COMPLETE",
        payload: { url: tab.url }
      }).catch(() => {
      });
    }
  });
  chrome.alarms.create("cacheCleanup", { periodInMinutes: 720 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "cacheCleanup") {
      reputationCache.clear().catch((err) => logger.error("Cache cleanup failed:", err));
    }
  });
  logger.info("Web Security Shield service worker initialized");

})();
//# sourceMappingURL=background.js.map
