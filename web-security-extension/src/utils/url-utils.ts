import type { ParsedURL } from '../types/url';
import { URL_SHORTENER_DOMAINS, DANGEROUS_SCHEMES, REDIRECT_PARAMS } from '../types/url';

export function isIPAddress(hostname: string): boolean {
  if (!hostname) return false;
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/;
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
}

export function isPunycode(hostname: string): boolean {
  return typeof hostname === 'string' && hostname.includes('xn--');
}

export function extractRegisteredDomain(hostname: string): string {
  if (!hostname || isIPAddress(hostname)) return hostname;
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 1) return hostname;
  if (parts.length === 2) return hostname;

  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  
  // Simplified logic for double TLDs like co.uk, com.au
  const doubleTlds = new Set(['co', 'com', 'org', 'net', 'edu', 'gov', 'ac']);
  if (doubleTlds.has(sld) && parts.length > 2) {
    return `${parts[parts.length - 3]}.${sld}.${tld}`;
  }
  
  return `${sld}.${tld}`;
}

export function parseURL(url: string): ParsedURL | null {
  try {
    const isJavaScript = url.toLowerCase().trim().startsWith('javascript:');
    const isDataURL = url.toLowerCase().trim().startsWith('data:');
    
    let parsedObj: URL;
    if (isJavaScript || isDataURL) {
       parsedObj = new URL(url);
    } else {
       // if not http/https/ftp etc, this might fail, fallback gracefully
       try { parsedObj = new URL(url); } 
       catch {
           // check if missing scheme
           parsedObj = new URL('http://' + url);
       }
    }

    const scheme = parsedObj.protocol.replace(':', '').toLowerCase();
    const domain = parsedObj.hostname;
    const registeredDomain = extractRegisteredDomain(domain);
    
    let subdomain = '';
    if (domain !== registeredDomain && !isIPAddress(domain)) {
      subdomain = domain.substring(0, domain.length - registeredDomain.length - 1);
    }
    
    const parts = registeredDomain.split('.');
    const tld = parts.length > 1 ? parts[parts.length - 1] : '';

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

export function normalizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return decodeURI(normalized);
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

export function extractURLFromElement(el: HTMLAnchorElement | HTMLElement): string | null {
  if (!el) return null;
  if (el instanceof HTMLAnchorElement) {
    if (el.href) return el.href;
  }
  const dataHref = el.getAttribute('data-href');
  if (dataHref) return dataHref;
  return null;
}

export function isValidHTTPURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isDangerousScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '').toLowerCase();
    return DANGEROUS_SCHEMES.has(scheme);
  } catch {
    const lower = url.trim().toLowerCase();
    return lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:');
  }
}

export function getURLKey(url: string): string {
  return normalizeURL(url);
}

export function extractNestedURL(url: string): string | null {
  try {
    const parsedObj = new URL(url);
    for (const param of REDIRECT_PARAMS) {
      const val = parsedObj.searchParams.get(param);
      if (val) {
        try {
          new URL(val); // validate
          return val;
        } catch {
           try {
               const decoded = decodeURIComponent(val);
               new URL(decoded);
               return decoded;
           } catch {
               // ignore
           }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
