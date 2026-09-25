import type { ThreatIndicator } from './security';

export interface WebpageAnalysis {
  url: string;
  domain: string;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  hasOTPField: boolean;
  hasCreditCardField: boolean;
  hasBankingField: boolean;
  hasUrgencyLanguage: boolean;
  hasFakeWarnings: boolean;
  hasSuspiciousDownload: boolean;
  hasHiddenIframes: boolean;
  hasSuspiciousScripts: boolean;
  brandMismatch: boolean;
  detectedBrand: string | null;
  sensitiveFieldCount: number;
  externalLinks: number;
  suspiciousLinks: number;
  indicators: ThreatIndicator[];
  score: number;
}

export interface EmailAnalysis {
  platform: 'gmail' | 'outlook' | 'yahoo' | 'other';
  sender: string;
  displayName: string;
  replyTo: string | null;
  subject: string;
  hasDisplayNameMismatch: boolean;
  hasDomainMismatch: boolean;
  hasUrgencyLanguage: boolean;
  hasCredentialRequest: boolean;
  hasPaymentRequest: boolean;
  hasThreatLanguage: boolean;
  hasSuspiciousAttachment: boolean;
  links: string[];
  indicators: ThreatIndicator[];
  score: number;
}

export type WebmailPlatform = 'gmail' | 'outlook' | 'yahoo' | 'protonmail' | 'none';

export const WEBMAIL_PATTERNS: Record<WebmailPlatform, RegExp> = {
  gmail: /mail\.google\.com/,
  outlook: /outlook\.(live|office)\.com|mail\.live\.com/,
  yahoo: /mail\.yahoo\.com/,
  protonmail: /mail\.proton\.me|protonmail\.com/,
  none: /^$/,
};

export const URGENCY_KEYWORDS = [
  'urgent', 'immediately', 'act now', 'expires', 'expiring',
  'suspended', 'locked', 'compromised', 'unauthorized', 'verify now',
  'limited time', 'account will be', 'within 24 hours', 'within 48 hours',
  'action required', 'important notice', 'security alert', 'warning',
];

export const CREDENTIAL_REQUEST_KEYWORDS = [
  'enter your password', 'confirm your password', 'enter your credentials',
  'sign in to continue', 'verify your identity', 'update your payment',
  'enter your credit card', 'confirm billing', 'enter your otp',
  'enter your pin', 'social security', 'bank account number',
];
