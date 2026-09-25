import { ThreatIntelProvider } from './threat-intelligence';
import { ThreatIntelResult, ExtensionSettings } from '../types/security';

export class GoogleSafeBrowsingProvider implements ThreatIntelProvider {
  readonly name = 'Google Safe Browsing';
  
  isAvailable(settings: ExtensionSettings): boolean {
    return !!settings.googleSafeBrowsingApiKey;
  }
  
  async checkURL(url: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    const safeResult: ThreatIntelResult = { isKnownMalicious: false, sources: [], confidence: 0 };
    if (!this.isAvailable(settings)) return safeResult;

    try {
      const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${settings.googleSafeBrowsingApiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: {
            clientId: 'web-security-extension',
            clientVersion: '1.0.0'
          },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
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
  
  async checkDomain(domain: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    return this.checkURL(`https://${domain}`, settings);
  }
}
