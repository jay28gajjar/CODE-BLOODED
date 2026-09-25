import { 
  SecurityResult, RiskLevel, ThreatIndicator, 
  ThreatIntelResult, AIAnalysisResult, ExtensionSettings, DEFAULT_SETTINGS 
} from '../types/security';
import { PhishingAnalysis } from './phishing-detector';

export interface RiskEngineInput {
  url: string;
  phishingAnalysis?: PhishingAnalysis;
  threatIntelResult?: ThreatIntelResult;
  aiResult?: AIAnalysisResult;
  settings?: ExtensionSettings;
}

export function calculateRisk(input: RiskEngineInput): SecurityResult {
  const settings = input.settings || DEFAULT_SETTINGS;
  let score = input.phishingAnalysis?.rawScore || 0;
  const indicators: ThreatIndicator[] = input.phishingAnalysis?.combinedIndicators ? [...input.phishingAnalysis.combinedIndicators] : [];

  if (input.threatIntelResult?.isKnownMalicious) {
    score = 100;
    indicators.push({
      code: 'THREAT_INTEL_MATCH',
      message: 'Known malicious URL according to Threat Intelligence',
      score: 100
    });
  } else if (input.aiResult) {
    // Blend 70% heuristic + 30% AI
    const aiScore = getScoreFromRiskLevel(input.aiResult.riskLevel);
    score = Math.round((score * 0.7) + (aiScore * 0.3));
    input.aiResult.reasons.forEach(reason => {
      indicators.push({
        code: 'AI_INDICATOR',
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
      case 'low':
        thresholdSuspicious = 60;
        thresholdHigh = 80;
        break;
      case 'high':
        thresholdSuspicious = 35;
        thresholdHigh = 60;
        break;
      case 'medium':
      default:
        thresholdSuspicious = 50;
        thresholdHigh = 75;
        break;
    }
  }

  let riskLevel: RiskLevel = 'UNKNOWN';
  if (score < 20) {
    riskLevel = 'LOW';
  } else if (score < thresholdSuspicious) {
    riskLevel = 'UNKNOWN';
  } else if (score < thresholdHigh) {
    riskLevel = 'SUSPICIOUS';
  } else {
    riskLevel = 'HIGH';
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

function getScoreFromRiskLevel(level: RiskLevel): number {
  switch (level) {
    case 'HIGH': return 90;
    case 'SUSPICIOUS': return 65;
    case 'LOW': return 10;
    case 'UNKNOWN': return 35;
    default: return 35;
  }
}

export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'HIGH': return 'Dangerous';
    case 'SUSPICIOUS': return 'Suspicious';
    case 'LOW': return 'Safe';
    case 'UNKNOWN': return 'Unknown';
    default: return 'Unknown';
  }
}

export function getRiskLevelEmoji(level: RiskLevel): string {
  switch (level) {
    case 'HIGH': return '🔴';
    case 'SUSPICIOUS': return '🟡';
    case 'LOW': return '🟢';
    case 'UNKNOWN': return '⚪';
    default: return '⚪';
  }
}
