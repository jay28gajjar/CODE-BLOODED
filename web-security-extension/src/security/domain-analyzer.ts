import { DomainAnalysis } from '../types/url';
import { ThreatIndicator } from '../types/security';
import { extractDomainParts } from '../utils/domain-utils';
import { detectBrandImpersonation } from './brand-detector';

const SUSPICIOUS_TLDS = new Set(['xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'cc', 'vip', 'click']);

export function analyzeDomain(hostname: string, port: number | null): DomainAnalysis {
  const parts = extractDomainParts(hostname);
  const registeredDomain = parts.domain || hostname;
  const subdomain = parts.subdomain;
  const tldMatch = registeredDomain.match(/\.([^.]+)$/);
  const tld = tldMatch ? tldMatch[1].toLowerCase() : '';

  let lengthRisk = 0;
  if (registeredDomain.length > 30) lengthRisk = 20;
  else if (registeredDomain.length > 20) lengthRisk = 10;

  let subdomainRisk = 0;
  const subdomainParts = subdomain ? subdomain.split('.') : [];
  if (subdomainParts.length > 4) subdomainRisk = 25;
  else if (subdomainParts.length > 3) subdomainRisk = 15;

  let hyphenRisk = 0;
  const hyphenCount = (registeredDomain.match(/-/g) || []).length;
  if (hyphenCount > 2) hyphenRisk = 15;

  let digitRisk = 0;
  if (/\d/.test(registeredDomain)) digitRisk = 8;

  let punycodeRisk = 0;
  if (hostname.includes('xn--')) punycodeRisk = 20;

  let ipRisk = 0;
  const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
  if (isIP) ipRisk = 25;

  let portRisk = 0;
  if (port !== null && port !== 80 && port !== 443) portRisk = 10;

  let tldRisk = 0;
  if (SUSPICIOUS_TLDS.has(tld)) tldRisk = 15;

  const brandMatch = detectBrandImpersonation(registeredDomain, hostname);
  let brandRisk = 0;
  const indicators: ThreatIndicator[] = [];

  if (brandMatch && !brandMatch.isLegitimate) {
    brandRisk = 35;
    indicators.push({ code: 'BRAND_IMPERSONATION', message: `Domain impersonates brand: ${brandMatch.brand}`, score: 35 });
  }

  if (lengthRisk > 0) indicators.push({ code: 'DOMAIN_LENGTH', message: 'Domain is suspiciously long', score: lengthRisk });
  if (subdomainRisk > 0) indicators.push({ code: 'SUBDOMAIN_COUNT', message: 'Too many subdomains', score: subdomainRisk });
  if (hyphenRisk > 0) indicators.push({ code: 'HYPHEN_COUNT', message: 'Multiple hyphens in domain', score: hyphenRisk });
  if (digitRisk > 0) indicators.push({ code: 'DOMAIN_DIGITS', message: 'Domain contains digits', score: digitRisk });
  if (punycodeRisk > 0) indicators.push({ code: 'PUNYCODE', message: 'Punycode encoding detected', score: punycodeRisk });
  if (ipRisk > 0) indicators.push({ code: 'IP_ADDRESS', message: 'Domain is an IP address', score: ipRisk });
  if (portRisk > 0) indicators.push({ code: 'NON_STANDARD_PORT', message: 'Uses a non-standard port', score: portRisk });
  if (tldRisk > 0) indicators.push({ code: 'SUSPICIOUS_TLD', message: 'Suspicious TLD used', score: tldRisk });

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
