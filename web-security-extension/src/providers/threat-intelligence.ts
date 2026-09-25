import { ThreatIntelResult, ExtensionSettings } from '../types/security';

export interface ThreatIntelProvider {
  name: string;
  isAvailable(settings: ExtensionSettings): boolean;
  checkURL(url: string, settings: ExtensionSettings): Promise<ThreatIntelResult>;
  checkDomain(domain: string, settings: ExtensionSettings): Promise<ThreatIntelResult>;
}

export class ThreatIntelAggregator {
  private providers: ThreatIntelProvider[];
  
  constructor(providers: ThreatIntelProvider[]) {
    this.providers = providers;
  }
  
  async checkURL(url: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    const available = this.providers.filter(p => p.isAvailable(settings));
    if (available.length === 0) {
      return { isKnownMalicious: false, sources: [], confidence: 0 };
    }

    const results = await Promise.allSettled(
      available.map(p => this.withTimeout(p.checkURL(url, settings), 5000))
    );

    return this.aggregateResults(results);
  }
  
  async checkDomain(domain: string, settings: ExtensionSettings): Promise<ThreatIntelResult> {
    const available = this.providers.filter(p => p.isAvailable(settings));
    if (available.length === 0) {
      return { isKnownMalicious: false, sources: [], confidence: 0 };
    }

    const results = await Promise.allSettled(
      available.map(p => this.withTimeout(p.checkDomain(domain, settings), 5000))
    );

    return this.aggregateResults(results);
  }

  private aggregateResults(results: PromiseSettledResult<ThreatIntelResult>[]): ThreatIntelResult {
    let isKnownMalicious = false;
    let confidence = 0;
    const sources: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.isKnownMalicious) {
          isKnownMalicious = true;
          confidence = Math.max(confidence, result.value.confidence);
        }
        sources.push(...result.value.sources);
      }
    }

    return {
      isKnownMalicious,
      sources: Array.from(new Set(sources)),
      confidence
    };
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
    ]);
  }
}

export function createDefaultAggregator(): ThreatIntelAggregator {
  // Can inject specific providers later
  return new ThreatIntelAggregator([]);
}
