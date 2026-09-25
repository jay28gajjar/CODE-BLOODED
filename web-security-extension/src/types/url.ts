import type { ThreatIndicator } from './security';

export interface ParsedURL {
  original: string;
  normalized: string;
  scheme: string;
  domain: string;
  registeredDomain: string;
  subdomain: string;
  tld: string;
  path: string;
  query: string;
  fragment: string;
  port: number | null;
  isIP: boolean;
  isPunycode: boolean;
  isShortened: boolean;
  isDataURL: boolean;
  isJavaScript: boolean;
}

export interface URLAnalysis {
  parsedURL: ParsedURL;
  schemeRisk: number;
  pathRisk: number;
  structureRisk: number;
  redirectRisk: number;
  indicators: ThreatIndicator[];
}

export interface DomainAnalysis {
  domain: string;
  registeredDomain: string;
  lengthRisk: number;
  subdomainRisk: number;
  hyphenRisk: number;
  digitRisk: number;
  punycodeRisk: number;
  ipRisk: number;
  portRisk: number;
  tldRisk: number;
  brandMatch: BrandMatch | null;
  indicators: ThreatIndicator[];
}

export interface BrandMatch {
  brand: string;
  isLegitimate: boolean;
  similarity: number;
  legitimateDomains: string[];
}

export const URL_SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.io',
  'tiny.cc', 'lnkd.in', 'buff.ly', 'rebrand.ly', 'yourls.org',
  'is.gd', 'v.gd', 'clck.ru', 'cutt.ly', 'rb.gy',
]);

export const DANGEROUS_SCHEMES = new Set([
  'javascript', 'data', 'vbscript', 'file',
]);

export const SUSPICIOUS_PATH_KEYWORDS = [
  'login', 'signin', 'sign-in', 'verify', 'verification',
  'account', 'password', 'reset', 'security', 'confirm',
  'payment', 'update', 'suspend', 'billing', 'checkout',
  'banking', 'secure', 'recover', 'unlock', 'activate',
];

export const REDIRECT_PARAMS = [
  'url', 'redirect', 'redirect_url', 'redirectUrl', 'target',
  'next', 'destination', 'returnUrl', 'return_url', 'goto',
  'link', 'to', 'ref', 'redir',
];
