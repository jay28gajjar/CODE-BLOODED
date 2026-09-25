import { analyzeURL } from './url-analyzer';
import { analyzeDomain } from './domain-analyzer';
import { URLAnalysis, DomainAnalysis } from '../types/url';
import { ThreatIndicator } from '../types/security';

export interface PhishingAnalysis {
  urlAnalysis: URLAnalysis;
  domainAnalysis: DomainAnalysis;
  combinedIndicators: ThreatIndicator[];
  rawScore: number;
}

export function analyzeURLForPhishing(url: string): PhishingAnalysis | null {
  const urlAnalysis = analyzeURL(url);
  if (!urlAnalysis) return null;

  const domainAnalysis = analyzeDomain(urlAnalysis.parsedURL.domain, urlAnalysis.parsedURL.port);
  
  const combinedIndicators = [...urlAnalysis.indicators, ...domainAnalysis.indicators];
  
  let rawScore = combinedIndicators.reduce((sum, ind) => sum + ind.score, 0);

  const hasImpersonation = combinedIndicators.some(ind => ind.code === 'BRAND_IMPERSONATION');
  const hasLoginPath = combinedIndicators.some(ind => ind.code === 'SUSPICIOUS_PATH');
  const hasIP = combinedIndicators.some(ind => ind.code === 'IP_ADDRESS');
  const hasDangerousScheme = combinedIndicators.some(ind => ind.code === 'DANGEROUS_SCHEME');

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
