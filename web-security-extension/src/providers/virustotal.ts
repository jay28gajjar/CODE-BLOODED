import { ThreatIntelProvider } from './threat-intelligence';
import { ThreatIntelResult, ExtensionSettings } from '../types/security';

export class VirusTotalProvider implements ThreatIntelProvider {
  readonly name = 'VirusTotal';
  
  private lastCallTime = 0;
  private readonly RATE_LIMIT_MS = 15000; // 4 req per min = 15s per req
  
  isAvailable(settings: ExtensionSettings): boolean {
    return !!settings.virusTotalApiKey;
  }
  
  private encodeUrl(url: string): string {
    return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  async checkURL(url: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    const safeResult: ThreatIntelResult = { isKnownMalicious: false, sources: [], confidence: 0 };
    if (!this.isAvailable(settings)) return safeResult;

    const now = Date.now();
    if (now - this.lastCallTime < this.RATE_LIMIT_MS) {
      return safeResult; // Rate limited, skip this provider
    }
    this.lastCallTime = now;

    try {
      const urlId = this.encodeUrl(url);
      const apiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-apikey': settings.virusTotalApiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // If it's a 404, it might mean the URL is not in VT yet.
        // For a full implementation, you might POST to scan it, but typically we just check cache.
        return safeResult;
      }

      const data = await response.json();
      const stats = data.data?.attributes?.last_analysis_stats;
      
      if (stats && stats.malicious > 2) {
        return {
          isKnownMalicious: true,
          sources: [this.name],
          confidence: Math.min(100, stats.malicious * 10)
        };
      }

      return safeResult;
    } catch (e) {
      return safeResult;
    }
  }
  
  async checkDomain(domain: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    const safeResult: ThreatIntelResult = { isKnownMalicious: false, sources: [], confidence: 0 };
    if (!this.isAvailable(settings)) return safeResult;
    
    const now = Date.now();
    if (now - this.lastCallTime < this.RATE_LIMIT_MS) {
      return safeResult; // Rate limited
    }
    this.lastCallTime = now;

    try {
      const apiUrl = `https://www.virustotal.com/api/v3/domains/${domain}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-apikey': settings.virusTotalApiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return safeResult;

      const data = await response.json();
      const stats = data.data?.attributes?.last_analysis_stats;

      if (stats && stats.malicious > 2) {
        return {
          isKnownMalicious: true,
          sources: [this.name],
          confidence: Math.min(100, stats.malicious * 10)
        };
      }
      return safeResult;
    } catch (e) {
      return safeResult;
    }
  }
}
