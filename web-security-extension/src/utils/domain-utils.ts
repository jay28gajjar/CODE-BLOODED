import { isIPAddress } from './url-utils';

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => 
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

export function detectTyposquatting(domain: string, brands: string[]): { brand: string; similarity: number } | null {
  if (!domain || !brands || brands.length === 0) return null;
  
  let bestMatch = null;
  let highestSimilarity = 0;

  for (const brand of brands) {
    if (domain === brand) continue; // Exact match is not a typosquat
    
    const score = similarityScore(domain, brand);
    if (score > highestSimilarity) {
      highestSimilarity = score;
      bestMatch = brand;
    }
  }

  if (bestMatch && highestSimilarity >= 0.7 && highestSimilarity < 1) {
    return { brand: bestMatch, similarity: highestSimilarity };
  }

  return null;
}

export function getSubdomains(hostname: string): string[] {
  if (!hostname || isIPAddress(hostname) || hostname === 'localhost') return [];
  const parts = hostname.split('.');
  // Need at least 3 parts for a subdomain (e.g., sub.example.com)
  if (parts.length <= 2) return [];
  
  // Very simplistic check to avoid treating co.uk as domain + tld for subdomains
  const sld = parts[parts.length - 2];
  const doubleTlds = new Set(['co', 'com', 'org', 'net', 'edu', 'gov', 'ac']);
  
  if (doubleTlds.has(sld) && parts.length > 2) {
    if (parts.length === 3) return []; // e.g., google.co.uk
    return parts.slice(0, parts.length - 3);
  }
  
  return parts.slice(0, parts.length - 2);
}

export function countHyphens(domain: string): number {
  if (!domain) return 0;
  return (domain.match(/-/g) || []).length;
}

export function countDigits(domain: string): number {
  if (!domain) return 0;
  return (domain.match(/\d/g) || []).length;
}

export function hasSuspiciousPort(port: number | null): boolean {
  if (port === null) return false;
  const standardPorts = new Set([80, 443, 8080, 8443]);
  return !standardPorts.has(port);
}

export function isSuspiciousTLD(tld: string): boolean {
  if (!tld) return false;
  const suspicious = new Set([
    'xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'click', 'download',
    'zip', 'review', 'country', 'kim', 'science', 'work', 'party', 'gq'
  ]);
  return suspicious.has(tld.toLowerCase());
}

export function extractDomainParts(hostname: string): { subdomain: string; domain: string; tld: string } {
  if (!hostname || isIPAddress(hostname) || hostname === 'localhost') {
    return { subdomain: '', domain: hostname, tld: '' };
  }
  const parts = hostname.split('.');
  if (parts.length === 1) return { subdomain: '', domain: hostname, tld: '' };
  
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  
  const doubleTlds = new Set(['co', 'com', 'org', 'net', 'edu', 'gov', 'ac']);
  let registeredDomain = `${sld}.${tld}`;
  let subLength = 2;
  
  if (doubleTlds.has(sld) && parts.length > 2) {
      registeredDomain = `${parts[parts.length - 3]}.${sld}.${tld}`;
      subLength = 3;
  }
  
  let subdomain = '';
  if (parts.length > subLength) {
      subdomain = parts.slice(0, parts.length - subLength).join('.');
  }
  
  return {
      subdomain,
      domain: registeredDomain,
      tld: parts.slice(parts.length - (subLength - 1)).join('.')
  };
}
