export type RiskLevel = 'LOW' | 'UNKNOWN' | 'SUSPICIOUS' | 'HIGH';

export interface ThreatIndicator {
  code: string;      // e.g. 'BRAND_IMPERSONATION', 'SUSPICIOUS_PATH', 'DANGEROUS_SCHEME'
  message: string;   // human-readable explanation
  score: number;     // contribution to risk score 0-100
}

export interface SecurityResult {
  url: string;
  domain: string;
  riskLevel: RiskLevel;
  score: number;               // 0-100 normalized
  indicators: ThreatIndicator[];
  isCached: boolean;
  analyzedAt: number;          // Date.now()
  threatIntelResult?: ThreatIntelResult;
  aiResult?: AIAnalysisResult;
}

export interface ThreatIntelResult {
  isKnownMalicious: boolean;
  sources: string[];           // e.g. ['Google Safe Browsing', 'VirusTotal']
  confidence: number;          // 0-1
}

export interface AIAnalysisResult {
  riskLevel: RiskLevel;
  confidence: number;
  reasons: string[];
}

export interface CachedSecurityResult {
  key: string;
  url: string;
  result: SecurityResult;
  timestamp: number;
  expiresAt: number;
}

export interface ScanHistoryEntry {
  id: string;
  url: string;
  domain: string;
  riskLevel: RiskLevel;
  score: number;
  timestamp: number;
}

export interface ExtensionSettings {
  enableURLProtection: boolean;
  enableHoverAnalysis: boolean;
  enableClickWarnings: boolean;
  enableWebpageAnalysis: boolean;
  enableEmailAnalysis: boolean;
  enableSearchAnalysis: boolean;
  showPageBadge: boolean;
  enableLocalAnalysis: boolean;
  enableAIAnalysis: boolean;
  storeScanHistory: boolean;
  googleSafeBrowsingApiKey: string;
  virusTotalApiKey: string;
  aiProviderApiKey: string;
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'none';
  sensitivityLevel: 'low' | 'medium' | 'high';
  protectedBrands: string[];
  riskThresholds: {
    suspicious: number;  // default 50
    high: number;        // default 75
  };
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
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
  googleSafeBrowsingApiKey: '',
  virusTotalApiKey: '',
  aiProviderApiKey: '',
  aiProvider: 'none',
  sensitivityLevel: 'medium',
  protectedBrands: [
    'google', 'microsoft', 'apple', 'paypal', 'amazon',
    'facebook', 'instagram', 'linkedin', 'netflix', 'docusign',
    'dropbox', 'twitter', 'github', 'adobe', 'chase', 'wellsfargo',
    'bankofamerica', 'citibank', 'irs', 'usps', 'fedex', 'ups',
  ],
  riskThresholds: {
    suspicious: 50,
    high: 75,
  },
};

export type MessageType =
  | 'ANALYZE_URL'
  | 'ANALYZE_PAGE'
  | 'ANALYZE_EMAIL'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'CLEAR_CACHE'
  | 'GET_HISTORY'
  | 'PAGE_ANALYSIS_COMPLETE'
  | 'URL_ANALYSIS_COMPLETE';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface AnalyzeURLPayload {
  url: string;
  tabId?: number;
}

export interface AnalyzeURLResponse {
  success: boolean;
  result?: SecurityResult;
  error?: string;
}

export interface AnalyzePagePayload {
  url: string;
  html?: string;  // Only sent if AI is enabled and user consented
  tabId?: number;
}

export interface PageAnalysisResponse {
  success: boolean;
  result?: import('./webpage').WebpageAnalysis;
  error?: string;
}
