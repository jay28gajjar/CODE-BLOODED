import { parseURL } from '../utils/url-utils';
import { URLAnalysis, SUSPICIOUS_PATH_KEYWORDS, REDIRECT_PARAMS } from '../types/url';
import { ThreatIndicator } from '../types/security';

const DANGEROUS_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:']);
const SUSPICIOUS_EXTENSIONS = new Set(['.exe', '.bat', '.ps1', '.vbs', '.scr']);

export function analyzeURL(url: string): URLAnalysis | null {
  const parsedURL = parseURL(url);
  if (!parsedURL) return null;

  let schemeRisk = 0;
  const indicators: ThreatIndicator[] = [];

  const scheme = parsedURL.scheme.toLowerCase() + ':';
  if (DANGEROUS_SCHEMES.has(scheme)) {
    schemeRisk = 100;
    indicators.push({ code: 'DANGEROUS_SCHEME', message: `Dangerous scheme used: ${scheme}`, score: 100 });
  } else if (scheme === 'ftp:') {
    schemeRisk = 20;
    indicators.push({ code: 'INSECURE_SCHEME', message: 'Insecure FTP scheme', score: 20 });
  } else if (scheme === 'http:') {
    schemeRisk = 10;
    indicators.push({ code: 'HTTP_SCHEME', message: 'Insecure HTTP scheme', score: 10 });
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
    indicators.push({ code: 'SUSPICIOUS_PATH', message: 'Path contains suspicious keywords', score: risk });
  }

  if (parsedURL.path.length > 100) {
    pathRisk += 5;
    indicators.push({ code: 'LONG_PATH', message: 'Path is unusually long', score: 5 });
  }

  const pathSegments = parsedURL.path.split('/').filter(Boolean);
  if (pathSegments.length > 8) {
    pathRisk += 5;
    indicators.push({ code: 'EXCESSIVE_SEGMENTS', message: 'Too many path segments', score: 5 });
  }

  if (/%[0-9a-f]{2}/i.test(parsedURL.path)) {
    pathRisk += 5;
    indicators.push({ code: 'ENCODED_PATH', message: 'Path contains encoded characters', score: 5 });
  }

  let structureRisk = 0;
  if (url.length > 200) {
    structureRisk += 10;
    indicators.push({ code: 'URL_VERY_LONG', message: 'URL is very long', score: 10 });
  } else if (url.length > 100) {
    structureRisk += 5;
    indicators.push({ code: 'URL_LONG', message: 'URL is long', score: 5 });
  }

  const queryParams = new URLSearchParams(parsedURL.query);
  const paramCount = Array.from(queryParams.keys()).length;
  if (paramCount > 8) {
    structureRisk += 5;
    indicators.push({ code: 'EXCESSIVE_QUERY_PARAMS', message: 'Too many query parameters', score: 5 });
  }

  for (const val of queryParams.values()) {
    if (val.startsWith('http://') || val.startsWith('https://')) {
      structureRisk += 25;
      indicators.push({ code: 'NESTED_URL', message: 'URL found in query parameter', score: 25 });
      break;
    }
  }

  for (const ext of SUSPICIOUS_EXTENSIONS) {
    if (pathLower.endsWith(ext)) {
      structureRisk += 30;
      indicators.push({ code: 'SUSPICIOUS_EXTENSION', message: `Suspicious file extension: ${ext}`, score: 30 });
      break;
    }
  }

  let redirectRisk = 0;
  for (const param of REDIRECT_PARAMS || []) {
    if (queryParams.has(param)) {
      redirectRisk += 15;
      indicators.push({ code: 'REDIRECT_PARAM', message: 'Potential redirect parameter found', score: 15 });
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
